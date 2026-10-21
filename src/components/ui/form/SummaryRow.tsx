import { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** Fila del resumen de una tarjeta de formulario: etiqueta a la izquierda y el valor a la derecha. */
export function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <View className="flex-row gap-3 border-t border-borde py-2">
            <Text className="w-24 text-[11px] font-semibold uppercase text-texto-tenue">{label}</Text>
            <View className="flex-1">{children}</View>
        </View>
    );
}
