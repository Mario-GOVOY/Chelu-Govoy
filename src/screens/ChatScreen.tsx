import { Pressable, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { Menu } from 'lucide-react-native';

import { CheluAvatar } from '@/components/CheluAvatar';
import { Pantalla } from '@/components/ui/Pantalla';
import { AppDrawerParamList } from '@/navigation/AppNavigator';
import { useColores } from '@/theme/ThemeProvider';
import { useSesionActiva } from '@/context/SesionContext';

type Props = DrawerScreenProps<AppDrawerParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
    const colores = useColores();
    const { sesion} = useSesionActiva();

    return (
        <Pantalla>
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
                    Nueva conversación
                </Text>
            </View>

            <View className="flex-1 items-center justify-center px-8">
                <View className="h-32 w-28">
                    <CheluAvatar />
                </View>
                <Text className="mt-4 text-2xl font-bold text-texto">¿En qué te ayudo <Text className="text-primario">hoy</Text>?</Text>
                <Text className="mt-2 text-center text-base text-texto-secundario">
                    Pregúntame en chat CHELU sobre rutas, alertas, paradas, proveedores, depots, recogidas o PUDOS de {sesion.nombreEmpresa}.
                </Text>
            </View>
        </Pantalla>
    );
}
