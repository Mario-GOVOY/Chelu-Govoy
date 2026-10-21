import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { isProviderSelected } from '@/chat/sectorsForm';
import { Chip } from '@/components/ui/Chip';
import { FormSection } from '@/components/ui/form/FormSection';
import { Warning } from '@/components/ui/form/Warning';
import { useColores } from '@/theme/ThemeProvider';
import type { FormProvider, FormZone, ZoneMode } from '@/types/SectorsForm';
import { formatInteger } from '@/utils/numbers';
import { normalizeForSearch } from '@/utils/text';

const ZONE_MODES: { value: ZoneMode; label: string }[] = [
    { value: 'mapa_entero', label: 'Mapa entero' },
    { value: 'cps', label: 'Por CP' },
    { value: 'proveedor', label: 'Por proveedor' },
];

/** Zona del formulario: el mapa entero, los CP elegidos o los de un proveedor, con las celdas y vehículos que salen. */
export const SectorsZoneSection = memo(function SectorsZoneSection({
    zone,
    vehicleCount,
    loading,
    error,
    providers,
    loadingProviders,
    onChangeMode,
    onTogglePostcode,
    onToggleProvider,
}: {
    zone: FormZone;
    // Vehículos incluidos de la flota.
    vehicleCount: number;
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
    const [switchingMode, setSwitchingMode] = useState<ZoneMode | null>(null);

    // Montar todos los chips de CP o de proveedores tarda: se deja un fotograma para que se vea el indicador.
    const changeMode = (mode: ZoneMode) => {
        if (mode === zone.modo) return;
        setSwitchingMode(mode);
        requestAnimationFrame(() => {
            onChangeMode(mode);
            setSwitchingMode(null);
        });
    };

    const matchingPostcodes = useMemo(
        () => zone.cps_disponibles.filter((item) => item.cp.includes(filter.trim())),
        [zone.cps_disponibles, filter],
    );
    const matchingProviders = useMemo(() => {
        const search = normalizeForSearch(providerFilter.trim());
        return (providers ?? []).filter((provider) => normalizeForSearch(provider.nombre).includes(search));
    }, [providers, providerFilter]);

    // Los chips solo cambian con los CP elegidos o el filtro: al marcar un vehículo (cambia el recuento) no se repintan.
    const postcodeChips = useMemo(() => zone.modo === 'cps' && matchingPostcodes.map((item) => (
        <Chip
            key={item.cp}
            label={item.cp}
            selected={zone.cps_seleccionados.includes(item.cp)}
            onPress={() => onTogglePostcode(item.cp)}
        />
    )), [zone.modo, matchingPostcodes, zone.cps_seleccionados, onTogglePostcode]);

    const providerChips = useMemo(() => zone.modo === 'proveedor' && matchingProviders.map((provider) => (
        <Chip
            key={provider.nombre}
            label={`${provider.nombre} (${provider.num_cps})`}
            selected={isProviderSelected(provider, zone.cps_seleccionados)}
            onPress={() => onToggleProvider(provider)}
        />
    )), [zone.modo, matchingProviders, zone.cps_seleccionados, onToggleProvider]);

    return (
        <FormSection title="Zona">
            <View className="flex-row flex-wrap gap-2">
                {ZONE_MODES.map((mode) => (
                    <Chip
                        key={mode.value}
                        label={mode.label}
                        selected={zone.modo === mode.value}
                        onPress={() => changeMode(mode.value)}
                        loading={switchingMode === mode.value}
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
                        {postcodeChips}
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
                            {providerChips}
                        </ScrollView>
                        {matchingProviders.length === 0 && (
                            <Text className="text-xs text-texto-tenue">Ningún proveedor coincide.</Text>
                        )}
                    </>
                )
            )}

            {zone.cps_no_encontrados.length > 0 && (
                <Warning text={`Ignorados por no estar en el mapa: ${zone.cps_no_encontrados.join(', ')}`} />
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
                    {' · '}{formatInteger(vehicleCount)} vehículos
                </Text>
            )}
            {error && <Text className="text-xs text-peligro">{error}</Text>}
        </FormSection>
    );
});
