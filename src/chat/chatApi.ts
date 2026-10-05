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
