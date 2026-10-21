import { Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';

/** Aviso en amarillo con el triángulo. */
export function Warning({ text }: { text: string }) {
    const colores = useColores();
    return (
        <View className="flex-row items-start gap-2 rounded-lg bg-aviso-suave px-3 py-2">
            <TriangleAlert size={14} color={colores.aviso} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs text-aviso">{text}</Text>
        </View>
    );
}
