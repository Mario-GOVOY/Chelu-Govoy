import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CircleCheck, Pencil, Play, RotateCw, SlidersHorizontal, TriangleAlert } from 'lucide-react-native';

import {
    capitalize,
    countFleetVehicles,
    formatIsoDate,
    getFleetCapacity,
    getFleetLabel,
    getFleetScenarios,
    getLaunchBlocker,
    getModeLabel,
    getRangeLabel,
} from '@/chat/sectorsForm';
import { Selector } from '@/components/ui/Selector';
import { useSesionActiva } from '@/context/SesionContext';
import { useColores } from '@/theme/ThemeProvider';
import type { FormMap, SectorsForm } from '@/types/SectorsForm';
import { esSesionMaster } from '@/utils/ControlOpcionesUsuarios';
import { formatInteger } from '@/utils/numbers';

const formatVehicles = (count: number) => `${formatInteger(count)} ${count === 1 ? 'vehículo' : 'vehículos'}`;

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <View className="flex-row gap-3 border-t border-borde py-2">
            <Text className="w-24 text-[11px] font-semibold uppercase text-texto-tenue">{label}</Text>
            <View className="flex-1">{children}</View>
        </View>
    );
}

// Mapas internos de pruebas de GOVOY: solo se ofrecen en sesiones master.
const INTERNAL_MAP_REGEX = /PRUEBAS? GOVOY/i;

/** Resumen del formulario de sectores con el mapa a elegir y los botones para editarlo y lanzar la optimización. */
export function SectorsFormCard({ form, onLaunch, onChangeMap, onEdit }: {
    form: SectorsForm;
    // Sin él (Chelu está respondiendo), el botón sale desactivado.
    onLaunch?: () => void;
    // Carga el formulario del mapa (sin mapa, uno sin elegir); si falla, lanza el error que se enseña en la tarjeta.
    onChangeMap: (mapId?: number) => Promise<void>;
    // Abre la pantalla de edición con el mapa elegido.
    onEdit: (map: FormMap) => void;
}) {
    const colores = useColores();
    const { sesion } = useSesionActiva();
    const [loadingMap, setLoadingMap] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const { mapa, zona, rango_estudio, demanda, flota, carga_minima, modo } = form;
    const blocker = getLaunchBlocker(form);
    const canLaunch = !blocker && !!onLaunch && !form.readOnly && !form.launched && !loadingMap;

    // El mapa actual siempre en la lista, aunque no venga en los disponibles.
    const maps = mapa && !form.mapas_disponibles.some((item) => item.id === mapa.id)
        ? [mapa, ...form.mapas_disponibles]
        : form.mapas_disponibles;
    const mapOptions = maps
        .filter((item) => esSesionMaster(sesion) || !INTERNAL_MAP_REGEX.test(item.nombre))
        .map((item) => ({ value: String(item.id), label: `${item.nombre} · ${item.deposito}` }));

    const changeMap = async (mapId?: number) => {
        setMapError(null);
        setLoadingMap(true);
        try {
            await onChangeMap(mapId);
        } catch (e) {
            setMapError(e instanceof Error ? e.message : 'No se pudo cargar el mapa.');
        } finally {
            setLoadingMap(false);
        }
    };

    const subtitle = form.launched
        ? null
        : form.readOnly
            ? 'De una conversación anterior. Vuelve a cargarlo para editarlo'
            : 'Revisa los valores y lanza la optimización';

    return (
        <View className="gap-2 rounded-xl border border-borde bg-superficie px-3 py-3">
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primario-suave">
                    <SlidersHorizontal size={20} color={colores.primario} />
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-texto">Optimización de sectores</Text>
                    {subtitle && <Text className="text-xs text-texto-tenue">{subtitle}</Text>}
                </View>
            </View>

            {/* Opacidad en style: al cambiar la clase de una vista ya montada, NativeWind puede no repintarla. */}
            <View className="gap-2" style={{ opacity: form.readOnly ? 0.5 : 1 }}>
                {!form.launched && form.avisos.map((aviso) => (
                    <View key={aviso} className="flex-row items-start gap-2 rounded-lg bg-aviso-suave px-3 py-2">
                        <TriangleAlert size={14} color={colores.aviso} style={{ marginTop: 1 }} />
                        <Text className="flex-1 text-xs text-aviso">{aviso}</Text>
                    </View>
                ))}

                <View>
                    <SummaryRow label="Mapa">
                        {form.launched || form.readOnly ? (
                            <Text className="text-[13px] text-texto">{mapa?.nombre ?? 'Sin elegir'}</Text>
                        ) : (
                            <Selector
                                opciones={mapOptions}
                                valor={mapa ? String(mapa.id) : null}
                                onCambiar={(value) => value && changeMap(Number(value))}
                                placeholder="Elige un mapa"
                                etiqueta="Mapa"
                            />
                        )}
                        {mapa && (
                            <Text className="mt-1 text-xs text-texto-tenue">
                                {formatIsoDate(mapa.fecha_min)} - {formatIsoDate(mapa.fecha_max)}
                            </Text>
                        )}
                        {/* Al volver a cargar, la carga y el error salen junto a su botón. */}
                        {loadingMap && !form.readOnly && (
                            <View className="mt-1 flex-row items-center gap-2">
                                <ActivityIndicator size={14} color={colores.primario} />
                                <Text className="text-xs text-texto-tenue">Cargando el mapa…</Text>
                            </View>
                        )}
                        {mapError && !form.readOnly && <Text className="mt-1 text-xs text-peligro">{mapError}</Text>}
                    </SummaryRow>
                    <SummaryRow label="Zona">
                        <Text className="text-[13px] text-texto">
                            {zona.cps_seleccionados.length ? `Por CP: ${zona.cps_seleccionados.join(', ')}` : 'Mapa entero'}
                            <Text className="text-texto-tenue"> · {formatInteger(zona.num_celdas)} celdas</Text>
                        </Text>
                    </SummaryRow>
                    <SummaryRow label="Rango">
                        <Text className="text-[13px] text-texto">{getRangeLabel(rango_estudio)}</Text>
                    </SummaryRow>
                    <SummaryRow label="Demanda">
                        <Text className="text-[13px] text-texto">
                            {demanda.nivel === 'personalizado' ? `${demanda.percentil} %` : capitalize(demanda.nivel)}
                        </Text>
                    </SummaryRow>
                    <SummaryRow label="Flota">
                        <Text className="text-[13px] text-texto">{getFleetLabel(flota.tipo)}</Text>
                        {flota.tipo === 'escenarios' ? (
                            getFleetScenarios(flota).map((scenario) => (
                                <Text key={scenario.key} className="text-xs text-texto-tenue">
                                    {scenario.label}: {formatVehicles(scenario.vehicleCount)}
                                    {scenario.edited ? ' · flota propia' : ''}
                                </Text>
                            ))
                        ) : (
                            <Text className="text-xs text-texto-tenue">
                                {formatVehicles(countFleetVehicles(flota))} · {formatInteger(getFleetCapacity(flota))} de capacidad
                            </Text>
                        )}
                    </SummaryRow>
                    <SummaryRow label="Capacidad">
                        <Text className="text-[13px] text-texto">
                            {carga_minima.porcentaje > 0
                                ? `Aprovechamiento mínimo del ${carga_minima.porcentaje} % por vehículo`
                                : 'Sin aprovechamiento mínimo'}
                        </Text>
                    </SummaryRow>
                    {!!modo.valor && (
                        <SummaryRow label="Optimización">
                            <Text className="text-[13px] text-texto">
                                {getModeLabel(modo.valor)}
                                {/* La asignación múltiple solo se aplica en fragmentado. */}
                                {modo.valor === 'fragmentado' && modo.asignacion_multiple ? ' · asignación múltiple' : ''}
                            </Text>
                        </SummaryRow>
                    )}
                </View>
            </View>

            {form.launched ? (
                <View className="flex-row items-center justify-end gap-1.5">
                    <CircleCheck size={14} color={colores.exito} />
                    <Text className="text-[13px] font-semibold text-exito">Optimización lanzada con estos valores</Text>
                </View>
            ) : form.readOnly ? (
                // Vuelve a pedir el formulario del mismo mapa (o uno sin elegir) con los datos de hoy, ya editable.
                <View className="gap-2">
                    {mapError && <Text className="text-right text-xs text-peligro">{mapError}</Text>}
                    <View className="flex-row justify-end">
                        <Pressable
                            onPress={() => changeMap(mapa?.id)}
                            disabled={loadingMap}
                            accessibilityRole="button"
                            accessibilityLabel="Volver a cargar"
                            accessibilityState={{ busy: loadingMap }}
                            className="flex-row items-center gap-1.5 rounded-full border border-borde-medio px-3 py-1.5 active:bg-primario-suave"
                        >
                            {loadingMap
                                ? <ActivityIndicator size={14} color={colores.primario} />
                                : <RotateCw size={14} color={colores.primario} />}
                            <Text className="text-[13px] font-semibold text-primario">
                                {loadingMap ? 'Cargando…' : 'Volver a cargar'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <View className="gap-2">
                    {blocker && <Text className="text-right text-xs font-semibold text-peligro">{blocker}</Text>}
                    <View className="flex-row items-center justify-end gap-2">
                        {/* La zona y la flota dependen del mapa: sin él no hay nada que editar. */}
                        {mapa && (
                            <Pressable
                                onPress={() => onEdit(mapa)}
                                disabled={loadingMap}
                                accessibilityRole="button"
                                accessibilityLabel="Editar"
                                accessibilityState={{ disabled: loadingMap }}
                                className={`flex-row items-center gap-1.5 rounded-full border border-borde-medio px-3 py-1.5 active:bg-primario-suave ${loadingMap ? 'opacity-60' : ''}`}
                            >
                                <Pencil size={14} color={colores.primario} />
                                <Text className="text-[13px] font-semibold text-primario">Editar</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onLaunch}
                            disabled={!canLaunch}
                            accessibilityRole="button"
                            accessibilityLabel="Optimizar"
                            accessibilityState={{ disabled: !canLaunch }}
                            className={`flex-row items-center gap-1.5 rounded-full bg-primario px-3 py-1.5 active:bg-primario-presionado ${canLaunch ? '' : 'opacity-60'}`}
                        >
                            <Play size={14} color={colores['sobre-primario']} />
                            <Text className="text-[13px] font-semibold text-sobre-primario">Optimizar</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}
