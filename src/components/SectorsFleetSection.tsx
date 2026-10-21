import { memo, useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Check, Pencil, Plus } from 'lucide-react-native';

import {
    changeScenarioVehicles,
    countUnits,
    getFleetLabel,
    getFleetScenarios,
    getIncludedVehicles,
    getListCapacity,
    getScenarioVehicles,
    type ScenarioKey,
} from '@/chat/sectorsForm';
import type { VehicleEditing } from '@/components/SectorsVehicleSheet';
import { Chip } from '@/components/ui/Chip';
import { FormSection } from '@/components/ui/form/FormSection';
import { Warning } from '@/components/ui/form/Warning';
import { useColores } from '@/theme/ThemeProvider';
import type { FormFleet, FormVehicle } from '@/types/SectorsForm';
import { formatInteger } from '@/utils/numbers';

/**
 * Tipo de flota y vehículos de la zona: al tocar uno se incluye o se quita, y con el lápiz se edita.
 * Con escenarios, se elige cuál se ve y se edita.
 */
export const SectorsFleetSection = memo(function SectorsFleetSection({ fleet, recalculating, onChange, onEditVehicle, onAddVehicle }: {
    fleet: FormFleet;
    // Mientras se recalcula, la lista es la de la zona anterior y no se deja tocar.
    recalculating: boolean;
    // Recibe la flota actual y devuelve la nueva.
    onChange: (change: (fleet: FormFleet) => FormFleet) => void;
    onEditVehicle: (editing: VehicleEditing) => void;
    onAddVehicle: (scenario: ScenarioKey) => void;
}) {
    const colores = useColores();
    const { height: windowHeight } = useWindowDimensions();
    const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('recomendada');
    const hasScenarios = fleet.tipo === 'escenarios';
    const scenarioKey = hasScenarios ? selectedScenario : 'recomendada';
    const scenarios = getFleetScenarios(fleet);
    const activeScenario = scenarios.find((scenario) => scenario.key === scenarioKey);
    const vehicles = getScenarioVehicles(fleet, scenarioKey);
    // "Personalizada" solo se ofrece si el formulario ya llega con ella.
    const typeOptions = fleet.opciones.filter((option) => option !== 'personalizada' || fleet.tipo === 'personalizada');
    const included = getIncludedVehicles(vehicles);
    const includedUnits = countUnits(included);

    // Estables para que al marcar un vehículo solo se repinte su fila.
    // Los quitados no se borran: van con incluido: false.
    const toggleVehicle = useCallback((index: number) => {
        onChange((current) => changeScenarioVehicles(current, scenarioKey, (list) =>
            list.map((vehicle, i) => (i === index ? { ...vehicle, incluido: vehicle.incluido === false } : vehicle))));
    }, [onChange, scenarioKey]);

    const editVehicle = useCallback((index: number, vehicle: FormVehicle) => {
        onEditVehicle({ scenario: scenarioKey, index, vehicle });
    }, [onEditVehicle, scenarioKey]);

    // Sin su flota propia, el escenario se vuelve a calcular sobre la recomendada.
    const recalculateScenario = () => {
        onChange((current) => {
            const edited = { ...current.escenarios_editados };
            delete edited[scenarioKey as 'ajustado' | 'holgado'];
            return { ...current, escenarios_editados: edited };
        });
    };

    return (
        <FormSection title="Flota">
            <View className="flex-row flex-wrap gap-2">
                {typeOptions.map((option) => (
                    <Chip
                        key={option}
                        label={getFleetLabel(option)}
                        selected={fleet.tipo === option}
                        onPress={() => onChange((current) => ({ ...current, tipo: option }))}
                    />
                ))}
            </View>

            {hasScenarios && (
                <>
                    <View className="flex-row flex-wrap gap-2">
                        {scenarios.map((scenario) => (
                            <Chip
                                key={scenario.key}
                                label={`${scenario.label}: ${formatInteger(scenario.vehicleCount)}`}
                                selected={scenarioKey === scenario.key}
                                onPress={() => setSelectedScenario(scenario.key)}
                            />
                        ))}
                    </View>
                    {scenarioKey !== 'recomendada' && (
                        <View className="flex-row items-center justify-between gap-2">
                            <Text className="flex-1 text-xs text-texto-tenue">
                                {activeScenario?.edited
                                    ? 'Flota propia: la has editado y ya no sigue a la recomendada.'
                                    : 'Calculado sobre la recomendada. Al editarlo pasa a ser una flota propia.'}
                            </Text>
                            {activeScenario?.edited && (
                                <Pressable onPress={recalculateScenario} hitSlop={8} accessibilityRole="button">
                                    <Text className="text-xs font-semibold text-primario">Volver a calcularlo</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </>
            )}

            {vehicles.length === 0 ? (
                <Text className="text-xs text-texto-tenue">No hay vehículos en esta zona.</Text>
            ) : (
                <ScrollView
                    style={{ maxHeight: windowHeight * 0.5, opacity: recalculating ? 0.5 : 1 }}
                    nestedScrollEnabled
                    className="rounded-lg border border-borde"
                >
                    {vehicles.map((vehicle, index) => (
                        <VehicleRow
                            key={index}
                            vehicle={vehicle}
                            index={index}
                            disabled={recalculating}
                            onToggle={toggleVehicle}
                            onEdit={editVehicle}
                        />
                    ))}
                </ScrollView>
            )}

            <Pressable
                onPress={() => onAddVehicle(scenarioKey)}
                disabled={recalculating}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 self-start"
                style={{ opacity: recalculating ? 0.5 : 1 }}
            >
                <Plus size={16} color={colores.primario} />
                <Text className="text-sm font-semibold text-primario">Añadir un tipo de vehículo</Text>
            </Pressable>

            {fleet.descartados.length > 0 && (
                <Warning text={`Sin capacidad en Fleet, no se usan: ${fleet.descartados.map((vehicle) => vehicle.nombre).join(', ')}`} />
            )}

            <Text className="text-xs text-texto-secundario">
                Saldrán {formatInteger(includedUnits)} {includedUnits === 1 ? 'vehículo' : 'vehículos'}
                {' · '}{formatInteger(getListCapacity(included))} de capacidad
                {hasScenarios ? ` en el escenario ${activeScenario?.label.toLowerCase()}` : ''}
            </Text>
        </FormSection>
    );
});

// Con memo: al marcar un vehículo, las demás filas reciben lo mismo y no se repintan.
const VehicleRow = memo(function VehicleRow({ vehicle, index, disabled, onToggle, onEdit }: {
    vehicle: FormVehicle;
    index: number;
    disabled: boolean;
    onToggle: (index: number) => void;
    onEdit: (index: number, vehicle: FormVehicle) => void;
}) {
    const colores = useColores();
    const isIncluded = vehicle.incluido !== false;

    return (
        <View className="flex-row items-center border-b border-borde">
            <Pressable
                onPress={() => onToggle(index)}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isIncluded, disabled }}
                accessibilityLabel={vehicle.nombre}
                className="flex-1 active:bg-fondo"
            >
                <View className="flex-row items-center gap-3 py-2 pl-3" style={{ opacity: isIncluded ? 1 : 0.45 }}>
                    <View
                        className="h-5 w-5 items-center justify-center rounded border"
                        style={{
                            borderColor: isIncluded ? colores.primario : colores['borde-fuerte'],
                            backgroundColor: isIncluded ? colores.primario : 'transparent',
                        }}
                    >
                        {isIncluded && <Check size={14} color={colores['sobre-primario']} />}
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-texto" numberOfLines={1}>{vehicle.nombre}</Text>
                        <Text className="text-xs text-texto-tenue">
                            {vehicle.cantidad > 1 ? `${vehicle.cantidad} uds · ` : ''}
                            {vehicle.hora_inicio}–{vehicle.hora_fin} · {formatInteger(vehicle.capacidad)} paradas
                        </Text>
                    </View>
                </View>
            </Pressable>
            <Pressable
                onPress={() => onEdit(index, vehicle)}
                disabled={disabled}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${vehicle.nombre}`}
                className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
            >
                <Pencil size={16} color={colores['texto-secundario']} />
            </Pressable>
        </View>
    );
});
