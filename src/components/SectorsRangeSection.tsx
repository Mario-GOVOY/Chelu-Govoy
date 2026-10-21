import { Pressable, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { DateTimeFields } from '@/components/ui/form/DateTimeFields';
import { FormSection } from '@/components/ui/form/FormSection';
import type { FormStudyRange } from '@/types/SectorsForm';
import { formatIsoDate, parseIsoDate } from '@/utils/fechas';

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** Rango de estudio: fechas dentro de las del mapa (las dos o ninguna) y días de la semana. */
export function SectorsRangeSection({ range, onChange }: {
    range: FormStudyRange;
    onChange: (range: FormStudyRange) => void;
}) {
    const mapStart = parseIsoDate(range.fecha_min_mapa);
    const mapEnd = parseIsoDate(range.fecha_max_mapa);
    const start = range.fecha_inicio ? parseIsoDate(range.fecha_inicio) : null;
    const end = range.fecha_final ? parseIsoDate(range.fecha_final) : null;
    const selectedWeekdays = range.dias_semana ?? ALL_WEEKDAYS;

    // El back solo acota con las dos fechas: al elegir una, la otra toma el límite del mapa.
    const changeDate = (field: string, date: string) => {
        onChange(field === 'fecha_inicio'
            ? { ...range, fecha_inicio: date, fecha_final: range.fecha_final ?? range.fecha_max_mapa }
            : { ...range, fecha_inicio: range.fecha_inicio ?? range.fecha_min_mapa, fecha_final: date });
    };

    // Los 7 días van como null. No se deja sin ninguno: el back lo tomaría como todos.
    const toggleWeekday = (day: number) => {
        const next = selectedWeekdays.includes(day)
            ? selectedWeekdays.filter((item) => item !== day)
            : [...selectedWeekdays, day];
        if (!next.length) return;
        onChange({ ...range, dias_semana: next.length === 7 ? null : next });
    };

    return (
        <FormSection title="Rango de estudio">
            <DateTimeFields
                mode="date"
                fields={[
                    {
                        key: 'fecha_inicio',
                        label: 'Desde',
                        value: range.fecha_inicio,
                        initialDate: mapStart,
                        minimumDate: mapStart,
                        maximumDate: end ?? mapEnd,
                    },
                    {
                        key: 'fecha_final',
                        label: 'Hasta',
                        value: range.fecha_final,
                        initialDate: mapEnd,
                        minimumDate: start ?? mapStart,
                        maximumDate: mapEnd,
                    },
                ]}
                onChange={changeDate}
            />
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
        </FormSection>
    );
}
