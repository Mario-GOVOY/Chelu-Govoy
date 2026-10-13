import { memo, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { MessageSquare, MoreHorizontal } from 'lucide-react-native';

import type { ResumenChat } from '@/types/Chat';
import { useColores } from '@/theme/ThemeProvider';
import { fechaRelativa } from '@/utils/fechas';

type Props = {
    chats: ResumenChat[] | null;
    error: boolean;
    activoId?: string;
    onReintentar: () => void;
    onAbrir: (chat: ResumenChat) => void;
    onOpenActions: (chat: ResumenChat) => void;
    // Conversación con una acción en curso (duplicar, eliminar…).
    busyChatId: string | null;
};

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
    activo,
    busy,
    disabled,
    onAbrir,
    onOpenActions,
}: RowProps) {
    const colores = useColores();
    const chat = { id, titulo, actualizado };
    return (
        <Pressable
            onPress={() => onAbrir(chat)}
            onLongPress={disabled ? undefined : () => onOpenActions(chat)}
            className={`flex-row items-center gap-3 rounded-xl py-3 pl-3 pr-1 ${activo ? 'bg-primario-suave' : 'active:bg-fondo'}`}
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

export function ListaConversaciones({ chats, error, activoId, onReintentar, onAbrir, onOpenActions, busyChatId }: Props) {
    const colores = useColores();
    const listRef = useRef<FlashListRef<ResumenChat>>(null);
    // Ids de la lista anterior, para saber si al recargar ha llegado alguna conversación nueva.
    const previousIdsRef = useRef<Set<string> | null>(null);

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

    return (
        <FlashList
            ref={listRef}
            // Sin él, al entrar una conversación arriba la lista se queda donde estaba y la nueva queda oculta encima.
            maintainVisibleContentPosition={{ disabled: true }}
            data={chats}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            ListEmptyComponent={<Text className="px-2 text-sm text-texto-tenue">Aún no hay conversaciones.</Text>}
            renderItem={({ item }) => (
                <ConversationRow
                    {...item}
                    activo={item.id === activoId}
                    busy={busyChatId === item.id}
                    disabled={!!busyChatId}
                    onAbrir={onAbrir}
                    onOpenActions={onOpenActions}
                />
            )}
        />
    );
}
