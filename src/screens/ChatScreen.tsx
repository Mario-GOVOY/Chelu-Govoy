import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { Menu, RefreshCw } from 'lucide-react-native';

import { duplicarChat } from '@/chat/chatApi';
import { useChat } from '@/chat/useChat';
import { BurbujaMensaje } from '@/components/BurbujaMensaje';
import { CajaMensaje } from '@/components/CajaMensaje';
import { CheluAvatar } from '@/components/CheluAvatar';
import { Boton } from '@/components/ui/Boton';
import { Pantalla } from '@/components/ui/Pantalla';
import { AppDrawerParamList } from '@/navigation/AppNavigator';
import { useColores } from '@/theme/ThemeProvider';
import { useSesionActiva } from '@/context/SesionContext';

type Props = DrawerScreenProps<AppDrawerParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
    const colores = useColores();
    const { sesion } = useSesionActiva();
    const chatId = route.params?.chatId;
    // Al crearse la conversación se pone su id en la ruta, para que el menú la marque como activa.
    const alCrearse = useCallback((id: string) => navigation.setParams({ chatId: id }), [navigation]);
    const { mensajes, titulo, cargando, error, recargar, enviar, parar, respondiendo } = useChat(chatId, alCrearse);

    // La lista va invertida para que empiece abajo, en el último mensaje.
    const invertidos = useMemo(() => [...mensajes].reverse(), [mensajes]);

    // La copia la hace el back; aquí solo se abre. La conversación actual no cambia.
    // Respuesta desde la que se está duplicando, para pintar su botón cargando.
    const [duplicando, setDuplicando] = useState<string | null>(null);
    const duplicarDesde = (runId: string) => {
        if (!chatId || duplicando) return;
        Alert.alert('Duplicar desde aquí', 'Se creará una conversación nueva hasta esta respuesta.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Duplicar',
                onPress: async () => {
                    setDuplicando(runId);
                    try {
                        navigation.setParams({ chatId: await duplicarChat(chatId, runId) });
                    } catch {
                        Alert.alert('No se pudo duplicar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setDuplicando(null);
                    }
                },
            },
        ]);
    };

    const cabecera = chatId ? titulo ?? '' : 'Nueva conversación';

    return (
        <Pantalla margenInferior={false}>
            <View className="h-14 flex-row items-center gap-2 border-b border-borde bg-superficie px-2">
                <Pressable
                    onPress={() => navigation.openDrawer()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir menú"
                    className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                >
                    <Menu size={24} color={colores.texto} />
                </Pressable>
                <Text className="flex-1 text-lg font-semibold text-texto" numberOfLines={1}>
                    {cabecera}
                </Text>
                {/* Vuelve a pedir la conversación al back; con una respuesta en curso no, porque la cortaría. */}
                {chatId && (
                    <Pressable
                        onPress={recargar}
                        disabled={cargando || respondiendo}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Actualizar conversación"
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                    >
                        {cargando ? (
                            <ActivityIndicator size="small" color={colores['texto-secundario']} />
                        ) : (
                            <RefreshCw size={20} color={respondiendo ? colores['texto-tenue'] : colores['texto-secundario']} />
                        )}
                    </Pressable>
                )}
            </View>

            <KeyboardAvoidingView behavior="padding" className="flex-1">
                {error ? (
                    <View className="flex-1 items-center justify-center gap-4 px-8">
                        <Text className="text-center text-base text-texto-secundario">No se pudo cargar la conversación.</Text>
                        <Boton texto="Reintentar" variante="secundario" onPress={recargar} />
                    </View>
                ) : cargando ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colores.primario} />
                    </View>
                ) : mensajes.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <View className="h-32 w-28">
                            <CheluAvatar />
                        </View>
                        <Text className="mt-4 text-2xl font-bold text-texto">¿En qué te ayudo <Text className="text-primario">hoy</Text>?</Text>
                        <Text className="mt-2 text-center text-base text-texto-secundario">
                            Pregúntame en chat CHELU sobre rutas, alertas, paradas, proveedores, depots, recogidas o PUDOS de {sesion.nombreEmpresa}.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        inverted
                        data={invertidos}
                        keyExtractor={(m) => m.id}
                        contentContainerClassName="gap-5 px-4 py-4"
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <BurbujaMensaje
                                mensaje={item}
                                // Solo respuestas guardadas y completas: las detenidas o con error no tienen turno en el back.
                                onDuplicarDesde={item.runId && !item.estado && !respondiendo
                                    ? () => duplicarDesde(item.runId!)
                                    : undefined}
                                duplicando={!!item.runId && item.runId === duplicando}
                            />
                        )}
                    />
                )}
                <CajaMensaje
                    onEnviar={enviar}
                    onParar={parar}
                    respondiendo={respondiendo}
                    desactivada={cargando || error}
                />
            </KeyboardAvoidingView>
        </Pantalla>
    );
}
