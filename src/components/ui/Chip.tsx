import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useColores } from '@/theme/ThemeProvider';

/** Píldora que se marca y desmarca, para elegir entre opciones. */
export function Chip({ label, selected, onPress, disabled = false, loading = false }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
    // Indicador delante del texto, mientras se carga lo que abre.
    loading?: boolean;
}) {
    const colores = useColores();

    // Colores en un View con style fijo: en un Pressable con clases, NativeWind no aplicaba el fondo de un style función.
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled }}
        >
            {({ pressed }) => (
                <View
                    className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
                    style={{
                        borderColor: selected ? colores.primario : colores['borde-medio'],
                        backgroundColor: selected ? colores.primario : pressed ? colores['primario-suave'] : colores.superficie,
                        opacity: disabled ? 0.6 : 1,
                    }}
                >
                    {loading && <ActivityIndicator size={12} color={selected ? colores['sobre-primario'] : colores.primario} />}
                    <Text className="text-[13px]" style={{ color: selected ? colores['sobre-primario'] : colores.texto }}>
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}
