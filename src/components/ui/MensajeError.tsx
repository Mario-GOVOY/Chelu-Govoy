import { Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';

export function MensajeError({ texto }: { texto: string | null }) {
    const colores = useColores();
    if (!texto) return null;

    return (
        <View className="flex-row items-start gap-2 px-1" accessibilityLiveRegion="polite">
            <CircleAlert size={18} color={colores.peligro} />
            <Text className="flex-1 text-sm leading-5 text-peligro">{texto}</Text>
        </View>
    );
}
