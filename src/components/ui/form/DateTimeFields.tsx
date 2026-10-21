import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';
import { formatIsoDate, parseIsoDate, parseTime, toIsoDate, toTime } from '@/utils/fechas';

export type DateTimeFieldItem = {
    key: string;
    label: string;
    // aaaa-mm-dd con fechas y HH:MM con horas; null sin elegir.
    value: string | null;
    // Lo que enseña el selector al abrirlo sin valor.
    initialDate?: Date;
    minimumDate?: Date;
    maximumDate?: Date;
};

/**
 * Fechas u horas en fila (p. ej. "Desde" y "Hasta") con el selector del sistema debajo.
 * En Android abre un diálogo que se cierra al elegir. En iOS, un calendario que se cierra al elegir
 * o una rueda de horas que se cierra tocando otra vez su botón.
 */
export function DateTimeFields({ mode, fields, onChange }: {
    mode: 'date' | 'time';
    fields: DateTimeFieldItem[];
    onChange: (key: string, value: string) => void;
}) {
    const colores = useColores();
    const [pickingKey, setPickingKey] = useState<string | null>(null);
    const picking = fields.find((field) => field.key === pickingKey);
    const Icon = mode === 'date' ? CalendarDays : Clock;
    const format = (value: string) => (mode === 'date' ? formatIsoDate(value) : value);

    const pickerValue = (field: DateTimeFieldItem) => {
        if (field.value) return mode === 'date' ? parseIsoDate(field.value) : parseTime(field.value);
        return field.initialDate ?? new Date();
    };

    return (
        <>
            <View className="flex-row gap-2">
                {fields.map((field) => (
                    <Pressable
                        key={field.key}
                        onPress={() => setPickingKey(pickingKey === field.key ? null : field.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${field.label}: ${field.value ? format(field.value) : 'sin elegir'}`}
                        className="flex-1 flex-row items-center gap-2 rounded-xl border px-3 py-2"
                        style={{ borderColor: pickingKey === field.key ? colores.primario : colores['borde-medio'] }}
                    >
                        <Icon size={16} color={colores['texto-secundario']} />
                        <View>
                            <Text className="text-[11px] text-texto-tenue">{field.label}</Text>
                            <Text className="text-sm text-texto">{field.value ? format(field.value) : '—'}</Text>
                        </View>
                    </Pressable>
                ))}
            </View>
            {picking && (
                <DateTimePicker
                    mode={mode}
                    is24Hour
                    display={Platform.OS !== 'ios' ? 'default' : mode === 'date' ? 'inline' : 'spinner'}
                    value={pickerValue(picking)}
                    minimumDate={picking.minimumDate}
                    maximumDate={picking.maximumDate}
                    onValueChange={(_event, date) => {
                        if (mode === 'date' || Platform.OS !== 'ios') setPickingKey(null);
                        onChange(picking.key, mode === 'date' ? toIsoDate(date) : toTime(date));
                    }}
                    onDismiss={() => setPickingKey(null)}
                />
            )}
        </>
    );
}
