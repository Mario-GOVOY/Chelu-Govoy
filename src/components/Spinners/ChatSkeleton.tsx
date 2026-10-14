import { type DimensionValue, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePulseStyle } from '@/hooks/usePulseStyle';

// Anchos de las líneas de cada respuesta: la última más corta, como un párrafo.
const ANSWER_LINES: DimensionValue[] = ['100%', '100%', '100%', '100%', '60%'];

const REPEATS = [0, 1, 2, 3];

/** Hueco de la conversación mientras carga: preguntas y respuestas, una de cada dos con gráfica, pegadas abajo como el chat. */
export function ChatSkeleton() {
    const pulseStyle = usePulseStyle();

    // Se repite más de lo que cabe y se recorta por arriba: así llena el alto de cualquier pantalla.
    return (
        <Animated.View
            style={[{ flex: 1, justifyContent: 'flex-end', overflow: 'hidden' }, pulseStyle]}
            accessibilityLabel="Cargando la conversación"
        >
            <View className="gap-5 px-6 py-4">
                {REPEATS.map((repeat) => (
                    <View key={repeat} className="gap-5">
                        <View className="items-end gap-2">
                            <View className="-mr-2 flex-row items-center gap-2">
                                <View className="h-3 w-6 rounded-full bg-borde-medio" />
                                <View className="h-7 w-7 rounded-lg bg-borde-medio" />
                            </View>
                            <View className="h-11 w-1/2 rounded-xl rounded-tr-sm bg-borde-medio" />
                        </View>
                        <View className="gap-2">
                            <View className="-ml-2 flex-row items-center gap-2">
                                <View className="h-7 w-7 rounded-lg bg-borde-medio" />
                                <View className="h-3 w-14 rounded-full bg-borde-medio" />
                            </View>
                            {ANSWER_LINES.map((width, index) => (
                                <View key={index} className="h-3.5 rounded-full bg-borde-medio" style={{ width }} />
                            ))}
                            {repeat % 3 === 2 && <View className="mt-1 h-40 rounded-xl bg-borde-medio" />}
                        </View>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
}
