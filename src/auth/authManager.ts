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

// 403 por empresa desactivada: la sesión se cierra ya, sin esperar a la siguiente renovación.
// Se lee una copia de la respuesta (clone) para que quien hizo la petición pueda leerla igual.
async function cerrarSiEmpresaInactiva(respuesta: Response) {
    if (respuesta.status !== 403) return;
    const detalle = await respuesta
        .clone()
        .json()
        .then((j) => j?.detail)
        .catch(() => undefined);
    if (detalle === 'EMPRESA_INACTIVA') handlers?.onCaducada();
}

/**
 * fetch con el token de acceso. Si responde 401, renueva el token y reintenta una vez.
 * Solo cierra la sesión un 403 si es por empresa desactivada
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const conToken = (token: string): RequestInit => ({
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });

    let respuesta = await fetch(url, conToken(handlers?.getSesion()?.accessToken ?? ''));
    if (respuesta.status === 401) {
        const nuevo = await refreshAccessToken();
        if (!nuevo) return respuesta;
        respuesta = await fetch(url, conToken(nuevo));
    }

    await cerrarSiEmpresaInactiva(respuesta);
    return respuesta;
}
