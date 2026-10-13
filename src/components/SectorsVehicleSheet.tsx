import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';

import { parseTime, toTime, type ScenarioKey } from '@/chat/sectorsForm';
import { Boton } from '@/components/ui/Boton';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { useColores } from '@/theme/ThemeProvider';
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

type TimeField = 'hora_inicio' | 'hora_fin';

function VehicleFields({ vehicle, isNew, onSave, onDelete }: {
    vehicle: FormVehicle;
    isNew: boolean;
    onSave: (vehicle: FormVehicle) => void;
    onDelete: () => void;
}) {
    const colores = useColores();
    const [name, setName] = useState(vehicle.nombre);
    const [units, setUnits] = useState(String(vehicle.cantidad || 1));
    const [stops, setStops] = useState(vehicle.capacidad ? String(vehicle.capacidad) : '');
    const [times, setTimes] = useState({ hora_inicio: vehicle.hora_inicio, hora_fin: vehicle.hora_fin });
    const [pickingField, setPickingField] = useState<TimeField | null>(null);
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

    const timeButton = (field: TimeField, label: string) => (
        <Pressable
            onPress={() => setPickingField(pickingField === field ? null : field)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${times[field]}`}
            className="flex-1 flex-row items-center gap-2 rounded-xl border px-3 py-2"
            style={{ borderColor: pickingField === field ? colores.primario : colores['borde-medio'] }}
        >
            <Clock size={16} color={colores['texto-secundario']} />
            <View>
                <Text className="text-[11px] text-texto-tenue">{label}</Text>
                <Text className="text-sm text-texto">{times[field]}</Text>
            </View>
        </Pressable>
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
            <View className="flex-row gap-2">
                {timeButton('hora_inicio', 'Desde')}
                {timeButton('hora_fin', 'Hasta')}
            </View>
            {/* En Android abre un diálogo que se cierra al elegir; en iOS, una rueda que se cierra con su botón. */}
            {pickingField && (
                <DateTimePicker
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={parseTime(times[pickingField])}
                    onChange={(event, date) => {
                        if (Platform.OS !== 'ios') setPickingField(null);
                        if (event.type === 'set' && date) setTimes((prev) => ({ ...prev, [pickingField]: toTime(date) }));
                    }}
                />
            )}
            <Boton texto={isNew ? 'Añadir' : 'Guardar'} onPress={save} deshabilitado={!canSave} />
            {!isNew && <Boton texto="Eliminar vehículo" variante="peligro" onPress={onDelete} />}
        </View>
    );
}
