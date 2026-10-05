import { ReactNode } from 'react';
import { View } from 'react-native';
import { colorScheme, useColorScheme, vars } from 'nativewind';

import { Esquema, hexACanales, NombreColor, Paleta, paletas } from './palette';

// Por defecto la app arranca en claro, aunque el sistema esté en oscuro.
// Cuando haya ajustes, aquí se aplicará la preferencia guardada del usuario.
colorScheme.set('light');

function variablesDe(paleta: Paleta) {
    const entradas = Object.entries(paleta).map(([nombre, hex]) => [`--color-${nombre}`, hexACanales(hex)]);
    return vars(Object.fromEntries(entradas));
}

const variables: Record<Esquema, ReturnType<typeof vars>> = {
    light: variablesDe(paletas.light),
    dark: variablesDe(paletas.dark),
};

export function useEsquema(): Esquema {
    const { colorScheme: actual } = useColorScheme();
    return actual === 'dark' ? 'dark' : 'light';
}

// Colores en hexadecimal para lo que no admite clases (navegación, iconos, gráficas...).
export function useColores(): Record<NombreColor, string> {
    return paletas[useEsquema()];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const esquema = useEsquema();
    return <View style={[{ flex: 1 }, variables[esquema]]}>{children}</View>;
}
