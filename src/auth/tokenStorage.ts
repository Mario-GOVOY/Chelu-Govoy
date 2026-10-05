import * as SecureStore from 'expo-secure-store';

// Solo se guardan los tokens de renovación
export type Ranura = 'usuario' | 'staff';

const CLAVES: Record<Ranura, string> = {
    usuario: 'auth_refreshToken',
    staff: 'auth_refreshToken_staff',
};
const CLAVE_ULTIMO_USUARIO = 'auth_ultimoUsuario';
const CLAVE_ULTIMA_CONTRASENA = 'auth_ultimaContrasena';

// Todas las operaciones van en cola
let cola: Promise<unknown> = Promise.resolve();
const enCola = <T>(op: () => Promise<T>): Promise<T> => {
    const siguiente = cola.then(op, op);
    cola = siguiente.catch(() => {});
    return siguiente;
};

export const guardarRenovacion = (ranura: Ranura, token: string | null) =>
    enCola(async () => {
        if (token) {
            await SecureStore.setItemAsync(CLAVES[ranura], token);
        } else {
            await SecureStore.deleteItemAsync(CLAVES[ranura]);
        }
    });

export const leerRenovaciones = () =>
    enCola(async () => {
        const [usuario, staff] = await Promise.all([
            SecureStore.getItemAsync(CLAVES.usuario),
            SecureStore.getItemAsync(CLAVES.staff),
        ]);
        return { usuario, staff };
    });

export const borrarRenovaciones = () =>
    Promise.all([guardarRenovacion('usuario', null), guardarRenovacion('staff', null)]);

// Usuario y contraseña del último login, para rellenar los campos (como en AppGovoy).
// Se conservan al cerrar sesión.
export const guardarCredenciales = (username: string, password: string) =>
    Promise.all([
        SecureStore.setItemAsync(CLAVE_ULTIMO_USUARIO, username),
        SecureStore.setItemAsync(CLAVE_ULTIMA_CONTRASENA, password),
    ]).catch(() => {});

export const leerCredenciales = async () => {
    try {
        const [username, password] = await Promise.all([
            SecureStore.getItemAsync(CLAVE_ULTIMO_USUARIO),
            SecureStore.getItemAsync(CLAVE_ULTIMA_CONTRASENA),
        ]);
        return { username, password };
    } catch {
        return { username: null, password: null };
    }
};
