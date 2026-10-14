import { type DimensionValue, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePulseStyle } from '@/hooks/usePulseStyle';

// Anchos del título de cada fila, para que no parezca una tabla. Más de las que caben: se recorta abajo.
const TITLE_WIDTHS: DimensionValue[] = ['85%', '60%', '75%', '50%', '90%', '65%', '80%', '55%', '70%', '45%', '85%', '60%', '75%', '50%'];

/** Filas de la lista de conversaciones mientras carga, con las medidas de las de verdad. */
export function ConversationListSkeleton() {
    const pulseStyle = usePulseStyle();
    return (
        <Animated.View style={[{ flex: 1, overflow: 'hidden', paddingHorizontal: 12 }, pulseStyle]} accessibilityLabel="Cargando conversaciones">
            {TITLE_WIDTHS.map((width, index) => (
                <View key={index} className="h-12 flex-row items-center gap-3 pl-3 pr-1">
                    <View className="h-[18px] w-[18px] rounded bg-borde-medio" />
                    <View className="flex-1">
                        <View className="h-3.5 rounded-full bg-borde-medio" style={{ width }} />
                    </View>
                    <View className="w-8" />
                </View>
            ))}
        </Animated.View>
    );
}
