import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { colorScheme, vars } from 'nativewind';

import { Esquema, hexACanales, NombreColor, Paleta, paletas } from './palette';

function variablesDe(paleta: Paleta) {
    const entradas = Object.entries(paleta).map(([nombre, hex]) => [`--color-${nombre}`, hexACanales(hex)]);
    return vars(Object.fromEntries(entradas));
}

const variables: Record<Esquema, ReturnType<typeof vars>> = {
    light: variablesDe(paletas.light),
    dark: variablesDe(paletas.dark),
};

const CLAVE_TEMA = 'preferencia_tema';

type TemaContextType ={ esquema: Esquema; setEsquema: (esquema: Esquema) => void };

const TemaContext = createContext<TemaContextType>({ esquema: 'light', setEsquema: () => {} });

export const useTema = () => useContext(TemaContext);
export const useEsquema = () => useTema().esquema;

// Colores en hexadecimal para lo que no admite clases (navegación, iconos, gráficas...).
export function useColores(): Record<NombreColor, string> {
    return paletas[useEsquema()];
}

// El tema elegido se guarda aquí y no se lee de NativeWind: NativeWind sigue a Appearance,
// y Android la devuelve al modo del sistema al volver a primer plano.
export function ThemeProvider({ children }: { children: ReactNode }) {
    // null mientras se lee la preferencia guardada, para no pintar un instante el tema equivocado.
    const [guardado, setGuardado] = useState<Esquema | null>(null);
    const esquema = guardado ?? 'light';

    useEffect(() => {
        AsyncStorage.getItem(CLAVE_TEMA)
            .then((valor) => setGuardado(valor === 'dark' ? 'dark' : 'light'))
            .catch(() => setGuardado('light'));
    }, []);

    const setEsquema = useCallback((nuevo: Esquema) => {
        setGuardado(nuevo);
        AsyncStorage.setItem(CLAVE_TEMA, nuevo).catch(() => {});
    }, []);

    // Se aplica también a Appearance para los componentes nativos (Switch, teclado...).
    useEffect(() => {
        colorScheme.set(esquema);
        const sub = AppState.addEventListener('change', (estado) => {
            if (estado === 'active') colorScheme.set(esquema);
        });
        return () => sub.remove();
    }, [esquema]);

    if (!guardado) return null;

    return (
        <TemaContext.Provider value={{ esquema, setEsquema }}>
            <View style={[{ flex: 1 }, variables[esquema]]}>{children}</View>
            <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
        </TemaContext.Provider>
    );
}
