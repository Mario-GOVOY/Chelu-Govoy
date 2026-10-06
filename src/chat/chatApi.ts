import { fetch as fetchStreaming } from 'expo/fetch';

import { authFetch } from '@/auth/authManager';
import { API_URL } from '@/auth/Constants';

export type ResumenChat = {
    id: string;
    titulo: string;
    actualizado: number;
};

export type Mensaje = {
    id: string;
    rol: 'usuario' | 'chelu';
    texto: string;
    // Solo en la respuesta que se está recibiendo o que se acaba de recibir.
    estado?: 'escribiendo' | 'detenida' | 'error';
    herramientas?: Herramienta[];
};

// Tarjeta "Consultando…" de la respuesta. Las llamadas iguales se agrupan en una.
export type Herramienta = {
    clave: string;
    etiqueta: string;
    veces: number;
    enCurso: number;
};

export type Chat = {
    id: string;
    titulo: string;
    mensajes: Mensaje[];
};

// El back manda los tiempos en segundos.
const aMs = (ts?: number | null) => (ts == null ? Date.now() : ts < 1e12 ? ts * 1000 : ts);

export async function obtenerChats(): Promise<ResumenChat[]> {
    const respuesta = await authFetch(`${API_URL}chat-cex/get_chats`);
    if (!respuesta.ok) throw new Error(`get_chats ${respuesta.status}`);
    const json = await respuesta.json();
    const chats: any[] = Array.isArray(json?.chats) ? json.chats : [];
    return chats.map((c) => ({
        id: c.session_id,
        titulo: c.title || 'Conversación',
        actualizado: aMs(c.updated_at ?? c.created_at),
    }));
}

// Lanzar desde el formulario de sectores guarda esta línea de resumen; la web tampoco la pinta.
const esResumenFormulario = (texto: string) => /^Optimizar sectores —/.test(texto.trim());

export async function obtenerChat(id: string): Promise<Chat> {
    const respuesta = await authFetch(`${API_URL}chat-cex/get_chat?session_id=${encodeURIComponent(id)}`);
    if (!respuesta.ok) throw new Error(`get_chat ${respuesta.status}`);
    const json = await respuesta.json();
    const chat = json?.chat;
    const mensajes: any[] = Array.isArray(chat?.messages) ? chat.messages : [];
    return {
        id,
        titulo: chat?.title || 'Conversación',
        mensajes: mensajes.flatMap((m, i): Mensaje[] => {
            const texto = typeof m.content === 'string' ? m.content : '';
            if (!texto) return [];
            if (m.role === 'user' && !esResumenFormulario(texto)) return [{ id: String(i), rol: 'usuario', texto }];
            if (m.role === 'assistant') return [{ id: m.run_id ?? String(i), rol: 'chelu', texto }];
            return [];
        }),
    };
}

// Como la web. Más adelante, guardado en AsyncStorage y con selector para master.
const MODELO = 'deepseek-v4-flash';

// Eventos del stream que usa la app por ahora; el resto se ignoran.
export type EventoChat =
    | { tipo: 'session'; session_id: string }
    | { tipo: 'delta'; texto: string }
    | { tipo: 'tool'; fase: 'inicio' | 'fin'; nombre: string; args?: Record<string, unknown> }
    | { tipo: 'sugerencias'; preguntas: string[] }
    | { tipo: 'done'; run_id?: string }
    | { tipo: 'error'; detail?: string };

const TIPOS = ['session', 'delta', 'tool', 'sugerencias', 'done', 'error'];

/**
 * Manda una pregunta y va pasando a onEvento cada evento según llega.
 * Sin sessionId, el back crea una conversación nueva y devuelve su id en el evento 'session'.
 * Al abortar con signal, lanza un AbortError.
 */
export async function enviarMensaje({ pregunta, sessionId, signal, onEvento }: {
    pregunta: string;
    sessionId?: string;
    signal?: AbortSignal;
    onEvento: (evento: EventoChat) => void;
}): Promise<void> {
    const respuesta = await authFetch(
        `${API_URL}chat-cex/stream`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pregunta,
                session_id: sessionId,
                modelo: MODELO,
                incluir_herramientas: true,
                incluir_metricas: false,
            }),
            signal,
        },
        fetchStreaming,
    );
    if (!respuesta.ok || !respuesta.body) throw new Error(`stream ${respuesta.status}`);

    // Cada evento llega como "data: {json}\n\n"; un trozo puede traer varios o cortar uno a medias.
    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = '';
    while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        pendiente += decodificador.decode(value, { stream: true });
        const bloques = pendiente.split('\n\n');
        pendiente = bloques.pop() ?? '';
        for (const bloque of bloques) {
            const linea = bloque.split('\n').find((l) => l.startsWith('data:'));
            if (!linea) continue;
            try {
                const evento = JSON.parse(linea.slice(5));
                if (TIPOS.includes(evento?.tipo)) onEvento(evento);
            } catch {
                // Línea mal formada: se salta, como en la web.
            }
        }
    }
}
