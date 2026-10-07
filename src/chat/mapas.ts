import type { ImageRequireSource } from 'react-native';
import type {
    FillLayerSpecification,
    InitialViewState,
    LineLayerSpecification,
    StyleSpecification,
    SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection, Position } from 'geojson';

import { TILE_URL } from '@/auth/Constants';
import type { CapaMapa, Mapa, PropiedadesMapa } from '@/types/Chat';

// Solo las teselas de OSM; las capas del mapa van encima como fuentes GeoJSON.
export const ESTILO_MAPA: StyleSpecification = {
    version: 8,
    sources: { osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256, maxzoom: 19 } },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export const URL_ATRIBUCION_OSM = 'https://www.openstreetmap.org/copyright';

// Cómo se pintan los elementos, con el color de su capa. Cada una lee de la fuente de su tipo
// (ver elementosPorTipo) y van en orden: zonas debajo y puntos encima.
export const CAPAS_ELEMENTOS: (FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification)[] = [
    { id: 'zonas-relleno', type: 'fill', source: 'zonas', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 } },
    { id: 'zonas-borde', type: 'line', source: 'zonas', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } },
    {
        id: 'lineas',
        type: 'line',
        source: 'lineas',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 3 },
    },
    // Cada punto con la imagen de su `icono` (ver iconoPunto). Se pintan todos aunque se solapen,
    // los posteriores encima.
    {
        id: 'puntos',
        type: 'symbol',
        source: 'puntos',
        layout: {
            'icon-image': ['get', 'icono'],
            'icon-size': 0.8,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'symbol-z-order': 'source',
        },
    },
];

const MARGEN_ENCUADRE = { top: 40, right: 40, bottom: 40, left: 40 };

/**
 * Encuadre inicial: los bounds si los hay; si no (o si son un solo punto), el centro.
 * El back los manda en [lat, lon] y MapLibre los quiere en [lon, lat].
 */
export function vistaInicial({ bounds, centro }: Mapa): InitialViewState {
    if (bounds) {
        const [[sur, oeste], [norte, este]] = bounds;
        if (norte - sur > 0.001 || este - oeste > 0.001) {
            return { bounds: [oeste, sur, este, norte], padding: MARGEN_ENCUADRE };
        }
        return { center: [(oeste + este) / 2, (sur + norte) / 2], zoom: 15 };
    }
    if (centro) return { center: [centro[1], centro[0]], zoom: 13 };
    // Madrid.
    return { center: [-3.7038, 40.4168], zoom: 12 };
}

// Para unir capas con nombres equivalentes: sin acentos, mayúsculas ni espacios de más.
const claveNombre = (nombre: string) =>
    nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

// "VALÈNCIA" y "VALENCIA" van en una sola capa, con el color de la primera.
function unirCapas(capas: CapaMapa[]): CapaMapa[] {
    const porClave = new Map<string, CapaMapa>();
    for (const capa of capas) {
        const clave = claveNombre(capa.nombre);
        const existente = porClave.get(clave);
        if (existente) existente.geojson.features.push(...capa.geojson.features);
        else porClave.set(clave, capa);
    }
    return [...porClave.values()];
}

// Se descartan las capas sin elementos que pintar.
function aCapa(capa: any): CapaMapa | null {
    const features = Array.isArray(capa?.geojson?.features)
        ? capa.geojson.features.filter((f: any) => f?.geometry?.type)
        : [];
    if (!features.length) return null;
    return {
        nombre: String(capa.nombre ?? ''),
        color: typeof capa.color === 'string' ? capa.color : '#128bec',
        render: capa.render ?? undefined,
        marcador: capa.marcador ?? undefined,
        geojson: { type: 'FeatureCollection', features },
    };
}

/** Lee el mapa que manda el back. Devuelve null si no trae nada que pintar. */
export function aMapa(mapa: any): Mapa | null {
    const capas: CapaMapa[] = Array.isArray(mapa?.capas)
        ? mapa.capas.map(aCapa).filter((capa: CapaMapa | null) => capa !== null)
        : [];
    if (!capas.length) return null;
    return {
        titulo: mapa.titulo || undefined,
        centro: mapa.centro ?? undefined,
        bounds: mapa.bounds ?? undefined,
        numPuntos: mapa.num_puntos ?? undefined,
        numPoligonos: mapa.num_poligonos ?? undefined,
        truncado: !!mapa.truncado,
        capas: unirCapas(capas),
    };
}

// [lon, lat]. Sin posición, el back a veces manda (0, 0): se descarta.
const posicionValida = ([lon, lat]: Position) =>
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) > 0.0001 && Math.abs(lon) > 0.0001;

// Quita las posiciones no válidas de cada línea o anillo, y descarta los que se quedan con menos
// de `minimo` (2 para una línea, 3 para un anillo).
const filtrarPosiciones = (listas: Position[][], minimo: number) =>
    listas.map((posiciones) => posiciones.filter(posicionValida)).filter((posiciones) => posiciones.length >= minimo);

// Los PNG de los marcadores. El depósito está a 3x y los pines a 1,5x: sus 25×41 px se ven de 17×28.
export const IMAGENES_PNG = {
    deposito: require('../../assets/mapa/deposito.png'),
    'pin-azul': require('../../assets/mapa/pin-azul.png'),
    'pin-verde': require('../../assets/mapa/pin-verde.png'),
    'pin-rojo': require('../../assets/mapa/pin-rojo.png'),
    'pin-naranja': require('../../assets/mapa/pin-naranja.png'),
} satisfies Record<string, ImageRequireSource>;

type ImagenPng = keyof typeof IMAGENES_PNG;

const PNG_MARCADOR: Record<string, ImagenPng> = {
    depot: 'deposito',
    entrega: 'pin-azul',
    recogida: 'pin-verde',
    entregarecogida: 'pin-verde',
    incidencia: 'pin-rojo',
    agrupado: 'pin-naranja',
};

/** Un icono que se dibuja en la app (ver IconosMapa). */
export type DatosIcono =
    // Número, con o sin círculo detrás. `tamano` es el alto del icono y `letra`, el de la letra.
    | {
          tipo: 'numero';
          texto: string;
          colorTexto: string;
          tamano: number;
          letra: number;
          circulo?: { relleno: string; borde: string };
      }
    | { tipo: 'circulo'; color: string }
    | { tipo: 'alerta' }
    | { tipo: 'pudo' };

export type IconoGenerado = DatosIcono & { id: string };

const iconoGenerado = (datos: DatosIcono): IconoGenerado => ({ ...datos, id: JSON.stringify(datos) });

/** El icono de un punto: uno de los PNG o un icono que hay que generar. */
export type IconoPunto = { png: ImagenPng } | { generado: IconoGenerado };

// El marcador del punto o, si no trae, el de su capa. En minúsculas.
const marcadorDe = (propiedades: PropiedadesMapa | null, capa: CapaMapa) =>
    String(propiedades?.marcador ?? capa.marcador ?? 'circle').toLowerCase();

/** El icono de un marcador sin número: su PNG, la alerta, el PUDO o, si no, un círculo del color de la capa. */
export function iconoMarcador(marcador: string, color: string): IconoPunto {
    const png = PNG_MARCADOR[marcador];
    if (png) return { png };
    if (marcador === 'alert') return { generado: iconoGenerado({ tipo: 'alerta' }) };
    if (marcador === 'pudo') return { generado: iconoGenerado({ tipo: 'pudo' }) };
    return { generado: iconoGenerado({ tipo: 'circulo', color }) };
}

/**
 * El icono de un punto según su marcador:
 * - marker (parada de ruta): círculo con el borde del color de la capa, relleno según su estado
 *   y su número de orden en negro.
 * - number: solo el número, del color de la capa.
 * - el resto: ver iconoMarcador.
 */
function iconoPunto(propiedades: PropiedadesMapa | null, capa: CapaMapa): IconoPunto {
    const marcador = marcadorDe(propiedades, capa);
    const texto = String(propiedades?.orden || (propiedades?.etiqueta ?? ''));
    if (marcador === 'marker') {
        const relleno =
            propiedades?.estado === 'completado' ? capa.color : propiedades?.estado === 'incidencia' ? '#ff0000' : '#ffffff';
        const circulo = { relleno, borde: capa.color };
        return { generado: iconoGenerado({ tipo: 'numero', texto, colorTexto: '#000000', tamano: 25, letra: 9.9, circulo }) };
    }
    if (marcador === 'number' && texto) {
        return { generado: iconoGenerado({ tipo: 'numero', texto, colorTexto: capa.color, tamano: 18, letra: 11.88 }) };
    }
    return iconoMarcador(marcador, capa.color);
}

/** El marcador de los puntos de una capa, para su icono en la leyenda. */
export function marcadorCapa(capa: CapaMapa) {
    const conMarcador = capa.geojson.features.find((f) => f.geometry.type === 'Point' && f.properties?.marcador);
    return marcadorDe(conMarcador?.properties ?? null, capa);
}

export type TipoElemento = 'zonas' | 'lineas' | 'puntos';

export type ElementosMapa = Record<TipoElemento, FeatureCollection> & {
    // Los iconos que hay que generar, sin repetir.
    iconos: IconoGenerado[];
};

/**
 * Los elementos de todas las capas agrupados por geometría, cada uno con el color de su capa
 * en `color`. Así se pintan zonas, líneas y puntos en ese orden aunque una capa los mezcle.
 * Los puntos llevan además en `icono` el id de su imagen (ver iconoPunto).
 */
export function elementosPorTipo(mapa: Mapa): ElementosMapa {
    const zonas: Feature[] = [];
    const lineas: Feature[] = [];
    const puntos: Feature[] = [];
    const iconos = new Map<string, IconoGenerado>();
    for (const capa of mapa.capas) {
        for (const elemento of capa.geojson.features) {
            const conColor: Feature = { ...elemento, properties: { ...elemento.properties, color: capa.color } };
            const geometria = elemento.geometry;
            if (geometria.type === 'Polygon') {
                const coordinates = filtrarPosiciones(geometria.coordinates, 3);
                if (coordinates.length) zonas.push({ ...conColor, geometry: { type: 'Polygon', coordinates } });
            } else if (geometria.type === 'MultiPolygon') {
                const coordinates = geometria.coordinates
                    .map((anillos) => filtrarPosiciones(anillos, 3))
                    .filter((anillos) => anillos.length);
                if (coordinates.length) zonas.push({ ...conColor, geometry: { type: 'MultiPolygon', coordinates } });
            } else if (geometria.type === 'LineString') {
                const [coordinates] = filtrarPosiciones([geometria.coordinates], 2);
                if (coordinates) lineas.push({ ...conColor, geometry: { type: 'LineString', coordinates } });
            } else if (geometria.type === 'MultiLineString') {
                const coordinates = filtrarPosiciones(geometria.coordinates, 2);
                if (coordinates.length) lineas.push({ ...conColor, geometry: { type: 'MultiLineString', coordinates } });
            } else if (geometria.type === 'Point' && posicionValida(geometria.coordinates)) {
                const icono = iconoPunto(elemento.properties, capa);
                if ('generado' in icono) iconos.set(icono.generado.id, icono.generado);
                const idIcono = 'png' in icono ? icono.png : icono.generado.id;
                puntos.push({ ...conColor, properties: { ...conColor.properties, icono: idIcono } });
            }
        }
    }
    const coleccion = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });
    return {
        zonas: coleccion(zonas),
        lineas: coleccion(lineas),
        puntos: coleccion(puntos),
        iconos: [...iconos.values()],
    };
}

export type TipoCapa = 'zonas' | 'puntos' | 'recorrido';

/**
 * Zonas si tiene polígonos; recorrido si solo tiene líneas; si no, puntos.
 * Los recorridos no van en la leyenda: comparten color con sus paradas.
 */
export function tipoCapa(capa: CapaMapa): TipoCapa {
    const tipos = capa.geojson.features.map((f) => f.geometry.type);
    if (capa.render === 'polygons' || tipos.some((t) => t === 'Polygon' || t === 'MultiPolygon')) return 'zonas';
    if (!tipos.includes('Point') && tipos.some((t) => t === 'LineString' || t === 'MultiLineString')) return 'recorrido';
    return 'puntos';
}

// La leyenda solo se pinta con dos capas o más.
export const capasLeyenda = (mapa: Mapa) => mapa.capas.filter((capa) => tipoCapa(capa) !== 'recorrido');
