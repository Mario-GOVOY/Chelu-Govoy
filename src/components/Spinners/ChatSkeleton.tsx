import { type DimensionValue, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePulseStyle } from '@/hooks/usePulseStyle';

// Anchos de las líneas de cada respuesta, para que no parezca una tabla.
const ANSWERS: { lines: DimensionValue[]; card: boolean }[] = [
    { lines: ['92%', '78%', '85%'], card: true },
    { lines: ['88%', '64%'], card: false },
];

const REPEATS = [0, 1, 2];

/** Hueco de la conversación mientras carga: respuestas de Chelu y una pregunta, pegadas abajo como el chat. */
export function ChatSkeleton() {
    const pulseStyle = usePulseStyle();

    const answer = ({ lines, card }: (typeof ANSWERS)[number], key: number) => (
        <View key={key} className="gap-2">
            <View className="-ml-2 flex-row items-center gap-2">
                <View className="h-7 w-7 rounded-lg bg-borde-medio" />
                <View className="h-3 w-14 rounded-full bg-borde-medio" />
            </View>
            {lines.map((width, index) => (
                <View key={index} className="h-3.5 rounded-full bg-borde-medio" style={{ width }} />
            ))}
            {card && <View className="mt-1 h-40 rounded-xl bg-borde-medio" />}
        </View>
    );

    // Se repite más de lo que cabe y se recorta por arriba: así llena el alto de cualquier pantalla.
    return (
        <Animated.View
            style={[{ flex: 1, justifyContent: 'flex-end', overflow: 'hidden' }, pulseStyle]}
            accessibilityLabel="Cargando la conversación"
        >
            <View className="gap-5 px-6 py-4">
                {REPEATS.map((repeat) => (
                    <View key={repeat} className="gap-5">
                        {answer(ANSWERS[0], 0)}
                        <View className="h-11 w-3/5 self-end rounded-xl rounded-tr-sm bg-borde-medio" />
                        {answer(ANSWERS[1], 1)}
                        <View className="h-11 w-2/5 self-end rounded-xl rounded-tr-sm bg-borde-medio" />
                    </View>
                ))}
            </View>
        </Animated.View>
    );
}
