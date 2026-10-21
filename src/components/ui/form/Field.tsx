import { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** Campo de un formulario: etiqueta, el control, una ayuda debajo y el error si lo hay. */
export function Field({ label, help, error, children }: {
    label: string;
    help?: string;
    error?: string | null;
    children: ReactNode;
}) {
    return (
        <View className="gap-2">
            <Text className="text-sm font-semibold text-texto">{label}</Text>
            {children}
            {!!help && <Text className="text-xs text-texto-tenue">{help}</Text>}
            {!!error && <Text className="text-xs text-peligro">{error}</Text>}
        </View>
    );
}
