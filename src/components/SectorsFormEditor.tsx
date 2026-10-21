import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchSectorsFleet, fetchSectorsProviders, fetchSectorsZone } from '@/chat/chatApi';
import { changeScenarioVehicles, countFleetVehicles, isProviderSelected, type ScenarioKey } from '@/chat/sectorsForm';
import { SectorsFleetSection } from '@/components/SectorsFleetSection';
import { SectorsParamsSection } from '@/components/SectorsParamsSection';
import { SectorsRangeSection } from '@/components/SectorsRangeSection';
import { SectorsVehicleSheet, type VehicleEditing } from '@/components/SectorsVehicleSheet';
import { SectorsZoneSection } from '@/components/SectorsZoneSection';
import { FormEditorScreen } from '@/components/ui/form/FormEditorScreen';
import { useFormDraft } from '@/hooks/useFormDraft';
import type { FormFleet, FormMap, FormProvider, FormStudyRange, FormVehicle, SectorsForm, ZoneMode } from '@/types/SectorsForm';

// Espera tras tocar un CP antes de recalcular, para no pedir la zona en cada toque.
const RECALCULATE_DELAY_MS = 400;

// Sin tope de paradas propio (0): lo marca la capacidad.
const NEW_VEHICLE: FormVehicle = { nombre: '', capacidad: 0, hora_inicio: '08:00', hora_fin: '18:00', maxdestinos: 0, cantidad: 1 };

export type SectorsFormEditing = { form: SectorsForm; map: FormMap };

/**
 * Edición del formulario de sectores a pantalla completa. Es una capa encima del chat, así que va la última dentro de él.
 * Trabaja sobre una copia: los cambios pasan al chat solo al pulsar "Guardar".
 */
export function SectorsFormEditor({ editing, onSave, onClose }: {
    editing: SectorsFormEditing | null;
    onSave: (form: SectorsForm, editedForm: SectorsForm) => void;
    onClose: () => void;
}) {
    if (!editing) return null;

    return (
        <EditorContent
            form={editing.form}
            map={editing.map}
            onSave={(editedForm) => onSave(editing.form, editedForm)}
            onClose={onClose}
        />
    );
}

function EditorContent({ form, map, onSave, onClose }: {
    form: SectorsForm;
    map: FormMap;
    onSave: (editedForm: SectorsForm) => void;
    onClose: () => void;
}) {
    const { draft: borrador, setDraft: setBorrador, update, changed } = useFormDraft(form);
    const [loading, setLoading] = useState<'zone' | 'fleet' | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Proveedores del mapa; null hasta que se piden.
    const [providers, setProviders] = useState<FormProvider[] | null>(null);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [vehicleEditing, setVehicleEditing] = useState<VehicleEditing | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Las funciones que reciben las secciones son estables (useCallback): las secciones van con memo
    // y así no se repintan al cambiar otra parte del formulario.
    const cancelRecalculation = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        abortRef.current?.abort();
    }, []);

    // Al cerrar se cancela lo pendiente.
    useEffect(() => cancelRecalculation, [cancelRecalculation]);

    // La flota depende de la zona: al cambiar los CP se piden las dos.
    const recalculateZone = useCallback(async (postcodes: string[]) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setError(null);
        setLoading('zone');
        try {
            const zone = await fetchSectorsZone(map.id, postcodes, controller.signal);
            // Se mantiene el modo elegido. Los avisos del back eran del formulario tal como llegó.
            setBorrador((prev) => ({ ...prev, zona: { ...zone, modo: prev.zona.modo }, avisos: [] }));
            setLoading('fleet');
            const fleet = await fetchSectorsFleet(map.id, postcodes, controller.signal);
            // Se mezcla: el back no devuelve el tipo de flota, que es elección del usuario.
            // Los escenarios editados eran de la zona anterior: se vuelven a calcular.
            setBorrador((prev) => ({ ...prev, flota: { ...prev.flota, ...fleet, escenarios_editados: undefined } }));
            setLoading(null);
        } catch (e) {
            // Cancelada por otra petición o al cerrar: la siguiente pone el estado.
            if (controller.signal.aborted) return;
            setError(e instanceof Error ? e.message : 'No se pudo recalcular la zona.');
            setLoading(null);
        }
    }, [map.id, setBorrador]);

    // Cambia los CP elegidos y recalcula tras una espera, para no pedir la zona en cada toque.
    const changePostcodes = useCallback((postcodes: string[]) => {
        setBorrador((prev) => ({ ...prev, zona: { ...prev.zona, cps_seleccionados: postcodes } }));
        // Se cancela ya la petición en curso: su respuesta quitaría los CP tocados después.
        cancelRecalculation();
        setLoading('zone');
        timerRef.current = setTimeout(() => recalculateZone(postcodes), RECALCULATE_DELAY_MS);
    }, [setBorrador, cancelRecalculation, recalculateZone]);

    const selectedPostcodes = borrador.zona.cps_seleccionados;

    const togglePostcode = useCallback((postcode: string) => {
        changePostcodes(selectedPostcodes.includes(postcode)
            ? selectedPostcodes.filter((item) => item !== postcode)
            : [...selectedPostcodes, postcode]);
    }, [selectedPostcodes, changePostcodes]);

    // Se piden la primera vez que se acota por proveedor.
    const loadProviders = useCallback(async () => {
        setError(null);
        setLoadingProviders(true);
        try {
            setProviders(await fetchSectorsProviders(map.id));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar los proveedores.');
        } finally {
            setLoadingProviders(false);
        }
    }, [map.id]);

    const zoneMode = borrador.zona.modo;

    const changeZoneMode = useCallback((mode: ZoneMode) => {
        if (mode === zoneMode) return;
        setBorrador((prev) => ({
            ...prev,
            zona: { ...prev.zona, modo: mode, cps_seleccionados: mode === 'mapa_entero' ? [] : prev.zona.cps_seleccionados },
        }));
        if (mode === 'mapa_entero' && selectedPostcodes.length > 0) {
            cancelRecalculation();
            recalculateZone([]);
        }
        if (mode === 'proveedor' && !providers) loadProviders();
    }, [zoneMode, selectedPostcodes, providers, setBorrador, cancelRecalculation, recalculateZone, loadProviders]);

    // La sección de flota manda una función que recibe la flota actual.
    const changeFleet = useCallback((change: (fleet: FormFleet) => FormFleet) => {
        setBorrador((prev) => ({ ...prev, flota: change(prev.flota) }));
    }, [setBorrador]);

    const addVehicle = useCallback((scenario: ScenarioKey) => {
        setVehicleEditing({ scenario, index: null, vehicle: NEW_VEHICLE });
    }, []);

    const changeRange = useCallback((range: FormStudyRange) => update({ rango_estudio: range }), [update]);

    // Cambia los vehículos del escenario que se está editando en la hoja.
    const changeEditingVehicles = (change: (vehicles: FormVehicle[]) => FormVehicle[]) => {
        if (!vehicleEditing) return;
        setBorrador((prev) => ({ ...prev, flota: changeScenarioVehicles(prev.flota, vehicleEditing.scenario, change) }));
        setVehicleEditing(null);
    };

    const saveVehicle = (vehicle: FormVehicle) => {
        const index = vehicleEditing?.index ?? null;
        changeEditingVehicles((vehicles) => (index === null
            ? [...vehicles, vehicle]
            : vehicles.map((item, i) => (i === index ? vehicle : item))));
    };

    const deleteVehicle = () => {
        const index = vehicleEditing?.index;
        changeEditingVehicles((vehicles) => vehicles.filter((_, i) => i !== index));
    };

    // Marcar un proveedor añade sus CP a los elegidos; desmarcarlo quita todos los suyos.
    const toggleProvider = useCallback((provider: FormProvider) => {
        changePostcodes(isProviderSelected(provider, selectedPostcodes)
            ? selectedPostcodes.filter((cp) => !provider.cps.includes(cp))
            : [...new Set([...selectedPostcodes, ...provider.cps])]);
    }, [selectedPostcodes, changePostcodes]);

    // Mientras se recalcula no se guarda: lo que se ve aún no cuadra con los CP elegidos.
    return (
        <FormEditorScreen
            title="Editar optimización"
            subtitle={`${map.nombre} · ${map.deposito}`}
            changed={changed}
            saveDisabled={!!loading}
            onSave={() => onSave(borrador)}
            onClose={onClose}
            overlays={(
                <SectorsVehicleSheet
                    editing={vehicleEditing}
                    onSave={saveVehicle}
                    onDelete={deleteVehicle}
                    onClose={() => setVehicleEditing(null)}
                />
            )}
        >
            <SectorsZoneSection
                zone={borrador.zona}
                vehicleCount={countFleetVehicles(borrador.flota)}
                loading={loading}
                error={error}
                providers={providers}
                loadingProviders={loadingProviders}
                onChangeMode={changeZoneMode}
                onTogglePostcode={togglePostcode}
                onToggleProvider={toggleProvider}
            />
            <SectorsFleetSection
                fleet={borrador.flota}
                recalculating={!!loading}
                onChange={changeFleet}
                onEditVehicle={setVehicleEditing}
                onAddVehicle={addVehicle}
            />
            <SectorsRangeSection range={borrador.rango_estudio} onChange={changeRange} />
            <SectorsParamsSection
                demand={borrador.demanda}
                minimumLoad={borrador.carga_minima.porcentaje}
                mode={borrador.modo}
                onChange={update}
            />
        </FormEditorScreen>
    );
}
