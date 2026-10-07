import type { FeatureCollection, Geometry } from 'geojson';

export type ResumenChat = {
    id: string;
    titulo: string;
    actualizado: number;
};

export type Chat = {
    id: string;
    titulo: string;
    mensajes: Mensaje[];
};

export type Mensaje = {
    id: string;
    rol: 'usuario' | 'chelu';
    texto: string;
    // Turno del back al que pertenece la respuesta; hace falta para duplicar desde ella.
    runId?: string;
    // Solo en la respuesta que se está recibiendo o que se acaba de recibir.
    estado?: 'escribiendo' | 'detenida' | 'error';
    herramientas?: Herramienta[];
    // Preguntas que propone Chelu al acabar la respuesta.
    sugerencias?: string[];
    documentos?: Documento[];
    graficas?: Grafica[];
    mapas?: Mapa[];
    voto?: Voto | null;
};

// Gráfica de ApexCharts tal como la manda el back.
export type Grafica = {
    // Tipo de gráfica (bar, line, pie…), si no viene en options.chart.type.
    grafico?: string;
    titulo?: string;
    series: unknown[];
    options?: Record<string, unknown>;
};

// Mapa del chat (generar_mapa en el back). Ojo: centro y bounds van en [lat, lon],
// y las coordenadas del GeoJSON en [lon, lat].
export type Mapa = {
    titulo?: string;
    centro?: [number, number];
    bounds?: [[number, number], [number, number]];
    // Los de puntos y rutas traen numPuntos; los de zonas, numPoligonos.
    numPuntos?: number;
    numPoligonos?: number;
    // El back recortó los puntos por haber demasiados.
    truncado?: boolean;
    capas: CapaMapa[];
};

export type CapaMapa = {
    nombre: string;
    color: string;
    // 'points', 'lines' o 'polygons'.
    render?: string;
    // Tipo de marcador de los puntos si no lo trae cada uno.
    marcador?: string;
    geojson: FeatureCollection<Geometry, PropiedadesMapa | null>;
};

export type PropiedadesMapa = {
    etiqueta?: string | number;
    marcador?: string;
    // Posición de la parada en su ruta.
    orden?: number;
    estado?: string;
    tipo?: string;
    poligono?: string;
};

// Valoración de una respuesta. El motivo solo en las negativas.
export type Voto = {
    valoracion: 1 | -1;
    motivo?: string | null;
    nota?: string | null;
};

// Tarjeta "Consultando…" de la respuesta. Las llamadas iguales se agrupan en una.
export type Herramienta = {
    clave: string;
    etiqueta: string;
    veces: number;
    enCurso: number;
};

// Archivo generado por Chelu (Excel, PDF…).
export type Documento = {
    // Clave de S3: con ella /archivo da un enlace de descarga nuevo.
    fileId: string;
    nombre: string;
    formato: string;
    tamano?: number;
};
