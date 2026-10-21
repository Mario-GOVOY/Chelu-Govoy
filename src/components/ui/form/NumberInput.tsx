import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

/**
 * Número entero entre `min` y `max`. Solo pasa al formulario lo que está dentro del rango;
 * al salir del campo con algo vacío o fuera de rango, vuelve el último valor válido.
 */
export function NumberInput({ value, min, max, suffix, accessibilityLabel, onChange }: {
    value: number;
    min: number;
    max: number;
    // Unidad a la derecha del campo, p. ej. "%".
    suffix?: string;
    accessibilityLabel: string;
    onChange: (value: number) => void;
}) {
    const [text, setText] = useState(String(value));

    // Si cambia desde fuera (p. ej. al tocar un chip que lo fija), se enseña el nuevo.
    useEffect(() => setText(String(value)), [value]);

    const changeText = (newText: string) => {
        const digits = newText.replace(/\D/g, '');
        setText(digits);
        const number = Number(digits);
        if (digits && number >= min && number <= max) onChange(number);
    };

    return (
        <View className="flex-row items-center gap-1.5">
            <TextInput
                value={text}
                onChangeText={changeText}
                onBlur={() => setText(String(value))}
                keyboardType="number-pad"
                maxLength={String(max).length}
                accessibilityLabel={accessibilityLabel}
                className="w-16 rounded-xl border border-borde-medio bg-superficie px-3 py-1.5 text-center text-sm text-texto"
            />
            {!!suffix && <Text className="text-sm text-texto-secundario">{suffix}</Text>}
        </View>
    );
}
