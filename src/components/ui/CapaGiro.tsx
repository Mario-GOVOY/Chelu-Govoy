import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useColores } from '@/theme/ThemeProvider';

/**
 * Tapa una pantalla vertical mientras la ventana está en horizontal, con un indicador de carga.
 * Pasa un momento al volver de la gráfica ampliada: así no se ve la pantalla maquetada a lo ancho.
 * No evita que se maquete, solo lo tapa. Va la última dentro de la pantalla.
 * Es un componente aparte para que leer las dimensiones no re-renderice la pantalla entera al girar.
 */
export function CapaGiro() {
    const colores = useColores();
    const { width, height } = useWindowDimensions();
    if (width <= height) return null;
    return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colores.fondo }]} className="items-center justify-center">
            <ActivityIndicator size="large" color={colores.primario} />
        </View>
    );
}
