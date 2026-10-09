import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { countFleetVehicles, isProviderSelected } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { useColores } from '@/theme/ThemeProvider';
import type { FormFleet, FormProvider, FormZone, ZoneMode } from '@/types/SectorsForm';
import { formatInteger } from '@/utils/numbers';

const ZONE_MODES: { value: ZoneMode; label: string }[] = [
    { value: 'mapa_entero', label: 'Mapa entero' },
    { value: 'cps', label: 'Por CP' },
    { value: 'proveedor', label: 'Por proveedor' },
];

// Para buscar sin distinguir mayúsculas ni tildes.
const normalizeText = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Zona del formulario: el mapa entero, los CP elegidos o los de un proveedor, con las celdas y vehículos que salen. */
export function SectorsZoneSection({
    zone,
    fleet,
    loading,
    error,
    providers,
    loadingProviders,
    onChangeMode,
    onTogglePostcode,
    onToggleProvider,
}: {
    zone: FormZone;
    fleet: FormFleet;
    // Lo que se está recalculando; null si nada.
    loading: 'zone' | 'fleet' | null;
    error: string | null;
    // null hasta que se piden.
    providers: FormProvider[] | null;
    loadingProviders: boolean;
    onChangeMode: (mode: ZoneMode) => void;
    onTogglePostcode: (postcode: string) => void;
    onToggleProvider: (provider: FormProvider) => void;
}) {
    const colores = useColores();
    const { height: windowHeight } = useWindowDimensions();
    const [filter, setFilter] = useState('');
    const [providerFilter, setProviderFilter] = useState('');

    const matchingPostcodes = useMemo(
        () => zone.cps_disponibles.filter((item) => item.cp.includes(filter.trim())),
        [zone.cps_disponibles, filter],
    );
    const matchingProviders = useMemo(() => {
        const search = normalizeText(providerFilter.trim());
        return (providers ?? []).filter((provider) => normalizeText(provider.nombre).includes(search));
    }, [providers, providerFilter]);

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
                    {/* Scroll propio dentro del de la pantalla. */}
                    <ScrollView
                        style={{ maxHeight: windowHeight * 0.5 }}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="flex-row flex-wrap gap-2"
                    >
                        {matchingPostcodes.map((item) => (
                            <Chip
                                key={item.cp}
                                label={item.cp}
                                selected={zone.cps_seleccionados.includes(item.cp)}
                                onPress={() => onTogglePostcode(item.cp)}
                            />
                        ))}
                    </ScrollView>
                    {matchingPostcodes.length === 0 && (
                        <Text className="text-xs text-texto-tenue">Ningún código postal del mapa coincide.</Text>
                    )}
                </>
            )}

            {zone.modo === 'proveedor' && (
                loadingProviders ? (
                    <View className="flex-row items-center gap-2">
                        <ActivityIndicator size={14} color={colores.primario} />
                        <Text className="text-xs text-texto-tenue">Cargando proveedores…</Text>
                    </View>
                ) : !providers ? null : providers.length === 0 ? (
                    <Text className="text-xs text-texto-tenue">Este mapa no tiene proveedores.</Text>
                ) : (
                    <>
                        <TextInput
                            value={providerFilter}
                            onChangeText={setProviderFilter}
                            placeholder="Buscar proveedor…"
                            placeholderTextColor={colores['texto-tenue']}
                            accessibilityLabel="Buscar proveedor"
                            className="rounded-xl border border-borde-medio bg-superficie px-3 py-2 text-sm text-texto"
                        />
                        <ScrollView
                            style={{ maxHeight: windowHeight * 0.5 }}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            contentContainerClassName="flex-row flex-wrap gap-2"
                        >
                            {matchingProviders.map((provider) => (
                                <Chip
                                    key={provider.nombre}
                                    label={`${provider.nombre} (${provider.num_cps})`}
                                    selected={isProviderSelected(provider, zone.cps_seleccionados)}
                                    onPress={() => onToggleProvider(provider)}
                                />
                            ))}
                        </ScrollView>
                        {matchingProviders.length === 0 && (
                            <Text className="text-xs text-texto-tenue">Ningún proveedor coincide.</Text>
                        )}
                    </>
                )
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
