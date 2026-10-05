import { Text, View } from 'react-native';

import { Mensaje } from '@/chat/chatApi';

export function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
    if (mensaje.rol === 'usuario') {
        return (
            <View className="max-w-[85%] self-end rounded-3xl rounded-br-md bg-primario px-4 py-3">
                <Text selectable className="text-base text-sobre-primario">
                    {mensaje.texto}
                </Text>
            </View>
        );
    }

    return (
        <Text selectable className="text-base leading-6 text-texto">
            {mensaje.texto}
        </Text>
    );
}
