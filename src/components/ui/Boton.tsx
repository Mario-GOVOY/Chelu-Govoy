import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useColores } from '@/theme/ThemeProvider';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const estilos: Record<Variante, { boton: string; texto: string }> = {
    primario: { boton: 'bg-primario active:bg-primario-presionado', texto: 'text-sobre-primario' },
    secundario: { boton: 'border border-borde-fuerte bg-superficie active:bg-superficie-alt', texto: 'text-texto' },
    peligro: { boton: 'border border-peligro bg-superficie active:bg-peligro-suave', texto: 'text-peligro' },
    texto: { boton: 'active:bg-fondo', texto: 'text-texto-secundario' },
};

type Props = {
    texto: string;
    onPress: () => void;
    variante?: Variante;
    cargando?: boolean;
    deshabilitado?: boolean;
};

export function Boton({ texto, onPress, variante = 'primario', cargando = false, deshabilitado = false }: Props) {
    const colores = useColores();
    const inactivo = cargando || deshabilitado;
    const { boton, texto: claseTexto } = estilos[variante];

    return (
        <Pressable
            onPress={onPress}
            disabled={inactivo}
            accessibilityRole="button"
            accessibilityState={{ disabled: inactivo, busy: cargando }}
            className={`h-14 flex-row items-center justify-center rounded-2xl px-5 ${boton} ${inactivo ? 'opacity-60' : ''}`}
        >
            {cargando ? (
                <ActivityIndicator color={variante === 'primario' ? colores['sobre-primario'] : colores.primario} />
            ) : (
                <Text className={`text-base font-semibold ${claseTexto}`}>{texto}</Text>
            )}
        </Pressable>
    );
}
