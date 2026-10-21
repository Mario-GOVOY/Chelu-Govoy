import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import type { ScenarioKey } from '@/chat/sectorsForm';
import { Boton } from '@/components/ui/Boton';
import { DateTimeFields } from '@/components/ui/form/DateTimeFields';
import { HojaInferior } from '@/components/ui/HojaInferior';
import type { FormVehicle } from '@/types/SectorsForm';

export type VehicleEditing = {
    scenario: ScenarioKey;
    // null: vehículo nuevo.
    index: number | null;
    vehicle: FormVehicle;
};

/** Hoja para editar un vehículo de la flota o añadir uno. Va la última dentro del editor. */
export function SectorsVehicleSheet({ editing, onSave, onDelete, onClose }: {
    editing: VehicleEditing | null;
    onSave: (vehicle: FormVehicle) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const isNew = editing?.index === null;
    return (
        <HojaInferior visible={!!editing} titulo={isNew ? 'Añadir vehículo' : 'Editar vehículo'} onCerrar={onClose}>
            {editing && <VehicleFields vehicle={editing.vehicle} isNew={isNew} onSave={onSave} onDelete={onDelete} />}
        </HojaInferior>
    );
}

function VehicleFields({ vehicle, isNew, onSave, onDelete }: {
    vehicle: FormVehicle;
    isNew: boolean;
    onSave: (vehicle: FormVehicle) => void;
    onDelete: () => void;
}) {
    const [name, setName] = useState(vehicle.nombre);
    const [units, setUnits] = useState(String(vehicle.cantidad || 1));
    const [stops, setStops] = useState(vehicle.capacidad ? String(vehicle.capacidad) : '');
    const [times, setTimes] = useState({ hora_inicio: vehicle.hora_inicio, hora_fin: vehicle.hora_fin });
    const unitCount = Number(units);
    const stopCount = Number(stops);
    const canSave = !!name.trim() && unitCount >= 1 && stopCount >= 1;

    const save = () => {
        onSave({
            ...vehicle,
            ...times,
            nombre: name.trim(),
            cantidad: unitCount,
            capacidad: stopCount,
        });
    };

    const numberField = (label: string, value: string, onChange: (text: string) => void, maxLength: number) => (
        <View className="flex-1 gap-1">
            <Text className="text-xs text-texto-tenue">{label}</Text>
            <TextInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={maxLength}
                accessibilityLabel={label}
                className="rounded-xl border border-borde-medio bg-superficie px-3 py-2 text-sm text-texto"
            />
        </View>
    );

    return (
        <View className="gap-3">
            <View className="gap-1">
                <Text className="text-xs text-texto-tenue">Ruta</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="characters"
                    accessibilityLabel="Ruta"
                    className="rounded-xl border border-borde-medio bg-superficie px-3 py-2 text-sm text-texto"
                />
            </View>
            <View className="flex-row gap-2">
                {numberField('Unidades', units, setUnits, 3)}
                {numberField('Paradas', stops, setStops, 5)}
            </View>
            <DateTimeFields
                mode="time"
                fields={[
                    { key: 'hora_inicio', label: 'Desde', value: times.hora_inicio },
                    { key: 'hora_fin', label: 'Hasta', value: times.hora_fin },
                ]}
                onChange={(field, time) => setTimes((prev) => ({ ...prev, [field]: time }))}
            />
            <Boton texto={isNew ? 'Añadir' : 'Guardar'} onPress={save} deshabilitado={!canSave} />
            {!isNew && <Boton texto="Eliminar vehículo" variante="peligro" onPress={onDelete} />}
        </View>
    );
}
