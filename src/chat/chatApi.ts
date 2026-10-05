import { authFetch } from '@/auth/authManager';
import { API_URL, API_URL_LOCAL } from '@/auth/Constants';

export type ResumenChat = {
    id: string;
    titulo: string;
    actualizado: number;
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
