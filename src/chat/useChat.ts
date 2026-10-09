import { useCallback, useEffect, useRef, useState } from 'react';

import {
    enviarMensaje,
    EventoChat,
    fetchSectorsForm,
    obtenerChat,
    sendEmail as sendEmailApi,
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

/**
 * Mensajes de una conversación (o de una nueva, sin chatId) y envío de preguntas.
 * @param onCreada se llama con el id que da el back al empezar una conversación nueva.
 */
export function useChat(chatId: string | undefined, onCreada: (id: string) => void) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [titulo, setTitulo] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(false);
    const [intento, setIntento] = useState(0);
    const [respondiendo, setRespondiendo] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    // Id de la conversación que acaba de crear un envío: ya está en pantalla, no hay que cargarla.
    const creadaRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (chatId && chatId === creadaRef.current) {
            creadaRef.current = undefined;
            return;
        }
        abortRef.current?.abort();
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
            })
            .catch(() => {
                if (!vigente) return;
                setError(true);
                setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [chatId, intento]);

    // Al salir de la pantalla se corta la respuesta en curso.
    useEffect(() => () => abortRef.current?.abort(), []);

    // Con sectorsForm y sin pregunta se lanza la optimización de sectores y no se pinta mensaje del usuario.
    const enviar = useCallback(
        async (pregunta: string, sectorsForm?: SectorsFormPayload) => {
            const controlador = new AbortController();
            abortRef.current = controlador;
            const idChelu = `chelu-${Date.now()}`;
            const mensajeUsuario: Mensaje[] = pregunta ? [{ id: `usuario-${Date.now()}`, rol: 'usuario', texto: pregunta }] : [];
            setMensajes((prev) => [
                ...prev,
                ...mensajeUsuario,
                { id: idChelu, rol: 'chelu', texto: '', estado: 'escribiendo' },
            ]);
            setRespondiendo(true);

            // Se actualiza por id: si entretanto se cambió de conversación, no encuentra nada que tocar.
            const actualizar = (cambios: Partial<Mensaje>) =>
                setMensajes((prev) => prev.map((m) => (m.id === idChelu ? { ...m, ...cambios } : m)));

            // Los trozos llegan muy seguidos: se pinta como mucho una vez por fotograma.
            let texto = '';
            let pintadoPendiente = false;
            let fallo = false;
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

            try {
                await enviarMensaje({
                    pregunta,
                    sessionId: chatId,
                    sectorsForm,
                    signal: controlador.signal,
                    onEvento: (evento) => {
                        if (evento.tipo === 'session' && !chatId && !controlador.signal.aborted) {
                            creadaRef.current = evento.session_id;
                            setTitulo(pregunta);
                            onCreada(evento.session_id);
                        } else if (evento.tipo === 'delta') {
                            texto += evento.texto;
                            if (!pintadoPendiente) {
                                pintadoPendiente = true;
                                requestAnimationFrame(() => {
                                    pintadoPendiente = false;
                                    actualizar({ texto });
                                });
                            }
                        } else if (evento.tipo === 'tool') {
                            herramienta(evento);
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
                        } else if (evento.tipo === 'error') {
                            fallo = true;
                        }
                    },
                });
                // Las sugerencias se muestran al acabar, no según llegan.
                actualizar({ texto, runId, sugerencias, progress: undefined, estado: fallo ? 'error' : undefined });
            } catch {
                actualizar({ texto, progress: undefined, estado: controlador.signal.aborted ? 'detenida' : 'error' });
            } finally {
                if (abortRef.current === controlador) abortRef.current = null;
                setRespondiendo(false);
            }
        },
        [chatId, onCreada],
    );

    const parar = useCallback(() => abortRef.current?.abort(), []);
    const recargar = useCallback(() => setIntento((n) => n + 1), []);

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

    /** Lanza la optimización con el formulario tal cual y lo marca como lanzado en su mensaje. */
    const launchSectorsForm = useCallback(
        (form: SectorsForm) => {
            replaceSectorsForm(form, { ...form, launched: true });
            const { readOnly, launched, ...payload } = form;
            enviar('', payload);
        },
        [enviar],
    );

    /**
     * Carga el formulario del mapa elegido y sustituye con él al anterior, ya editable.
     * Se conserva el tipo de optimización si el mapa nuevo lo admite. Si el back falla, se relanza el error.
     */
    const changeSectorsFormMap = useCallback(async (form: SectorsForm, mapId: number) => {
        const newForm = await fetchSectorsForm(mapId);
        const keepsMode = newForm.modo.opciones.includes(form.modo.valor);
        replaceSectorsForm(form, {
            ...newForm,
            modo: keepsMode
                ? { ...newForm.modo, valor: form.modo.valor, asignacion_multiple: form.modo.asignacion_multiple }
                : newForm.modo,
        });
    }, []);

    return {
        mensajes,
        titulo,
        cargando,
        error,
        recargar,
        enviar,
        parar,
        respondiendo,
        votar,
        sendEmail,
        launchSectorsForm,
        changeSectorsFormMap,
    };
}
