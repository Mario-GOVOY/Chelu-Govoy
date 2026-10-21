import { Switch, Text, View } from 'react-native';

import { capitalize, getModeLabel } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/form/Field';
import { FormSection } from '@/components/ui/form/FormSection';
import { NumberInput } from '@/components/ui/form/NumberInput';
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
        <FormSection title="Parámetros">
            <Field label="Demanda" help="Cuánto se espera en cada zona: más alto, sectores más pequeños y más vehículos.">
                <View className="flex-row flex-wrap items-center gap-2">
                    {demand.opciones.map((option) => (
                        <Chip
                            key={option.nivel}
                            label={capitalize(option.nivel)}
                            selected={demand.nivel === option.nivel}
                            onPress={() => onChange({ demanda: { ...demand, nivel: option.nivel, percentil: option.percentil } })}
                        />
                    ))}
                    <NumberInput
                        value={demand.percentil}
                        min={1}
                        max={100}
                        suffix="%"
                        accessibilityLabel="Porcentaje de demanda"
                        onChange={changeDemandPercentile}
                    />
                </View>
            </Field>

            <Field label="Aprovechamiento mínimo por vehículo" help="Con 0 no se exige ningún mínimo.">
                <NumberInput
                    value={minimumLoad}
                    min={0}
                    max={100}
                    suffix="%"
                    accessibilityLabel="Aprovechamiento mínimo por vehículo"
                    onChange={(percentage) => onChange({ carga_minima: { porcentaje: percentage } })}
                />
            </Field>

            <Field label="Tipo de optimización">
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
            </Field>
        </FormSection>
    );
}
