import { ErrorAuth, renovar } from '@/auth/authApi';
import { Sesion } from '@/types/Sesion';

type Handlers = {
    getSesion: () => Sesion | null;
    onRenovada: (sesion: Sesion) => void;
    // El token de renovación ya no vale
    onCaducada: () => void;
};

let handlers: Handlers | null = null;

export function registerAuthHandlers(h: Handlers) {
    handlers = h;
}

let renovacionEnCurso: Promise<string | null> | null = null;

/**
 * Renueva el token de acceso con el de renovación.
 * @returns el nuevo token de acceso, o null si no se pudo.
 *   - 401/403 -> onCaducada() y null.
 *   - red / 5xx -> null (se mantiene la sesión).
 */
export function refreshAccessToken(): Promise<string | null> {
    if (!renovacionEnCurso) {
        renovacionEnCurso = renovarAcceso().finally(() => {
            renovacionEnCurso = null;
        });
    }
    return renovacionEnCurso;
}

async function renovarAcceso(): Promise<string | null> {
    const refreshToken = handlers?.getSesion()?.refreshToken;
    if (!handlers || !refreshToken) return null;

    try {
        const sesion = await renovar(refreshToken);
        handlers.onRenovada(sesion);
        return sesion.accessToken;
    } catch (error) {
        if (error instanceof ErrorAuth && (error.tipo === 'credenciales' || error.tipo === 'sin-acceso')) {
            handlers.onCaducada();
        }
        return null;
    }
}

/**
 * fetch con el token de acceso. Si responde 401, renueva el token y reintenta una vez.
 * A diferencia de AppGovoy, un 403 no cierra la sesión: en el chat también significa
 * "no puedes tocar este chat"
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const conToken = (token: string): RequestInit => ({
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });

    const respuesta = await fetch(url, conToken(handlers?.getSesion()?.accessToken ?? ''));
    if (respuesta.status !== 401) return respuesta;

    const nuevo = await refreshAccessToken();
    if (!nuevo) return respuesta;
    return fetch(url, conToken(nuevo));
}
