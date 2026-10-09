import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';

import { formatIsoDate, parseIsoDate, toIsoDate } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { useColores } from '@/theme/ThemeProvider';
import type { FormStudyRange } from '@/types/SectorsForm';

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

type DateField = 'fecha_inicio' | 'fecha_final';

/** Rango de estudio: fechas dentro de las del mapa (las dos o ninguna) y días de la semana. */
export function SectorsRangeSection({ range, onChange }: {
    range: FormStudyRange;
    onChange: (range: FormStudyRange) => void;
}) {
    const colores = useColores();
    const [pickingField, setPickingField] = useState<DateField | null>(null);
    const mapStart = parseIsoDate(range.fecha_min_mapa);
    const mapEnd = parseIsoDate(range.fecha_max_mapa);
    const start = range.fecha_inicio ? parseIsoDate(range.fecha_inicio) : null;
    const end = range.fecha_final ? parseIsoDate(range.fecha_final) : null;
    const selectedWeekdays = range.dias_semana ?? ALL_WEEKDAYS;

    // El back solo acota con las dos fechas: al elegir una, la otra toma el límite del mapa.
    const changeDate = (field: DateField, date: Date) => {
        onChange(field === 'fecha_inicio'
            ? { ...range, fecha_inicio: toIsoDate(date), fecha_final: range.fecha_final ?? range.fecha_max_mapa }
            : { ...range, fecha_inicio: range.fecha_inicio ?? range.fecha_min_mapa, fecha_final: toIsoDate(date) });
    };

    // Los 7 días van como null. No se deja sin ninguno: el back lo tomaría como todos.
    const toggleWeekday = (day: number) => {
        const next = selectedWeekdays.includes(day)
            ? selectedWeekdays.filter((item) => item !== day)
            : [...selectedWeekdays, day];
        if (!next.length) return;
        onChange({ ...range, dias_semana: next.length === 7 ? null : next });
    };

    const dateButton = (field: DateField, label: string, value: string | null) => (
        <Pressable
            onPress={() => setPickingField(pickingField === field ? null : field)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? formatIsoDate(value) : 'sin elegir'}`}
            className="flex-1 flex-row items-center gap-2 rounded-xl border px-3 py-2"
            style={{ borderColor: pickingField === field ? colores.primario : colores['borde-medio'] }}
        >
            <CalendarDays size={16} color={colores['texto-secundario']} />
            <View>
                <Text className="text-[11px] text-texto-tenue">{label}</Text>
                <Text className="text-sm text-texto">{value ? formatIsoDate(value) : '—'}</Text>
            </View>
        </Pressable>
    );

    return (
        <View className="gap-3 rounded-xl border border-borde bg-superficie p-3">
            <Text className="text-[11px] font-semibold uppercase text-texto-tenue">Rango de estudio</Text>

            <View className="flex-row gap-2">
                {dateButton('fecha_inicio', 'Desde', range.fecha_inicio)}
                {dateButton('fecha_final', 'Hasta', range.fecha_final)}
            </View>
            {/* En Android abre un diálogo; en iOS, un calendario debajo de las fechas. Se cierra al elegir. */}
            {pickingField && (
                <DateTimePicker
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    value={pickingField === 'fecha_inicio' ? start ?? mapStart : end ?? mapEnd}
                    minimumDate={pickingField === 'fecha_inicio' ? mapStart : start ?? mapStart}
                    maximumDate={pickingField === 'fecha_inicio' ? end ?? mapEnd : mapEnd}
                    onChange={(event, date) => {
                        setPickingField(null);
                        if (event.type === 'set' && date) changeDate(pickingField, date);
                    }}
                />
            )}
            <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-xs text-texto-tenue">
                    El mapa va del {formatIsoDate(range.fecha_min_mapa)} al {formatIsoDate(range.fecha_max_mapa)}
                </Text>
                {range.fecha_inicio && (
                    <Pressable
                        onPress={() => onChange({ ...range, fecha_inicio: null, fecha_final: null })}
                        hitSlop={8}
                        accessibilityRole="button"
                    >
                        <Text className="text-xs font-semibold text-primario">Usar todo el histórico</Text>
                    </Pressable>
                )}
            </View>

            <View className="flex-row flex-wrap gap-2">
                {WEEKDAY_INITIALS.map((initial, day) => (
                    <Chip
                        key={initial}
                        label={initial}
                        selected={selectedWeekdays.includes(day)}
                        onPress={() => toggleWeekday(day)}
                    />
                ))}
            </View>
        </View>
    );
}
