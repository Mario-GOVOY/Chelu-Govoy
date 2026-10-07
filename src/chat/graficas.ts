import type { Grafica } from '@/types/Chat';

export const PALETA_GRAFICAS = [
    '#128bec', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#0ea5e9', '#a3e635',
    '#e11d48', '#6366f1', '#84cc16', '#06b6d4', '#fb923c',
    '#10b981', '#d946ef', '#eab308', '#3b82f6', '#f43f5e',
];

export type TipoGrafica = 'barras' | 'lineas' | 'area' | 'circular' | 'donut' | 'radial';

export type DatosGrafica = {
    tipo: TipoGrafica;
    titulo?: string;
    // Eje X en las cartesianas; nombre de cada porción en las circulares.
    categorias: string[];
    // Las circulares tienen una sola serie.
    series: { nombre: string; valores: number[] }[];
};

// Los tipos que puede pedir el agente (generar_grafica en el back).
const TIPOS: Record<string, TipoGrafica> = {
    bar: 'barras',
    column: 'barras',
    line: 'lineas',
    area: 'area',
    pie: 'circular',
    donut: 'donut',
    radialBar: 'radial',
};

const aNumero = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Lee la gráfica que manda el back (series y options de ApexCharts).
 * Devuelve null si el tipo no se sabe pintar o no trae datos.
 */
export function leerGrafica(g: Grafica): DatosGrafica | null {
    const opciones: any = g.options ?? {};
    const tipo = TIPOS[opciones.chart?.type ?? g.grafico ?? 'bar'];
    if (!tipo || !g.series.length) return null;
    const titulo = g.titulo ?? opciones.title?.text ?? undefined;

    // Circulares: series = [números] y las etiquetas en options.labels.
    if (tipo === 'circular' || tipo === 'donut' || tipo === 'radial') {
        return {
            tipo,
            titulo,
            categorias: (opciones.labels ?? []).map(String),
            series: [{ nombre: titulo ?? '', valores: g.series.map(aNumero) }],
        };
    }

    // Cartesianas: series = [{ name, data }] y el eje X en options.xaxis.categories.
    return {
        tipo,
        titulo,
        categorias: (opciones.xaxis?.categories ?? []).map(String),
        series: g.series.map((s: any, i) => ({
            nombre: String(s?.name ?? `Serie ${i + 1}`),
            valores: Array.isArray(s?.data) ? s.data.map(aNumero) : [],
        })),
    };
}
