import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import * as authApi from '@/auth/authApi';
import { ErrorAuth } from '@/auth/authApi';
import { registerAuthHandlers } from '@/auth/authManager';
import { borrarRenovaciones, guardarCredenciales, guardarRenovacion, leerRenovaciones } from '@/auth/tokenStorage';
import { Sesion } from '@/types/Sesion';
import { esStaffSinSuplantar, puedeUsarChat } from '@/utils/ControlOpcionesUsuarios';

// - cargando: renovando la sesión guardada al abrir la app.
// - sin-conexion: había sesión guardada, pero no se pudo renovar por la red.
// - fuera: pantalla de login.
// - staff: staff de Govoy sin suplantar, pantalla de suplantar.
// - dentro: sesión con chat (normal o suplantada). `staff` es la sesión del staff si se está suplantando.
export type EstadoSesion =
    | { tipo: 'cargando' }
    | { tipo: 'sin-conexion' }
    | { tipo: 'fuera' }
    | { tipo: 'staff'; staff: Sesion }
    | { tipo: 'dentro'; sesion: Sesion; staff: Sesion | null };

type SesionContextType = {
    estado: EstadoSesion;
    iniciarSesion: (username: string, password: string) => Promise<void>;
    suplantar: (username: string, sinMaestro: boolean) => Promise<void>;
    salirDeSuplantacion: () => Promise<void>;
    cerrarSesion: () => Promise<void>;
    reintentar: () => void;
};

const SesionContext = createContext<SesionContextType | null>(null);

export function useSesion() {
    const contexto = useContext(SesionContext);
    if (!contexto) throw new Error('useSesion se usa fuera de SesionProvider');
    return contexto;
}

const caducada = (e: unknown) => e instanceof ErrorAuth && (e.tipo === 'credenciales' || e.tipo === 'sin-acceso');

// Renueva un token guardado. null si ya no vale (y lo borra); lanza si falla la red o el servidor.
async function renovarGuardada(ranura: 'usuario' | 'staff', token: string | null) {
    if (!token) return null;
    try {
        const sesion = await authApi.renovar(token);
        await guardarRenovacion(ranura, sesion.refreshToken);
        return sesion;
    } catch (e) {
        if (!caducada(e)) throw e;
        await guardarRenovacion(ranura, null);
        return null;
    }
}

export function SesionProvider({ children }: { children: ReactNode }) {
    const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'cargando' });
    const estadoRef = useRef(estado);
    estadoRef.current = estado;

    const cambiarEstado = useCallback((nuevo: EstadoSesion) => {
        estadoRef.current = nuevo;
        setEstado(nuevo);
    }, []);

    const restaurar = useCallback(async () => {
        cambiarEstado({ tipo: 'cargando' });
        try {
            const guardadas = await leerRenovaciones();
            const staff = await renovarGuardada('staff', guardadas.staff);
            const sesion = await renovarGuardada('usuario', guardadas.usuario);

            if (sesion && puedeUsarChat(sesion)) {
                cambiarEstado({ tipo: 'dentro', sesion, staff });
                return;
            }
            // Ha perdido el acceso desde la última vez (p. ej. le han cambiado el rol).
            if (sesion) await guardarRenovacion('usuario', null);
            if (staff) {
                cambiarEstado({ tipo: 'staff', staff });
            } else {
                cambiarEstado({ tipo: 'fuera' });
            }
        } catch {
            cambiarEstado({ tipo: 'sin-conexion' });
        }
    }, [cambiarEstado]);

    const cerrarSesion = useCallback(async () => {
        // Solo en el móvil (D1): se borran los tokens, el back no se entera.
        await borrarRenovaciones();
        cambiarEstado({ tipo: 'fuera' });
    }, [cambiarEstado]);

    const salirDeSuplantacion = useCallback(async () => {
        const actual = estadoRef.current;
        await guardarRenovacion('usuario', null);
        if (actual.tipo === 'dentro' && actual.staff) {
            cambiarEstado({ tipo: 'staff', staff: actual.staff });
        } else {
            await cerrarSesion();
        }
    }, [cambiarEstado, cerrarSesion]);

    const iniciarSesion = useCallback(
        async (username: string, password: string) => {
            const sesion = await authApi.login(username, password);
            await guardarCredenciales(username, password);

            if (esStaffSinSuplantar(sesion)) {
                await guardarRenovacion('usuario', null);
                await guardarRenovacion('staff', sesion.refreshToken);
                cambiarEstado({ tipo: 'staff', staff: sesion });
                return;
            }
            if (!puedeUsarChat(sesion)) {
                throw new ErrorAuth('sin-acceso', 'Tu usuario no tiene acceso a Chat Chelu.');
            }
            await guardarRenovacion('staff', null);
            await guardarRenovacion('usuario', sesion.refreshToken);
            cambiarEstado({ tipo: 'dentro', sesion, staff: null });
        },
        [cambiarEstado],
    );

    const suplantar = useCallback(
        async (username: string, sinMaestro: boolean) => {
            const actual = estadoRef.current;
            if (actual.tipo !== 'staff') return;

            // El token de acceso del staff puede llevar más de una hora parado: se renueva antes.
            let staff: Sesion;
            try {
                staff = await authApi.renovar(actual.staff.refreshToken);
            } catch (e) {
                if (caducada(e)) await cerrarSesion();
                throw e;
            }
            await guardarRenovacion('staff', staff.refreshToken);
            cambiarEstado({ tipo: 'staff', staff });

            const sesion = await authApi.suplantar(staff.accessToken, username, sinMaestro);
            if (!puedeUsarChat(sesion)) {
                throw new ErrorAuth('sin-acceso', `El usuario ${username} no tiene acceso a Chat Chelu.`);
            }
            await guardarRenovacion('usuario', sesion.refreshToken);
            cambiarEstado({ tipo: 'dentro', sesion, staff });
        },
        [cambiarEstado, cerrarSesion],
    );

    useEffect(() => {
        registerAuthHandlers({
            getSesion: () => {
                const actual = estadoRef.current;
                return actual.tipo === 'dentro' ? actual.sesion : null;
            },
            onRenovada: (sesion) => {
                const actual = estadoRef.current;
                if (actual.tipo !== 'dentro') return;
                cambiarEstado({ ...actual, sesion });
                guardarRenovacion('usuario', sesion.refreshToken);
            },
            // Si caduca una suplantación (6 h), se vuelve a la sesión del staff.
            onCaducada: () => {
                salirDeSuplantacion();
            },
        });
        restaurar();
    }, [cambiarEstado, restaurar, salirDeSuplantacion]);

    return (
        <SesionContext.Provider
            value={{ estado, iniciarSesion, suplantar, salirDeSuplantacion, cerrarSesion, reintentar: restaurar }}
        >
            {children}
        </SesionContext.Provider>
    );
}
