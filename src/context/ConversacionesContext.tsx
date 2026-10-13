import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { duplicarChat, obtenerChats, renameChat as renameChatApi } from '@/chat/chatApi';
import type { ResumenChat } from '@/types/Chat';

// Conversación de la que se duplica (puede no estar aún en la lista).
type ChatSource = Pick<ResumenChat, 'id' | 'titulo'>;

type ConversacionesContextType = {
    chats: ResumenChat[] | null;
    cargando: boolean;
    error: boolean;
    recargar: () => Promise<void>;
    renameChat: (chat: ResumenChat, title: string) => Promise<void>;
    // Devuelve el id de la copia. Con untilRunId, la copia acaba en esa respuesta.
    duplicateChat: (source: ChatSource, untilRunId?: string) => Promise<string>;
};

const ConversacionesContext = createContext<ConversacionesContextType | null>(null);

// La lista de conversaciones la usan el menú lateral y la cabecera del chat (su título).
export function useConversaciones() {
    const contexto = useContext(ConversacionesContext);
    if (!contexto) throw new Error('useConversaciones se usa fuera de ConversacionesProvider');
    return contexto;
}

export function ConversacionesProvider({ children }: { children: ReactNode }) {
    const [chats, setChats] = useState<ResumenChat[] | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(false);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(false);
        try {
            setChats(await obtenerChats());
        } catch {
            setError(true);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        recargar();
    }, [recargar]);

    // Se pinta al momento; si el back falla, vuelve el título anterior y se lanza el error.
    const renameChat = useCallback(async (chat: ResumenChat, title: string) => {
        const setTitle = (titulo: string) =>
            setChats((prev) => prev && prev.map((c) => (c.id === chat.id ? { ...c, titulo } : c)));
        setTitle(title);
        try {
            setTitle(await renameChatApi(chat.id, title));
        } catch (e) {
            setTitle(chat.titulo);
            throw e;
        }
    }, []);

    // La copia conserva el título de la original: se pone arriba de la lista sin esperar a recargarla.
    const duplicateChat = useCallback(async (source: ChatSource, untilRunId?: string) => {
        const id = await duplicarChat(source.id, untilRunId);
        setChats((prev) => prev && [{ id, titulo: source.titulo, actualizado: Date.now() }, ...prev]);
        return id;
    }, []);

    return (
        <ConversacionesContext.Provider value={{ chats, cargando, error, recargar, renameChat, duplicateChat }}>
            {children}
        </ConversacionesContext.Provider>
    );
}
