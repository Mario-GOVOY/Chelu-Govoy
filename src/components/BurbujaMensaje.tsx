import { Text, View } from 'react-native';

import { Mensaje } from '@/chat/chatApi';
import { CheluAvatar } from '@/components/CheluAvatar';
import { PuntosEscribiendo } from '@/components/PuntosEscribiendo';
import { TarjetasHerramientas } from '@/components/TarjetasHerramientas';
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
            <View className="gap-2 pl-9">
                {!!mensaje.herramientas?.length && <TarjetasHerramientas herramientas={mensaje.herramientas} />}
                {!!mensaje.texto && <TextoMarkdown texto={mensaje.texto} />}
                {/* También tras el texto: si Chelu está llamando a una herramienta, pasan segundos sin texto nuevo. */}
                {mensaje.estado === 'escribiendo' && <PuntosEscribiendo />}
                {mensaje.estado === 'detenida' && (
                    <Text className="text-sm italic text-texto-tenue">Respuesta detenida.</Text>
                )}
                {mensaje.estado === 'error' && (
                    <View className="rounded-xl bg-peligro-suave px-3 py-2">
                        <Text className="text-sm text-peligro">No se pudo completar la respuesta. Inténtalo de nuevo.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
