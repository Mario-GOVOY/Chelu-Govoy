import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { countFleetVehicles } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { useColores } from '@/theme/ThemeProvider';
import type { FormFleet, FormZone, ZoneMode } from '@/types/SectorsForm';
import { formatInteger } from '@/utils/numbers';

// CP que se enseñan antes de "+N".
const VISIBLE_POSTCODES = 24;

const ZONE_MODES: { value: ZoneMode; label: string }[] = [
    { value: 'mapa_entero', label: 'Mapa entero' },
    { value: 'cps', label: 'Por CP' },
];

/** Zona del formulario: el mapa entero o los CP elegidos, con las celdas y vehículos que salen. */
export function SectorsZoneSection({ zone, fleet, loading, error, onChangeMode, onTogglePostcode }: {
    zone: FormZone;
    fleet: FormFleet;
    // Lo que se está recalculando; null si nada.
    loading: 'zone' | 'fleet' | null;
    error: string | null;
    onChangeMode: (mode: ZoneMode) => void;
    onTogglePostcode: (postcode: string) => void;
}) {
    const colores = useColores();
    const [filter, setFilter] = useState('');
    const [showAll, setShowAll] = useState(false);

    const matchingPostcodes = useMemo(
        () => zone.cps_disponibles.filter((item) => item.cp.includes(filter.trim())),
        [zone.cps_disponibles, filter],
    );
    const visiblePostcodes = showAll ? matchingPostcodes : matchingPostcodes.slice(0, VISIBLE_POSTCODES);
    const hiddenCount = matchingPostcodes.length - visiblePostcodes.length;

    return (
        <View className="gap-3 rounded-xl border border-borde bg-superficie p-3">
            <Text className="text-[11px] font-semibold uppercase text-texto-tenue">Zona</Text>

            <View className="flex-row flex-wrap gap-2">
                {ZONE_MODES.map((mode) => (
                    <Chip
                        key={mode.value}
                        label={mode.label}
                        selected={zone.modo === mode.value}
                        onPress={() => onChangeMode(mode.value)}
                    />
                ))}
            </View>

            {zone.modo === 'cps' && (
                <>
                    <TextInput
                        value={filter}
                        onChangeText={setFilter}
                        placeholder="Filtrar CP…"
                        placeholderTextColor={colores['texto-tenue']}
                        keyboardType="number-pad"
                        accessibilityLabel="Filtrar códigos postales"
                        className="rounded-xl border border-borde-medio bg-superficie px-3 py-2 text-sm text-texto"
                    />
                    <View className="flex-row flex-wrap gap-2">
                        {visiblePostcodes.map((item) => (
                            <Chip
                                key={item.cp}
                                label={item.cp}
                                selected={zone.cps_seleccionados.includes(item.cp)}
                                onPress={() => onTogglePostcode(item.cp)}
                            />
                        ))}
                        {hiddenCount > 0 && (
                            <Chip label={`+${hiddenCount}`} selected={false} onPress={() => setShowAll(true)} />
                        )}
                    </View>
                    {matchingPostcodes.length === 0 && (
                        <Text className="text-xs text-texto-tenue">Ningún código postal del mapa coincide.</Text>
                    )}
                </>
            )}

            {zone.cps_no_encontrados.length > 0 && (
                <View className="flex-row items-start gap-2 rounded-lg bg-aviso-suave px-3 py-2">
                    <TriangleAlert size={14} color={colores.aviso} style={{ marginTop: 1 }} />
                    <Text className="flex-1 text-xs text-aviso">
                        Ignorados por no estar en el mapa: {zone.cps_no_encontrados.join(', ')}
                    </Text>
                </View>
            )}

            {loading ? (
                <View className="flex-row items-center gap-2">
                    <ActivityIndicator size={14} color={colores.primario} />
                    <Text className="text-xs text-texto-tenue">
                        {loading === 'zone' ? 'Recalculando la zona…' : 'Recalculando la flota…'}
                    </Text>
                </View>
            ) : (
                <Text className="text-xs text-texto-secundario">
                    {formatInteger(zone.num_celdas)} de {formatInteger(zone.num_celdas_mapa)} celdas
                    {' · '}{formatInteger(countFleetVehicles(fleet))} vehículos
                </Text>
            )}
            {error && <Text className="text-xs text-peligro">{error}</Text>}
        </View>
    );
}
