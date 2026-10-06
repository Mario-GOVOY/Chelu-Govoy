import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { CopyPlus, MessageSquare, Trash2 } from 'lucide-react-native';

import { ResumenChat } from '@/chat/chatApi';
import { useColores } from '@/theme/ThemeProvider';
import { fechaRelativa } from '@/utils/fechas';

type Props = {
    chats: ResumenChat[] | null;
    error: boolean;
    activoId?: string;
    onReintentar: () => void;
    onAbrir: (chat: ResumenChat) => void;
    onDuplicar: (chat: ResumenChat) => void;
    onBorrar: (chat: ResumenChat) => void;
    ocupado?: { id: string; accion: 'duplicar' | 'borrar' } | null;
};

export function ListaConversaciones({ chats, error, activoId, onReintentar, onAbrir, onDuplicar, onBorrar, ocupado }: Props) {
    const colores = useColores();

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
        <FlatList
            data={chats}
            keyExtractor={(c) => c.id}
            contentContainerClassName="px-3 pb-2"
            ListEmptyComponent={<Text className="px-2 text-sm text-texto-tenue">Aún no hay conversaciones.</Text>}
            renderItem={({ item }) => {
                const activo = item.id === activoId;
                return (
                    <Pressable
                        onPress={() => onAbrir(item)}
                        className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${activo ? 'bg-primario-suave' : 'active:bg-fondo'}`}
                    >
                        <MessageSquare size={18} color={activo ? colores.primario : colores['texto-tenue']} />
                        <Text
                            className={`flex-1 text-base ${activo ? 'font-semibold text-primario' : 'text-texto'}`}
                            numberOfLines={1}
                        >
                            {item.titulo}
                        </Text>
                        <Text className="text-xs text-texto-tenue">{fechaRelativa(item.actualizado)}</Text>
                        <Pressable
                            onPress={() => onDuplicar(item)}
                            disabled={!!ocupado}
                            accessibilityRole="button"
                            accessibilityLabel="Duplicar conversación"
                            className="h-8 w-8 items-center justify-center"
                        >
                            {ocupado?.id === item.id && ocupado.accion === 'duplicar' ? (
                                <ActivityIndicator size={14} color={colores['texto-tenue']} />
                            ) : (
                                <CopyPlus size={16} color={colores['texto-tenue']} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => onBorrar(item)}
                            disabled={!!ocupado}
                            accessibilityRole="button"
                            accessibilityLabel="Borrar conversación"
                            className="-ml-2 h-8 w-8 items-center justify-center"
                        >
                            {ocupado?.id === item.id && ocupado.accion === 'borrar' ? (
                                <ActivityIndicator size={14} color={colores['texto-tenue']} />
                            ) : (
                                <Trash2 size={16} color={colores['texto-tenue']} />
                            )}
                        </Pressable>
                    </Pressable>
                );
            }}
        />
    );
}
