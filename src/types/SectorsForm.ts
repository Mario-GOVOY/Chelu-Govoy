// Formulario de optimización de sectores (evento 'formulario_sectores').
// Va con los nombres del back: se edita y se devuelve tal cual en el campo `formulario` del stream.

export type FormMap = {
    // id_cell_group; no se enseña.
    id: number;
    nombre: string;
    deposito: string;
    id_depot: number;
    fecha_min: string;
    fecha_max: string;
};

export type FormPostcode = { cp: string; num_celdas: number };

export type FormZone = {
    // 'mapa_entero', 'cps' o 'proveedor'.
    modo: string;
    cps_disponibles: FormPostcode[];
    cps_seleccionados: string[];
    cps_no_encontrados: string[];
    num_celdas: number;
    num_celdas_mapa: number;
};

export type FormStudyRange = {
    fecha_inicio: string | null;
    fecha_final: string | null;
    // 0 = lunes … 6 = domingo; los 7 días = null.
    dias_semana: number[] | null;
    fecha_min_mapa: string;
    fecha_max_mapa: string;
    // Lo redacta el back; se pinta tal cual.
    etiqueta: string;
};

export type FormDemandOption = { nivel: string; percentil: number };
export type FormDemand = { nivel: string; percentil: number; opciones: FormDemandOption[] };

export type FormVehicle = {
    nombre: string;
    capacidad: number;
    hora_inicio: string;
    hora_fin: string;
    maxdestinos: number;
    cantidad: number;
    cps_en_zona?: string[];
    // Los desmarcados no se borran: van con incluido: false.
    incluido?: boolean;
};

export type FormFleet = {
    // 'recomendada', 'escenarios' o 'personalizada'.
    tipo: string;
    opciones: string[];
    origen: string;
    vehiculos: FormVehicle[];
    // Sin capacidad en Fleet: se enseñan aparte.
    descartados: FormVehicle[];
    // Flotas de los escenarios tocadas a mano. Sin ellas, se calculan a partir de vehiculos.
    escenarios_editados?: { ajustado?: FormVehicle[]; holgado?: FormVehicle[] };
    num_vehiculos: number;
    capacidad_total: number;
};

export type FormMode = { valor: string; opciones: string[]; asignacion_multiple: boolean | null };

export type FormProvider = { nombre: string; cps: string[]; num_cps: number };

export type SectorsFormPayload = {
    mapa: FormMap | null;
    mapas_disponibles: FormMap[];
    zona: FormZone;
    rango_estudio: FormStudyRange;
    demanda: FormDemand;
    flota: FormFleet;
    carga_minima: { porcentaje: number };
    modo: FormMode;
    limites: { max_escenarios: number };
    avisos: string[];
};

export type SectorsForm = SectorsFormPayload & {
    // Los que vienen del historial no se lanzan tal cual: la flota puede haber cambiado.
    readOnly?: boolean;
};
