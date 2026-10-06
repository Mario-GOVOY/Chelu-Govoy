import { useCallback, useEffect, useRef, useState } from 'react';

import { enviarMensaje, EventoChat, Herramienta, Mensaje, obtenerChat } from '@/chat/chatApi';
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

    const enviar = useCallback(
        async (pregunta: string) => {
            const controlador = new AbortController();
            abortRef.current = controlador;
            const idChelu = `chelu-${Date.now()}`;
            setMensajes((prev) => [
                ...prev,
                { id: `usuario-${Date.now()}`, rol: 'usuario', texto: pregunta },
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
                        } else if (evento.tipo === 'done') {
                            runId = evento.run_id;
                        } else if (evento.tipo === 'error') {
                            fallo = true;
                        }
                    },
                });
                actualizar({ texto, runId, estado: fallo ? 'error' : undefined });
            } catch {
                actualizar({ texto, estado: controlador.signal.aborted ? 'detenida' : 'error' });
            } finally {
                if (abortRef.current === controlador) abortRef.current = null;
                setRespondiendo(false);
            }
        },
        [chatId, onCreada],
    );

    const parar = useCallback(() => abortRef.current?.abort(), []);
    const reintentar = useCallback(() => setIntento((n) => n + 1), []);

    return { mensajes, titulo, cargando, error, reintentar, enviar, parar, respondiendo };
}
