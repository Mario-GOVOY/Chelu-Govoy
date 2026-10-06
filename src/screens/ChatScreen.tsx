import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { Menu } from 'lucide-react-native';

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
    const { mensajes, titulo, cargando, error, reintentar, enviar, parar, respondiendo } = useChat(chatId, alCrearse);

    // La lista va invertida para que empiece abajo, en el último mensaje.
    const invertidos = useMemo(() => [...mensajes].reverse(), [mensajes]);

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
            </View>

            <KeyboardAvoidingView behavior="padding" className="flex-1">
                {error ? (
                    <View className="flex-1 items-center justify-center gap-4 px-8">
                        <Text className="text-center text-base text-texto-secundario">No se pudo cargar la conversación.</Text>
                        <Boton texto="Reintentar" variante="secundario" onPress={reintentar} />
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
                        renderItem={({ item }) => <BurbujaMensaje mensaje={item} />}
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
