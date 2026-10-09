import type { FormFleet, FormProvider, FormStudyRange, FormVehicle, SectorsFormPayload } from '@/types/SectorsForm';

export const getIncludedVehicles = (vehicles: FormVehicle[]) => vehicles.filter((vehicle) => vehicle.incluido !== false);

export const countUnits = (vehicles: FormVehicle[]) => vehicles.reduce((total, vehicle) => total + (vehicle.cantidad || 1), 0);

export const getListCapacity = (vehicles: FormVehicle[]) =>
    vehicles.reduce((total, vehicle) => total + (vehicle.capacidad || 0) * (vehicle.cantidad || 1), 0);

export function countFleetVehicles(fleet: FormFleet): number {
    if (!fleet.vehiculos.length) return fleet.num_vehiculos;
    return countUnits(getIncludedVehicles(fleet.vehiculos));
}

export function getFleetCapacity(fleet: FormFleet): number {
    if (!fleet.vehiculos.length) return fleet.capacidad_total;
    return getListCapacity(getIncludedVehicles(fleet.vehiculos));
}

export type FleetScenario = {
    key: 'ajustado' | 'recomendada' | 'holgado';
    label: string;
    vehicleCount: number;
    vehicles: FormVehicle[];
    // La flota del escenario se ha tocado a mano y ya no sale de la recomendada.
    edited: boolean;
};

// Una unidad menos: baja la cantidad del último tipo o, si solo quedaba una, quita la fila.
function removeOneUnit(vehicles: FormVehicle[]): FormVehicle[] {
    if (!vehicles.length) return [];
    const last = vehicles.length - 1;
    const quantity = vehicles[last].cantidad || 1;
    return quantity > 1
        ? vehicles.map((vehicle, i) => (i === last ? { ...vehicle, cantidad: quantity - 1 } : vehicle))
        : vehicles.slice(0, last);
}

// Nombre con sufijo -N que no esté usado, a partir del nombre sin sufijo.
function getFreeName(name: string, usedNames: Set<string>): string {
    const base = (name || 'VEHICULO').replace(/-\d+$/, '');
    let suffix = 2;
    while (usedNames.has(`${base}-${suffix}`)) suffix++;
    return `${base}-${suffix}`;
}

// Una unidad más: una fila nueva, copia del último tipo.
function addOneUnit(vehicles: FormVehicle[]): FormVehicle[] {
    if (!vehicles.length) return [];
    const last = vehicles[vehicles.length - 1];
    const usedNames = new Set(vehicles.map((vehicle) => vehicle.nombre));
    return [...vehicles, { ...last, nombre: getFreeName(last.nombre, usedNames), cantidad: 1, incluido: undefined }];
}

/** Los tres escenarios de la flota: uno menos, la recomendada y uno más, salvo los tocados a mano. */
export function getFleetScenarios(fleet: FormFleet): FleetScenario[] {
    const base = getIncludedVehicles(fleet.vehiculos);
    const edited = fleet.escenarios_editados ?? {};

    // Sin lista de vehículos solo se conocen los recuentos.
    if (!base.length && !edited.ajustado && !edited.holgado) {
        const recommended = countFleetVehicles(fleet);
        return [
            { key: 'ajustado', label: 'Ajustado', vehicleCount: Math.max(0, recommended - 1), vehicles: [], edited: false },
            { key: 'recomendada', label: 'Recomendada', vehicleCount: recommended, vehicles: [], edited: false },
            { key: 'holgado', label: 'Holgado', vehicleCount: recommended > 0 ? recommended + 1 : 0, vehicles: [], edited: false },
        ];
    }

    const resolve = (derived: FormVehicle[], override?: FormVehicle[]) => {
        const vehicles = override ?? derived;
        return { vehicleCount: countUnits(getIncludedVehicles(vehicles)), vehicles, edited: !!override };
    };
    return [
        { key: 'ajustado', label: 'Ajustado', ...resolve(removeOneUnit(base), edited.ajustado) },
        { key: 'recomendada', label: 'Recomendada', vehicleCount: countUnits(base), vehicles: base, edited: false },
        { key: 'holgado', label: 'Holgado', ...resolve(addOneUnit(base), edited.holgado) },
    ];
}

export const getFleetLabel = (type: string) =>
    type === 'escenarios' ? 'Múltiples escenarios' : type === 'personalizada' ? 'Personalizada' : 'Recomendada';

export const getModeLabel = (mode: string) =>
    mode === 'fragmentado' ? 'SmartZone Fragmentado' : mode === 'celdas' ? 'SmartZone Celdas' : capitalize(mode);

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Días elegidos (0 = lunes); null son todos. */
export const getWeekdaysLabel = (weekdays: number[] | null) =>
    weekdays ? [...weekdays].sort((a, b) => a - b).map((day) => WEEKDAY_NAMES[day]).join(', ') : 'todos los días';

// Se calcula aquí y no se usa la etiqueta del back, que no cambia al editar el rango.
export function getRangeLabel(range: FormStudyRange): string {
    const dates = range.fecha_inicio && range.fecha_final
        ? `Del ${formatIsoDate(range.fecha_inicio)} al ${formatIsoDate(range.fecha_final)}`
        : 'Histórico del mapa';
    return `${dates} · ${getWeekdaysLabel(range.dias_semana)}`;
}

/** aaaa-mm-dd → dd/mm/aaaa. */
export function formatIsoDate(iso: string): string {
    const [year, month, day] = iso.split('-');
    return day ? `${day}/${month}/${year}` : iso;
}

/** aaaa-mm-dd → Date a las 00:00 de la hora local. */
export function parseIsoDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/** Date → aaaa-mm-dd con la fecha local. */
export const toIsoDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** El proveedor cuenta como elegido si todos sus CP están entre los elegidos. */
export const isProviderSelected = (provider: FormProvider, selectedPostcodes: string[]) =>
    provider.cps.length > 0 && provider.cps.every((cp) => selectedPostcodes.includes(cp));

/** Motivo por el que no se puede lanzar tal cual; null si se puede. */
export function getLaunchBlocker(form: SectorsFormPayload): string | null {
    if (!form.mapa) return 'Elige un mapa';
    if (form.zona.modo !== 'mapa_entero' && !form.zona.cps_seleccionados.length) return 'Elige al menos un código postal';
    if (form.flota.tipo === 'personalizada') return 'Describe la flota en el cuadro de texto';
    if (countFleetVehicles(form.flota) === 0) return 'No queda ningún vehículo marcado';
    return null;
}
