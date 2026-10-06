import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { useColores } from '@/theme/ThemeProvider';

// Como `chelu-blink` de la web: ciclo de 1,2 s; cada punto se enciende y sube 3 px
// al 40 % y vuelve al 80 %. Los puntos van desfasados 0,2 s.
function Punto({ retraso }: { retraso: number }) {
    const colores = useColores();
    const fase = useSharedValue(0);

    useEffect(() => {
        fase.value = withDelay(
            retraso,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 480 }),
                    withTiming(0, { duration: 480 }),
                    withTiming(0, { duration: 240 }),
                ),
                -1,
            ),
        );
    }, [fase, retraso]);

    const estilo = useAnimatedStyle(() => ({
        opacity: 0.25 + 0.75 * fase.value,
        transform: [{ translateY: -3 * fase.value }],
    }));

    // Animated.View no pasa por NativeWind: sus estilos van en style, no en className.
    return (
        <Animated.View
            style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colores.primario }, estilo]}
        />
    );
}

export function PuntosEscribiendo() {
    return (
        <View
            className="flex-row items-center gap-1 self-start py-2"
            accessibilityRole="progressbar"
            accessibilityLabel="CHELU está escribiendo"
        >
            <Punto retraso={0} />
            <Punto retraso={200} />
            <Punto retraso={400} />
        </View>
    );
}
