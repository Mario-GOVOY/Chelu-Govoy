import { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import { capitalize, getModeLabel } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { useColores } from '@/theme/ThemeProvider';
import type { FormDemand, FormMode, SectorsForm } from '@/types/SectorsForm';

/** Demanda, aprovechamiento mínimo y tipo de optimización: campos sueltos, sin recalcular nada en el back. */
export function SectorsParamsSection({ demand, minimumLoad, mode, onChange }: {
    demand: FormDemand;
    minimumLoad: number;
    mode: FormMode;
    onChange: (changes: Partial<SectorsForm>) => void;
}) {
    const colores = useColores();

    // Si el porcentaje escrito es el de un nivel, se marca ese nivel.
    const changeDemandPercentile = (percentile: number) => {
        const level = demand.opciones.find((option) => option.percentil === percentile);
        onChange({ demanda: { ...demand, nivel: level?.nivel ?? 'personalizado', percentil: percentile } });
    };

    // La asignación múltiple solo se aplica en fragmentado; al pasar a él empieza activada.
    const changeMode = (value: string) => {
        onChange({
            modo: {
                ...mode,
                valor: value,
                asignacion_multiple: value === 'fragmentado' ? mode.asignacion_multiple ?? true : mode.asignacion_multiple,
            },
        });
    };

    return (
        <View className="gap-4 rounded-xl border border-borde bg-superficie p-3">
            <Text className="text-[11px] font-semibold uppercase text-texto-tenue">Parámetros</Text>

            <View className="gap-2">
                <Text className="text-sm font-semibold text-texto">Demanda</Text>
                <View className="flex-row flex-wrap items-center gap-2">
                    {demand.opciones.map((option) => (
                        <Chip
                            key={option.nivel}
                            label={capitalize(option.nivel)}
                            selected={demand.nivel === option.nivel}
                            onPress={() => onChange({ demanda: { ...demand, nivel: option.nivel, percentil: option.percentil } })}
                        />
                    ))}
                    <PercentInput
                        value={demand.percentil}
                        min={1}
                        max={100}
                        accessibilityLabel="Porcentaje de demanda"
                        onChange={changeDemandPercentile}
                    />
                </View>
                <Text className="text-xs text-texto-tenue">
                    Cuánto se espera en cada zona: más alto, sectores más pequeños y más vehículos.
                </Text>
            </View>

            <View className="gap-2">
                <Text className="text-sm font-semibold text-texto">Aprovechamiento mínimo por vehículo</Text>
                <PercentInput
                    value={minimumLoad}
                    min={0}
                    max={100}
                    accessibilityLabel="Aprovechamiento mínimo por vehículo"
                    onChange={(percentage) => onChange({ carga_minima: { porcentaje: percentage } })}
                />
                <Text className="text-xs text-texto-tenue">Con 0 no se exige ningún mínimo.</Text>
            </View>

            <View className="gap-2">
                <Text className="text-sm font-semibold text-texto">Tipo de optimización</Text>
                <View className="flex-row flex-wrap gap-2">
                    {mode.opciones.map((option) => (
                        <Chip
                            key={option}
                            label={getModeLabel(option)}
                            selected={mode.valor === option}
                            onPress={() => changeMode(option)}
                        />
                    ))}
                </View>
                {mode.valor === 'fragmentado' && (
                    <View className="flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-sm text-texto">Asignación múltiple</Text>
                        <Switch
                            value={!!mode.asignacion_multiple}
                            onValueChange={(value) => onChange({ modo: { ...mode, asignacion_multiple: value } })}
                            trackColor={{ true: colores.primario, false: colores['borde-fuerte'] }}
                            thumbColor={colores.superficie}
                            accessibilityLabel="Asignación múltiple"
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

/**
 * Porcentaje entero. Solo pasa al formulario lo que está dentro del rango;
 * al salir del campo con algo vacío o fuera de rango, vuelve el último valor válido.
 */
function PercentInput({ value, min, max, accessibilityLabel, onChange }: {
    value: number;
    min: number;
    max: number;
    accessibilityLabel: string;
    onChange: (value: number) => void;
}) {
    const [text, setText] = useState(String(value));

    // Si cambia desde fuera (p. ej. al tocar un nivel de demanda), se enseña el nuevo.
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
                maxLength={3}
                accessibilityLabel={accessibilityLabel}
                className="w-16 rounded-xl border border-borde-medio bg-superficie px-3 py-1.5 text-center text-sm text-texto"
            />
            <Text className="text-sm text-texto-secundario">%</Text>
        </View>
    );
}
