import { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** Bloque de un formulario a pantalla completa: tarjeta con el título en mayúsculas. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View className="gap-3 rounded-xl border border-borde bg-superficie p-3">
            <Text className="text-[11px] font-semibold uppercase text-texto-tenue">{title}</Text>
            {children}
        </View>
    );
}
