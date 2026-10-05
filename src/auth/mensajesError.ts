import { ErrorAuth } from '@/auth/authApi';


export const SIN_ACCESO_CHAT = 'Tu usuario no tiene acceso a Chat Chelu.';

// `detail` del 403 de /login-chat-movil cuando la empresa no tiene perfil de chat.
const DETALLE_EMPRESA_SIN_CHAT = 'La empresa no tiene Chat Chelu';

// Texto para el usuario a partir de un error de login o de suplantación.
export function mensajeErrorAuth(e: unknown): string {
    if (!(e instanceof ErrorAuth)) return 'Ha ocurrido un error inesperado.';
    switch (e.tipo) {
        case 'credenciales':
            return 'Usuario o contraseña incorrectos.';
        case 'sin-acceso':
            if (e.message === 'EMPRESA_INACTIVA') return 'Usuario o contraseña incorrectos.';
            if (e.message === DETALLE_EMPRESA_SIN_CHAT) return SIN_ACCESO_CHAT;
            return e.message !== e.tipo ? e.message : SIN_ACCESO_CHAT;
        case 'no-encontrado':
            return 'No existe ese usuario.';
        case 'red':
            return 'Sin conexión con el servidor. Revisa tu conexión a internet.';
        default:
            return 'Error en el servidor. Inténtalo de nuevo en unos minutos.';
    }
}
