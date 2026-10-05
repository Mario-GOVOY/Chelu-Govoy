import { Pressable, Text, View } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { LogOut, Moon, Plus, Sun, UserRoundX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConversaciones } from '@/chat/useConversaciones';
import { CheluAvatar } from '@/components/CheluAvatar';
import { ListaConversaciones } from '@/components/ListaConversaciones';
import { useSesion, useSesionActiva } from '@/context/SesionContext';
import type { AppDrawerParamList } from '@/navigation/AppNavigator';
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
    const conversaciones = useConversaciones(useDrawerStatus() === 'open');
    const chatActivo = (state.routes[state.index].params as AppDrawerParamList['Chat'])?.chatId;

    const abrirChat = (chatId?: string) => {
        navigation.navigate('Chat', { chatId });
        navigation.closeDrawer();
    };

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

            <Text className="mx-5 mt-6 text-xs font-bold uppercase tracking-wider text-texto-tenue">Conversaciones</Text>
            <View className="mt-2 flex-1">
                <ListaConversaciones
                    {...conversaciones}
                    activoId={chatActivo}
                    onReintentar={conversaciones.recargar}
                    onAbrir={(chat) => abrirChat(chat.id)}
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
