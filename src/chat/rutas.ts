import type { Feature, FeatureCollection, LineString, Position } from 'geojson';

import { API_URL } from '@/auth/Constants';

// Por las coordenadas de la línea original.
const tracedRoutes = new Map<string, Position[]>();

// Una ruta vacía es una que OSRM no pudo trazar.
async function fetchRoutes(lines: Position[][]): Promise<Position[][] | null> {
    try {
        const response = await fetch(`${API_URL}directionsForMap2-todas-las-rutas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lines.map((line) => line.map(([lon, lat]) => `${lon},${lat}`).join(';'))),
        });
        if (!response.ok) return null;
        const json = await response.json();
        return Array.isArray(json) ? json : null;
    } catch {
        return null;
    }
}

/** Las líneas trazadas por calles. Las que no se pueden trazar se quitan. */
export async function getLinesByStreets(lines: FeatureCollection<LineString>): Promise<FeatureCollection<LineString>> {
    const segments = lines.features;
    const keys = segments.map((segment) => JSON.stringify(segment.geometry.coordinates));
    const pending = segments.filter((_, i) => !tracedRoutes.has(keys[i]));

    if (pending.length) {
        const routes = await fetchRoutes(pending.map((line) => line.geometry.coordinates));
        routes?.forEach((route, i) => {
            if (Array.isArray(route) && route.length >= 2) {
                tracedRoutes.set(JSON.stringify(pending[i].geometry.coordinates), route);
            }
        });
    }

    const features = segments.flatMap((line, i): Feature<LineString>[] => {
        const route = tracedRoutes.get(keys[i]);
        return route ? [{ ...line, geometry: { type: 'LineString', coordinates: route } }] : [];
    });
    return { type: 'FeatureCollection', features };
}
