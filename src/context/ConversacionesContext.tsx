import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import {
    createFolder as createFolderApi,
    deleteFolder as deleteFolderApi,
    duplicarChat,
    moveChatToFolder as moveChatToFolderApi,
    obtenerChats,
    renameChat as renameChatApi,
    renameFolder as renameFolderApi,
} from '@/chat/chatApi';
import type { ChatFolder, ResumenChat } from '@/types/Chat';

// Conversación de la que se duplica (puede no estar aún en la lista).
type ChatSource = Pick<ResumenChat, 'id' | 'titulo'>;

type ConversacionesContextType = {
    chats: ResumenChat[] | null;
    folders: ChatFolder[];
    cargando: boolean;
    error: boolean;
    recargar: () => Promise<void>;
    renameChat: (chat: ResumenChat, title: string) => Promise<void>;
    // Devuelve el id de la copia. Con untilRunId, la copia acaba en esa respuesta.
    duplicateChat: (source: ChatSource, untilRunId?: string) => Promise<string>;
    createFolder: (name: string) => Promise<ChatFolder>;
    // folderId null saca la conversación de su carpeta.
    moveChatToFolder: (chat: ResumenChat, folderId: number | null) => Promise<void>;
    renameFolder: (folder: ChatFolder, name: string) => Promise<void>;
    // Devuelve los ids de las conversaciones eliminadas con la carpeta.
    deleteFolder: (folder: ChatFolder, withChats: boolean) => Promise<string[]>;
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
    const [folders, setFolders] = useState<ChatFolder[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(false);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(false);
        try {
            const lista = await obtenerChats();
            setChats(lista.chats);
            setFolders(lista.folders);
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

    // La copia conserva el título y la carpeta de la original: se pone arriba de la lista sin esperar a recargarla.
    const duplicateChat = useCallback(async (source: ChatSource, untilRunId?: string) => {
        const id = await duplicarChat(source.id, untilRunId);
        setChats((prev) => {
            if (!prev) return prev;
            const folderId = prev.find((c) => c.id === source.id)?.folderId ?? null;
            return [{ id, titulo: source.titulo, actualizado: Date.now(), folderId }, ...prev];
        });
        return id;
    }, []);

    const createFolder = useCallback(async (name: string) => {
        const folder = await createFolderApi(name);
        setFolders((prev) => [...prev, folder]);
        return folder;
    }, []);

    // Como renameChat: se pinta al momento y, si el back falla, vuelve a su carpeta anterior.
    const moveChatToFolder = useCallback(async (chat: ResumenChat, folderId: number | null) => {
        const setFolder = (newFolderId: number | null) =>
            setChats((prev) => prev && prev.map((c) => (c.id === chat.id ? { ...c, folderId: newFolderId } : c)));
        setFolder(folderId);
        try {
            await moveChatToFolderApi(chat.id, folderId);
        } catch (e) {
            setFolder(chat.folderId);
            throw e;
        }
    }, []);

    // Como renameChat: se pinta al momento y, si el back falla, vuelve el nombre anterior.
    const renameFolder = useCallback(async (folder: ChatFolder, name: string) => {
        const setName = (newName: string) =>
            setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: newName } : f)));
        setName(name);
        try {
            setName(await renameFolderApi(folder.id, name));
        } catch (e) {
            setName(folder.name);
            throw e;
        }
    }, []);

    // Las conversaciones que no se eliminan con la carpeta pasan a sueltas.
    const deleteFolder = useCallback(async (folder: ChatFolder, withChats: boolean) => {
        const deletedChatIds = await deleteFolderApi(folder.id, withChats);
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        setChats((prev) => prev && prev
            .filter((c) => !deletedChatIds.includes(c.id))
            .map((c) => (c.folderId === folder.id ? { ...c, folderId: null } : c)));
        return deletedChatIds;
    }, []);

    return (
        <ConversacionesContext.Provider
            value={{ chats, folders, cargando, error, recargar, renameChat, duplicateChat, createFolder, moveChatToFolder, renameFolder, deleteFolder }}
        >
            {children}
        </ConversacionesContext.Provider>
    );
}
