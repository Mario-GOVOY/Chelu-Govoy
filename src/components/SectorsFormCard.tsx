import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CircleCheck, MessageSquare, Pencil, Play, RotateCw, SlidersHorizontal } from 'lucide-react-native';

import {
    capitalize,
    countFleetVehicles,
    getFleetCapacity,
    getFleetLabel,
    getFleetScenarios,
    getLaunchBlocker,
    getModeLabel,
    getRangeLabel,
} from '@/chat/sectorsForm';
import { FormCard } from '@/components/ui/form/FormCard';
import { SummaryRow } from '@/components/ui/form/SummaryRow';
import { Selector } from '@/components/ui/Selector';
import { useSesionActiva } from '@/context/SesionContext';
import { useColores } from '@/theme/ThemeProvider';
import type { FormMap, SectorsForm } from '@/types/SectorsForm';
import { esSesionMaster } from '@/utils/ControlOpcionesUsuarios';
import { formatIsoDate } from '@/utils/fechas';
import { formatInteger } from '@/utils/numbers';

const formatVehicles = (count: number) => `${formatInteger(count)} ${count === 1 ? 'vehículo' : 'vehículos'}`;

// Mapas internos de pruebas de GOVOY: solo se ofrecen en sesiones master.
const INTERNAL_MAP_REGEX = /PRUEBAS? GOVOY/i;

/** Resumen del formulario de sectores con el mapa a elegir y los botones para editarlo y lanzar la optimización. */
export function SectorsFormCard({ form, onLaunch, onRefine, onChangeMap, onEdit }: {
    form: SectorsForm;
    // Sin ellos (Chelu está respondiendo), los botones salen desactivados.
    onLaunch?: () => void;
    // Abre la hoja para pedirle a Chelu que ajuste el formulario.
    onRefine?: () => void;
    // Carga el formulario del mapa (sin mapa, uno sin elegir); si falla, lanza el error que se enseña en la tarjeta.
    onChangeMap: (mapId?: number) => Promise<void>;
    // Abre la pantalla de edición con el mapa elegido.
    onEdit: (map: FormMap) => void;
}) {
    const colores = useColores();
    const { sesion } = useSesionActiva();
    const [loadingMap, setLoadingMap] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [openingEditor, setOpeningEditor] = useState(false);
    const { mapa, zona, rango_estudio, demanda, flota, carga_minima, modo } = form;
    const blocker = getLaunchBlocker(form, false);
    const canLaunch = !blocker && !!onLaunch && !form.readOnly && !form.launched && !loadingMap && !openingEditor;
    const canRefine = !getLaunchBlocker(form, true) && !!onRefine && !loadingMap && !openingEditor;

    // El mapa actual siempre en la lista, aunque no venga en los disponibles.
    const maps = mapa && !form.mapas_disponibles.some((item) => item.id === mapa.id)
        ? [mapa, ...form.mapas_disponibles]
        : form.mapas_disponibles;
    const mapOptions = maps
        .filter((item) => esSesionMaster(sesion) || !INTERNAL_MAP_REGEX.test(item.nombre))
        .map((item) => ({ value: String(item.id), label: `${item.nombre} · ${item.deposito}` }));

    // El editor tarda en montarse: se deja un fotograma para que se vea el indicador antes.
    const openEditor = (map: FormMap) => {
        setOpeningEditor(true);
        requestAnimationFrame(() => {
            onEdit(map);
            setOpeningEditor(false);
        });
    };

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

    const footer = form.launched ? (
        form.accion === 'revisar' ? (
            <View className="flex-row items-center justify-end gap-1.5">
                <CircleCheck size={14} color={colores.primario} />
                <Text className="text-[13px] font-semibold text-primario">Mandado a revisar a Chelu</Text>
            </View>
        ) : (
            <View className="flex-row items-center justify-end gap-1.5">
                <CircleCheck size={14} color={colores.exito} />
                <Text className="text-[13px] font-semibold text-exito">Optimización lanzada con estos valores</Text>
            </View>
        )
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
            {/* Abre la hoja para escribirle a Chelu. Con flota personalizada, el texto es la flota. */}
            <Pressable
                onPress={onRefine}
                disabled={!canRefine}
                accessibilityRole="button"
                accessibilityLabel="Afinar con Chelu"
                accessibilityState={{ disabled: !canRefine }}
            >
                {/* Colores y opacidad en style: con clases que cambian, NativeWind puede no repintar. */}
                {({ pressed }) => (
                    <View
                        className="flex-row items-center gap-2 rounded-xl border border-borde-medio px-3 py-2.5"
                        style={{
                            backgroundColor: !canRefine ? colores.fondo : pressed ? colores['primario-suave'] : colores.superficie,
                            opacity: canRefine ? 1 : 0.5,
                        }}
                    >
                        <MessageSquare size={16} color={canRefine ? colores.primario : colores['texto-tenue']} />
                        <Text
                            className="flex-1 text-sm"
                            style={{ color: canRefine ? colores['texto-secundario'] : colores['texto-tenue'] }}
                        >
                            {flota.tipo === 'personalizada' ? 'Describe la flota a Chelu' : '¿Algo que afinar?'}
                        </Text>
                    </View>
                )}
            </Pressable>
            {blocker && <Text className="text-right text-xs font-semibold text-peligro">{blocker}</Text>}
            <View className="flex-row items-center justify-end gap-2">
                {/* La zona y la flota dependen del mapa: sin él no hay nada que editar. */}
                {mapa && (
                    <Pressable
                        onPress={() => openEditor(mapa)}
                        disabled={loadingMap || openingEditor}
                        accessibilityRole="button"
                        accessibilityLabel="Editar"
                        accessibilityState={{ disabled: loadingMap, busy: openingEditor }}
                        className={`flex-row items-center gap-1.5 rounded-full border border-borde-medio px-3 py-1.5 active:bg-primario-suave ${loadingMap ? 'opacity-60' : ''}`}
                    >
                        {openingEditor
                            ? <ActivityIndicator size={14} color={colores.primario} />
                            : <Pencil size={14} color={colores.primario} />}
                        <Text className="text-[13px] font-semibold text-primario">Editar</Text>
                    </Pressable>
                )}
                <Pressable
                    onPress={onLaunch}
                    disabled={!canLaunch}
                    accessibilityRole="button"
                    accessibilityLabel="Optimizar"
                    accessibilityState={{ disabled: !canLaunch }}
                    className={`flex-row items-center gap-1.5 rounded-full border border-primario bg-primario px-3 py-1.5 active:bg-primario-presionado ${canLaunch ? '' : 'opacity-60'}`}
                >
                    <Play size={14} color={colores['sobre-primario']} />
                    <Text className="text-[13px] font-semibold text-sobre-primario">Optimizar</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <FormCard
            icon={SlidersHorizontal}
            title="Optimización de sectores"
            subtitle={subtitle}
            warnings={form.launched ? [] : form.avisos}
            dimmed={form.readOnly}
            footer={footer}
        >
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
        </FormCard>
    );
}
