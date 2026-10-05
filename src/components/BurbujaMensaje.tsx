import { Text, View } from 'react-native';

import { Mensaje } from '@/chat/chatApi';
import { CheluAvatar } from '@/components/CheluAvatar';
import { TextoMarkdown } from '@/components/TextoMarkdown';
import { useSesionActiva } from '@/context/SesionContext';

export function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
    const { sesion } = useSesionActiva();

    if (mensaje.rol === 'usuario') {
        return (
            <View className="items-end gap-2">
                <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-texto">Tú</Text>
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-texto-secundario">
                        <Text className="text-sm font-bold text-superficie">
                            {sesion.username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>
                <View className="mr-9 max-w-[85%] rounded-xl rounded-tr-sm bg-primario px-4 py-3">
                    <Text selectable className="text-base text-sobre-primario">
                        {mensaje.texto}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="gap-1">
            <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-lg border border-borde bg-superficie p-0.5">
                    <CheluAvatar />
                </View>
                <Text className="text-sm font-bold text-texto">CHELU</Text>
            </View>
            <View className="pl-9">
                <TextoMarkdown texto={mensaje.texto} />
            </View>
        </View>
    );
}
