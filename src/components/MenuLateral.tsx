import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { LogOut, Moon, Plus, RefreshCw, Sun, UserRoundX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borrarChat, duplicarChat } from '@/chat/chatApi';
import { useConversaciones } from '@/chat/useConversaciones';
import { CheluAvatar } from '@/components/CheluAvatar';
import { ListaConversaciones } from '@/components/ListaConversaciones';
import { useSesion, useSesionActiva } from '@/context/SesionContext';
import type { AppDrawerParamList } from '@/navigation/AppNavigator';
import type { ResumenChat } from '@/types/Chat';
import { useColores, useTema } from '@/theme/ThemeProvider';

const ROLES: Record<string, string> = {
    administrador: 'Administrador',
    jefeDeOperaciones: 'Jefe de operaciones',
};

function OpcionMenu({ texto, icono: Icono, onPress, peligro = false }: {
    texto: string;
    icono: typeof LogOut;
    onPress: () => void;
    peligro?: boolean;
}) {
    const colores = useColores();
    return (
        <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-fondo">
            <Icono size={20} color={peligro ? colores.peligro : colores['texto-secundario']} />
            <Text className={`text-base ${peligro ? 'text-peligro' : 'text-texto'}`}>{texto}</Text>
        </Pressable>
    );
}

export function MenuLateral({ navigation, state }: DrawerContentComponentProps) {
    const insets = useSafeAreaInsets();
    const colores = useColores();
    const { esquema, setEsquema } = useTema();
    const { salirDeSuplantacion, cerrarSesion } = useSesion();
    const { sesion, staff } = useSesionActiva();
    const isMenuOpen = useDrawerStatus() === 'open';
    const conversaciones = useConversaciones();
    const { chats, recargar } = conversaciones;
    const chatActivo = (state.routes[state.index].params as AppDrawerParamList['Chat'])?.chatId;

    useEffect(() => {
        if (isMenuOpen && chatActivo && chats && !chats.some((chat) => chat.id === chatActivo)) recargar();
    }, [isMenuOpen]);

    const abrirChat = useCallback(
        (chatId?: string) => {
            navigation.navigate('Chat', { chatId });
            navigation.closeDrawer();
        },
        [navigation],
    );

    const openChatFromList = useCallback((chat: ResumenChat) => abrirChat(chat.id), [abrirChat]);

    // Acción en curso sobre una conversación, para pintar su icono cargando.
    const [ocupado, setOcupado] = useState<{ id: string; accion: 'duplicar' | 'borrar' } | null>(null);

    const duplicar = useCallback((chat: ResumenChat) => {
        Alert.alert('Duplicar conversación', `Se creará una copia de «${chat.titulo}».`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Duplicar',
                onPress: async () => {
                    setOcupado({ id: chat.id, accion: 'duplicar' });
                    try {
                        abrirChat(await duplicarChat(chat.id));
                    } catch {
                        Alert.alert('No se pudo duplicar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setOcupado(null);
                    }
                },
            },
        ]);
    }, [abrirChat]);

    const borrar = useCallback((chat: ResumenChat) => {
        Alert.alert('Borrar conversación', `Se borrará «${chat.titulo}».`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Borrar',
                style: 'destructive',
                onPress: async () => {
                    setOcupado({ id: chat.id, accion: 'borrar' });
                    try {
                        await borrarChat(chat.id);
                        // Si era la abierta, se pasa a una nueva; el menú sigue abierto.
                        if (chat.id === chatActivo) navigation.navigate('Chat', { chatId: undefined });
                        await recargar();
                    } catch {
                        Alert.alert('No se pudo borrar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setOcupado(null);
                    }
                },
            },
        ]);
    }, [chatActivo, navigation, recargar]);

    return (
        <View className="flex-1 bg-superficie" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}>
            <View className="flex-row items-center gap-3 px-5">
                <View className="h-11 w-10">
                    <CheluAvatar />
                </View>
                <View className="flex-1">
                    <Text className="text-lg font-bold tracking-wide text-texto">
                        CHE<Text className="text-primario">LU</Text>
                    </Text>
                    <Text className="text-xs text-texto-tenue" numberOfLines={1}>
                        {sesion.nombreEmpresa}
                    </Text>
                </View>
            </View>

            <Pressable
                onPress={() => abrirChat()}
                className="mx-4 mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primario active:bg-primario-presionado"
            >
                <Plus size={20} color={colores['sobre-primario']} />
                <Text className="text-base font-semibold text-sobre-primario">Nueva conversación</Text>
            </Pressable>

            <View className="ml-5 mr-3 mt-4 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-texto-tenue">Conversaciones</Text>
                <Pressable
                    onPress={conversaciones.recargar}
                    disabled={conversaciones.cargando}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Recargar conversaciones"
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-fondo"
                >
                    {conversaciones.cargando ? (
                        <ActivityIndicator size="small" color={colores['texto-tenue']} />
                    ) : (
                        <RefreshCw size={16} color={colores['texto-tenue']} />
                    )}
                </Pressable>
            </View>
            <View className="mt-1 flex-1">
                <ListaConversaciones
                    {...conversaciones}
                    activoId={chatActivo}
                    onReintentar={conversaciones.recargar}
                    onAbrir={openChatFromList}
                    onDuplicar={duplicar}
                    onBorrar={borrar}
                    ocupado={ocupado}
                />
            </View>

            <View className="mx-3 border-t border-borde pt-2">
                {sesion.isImpersonation && (
                    <View className="mx-2 mb-2 rounded-xl bg-aviso-suave px-3 py-2">
                        <Text className="text-xs text-aviso">
                            Suplantando a <Text className="font-bold">{sesion.username}</Text>
                            {sesion.isMaster ? ' (con maestro)' : ' (sin maestro)'}
                        </Text>
                    </View>
                )}
                <View className="mx-1 mb-1 flex-row items-center gap-3 rounded-2xl bg-fondo px-3 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primario">
                        <Text className="text-base font-bold text-sobre-primario">
                            {sesion.username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-texto" numberOfLines={1}>
                            {sesion.username}
                        </Text>
                        {sesion.rol && (
                            <Text className="text-xs text-texto-secundario" numberOfLines={1}>
                                {ROLES[sesion.rol] ?? sesion.rol}
                            </Text>
                        )}
                    </View>
                </View>
                <OpcionMenu
                    texto={esquema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    icono={esquema === 'dark' ? Sun : Moon}
                    onPress={() => setEsquema(esquema === 'dark' ? 'light' : 'dark')}
                />
                {staff && <OpcionMenu texto="Salir de suplantación" icono={UserRoundX} onPress={salirDeSuplantacion} />}
                <OpcionMenu texto="Cerrar sesión" icono={LogOut} onPress={cerrarSesion} peligro />
            </View>
        </View>
    );
}
