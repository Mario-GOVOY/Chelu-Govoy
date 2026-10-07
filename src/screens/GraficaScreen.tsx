import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { leerGrafica } from '@/chat/graficas';
import { DibujoGrafica } from '@/components/TarjetaGrafica';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useColores } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Grafica'>;

type Medida = { ancho: number; alto: number };

/**
 * Gráfica ampliada, en horizontal y a pantalla completa, con todas las etiquetas y scroll si no cabe.
 * Es una pantalla del stack (no una capa) para que el giro lo haga el sistema: el chat queda debajo,
 * congelado, y no se vuelve a maquetar al girar.
 */
export default function GraficaScreen({ navigation, route }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const datos = useMemo(() => leerGrafica(route.params.grafica), [route.params.grafica]);
    const [pantalla, setPantalla] = useState<Medida>({ ancho: 0, alto: 0 });
    // Hueco bajo la cabecera: la gráfica se ajusta a él.
    const [hueco, setHueco] = useState<Medida>({ ancho: 0, alto: 0 });
    // Por si el sistema no deja girar: pasado un rato se enseña tal cual.
    const [esperaAgotada, setEsperaAgotada] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setEsperaAgotada(true), 1500);
        return () => clearTimeout(t);
    }, []);

    // La pantalla se monta antes de acabar el giro. Hasta que no está en horizontal solo se ve
    // el indicador: si no, la tarjeta y la gráfica se pintarían en vertical y otra vez al girar.
    const lista = pantalla.ancho > pantalla.alto || esperaAgotada;

    // gifted-charts añade al alto pedido 1/8 por encima del eje Y y ~50 para las etiquetas del eje X.
    // Se descuentan también el padding (24) y, si hay leyenda, una línea suya.
    const conLeyenda = !!datos && (datos.tipo === 'circular' || datos.tipo === 'donut' || datos.series.length > 1);
    const alto = Math.max(120, (hueco.alto - 24 - 60 - (conLeyenda ? 30 : 0)) / 1.125);

    const cargando = (
        <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colores.primario} />
        </View>
    );

    return (
        <View
            className="flex-1 bg-fondo"
            onLayout={(e) => setPantalla({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height })}
            style={{
                paddingTop: insets.top + 12,
                paddingBottom: insets.bottom + 12,
                // En horizontal, el notch queda a un lado.
                paddingLeft: insets.left + 16,
                paddingRight: insets.right + 16,
            }}
        >
            {!lista ? cargando : (
                <View className="flex-1 overflow-hidden rounded-xl border border-borde bg-superficie">
                    <View className="h-12 flex-row items-center gap-2 border-b border-borde pl-4 pr-1">
                        <Text className="flex-1 text-base font-semibold text-texto" numberOfLines={1}>
                            {datos?.titulo ?? 'Gráfica'}
                        </Text>
                        <Pressable
                            onPress={() => navigation.goBack()}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar"
                            className="h-10 w-10 items-center justify-center rounded-full active:bg-superficie-alt"
                        >
                            <X size={20} color={colores.texto} />
                        </Pressable>
                    </View>
                    <View
                        className="flex-1"
                        onLayout={(e) => setHueco({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height })}
                    >
                        {/* El indicador sigue hasta que se mide el hueco y se dibuja la gráfica. */}
                        {!datos || hueco.ancho === 0 ? cargando : (
                            <ScrollView contentContainerStyle={{ padding: 12 }}>
                                <DibujoGrafica datos={datos} completa alto={alto} anchoConocido={hueco.ancho - 24} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}
