import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { ChevronRight, Folder, FolderOpen, MessageSquare, MoreHorizontal } from 'lucide-react-native';

import type { ChatFolder, ResumenChat } from '@/types/Chat';
import { useColores } from '@/theme/ThemeProvider';
import { fechaRelativa } from '@/utils/fechas';

type Props = {
    chats: ResumenChat[] | null;
    folders: ChatFolder[];
    error: boolean;
    activoId?: string;
    onReintentar: () => void;
    onAbrir: (chat: ResumenChat) => void;
    onOpenActions: (chat: ResumenChat) => void;
    // Conversación con una acción en curso (duplicar, eliminar…).
    busyChatId: string | null;
};

// Campos sueltos y no el objeto, que es nuevo en cada recarga: así memo evita repintar las filas.
type RowProps = ResumenChat & {
    activo: boolean;
    busy: boolean;
    disabled: boolean;
    onAbrir: (chat: ResumenChat) => void;
    onOpenActions: (chat: ResumenChat) => void;
};

const ConversationRow = memo(function ConversationRow({
    id,
    titulo,
    actualizado,
    folderId,
    activo,
    busy,
    disabled,
    onAbrir,
    onOpenActions,
}: RowProps) {
    const colores = useColores();
    const chat = { id, titulo, actualizado, folderId };
    return (
        <Pressable
            onPress={() => onAbrir(chat)}
            onLongPress={disabled ? undefined : () => onOpenActions(chat)}
            className={`flex-row items-center gap-3 rounded-xl py-3 pr-1 ${folderId === null ? 'pl-3' : 'pl-9'} ${activo ? 'bg-primario-suave' : 'active:bg-fondo'}`}
        >
            <MessageSquare size={18} color={activo ? colores.primario : colores['texto-tenue']} />
            <Text className={`flex-1 text-base ${activo ? 'font-semibold text-primario' : 'text-texto'}`} numberOfLines={1}>
                {titulo}
            </Text>
            <Text className="text-xs text-texto-tenue">{fechaRelativa(actualizado)}</Text>
            <Pressable
                onPress={() => onOpenActions(chat)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Más opciones"
                className="-ml-1 h-8 w-8 items-center justify-center rounded-full active:bg-borde"
            >
                {busy ? (
                    <ActivityIndicator size={14} color={colores['texto-tenue']} />
                ) : (
                    <MoreHorizontal size={18} color={colores['texto-tenue']} />
                )}
            </Pressable>
        </Pressable>
    );
});

export function ListaConversaciones({
    chats,
    folders,
    error,
    activoId,
    onReintentar,
    onAbrir,
    onOpenActions,
    busyChatId,
}: Props) {
    const colores = useColores();
    const listRef = useRef<FlashListRef<ResumenChat>>(null);
    // Ids de la lista anterior, para saber si al recargar ha llegado alguna conversación nueva.
    const previousIdsRef = useRef<Set<string> | null>(null);
    const [openFolderIds, setOpenFolderIds] = useState<number[]>([]);

    const toggleFolder = useCallback((folderId: number) => {
        setOpenFolderIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]));
    }, []);

    // Abrir una conversación que está en una carpeta plegada la despliega, para que se vea marcada.
    const activeFolderId = chats?.find((chat) => chat.id === activoId)?.folderId ?? null;
    useEffect(() => {
        if (activeFolderId !== null) setOpenFolderIds((prev) => (prev.includes(activeFolderId) ? prev : [...prev, activeFolderId]));
    }, [activeFolderId]);

    // Si hay alguna nueva, la lista sube arriba, donde aparecen las más recientes.
    useEffect(() => {
        if (!chats) return;
        const previousIds = previousIdsRef.current;
        if (previousIds && chats.some((chat) => !previousIds.has(chat.id))) {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
        previousIdsRef.current = new Set(chats.map((chat) => chat.id));
    }, [chats]);

    if (chats === null) {
        if (error) {
            return (
                <Pressable onPress={onReintentar} className="px-5 py-2">
                    <Text className="text-sm text-peligro">No se pudieron cargar. Toca para reintentar.</Text>
                </Pressable>
            );
        }
        return <ActivityIndicator className="mt-4" color={colores.primario} />;
    }

    const renderChat = (chat: ResumenChat) => (
        <ConversationRow
            key={chat.id}
            {...chat}
            activo={chat.id === activoId}
            busy={busyChatId === chat.id}
            disabled={!!busyChatId}
            onAbrir={onAbrir}
            onOpenActions={onOpenActions}
        />
    );

    const looseChats = chats.filter((chat) => chat.folderId === null);

    // Las carpetas, con sus conversaciones debajo si están abiertas, van encima de las sueltas.
    const folderSections = folders.map((folder) => {
        const folderChats = chats.filter((chat) => chat.folderId === folder.id);
        const open = openFolderIds.includes(folder.id);
        const FolderIcon = open ? FolderOpen : Folder;
        return (
            <View key={folder.id}>
                <Pressable
                    onPress={() => toggleFolder(folder.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    className="flex-row items-center gap-2 rounded-xl py-3 pl-1 pr-3 active:bg-fondo"
                >
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                        <ChevronRight size={16} color={colores['texto-tenue']} />
                    </View>
                    <FolderIcon size={18} color={colores.primario} />
                    <Text className="flex-1 text-base font-semibold text-texto" numberOfLines={1}>
                        {folder.name}
                    </Text>
                    <Text className="text-xs text-texto-tenue">{folderChats.length}</Text>
                </Pressable>
                {open && folderChats.length === 0 && <Text className="py-2 pl-9 text-sm text-texto-tenue">Carpeta vacía.</Text>}
                {open && folderChats.map(renderChat)}
            </View>
        );
    });

    return (
        <FlashList
            ref={listRef}
            // Sin él, al entrar una conversación arriba la lista se queda donde estaba y la nueva queda oculta encima.
            maintainVisibleContentPosition={{ disabled: true }}
            data={looseChats}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            ListHeaderComponent={
                folders.length > 0 ? (
                    <>
                        {folderSections}
                        {looseChats.length > 0 && <View className="mx-2 my-2 h-px bg-borde" />}
                    </>
                ) : null
            }
            ListEmptyComponent={
                folders.length === 0 ? <Text className="px-2 text-sm text-texto-tenue">Aún no hay conversaciones.</Text> : null
            }
            renderItem={({ item }) => renderChat(item)}
        />
    );
}
