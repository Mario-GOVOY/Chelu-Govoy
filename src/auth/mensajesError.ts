import { ErrorAuth } from '@/auth/authApi';

// Texto para el usuario a partir de un error de login o de suplantación.
export function mensajeErrorAuth(e: unknown): string {
    if (!(e instanceof ErrorAuth)) return 'Ha ocurrido un error inesperado.';
    switch (e.tipo) {
        case 'credenciales':
            return 'Usuario o contraseña incorrectos.';
        case 'sin-acceso':
            if (e.message === 'EMPRESA_INACTIVA') return 'Usuario o contraseña incorrectos.';
            return e.message !== e.tipo ? e.message : 'No tienes acceso a Chat Chelu.';
        case 'no-encontrado':
            return 'No existe ese usuario.';
        case 'red':
            return 'Sin conexión con el servidor. Revisa tu conexión a internet.';
        default:
            return 'Error en el servidor. Inténtalo de nuevo en unos minutos.';
    }
}
