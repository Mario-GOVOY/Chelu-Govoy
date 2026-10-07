import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useColores } from '@/theme/ThemeProvider';

/**
 * Tapa el mapa mientras se prepara: un spinner y un texto que va pasando cada 3,5 s por
 * `textos` y se queda en el último. Al quitarla se va con un fundido.
 */
export function CargaMapa({ textos }: { textos: string[] }) {
    const colores = useColores();
    const [indiceTexto, setIndiceTexto] = useState(0);

    useEffect(() => {
        const cambioTexto = setInterval(() => setIndiceTexto((indice) => indice + 1), 3500);
        return () => clearInterval(cambioTexto);
    }, []);

    const texto = textos[Math.min(indiceTexto, textos.length - 1)];

    // Animated.View no pasa por NativeWind: sus estilos van en style y las clases en el View de dentro.
    return (
        <Animated.View exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
            <View
                className="flex-1 items-center justify-center gap-4 bg-fondo"
                accessibilityRole="progressbar"
                accessibilityLabel="Cargando el mapa"
            >
                <ActivityIndicator size="large" color={colores.primario} />
                {/* La key hace que cada texto nuevo entre con fundido. */}
                <Animated.Text
                    key={texto}
                    entering={FadeIn.duration(400)}
                    style={{ fontSize: 14, color: colores['texto-secundario'] }}
                >
                    {texto}
                </Animated.Text>
            </View>
        </Animated.View>
    );
}
