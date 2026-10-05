import { API_URL, API_URL_LOCAL } from '@/auth/Constants';
import { Sesion } from '@/types/Sesion';

export type TipoErrorAuth = 'credenciales' | 'sin-acceso' | 'no-encontrado' | 'red' | 'servidor';

export class ErrorAuth extends Error {
    constructor(public tipo: TipoErrorAuth, mensaje?: string) {
        super(mensaje ?? tipo);
    }
}

function sesionDesdeBody(body: any): Sesion {
    return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        username: body.username,
        empresaId: String(body.UsuarioID),
        nombreEmpresa: body.nombre_empresa ?? null,
        rol: body.rol ?? null,
        rolEspecial: body.rol_especial ?? null,
        isMaster: Boolean(body.is_master),
        isImpersonation: Boolean(body.is_impersonation),
        impersonatedBy: body.impersonated_by ?? null,
        idDepot: body.id_depot ?? null,
        idDepots: body.id_depots ?? null,
    };
}

async function pedirSesion(ruta: string, init: RequestInit): Promise<Sesion> {
    let respuesta: Response;
    try {
        respuesta = await fetch(`${API_URL}${ruta}`, {
            method: 'POST',
            ...init,
            headers: { 'Content-Type': 'application/json', ...init.headers },
        });
    } catch {
        throw new ErrorAuth('red');
    }

    if (!respuesta.ok) {
        const detalle = await respuesta
            .json()
            .then((j) => (typeof j?.detail === 'string' ? j.detail : undefined))
            .catch(() => undefined);
        if (respuesta.status === 401) throw new ErrorAuth('credenciales', detalle);
        if (respuesta.status === 403) throw new ErrorAuth('sin-acceso', detalle);
        if (respuesta.status === 404) throw new ErrorAuth('no-encontrado', detalle);
        throw new ErrorAuth('servidor', detalle);
    }

    const json = await respuesta.json().catch(() => null);
    if (!json?.body?.accessToken || !json?.body?.refreshToken) {
        throw new ErrorAuth('servidor', 'Respuesta sin tokens');
    }
    return sesionDesdeBody(json.body);
}

export const login = (username: string, password: string) =>
    pedirSesion('login-chat-movil', { body: JSON.stringify({ username, password }) });

export const renovar = (refreshToken: string) =>
    pedirSesion('refresh-token-chat-movil', { headers: { Authorization: `Bearer ${refreshToken}` } });

export const suplantar = (accessTokenStaff: string, username: string, sinMaestro: boolean) =>
    pedirSesion('impersonate-chat-movil', {
        headers: { Authorization: `Bearer ${accessTokenStaff}` },
        body: JSON.stringify({ target_username: username, iniciar_sin_maestro: sinMaestro }),
    });
