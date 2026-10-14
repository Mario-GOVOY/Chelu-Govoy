import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { ChevronRight, Folder, FolderOpen, MessageSquare, MoreHorizontal, Search, X } from 'lucide-react-native';

import { ConversationListSkeleton } from '@/components/Spinners/ConversationListSkeleton';
import type { ChatFolder, ResumenChat } from '@/types/Chat';
import { useColores } from '@/theme/ThemeProvider';
import { fechaRelativa } from '@/utils/fechas';
import { normalizeForSearch } from '@/utils/text';

type Props = {
    chats: ResumenChat[] | null;
    folders: ChatFolder[];
    error: boolean;
    activoId?: string;
    onReintentar: () => void;
    onAbrir: (chat: ResumenChat) => void;
    onOpenActions: (chat: ResumenChat) => void;
    // Sin él, las carpetas no tienen "⋯" (empresa sin carpetas).
    onOpenFolderActions?: (folder: ChatFolder) => void;
    // Conversación con una acción en curso (duplicar, eliminar…).
    busyChatId: string | null;
};

// Campos sueltos y no el objeto, que es nuevo en cada recarga: así memo evita repintar las filas.
type RowProps = ResumenChat & {
    // Con sangría bajo su carpeta; en los resultados de búsqueda, sin ella.
    indented: boolean;
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
    indented,
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
            className={`flex-row items-center gap-3 rounded-xl py-3 pr-1 ${indented ? 'pl-9' : 'pl-3'} ${activo ? 'bg-primario-suave' : 'active:bg-fondo'}`}
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
    onOpenFolderActions,
    busyChatId,
}: Props) {
    const colores = useColores();
    const listRef = useRef<FlashListRef<ResumenChat>>(null);
    // Ids de la lista anterior, para saber si al recargar ha llegado alguna conversación nueva.
    const previousIdsRef = useRef<Set<string> | null>(null);
    const [openFolderIds, setOpenFolderIds] = useState<number[]>([]);
    const [query, setQuery] = useState('');

    // Al abrir una conversación se limpia la búsqueda.
    const openChat = useCallback(
        (chat: ResumenChat) => {
            setQuery('');
            onAbrir(chat);
        },
        [onAbrir],
    );

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
        return <ConversationListSkeleton />;
    }

    const searchText = normalizeForSearch(query.trim());
    const searching = searchText !== '';

    const renderChat = (chat: ResumenChat) => (
        <ConversationRow
            key={chat.id}
            {...chat}
            indented={!searching && chat.folderId !== null}
            activo={chat.id === activoId}
            busy={busyChatId === chat.id}
            disabled={!!busyChatId}
            onAbrir={openChat}
            onOpenActions={onOpenActions}
        />
    );

    // Buscando, una sola lista con todas las que coinciden, estén o no en una carpeta.
    const listChats = searching
        ? chats.filter((chat) => normalizeForSearch(chat.titulo).includes(searchText))
        : chats.filter((chat) => chat.folderId === null);
    const showFolders = !searching && folders.length > 0;

    // Las carpetas, con sus conversaciones debajo si están abiertas, van encima de las sueltas.
    const folderSections = folders.map((folder) => {
        const folderChats = chats.filter((chat) => chat.folderId === folder.id);
        const open = openFolderIds.includes(folder.id);
        const FolderIcon = open ? FolderOpen : Folder;
        return (
            <View key={folder.id}>
                <Pressable
                    onPress={() => toggleFolder(folder.id)}
                    onLongPress={onOpenFolderActions && (() => onOpenFolderActions(folder))}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    className={`flex-row items-center gap-2 rounded-xl py-3 pl-1 active:bg-fondo ${onOpenFolderActions ? 'pr-1' : 'pr-3'}`}
                >
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                        <ChevronRight size={16} color={colores['texto-tenue']} />
                    </View>
                    <FolderIcon size={18} color={colores.primario} />
                    <Text className="flex-1 text-base font-semibold text-texto" numberOfLines={1}>
                        {folder.name}
                    </Text>
                    <Text className="text-xs text-texto-tenue">{folderChats.length}</Text>
                    {onOpenFolderActions && (
                        <Pressable
                            onPress={() => onOpenFolderActions(folder)}
                            accessibilityRole="button"
                            accessibilityLabel="Más opciones de la carpeta"
                            className="-ml-1 h-8 w-8 items-center justify-center rounded-full active:bg-borde"
                        >
                            <MoreHorizontal size={18} color={colores['texto-tenue']} />
                        </Pressable>
                    )}
                </Pressable>
                {open && folderChats.length === 0 && <Text className="py-2 pl-9 text-sm text-texto-tenue">Carpeta vacía.</Text>}
                {open && folderChats.map(renderChat)}
            </View>
        );
    });

    return (
        <View className="flex-1">
            <View className="mx-3 mb-1 h-10 flex-row items-center gap-2 rounded-xl bg-fondo pl-3">
                <Search size={16} color={colores['texto-tenue']} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar conversaciones"
                    placeholderTextColor={colores['texto-tenue']}
                    returnKeyType="search"
                    className="flex-1 py-0 text-base text-texto"
                />
                {query !== '' && (
                    <Pressable
                        onPress={() => setQuery('')}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar búsqueda"
                        className="h-10 w-10 items-center justify-center"
                    >
                        <X size={16} color={colores['texto-tenue']} />
                    </Pressable>
                )}
            </View>
            <FlashList
                ref={listRef}
                // Sin él, al entrar una conversación arriba la lista se queda donde estaba y la nueva queda oculta encima.
                maintainVisibleContentPosition={{ disabled: true }}
                // Con el teclado abierto, el primer toque abre la conversación en vez de solo cerrarlo.
                keyboardShouldPersistTaps="handled"
                data={listChats}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
                ListHeaderComponent={
                    showFolders ? (
                        <>
                            {folderSections}
                            {listChats.length > 0 && <View className="mx-2 my-2 h-px bg-borde" />}
                        </>
                    ) : null
                }
                ListEmptyComponent={
                    searching ? (
                        <Text className="px-2 py-2 text-sm text-texto-tenue">No hay conversaciones que coincidan.</Text>
                    ) : folders.length === 0 ? (
                        <Text className="px-2 text-sm text-texto-tenue">Aún no hay conversaciones.</Text>
                    ) : null
                }
                renderItem={({ item }) => renderChat(item)}
            />
        </View>
    );
}
