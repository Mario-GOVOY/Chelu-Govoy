import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

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

// Cada cuánto se recarga la lista mientras alguna responde sin que la siga la app.
const LIST_REFRESH_MS = 30_000;

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
    addNewChatToList: (id: string, question: string) => void;
    respondingChatIds: string[];
    setChatResponding: (id: string, responding: boolean) => void;
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

    // Empezadas en la app que el back aún no devuelve: las guarda al terminar la primera respuesta.
    const newChatsRef = useRef(new Map<string, ResumenChat>());

    // Pide la lista y la pone, con las nuevas que el back aún no devuelve. Si falla, lanza el error.
    const fetchList = useCallback(async () => {
        const lista = await obtenerChats();
        const missing: ResumenChat[] = [];
        for (const [id, chat] of newChatsRef.current) {
            if (lista.chats.some((c) => c.id === id)) newChatsRef.current.delete(id);
            else missing.push(chat);
        }
        setChats([...missing, ...lista.chats]);
        setFolders(lista.folders);
    }, []);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(false);
        try {
            await fetchList();
        } catch {
            setError(true);
        } finally {
            setCargando(false);
        }
    }, [fetchList]);

    // Para las recargas automáticas: sin indicador ni error; si falla, se queda la lista que había.
    const refreshQuietly = useCallback(async () => {
        try {
            await fetchList();
        } catch {
            // Se vuelve a intentar en la siguiente recarga.
        }
    }, [fetchList]);

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
            return [{ id, titulo: source.titulo, actualizado: Date.now(), folderId, inProgress: false }, ...prev];
        });
        return id;
    }, []);

    // Una conversación recién empezada se pone arriba sin esperar a recargar, para poder volver a ella
    // aunque siga respondiendo. El título es la pregunta, como el que pone el back.
    const addNewChatToList = useCallback((id: string, question: string) => {
        const text = question.trim();
        // Que está respondiendo lo dice respondingChatIds.
        const chat = { id, titulo: text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Nueva conversación', actualizado: Date.now(), folderId: null, inProgress: false };
        newChatsRef.current.set(id, chat);
        setChats((prev) => prev && !prev.some((c) => c.id === id) ? [chat, ...prev] : prev);
    }, []);

    // Conversaciones que están respondiendo: en la lista, con indicador y sin acciones hasta que terminen.
    const [respondingChatIds, setRespondingChatIds] = useState<string[]>([]);
    const setChatResponding = useCallback((id: string, responding: boolean) => {
        setRespondingChatIds((prev) => (responding ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));
        if (!responding) {
            // Al terminar, el back ya la tiene guardada: deja de hacer falta mantenerla al recargar.
            newChatsRef.current.delete(id);
            // Lo que dijo get_chats ya no vale: la respuesta ha acabado.
            setChats((prev) => prev && prev.map((c) => (c.id === id ? { ...c, inProgress: false } : c)));
        }
    }, []);

    // Al volver a primer plano se recarga: alguna respuesta puede haber empezado o acabado mientras tanto.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') refreshQuietly();
        });
        return () => subscription.remove();
    }, [refreshQuietly]);

    // Mientras alguna responde sin que la siga la app (se cerró a mitad, o se lanzó desde la web), se recarga para ver cuándo acaba.
    const hasUnfollowedAnswer = !!chats?.some((c) => c.inProgress && !respondingChatIds.includes(c.id));
    useEffect(() => {
        if (!hasUnfollowedAnswer) return;
        const interval = setInterval(() => {
            if (AppState.currentState === 'active') refreshQuietly();
        }, LIST_REFRESH_MS);
        return () => clearInterval(interval);
    }, [hasUnfollowedAnswer, refreshQuietly]);

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
            value={{ chats, folders, cargando, error, recargar, renameChat, duplicateChat, addNewChatToList, respondingChatIds, setChatResponding, createFolder, moveChatToFolder, renameFolder, deleteFolder }}
        >
            {children}
        </ConversacionesContext.Provider>
    );
}
