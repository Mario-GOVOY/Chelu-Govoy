import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
    ChatBusyError,
    enviarMensaje,
    EventoChat,
    fetchSectorsForm,
    obtenerChat,
    resumeAnswer,
    sendEmail as sendEmailApi,
    stopAnswer,
    votarRespuesta,
} from '@/chat/chatApi';
import type {
    BorradorCorreo,
    Documento,
    EditedEmail,
    Grafica,
    Herramienta,
    Mapa,
    Mensaje,
    ScenarioComparison,
    SectorsResult,
    Voto,
} from '@/types/Chat';
import type { SectorsForm, SectorsFormPayload } from '@/types/SectorsForm';
import { etiquetaHerramienta } from '@/chat/herramientas';
import { loadShowTools } from '@/chat/showToolsSetting';

// Lectura de una respuesta: cada envío tiene la suya, para que una que acaba no pise a la siguiente.
type StreamControl = {
    abortController: AbortController;
    // Llega en el evento 'session'; hace falta para parar y retomar.
    generationId?: string;
    // Último evento recibido: al retomar se pide lo posterior.
    lastSeq: number;
    // Se ha pulsado "Parar"; si aún no había id, se para al llegar.
    stopRequested: boolean;
};

type OnEvento = (evento: EventoChat, seq?: number) => void;

// Lecturas seguidas cortadas sin recibir nada antes de dar la respuesta por perdida.
const MAX_FAILED_READS = 5;
// Pausa antes de retomar con la app en primer plano (p. ej. sin red), para no reintentar sin parar.
const RETRY_DELAY_MS = 2000;
// Texto que se enseña por cada fotograma de 60 fps que pasa: 1/REVEAL_FRACTION de lo que falta, y como mínimo MIN_REVEAL_CHARS caracteres.
const REVEAL_FRACTION = 12;
const MIN_REVEAL_CHARS = 2;
const FRAME_MS = 1000 / 60;
// Se pinta como mucho cada REVEAL_INTERVAL_MS (unas 30 veces por segundo).
const REVEAL_INTERVAL_MS = 33;
// Tiempo que cuenta como mucho en un paso: tras una pausa (segundo plano) no se enseña todo de golpe.
const MAX_REVEAL_STEP_MS = 100;

// Espera a que la app vuelva a primer plano (si ya lo está, RETRY_DELAY_MS). Acaba también al abortar.
function waitUntilActive(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const finish = () => {
            clearTimeout(timer);
            subscription.remove();
            signal.removeEventListener('abort', finish);
            resolve();
        };
        const timer = AppState.currentState === 'active' ? setTimeout(finish, RETRY_DELAY_MS) : undefined;
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') finish();
        });
        signal.addEventListener('abort', finish);
    });
}

// Si el back no puede pararla, se corta la conexión para que al menos deje de pintarse.
async function requestStop(streamControl: StreamControl, generationId: string) {
    try {
        await stopAnswer(generationId);
    } catch {
        streamControl.abortController.abort();
    }
}

/**
 * Mensajes de una conversación (o de una nueva, sin chatId) y envío de preguntas.
 * @param onCreada se llama con el id que da el back al empezar una conversación nueva y la pregunta que la empezó.
 * @param model modelo con el que responde el back.
 */
export function useChat(chatId: string | undefined, onCreada: (id: string, pregunta: string) => void, model: string) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [titulo, setTitulo] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(false);
    const [intento, setIntento] = useState(0);
    const [respondiendo, setRespondiendo] = useState(false);
    // Se ha pedido parar y aún no ha terminado.
    const [stopping, setStopping] = useState(false);
    const streamRef = useRef<StreamControl | null>(null);
    // Id de la conversación que acaba de crear un envío: ya está en pantalla, no hay que cargarla.
    const creadaRef = useRef<string | undefined>(undefined);

    const recargar = useCallback(() => setIntento((n) => n + 1), []);

    /**
     * Sigue una respuesta hasta el final y la va pintando en su mensaje (idChelu), que ya está en la lista.
     * Si se corta la conexión (segundo plano o sin red), la retoma desde el último evento al volver a primer plano.
     * @param send primera lectura: el envío de la pregunta, o retomar desde el principio una respuesta en curso.
     * @param generationId de la respuesta, si ya se sabe; si no, llega en el evento 'session'.
     */
    const followAnswer = useCallback(async ({ idChelu, generationId, send, onSession }: {
        idChelu: string;
        generationId?: string;
        send: (signal: AbortSignal, onEvento: OnEvento, showTools: boolean) => Promise<void>;
        onSession?: (evento: Extract<EventoChat, { tipo: 'session' }>) => void;
    }) => {
        const streamControl: StreamControl = { abortController: new AbortController(), generationId, lastSeq: 0, stopRequested: false };
        streamRef.current = streamControl;
        const { signal } = streamControl.abortController;
        setRespondiendo(true);
        // Se toma al empezar: cambiarlo en Ajustes no afecta a la respuesta en curso.
        const toolsShown = await loadShowTools();

        // Se actualiza por id: si entretanto se cambió de conversación, no encuentra nada que tocar.
        const actualizar = (cambios: Partial<Mensaje>) =>
            setMensajes((prev) => prev.map((m) => (m.id === idChelu ? { ...m, ...cambios } : m)));

        // Texto recibido y cuánto de él se ve. Se pinta como mucho una vez por fotograma.
        let texto = '';
        let shownLength = 0;
        let revealing = false;
        let lastRevealAt = 0;
        // Lo llama reveal al enseñar todo el texto; lo pone waitForReveal.
        let onRevealed: (() => void) | null = null;
        let fallo = false;
        let detenida = false;
        let terminada = false;
        // Ha llegado el último evento: 'done', 'error', 'detenida' o 'terminada'.
        let finished = false;
        // Lecturas seguidas que se cortan sin recibir nada.
        let failedReads = 0;
        let runId: string | undefined;
        let sugerencias: string[] = [];
        const documentos: Documento[] = [];
        const graficas: Grafica[] = [];
        const mapas: Mapa[] = [];
        const borradoresCorreo: BorradorCorreo[] = [];
        const sectorsForms: SectorsForm[] = [];
        const sectorsResults: SectorsResult[] = [];
        const comparisons: ScenarioComparison[] = [];

        // El 'fin' de una herramienta no dice cuál de sus llamadas acaba: se toma la última abierta con ese nombre.
        const herramientas = new Map<string, Herramienta>();
        const abiertas: { nombre: string; clave: string }[] = [];
        const herramienta = (evento: Extract<EventoChat, { tipo: 'tool' }>) => {
            if (evento.fase === 'inicio') {
                const etiqueta = etiquetaHerramienta(evento.nombre, evento.args);
                const clave = `${evento.nombre}::${etiqueta}`;
                const h = herramientas.get(clave);
                herramientas.set(clave, h
                    ? { ...h, veces: h.veces + 1, enCurso: h.enCurso + 1 }
                    : { clave, etiqueta, veces: 1, enCurso: 1 });
                abiertas.push({ nombre: evento.nombre, clave });
            } else {
                const i = abiertas.findLastIndex((a) => a.nombre === evento.nombre);
                const cerrada = i >= 0 ? abiertas.splice(i, 1)[0] : abiertas.pop();
                const h = cerrada && herramientas.get(cerrada.clave);
                if (h) herramientas.set(h.clave, { ...h, enCurso: Math.max(0, h.enCurso - 1) });
            }
            actualizar({ herramientas: [...herramientas.values()] });
        };

        // En cada fotograma enseña una parte de lo que falta: lo que llega de golpe (al retomar) se ve escribirse.
        // Avanza según el tiempo pasado, no por fotogramas: si se pierden, el texto no se frena.
        const reveal = () => {
            const now = performance.now();
            const elapsed = now - lastRevealAt;
            if (elapsed < REVEAL_INTERVAL_MS) {
                requestAnimationFrame(reveal);
                return;
            }
            lastRevealAt = now;
            const frames = Math.min(elapsed, MAX_REVEAL_STEP_MS) / FRAME_MS;
            const remaining = texto.length - shownLength;
            const step = Math.max(Math.round(MIN_REVEAL_CHARS * frames), Math.ceil((remaining * frames) / REVEAL_FRACTION));
            shownLength = Math.min(texto.length, shownLength + step);
            actualizar({ texto: texto.slice(0, shownLength) });
            if (shownLength < texto.length) {
                requestAnimationFrame(reveal);
                return;
            }
            revealing = false;
            onRevealed?.();
            onRevealed = null;
        };

        // Espera a que se vea todo el texto. En segundo plano no se pinta: no se espera.
        const waitForReveal = () => new Promise<void>((resolve) => {
            if (!revealing || AppState.currentState !== 'active') resolve();
            else onRevealed = resolve;
        });

        const onEvento: OnEvento = (evento, seq) => {
            failedReads = 0;
            if (seq !== undefined) streamControl.lastSeq = seq;
            if (evento.tipo === 'session') {
                streamControl.generationId = evento.generation_id;
                if (streamControl.stopRequested) requestStop(streamControl, evento.generation_id);
                if (!signal.aborted) onSession?.(evento);
            } else if (evento.tipo === 'delta') {
                texto += evento.texto;
                if (!revealing) {
                    revealing = true;
                    lastRevealAt = performance.now();
                    requestAnimationFrame(reveal);
                }
            } else if (evento.tipo === 'tool') {
                // Al retomar llegan los eventos del envío original, que pudo pedirlas (p. ej. desde la web).
                if (toolsShown) herramienta(evento);
            } else if (evento.tipo === 'sugerencias') {
                sugerencias = Array.isArray(evento.preguntas) ? evento.preguntas : [];
            } else if (evento.tipo === 'documento') {
                documentos.push(evento.documento);
                actualizar({ documentos: [...documentos] });
            } else if (evento.tipo === 'grafica') {
                graficas.push(evento.grafica);
                actualizar({ graficas: [...graficas] });
            } else if (evento.tipo === 'mapa') {
                mapas.push(evento.mapa);
                actualizar({ mapas: [...mapas] });
            } else if (evento.tipo === 'correo_borrador') {
                borradoresCorreo.push(evento.borradorCorreo);
                actualizar({ borradoresCorreo: [...borradoresCorreo] });
            } else if (evento.tipo === 'formulario_sectores') {
                sectorsForms.push(evento.sectorsForm);
                actualizar({ sectorsForms: [...sectorsForms] });
            } else if (evento.tipo === 'sectores') {
                sectorsResults.push(evento.sectorsResult);
                actualizar({ sectorsResults: [...sectorsResults], progress: undefined });
            } else if (evento.tipo === 'comparativa') {
                comparisons.push(evento.comparison);
                actualizar({ comparisons: [...comparisons], progress: undefined });
            } else if (evento.tipo === 'progreso') {
                actualizar({ progress: evento.mensaje });
            } else if (evento.tipo === 'done') {
                runId = evento.run_id;
                finished = true;
            } else if (evento.tipo === 'error') {
                fallo = true;
                finished = true;
            } else if (evento.tipo === 'detenida') {
                detenida = true;
                finished = true;
            } else if (evento.tipo === 'terminada') {
                terminada = true;
                finished = true;
            }
        };

        try {
            let read = () => send(signal, onEvento, toolsShown);
            while (true) {
                try {
                    await read();
                } catch (e) {
                    // Cortada a propósito (al salir de la pantalla o cambiar de conversación) o rechazada con el 409: no se retoma.
                    if (signal.aborted || e instanceof ChatBusyError) throw e;
                }
                if (finished) break;
                // Sin id no se puede retomar: se cortó antes del evento 'session'.
                const idToResume = streamControl.generationId;
                if (!idToResume || ++failedReads > MAX_FAILED_READS) throw new Error('No se pudo retomar la respuesta');
                await waitUntilActive(signal);
                read = () => resumeAnswer({ generationId: idToResume, fromSeq: streamControl.lastSeq, signal, onEvento });
            }
            await waitForReveal();
            // Las sugerencias se muestran al acabar, no según llegan.
            actualizar({
                texto,
                runId,
                sugerencias,
                progress: undefined,
                estado: fallo ? 'error' : detenida ? 'detenida' : undefined,
            });
        } catch (e) {
            // Se enseña de golpe lo que faltaba; un fotograma pendiente ya no recorta el texto.
            shownLength = texto.length;
            actualizar({
                texto,
                progress: undefined,
                estado: streamControl.stopRequested ? 'detenida' : 'error',
                errorMessage: e instanceof ChatBusyError ? e.message : undefined,
            });
        } finally {
            if (streamRef.current === streamControl) streamRef.current = null;
            setRespondiendo(false);
            setStopping(false);
        }
        // Ya está en el historial, pero sus últimos eventos no han llegado: se vuelve a cargar la conversación.
        if (terminada) recargar();
    }, [recargar]);

    // Respuesta en curso al abrir la conversación (la app se cerró a mitad, o se lanzó desde la web): se sigue desde el principio.
    const resumeActiveAnswer = useCallback((generationId: string) => {
        const idChelu = `chelu-${Date.now()}`;
        setMensajes((prev) => [...prev, { id: idChelu, rol: 'chelu', texto: '', estado: 'escribiendo' }]);
        followAnswer({
            idChelu,
            generationId,
            send: (signal, onEvento) => resumeAnswer({ generationId, fromSeq: 0, signal, onEvento }),
            // El historial aún no tiene la pregunta: llega en el evento 'session' y va antes de la respuesta.
            onSession: (evento) => {
                if (!evento.pregunta) return;
                const question: Mensaje = { id: `usuario-${Date.now()}`, rol: 'usuario', texto: evento.pregunta };
                setMensajes((prev) => {
                    const answerIndex = prev.findIndex((m) => m.id === idChelu);
                    return answerIndex < 0 ? prev : [...prev.slice(0, answerIndex), question, ...prev.slice(answerIndex)];
                });
            },
        });
    }, [followAnswer]);

    useEffect(() => {
        if (chatId && chatId === creadaRef.current) {
            creadaRef.current = undefined;
            return;
        }
        streamRef.current?.abortController.abort();
        setMensajes([]);
        setTitulo(null);
        setError(false);
        setCargando(!!chatId);
        if (!chatId) return;

        // Si se cambia de conversación antes de que llegue la respuesta, se descarta.
        let vigente = true;
        obtenerChat(chatId)
            .then((c) => {
                if (!vigente) return;
                setMensajes(c.mensajes);
                setTitulo(c.titulo);
                setCargando(false);
                if (c.activeGenerationId) resumeActiveAnswer(c.activeGenerationId);
            })
            .catch(() => {
                if (!vigente) return;
                setError(true);
                setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [chatId, intento, resumeActiveAnswer]);

    // Al salir de la pantalla se deja de leer la respuesta; en el back sigue hasta terminar.
    useEffect(() => () => streamRef.current?.abortController.abort(), []);

    // Con sectorsForm y sin pregunta se lanza la optimización de sectores y no se pinta mensaje del usuario.
    const enviar = useCallback(
        async (pregunta: string, sectorsForm?: SectorsFormPayload, fromVoice = false) => {
            const idChelu = `chelu-${Date.now()}`;
            const mensajeUsuario: Mensaje[] = pregunta ? [{ id: `usuario-${Date.now()}`, rol: 'usuario', texto: pregunta, isNew: true }] : [];
            setMensajes((prev) => [
                ...prev,
                ...mensajeUsuario,
                { id: idChelu, rol: 'chelu', texto: '', estado: 'escribiendo', isNew: true },
            ]);
            await followAnswer({
                idChelu,
                send: (signal, onEvento, showTools) =>
                    enviarMensaje({ pregunta, sessionId: chatId, model, showTools, sectorsForm, fromVoice, signal, onEvento }),
                onSession: (evento) => {
                    if (chatId) return;
                    creadaRef.current = evento.session_id;
                    setTitulo(pregunta);
                    onCreada(evento.session_id, pregunta);
                },
            });
        },
        [chatId, onCreada, model, followAnswer],
    );

    // La respuesta termina con el evento 'detenida'. Sin id todavía, se para al llegar el evento 'session'.
    const parar = useCallback(async () => {
        const streamControl = streamRef.current;
        if (!streamControl || streamControl.stopRequested) return;
        streamControl.stopRequested = true;
        setStopping(true);
        if (streamControl.generationId) await requestStop(streamControl, streamControl.generationId);
    }, []);

    /**
     * Valora una respuesta. Se pinta al momento y, si el back falla, vuelve el voto anterior
     * y se relanza el error para que lo enseñe quien llama.
     */
    const votar = useCallback(
        async (runId: string, voto: Voto, anterior: Voto | null) => {
            if (!chatId) throw new Error('La conversación aún no se ha guardado.');
            const poner = (v: Voto | null) =>
                setMensajes((prev) => prev.map((m) => (m.runId === runId ? { ...m, voto: v } : m)));
            poner(voto);
            try {
                poner(await votarRespuesta(chatId, runId, voto));
            } catch (e) {
                poner(anterior);
                throw e;
            }
        },
        [chatId],
    );

    /**
     * Envía un borrador con lo editado y lo marca como enviado en su mensaje.
     * Si el back falla, se relanza el error para que lo enseñe la tarjeta.
     */
    const sendEmail = useCallback(
        async (borrador: BorradorCorreo, edited: EditedEmail) => {
            if (!chatId) throw new Error('La conversación aún no se ha guardado.');
            const sentMessageId = await sendEmailApi(chatId, borrador, edited);
            setMensajes((prev) => prev.map((mensaje) => mensaje.borradoresCorreo?.includes(borrador)
                ? {
                    ...mensaje,
                    borradoresCorreo: mensaje.borradoresCorreo.map((item) => (item === borrador ? { ...item, sentMessageId } : item)),
                }
                : mensaje));
        },
        [chatId],
    );

    // Sustituye un formulario de sectores en su mensaje.
    const replaceSectorsForm = (form: SectorsForm, newForm: SectorsForm) =>
        setMensajes((prev) => prev.map((mensaje) => mensaje.sectorsForms?.includes(form)
            ? { ...mensaje, sectorsForms: mensaje.sectorsForms.map((item) => (item === form ? newForm : item)) }
            : mensaje));

    /**
     * Manda el formulario y lo marca como lanzado en su mensaje. Sin texto se optimiza tal cual;
     * con texto, Chelu lo ajusta y devuelve uno nuevo.
     */
    const launchSectorsForm = useCallback(
        (form: SectorsForm, question: string) => {
            replaceSectorsForm(form, { ...form, launched: true, accion: question ? 'revisar' : 'optimizar' });
            const { readOnly, launched, ...payload } = form;
            enviar(question, payload);
        },
        [enviar],
    );

    /**
     * Carga el formulario del mapa elegido (sin mapa, uno sin elegir) y sustituye con él al anterior, ya editable.
     * Se conserva el tipo de optimización si el mapa nuevo lo admite. Si el back falla, se relanza el error.
     */
    const changeSectorsFormMap = useCallback(async (form: SectorsForm, mapId?: number) => {
        const newForm = await fetchSectorsForm(mapId);
        const keepsMode = newForm.modo.opciones.includes(form.modo.valor);
        replaceSectorsForm(form, {
            ...newForm,
            // El GET no trae id: la tarjeta sigue siendo la misma.
            id_formulario: form.id_formulario,
            modo: keepsMode
                ? { ...newForm.modo, valor: form.modo.valor, asignacion_multiple: form.modo.asignacion_multiple }
                : newForm.modo,
        });
    }, []);

    /** Sustituye el formulario por su versión editada en la pantalla de edición. */
    const saveSectorsForm = useCallback(
        (form: SectorsForm, editedForm: SectorsForm) => replaceSectorsForm(form, editedForm),
        [],
    );

    return {
        mensajes,
        titulo,
        cargando,
        error,
        recargar,
        enviar,
        parar,
        stopping,
        respondiendo,
        votar,
        sendEmail,
        launchSectorsForm,
        changeSectorsFormMap,
        saveSectorsForm,
    };
}
