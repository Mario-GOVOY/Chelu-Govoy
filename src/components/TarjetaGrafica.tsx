import { useMemo, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { Maximize2 } from 'lucide-react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Text as TextoSvg } from 'react-native-svg';

import { DatosGrafica, leerGrafica, PALETA_GRAFICAS } from '@/chat/graficas';
import type { Paleta } from '@/theme/palette';
import { useColores } from '@/theme/ThemeProvider';
import type { Grafica } from '@/types/Chat';

// En el chat la gráfica se ajusta al ancho; ampliada, si no cabe, hace scroll.
// alto: el del área de la gráfica; sin él, uno fijo según el modo.
type Modo = { completa: boolean; alto?: number };

// Hueco de cada etiqueta del eje X. Ampliada se ven todas; en el chat se salta alguna si no caben.
const ANCHO_ETIQUETA = 64;

const color = (i: number) => PALETA_GRAFICAS[i % PALETA_GRAFICAS.length];

// Como ApexCharts: el número entero, sin abreviar, con 2 decimales como mucho.
const numero = (n: number) => String(+n.toFixed(2));

// Ejes y rejilla comunes a barras y líneas. El eje Y, tan ancho como su número más largo.
// huecoArriba: píxeles libres sobre el valor más alto (para los valores de las líneas); sube el máximo del eje.
function ejes(colores: Paleta, datos: DatosGrafica, { completa, alto }: Modo, huecoArriba = 0) {
    const height = alto ?? (completa ? 320 : 200);
    const valorMaximo = Math.max(...datos.series.flatMap((s) => s.valores));
    const maxValue = huecoArriba && valorMaximo > 0 ? maximoRedondo(valorMaximo / (1 - huecoArriba / height)) : undefined;
    const max = maxValue ?? Math.max(1, ...datos.series.flatMap((s) => s.valores.map(Math.abs)));
    return {
        height,
        maxValue,
        noOfSections: 4,
        yAxisLabelWidth: numero(Math.ceil(max)).length * 7 + 12,
        yAxisThickness: 0,
        xAxisThickness: 1,
        xAxisColor: colores['borde-medio'],
        rulesColor: colores.borde,
        rulesType: 'solid',
        yAxisTextStyle: { color: colores['texto-tenue'], fontSize: 10 },
        formatYLabel: (l: string) => numero(Number(l)),
        xAxisTextNumberOfLines: 2,
        // Rejilla y eje X miden por defecto el ancho más el margen final y se salen de la tarjeta:
        // en cada gráfica se les da el ancho exacto (rulesLength, xAxisLength).
        disableScroll: !completa,
    };
}

// El primer máximo de eje >= minimo cuyas 4 divisiones sean un número redondo (1, 1,5, 2, 2,5... por una potencia de 10).
function maximoRedondo(minimo: number) {
    const division = minimo / 4;
    const potencia = 10 ** Math.floor(Math.log10(division));
    const multiplo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * potencia >= division) ?? 10;
    return multiplo * potencia * 4;
}

// Etiqueta del eje X centrada en su punto o grupo de barras (`ancho` es el de ese punto o grupo).
function etiquetaEjeX(texto: string, ancho: number, colores: Paleta) {
    return () => (
        <Text
            numberOfLines={2}
            style={{
                width: ANCHO_ETIQUETA,
                marginLeft: (ancho - ANCHO_ETIQUETA) / 2,
                textAlign: 'center',
                fontSize: 10,
                color: colores['texto-tenue'],
            }}
        >
            {texto}
        </Text>
    );
}

/** Tarjeta del chat: la gráfica ajustada al ancho. Al tocarla se amplía. */
export function TarjetaGrafica({ grafica, onAmpliar }: { grafica: Grafica; onAmpliar?: () => void }) {
    const colores = useColores();
    const datos = useMemo(() => leerGrafica(grafica), [grafica]);

    return (
        <Pressable
            onPress={onAmpliar}
            disabled={!datos || !onAmpliar}
            accessibilityRole="button"
            accessibilityLabel={`Ampliar gráfica${datos?.titulo ? `: ${datos.titulo}` : ''}`}
            className="gap-3 rounded-xl border border-borde bg-superficie p-3 active:bg-superficie-alt"
        >
            <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-sm font-semibold text-texto">{datos?.titulo ?? 'Gráfica'}</Text>
                {datos && onAmpliar && <Maximize2 size={16} color={colores['texto-tenue']} />}
            </View>
            {datos ? (
                // Sin toques dentro: el toque es de la tarjeta, no de las barras.
                <View pointerEvents="none">
                    <DibujoGrafica datos={datos} completa={false} />
                </View>
            ) : (
                <Text className="text-sm text-texto-tenue">No se puede mostrar esta gráfica.</Text>
            )}
        </Pressable>
    );
}

/**
 * La gráfica y su leyenda, a lo ancho del hueco que tenga.
 * @param anchoConocido si quien la usa ya sabe el ancho, se pinta sin medirlo antes (un paso en blanco menos).
 */
export function DibujoGrafica({ datos, anchoConocido, ...modo }: { datos: DatosGrafica; anchoConocido?: number } & Modo) {
    // Las gráficas necesitan un ancho en números: se mide el hueco antes de pintarlas.
    const [medido, setAncho] = useState(0);
    const ancho = anchoConocido ?? medido;
    return (
        <View className="gap-3">
            <View
                onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    // No se toman ni un ancho 0 (pantalla oculta) ni, en el chat, uno medido en horizontal:
                    // el chat va siempre en vertical y eso solo pasa un momento al volver de la gráfica
                    // ampliada. Si se tomaran, se pintaría desbordada y luego otra vez.
                    const ventana = Dimensions.get('window');
                    if (width > 0 && (modo.completa || ventana.width < ventana.height)) setAncho(width);
                }}
            >
                {ancho > 0 && <Contenido datos={datos} ancho={ancho} {...modo} />}
            </View>
            <Leyenda datos={datos} />
        </View>
    );
}

function Contenido(props: { datos: DatosGrafica; ancho: number } & Modo) {
    switch (props.datos.tipo) {
        // En el chat, en filas: al encoger el eje X se perdían nombres de columnas. Ampliada, columnas.
        case 'barras':
            return props.completa ? <Barras {...props} /> : <Filas datos={props.datos} />;
        case 'lineas':
        case 'area':
            return <Lineas {...props} />;
        case 'circular':
        case 'donut':
            return <Circular {...props} />;
        case 'radial':
            return <Filas datos={props.datos} radial />;
    }
}

function Barras({ datos, ancho, ...modo }: { datos: DatosGrafica; ancho: number } & Modo) {
    const colores = useColores();
    const propsEjes = ejes(colores, datos, modo);
    const { completa } = modo;
    const k = datos.series.length;
    const n = Math.max(datos.categorias.length, ...datos.series.map((s) => s.valores.length));
    const anchoGrafica = ancho - propsEjes.yAxisLabelWidth;
    // Hueco de cada categoría: lo que quepa. Ampliada, nunca menos que su etiqueta.
    const hueco = Math.max(anchoGrafica / n, completa ? Math.max(ANCHO_ETIQUETA, k * 12 + 16) : 0);
    const separacion = hueco * 0.3;
    const anchoBarra = Math.max(Math.min((hueco - separacion - (k - 1) * 2) / k, 40), 1);
    const anchoGrupo = anchoBarra * k + (k - 1) * 2;
    // Una etiqueta de cada `paso` categorías, para que no se pisen.
    const paso = Math.ceil(ANCHO_ETIQUETA / hueco);
    // El valor dentro de la columna, como la web, si la columna es lo bastante ancha y alta para él.
    const valorMaximo = Math.max(1, ...datos.series.flatMap((s) => s.valores.map(Math.abs)));
    const valorDentro = (item?: { value?: number }) => {
        const valor = item?.value ?? 0;
        const altoColumna = (Math.abs(valor) / valorMaximo) * propsEjes.height;
        if (anchoBarra < 20 || altoColumna < 16) return null;
        return (
            <View className="flex-1 items-center justify-center">
                <Text numberOfLines={1} className="text-[10px] font-bold text-white">{numero(valor)}</Text>
            </View>
        );
    };

    // Varias series: barras agrupadas por categoría. Una sola: cada barra de un color, como la web.
    const data = Array.from({ length: n }, (_, j) =>
        datos.series.map((s, i) => ({
            value: s.valores[j] ?? 0,
            frontColor: k === 1 ? color(j) : color(i),
            spacing: i < k - 1 ? 2 : separacion,
            ...(i === 0 && j % paso === 0 && {
                labelWidth: anchoGrupo,
                labelComponent: etiquetaEjeX(datos.categorias[j] ?? '', anchoGrupo + (k === 1 ? separacion : 2), colores),
            }),
        })),
    ).flat();

    return (
        <BarChart
            {...propsEjes}
            data={data}
            width={anchoGrafica}
            rulesLength={anchoGrafica}
            xAxisLength={anchoGrafica}
            barWidth={anchoBarra}
            barInnerComponent={valorDentro}
            spacing={separacion}
            initialSpacing={separacion / 2}
            // La librería suma dos veces el margen final: así queda en separacion / 2 y no sobra scroll.
            endSpacing={separacion / 4}
            barBorderTopLeftRadius={3}
            barBorderTopRightRadius={3}
        />
    );
}

function Lineas({ datos, ancho, ...modo }: { datos: DatosGrafica; ancho: number } & Modo) {
    const colores = useColores();
    const n = Math.max(1, ...datos.series.map((s) => s.valores.length));
    // Con valores en los vértices (hasta 20 puntos), hueco arriba para el del punto más alto.
    const propsEjes = ejes(colores, datos, modo, n <= 20 ? 24 : 0);
    const { completa } = modo;
    const anchoGrafica = ancho - propsEjes.yAxisLabelWidth;
    // Los puntos ocupan el ancho (menos medio hueco de etiqueta a cada lado). Ampliada, nunca más juntos que una etiqueta.
    const espacio = Math.max((anchoGrafica - ANCHO_ETIQUETA) / Math.max(n - 1, 1), completa ? ANCHO_ETIQUETA : 0);
    const paso = Math.ceil(ANCHO_ETIQUETA / espacio);
    const area = datos.tipo === 'area';
    // El valor encima de cada vértice, como la web, si los puntos están lo bastante separados para que no se pisen.
    const conValores = n <= 20 && espacio >= 32;
    const valorEnVertice = (value: number, colorSerie: string) => () => (
        <View className="items-center">
            <View className="rounded px-1" style={{ backgroundColor: colorSerie }}>
                <Text numberOfLines={1} className="text-[10px] font-bold text-white">{numero(value)}</Text>
            </View>
        </View>
    );

    const dataSet = datos.series.map((s, i) => ({
        color: color(i),
        thickness: 2,
        ...(area && { startFillColor: color(i), endFillColor: color(i), startOpacity: 0.3, endOpacity: 0.02 }),
        data: s.valores.map((value, j) => ({
            value,
            ...(conValores && {
                dataPointLabelComponent: valorEnVertice(value, color(i)),
                dataPointLabelWidth: espacio,
                // La librería lo pone con la parte de arriba en el punto: se sube por encima.
                dataPointLabelShiftY: -20,
            }),
            // Solo en la primera serie: las demás comparten el eje X.
            labelComponent: i === 0 && j % paso === 0 ? etiquetaEjeX(datos.categorias[j] ?? '', espacio, colores) : undefined,
        })),
    }));

    return (
        <LineChart
            {...propsEjes}
            dataSet={dataSet}
            areaChart={area}
            width={anchoGrafica}
            rulesLength={anchoGrafica}
            xAxisLength={anchoGrafica}
            spacing={espacio}
            initialSpacing={ANCHO_ETIQUETA / 2}
            // La librería suma dos veces el margen final: así queda en ANCHO_ETIQUETA / 2 y no sobra scroll.
            endSpacing={ANCHO_ETIQUETA / 4}
            hideDataPoints={n > 20}
            dataPointsRadius={3}
        />
    );
}

function Circular({ datos, ancho, completa, alto }: { datos: DatosGrafica; ancho: number } & Modo) {
    const colores = useColores();
    const radio = Math.min(ancho / 2 - 8, alto ? alto / 2 : completa ? 150 : 90);
    const valores = datos.series[0].valores;
    const total = valores.reduce((suma, valor) => suma + Math.abs(valor), 0) || 1;
    const donut = datos.tipo === 'donut';
    // Distancia al centro de los porcentajes: en el donut, en medio del anillo (de 0.6 a 1); en el pie, a medio radio.
    const distanciaTexto = radio * (donut ? 0.8 : 0.5);

    // El porcentaje en cada porción, como la web (las de menos del 5 % no, no caben).
    let acumulado = 0;
    const data = valores.map((value, i) => {
        const fraccion = Math.abs(value) / total;
        // Ángulo de la mitad de la porción, desde las 12 en el sentido del reloj, como la librería.
        const angulo = 2 * Math.PI * (acumulado + fraccion / 2);
        acumulado += fraccion;
        return {
            value,
            color: color(i),
            text: fraccion >= 0.05 ? `${+(fraccion * 100).toFixed(1)}%` : undefined,
            // Desplazamiento desde el punto de 'mid' (medio radio), que es donde la librería pone el texto.
            desplazamientoX: (distanciaTexto - radio / 2) * Math.sin(angulo),
            desplazamientoY: -(distanciaTexto - radio / 2) * Math.cos(angulo),
        };
    });
    // El texto propio de la librería no se centra bien: se pinta aparte, centrado en su punto.
    const porcentajeEnPorcion = (_item: unknown, indice = 0) => {
        const porcion = data[indice];
        if (!porcion?.text) return null;
        return (
            <TextoSvg
                x={porcion.desplazamientoX}
                y={porcion.desplazamientoY}
                dy={4}
                textAnchor="middle"
                fontSize={11}
                fontWeight="bold"
                fill="#ffffff"
            >
                {porcion.text}
            </TextoSvg>
        );
    };
    return (
        <View className="items-center">
            <PieChart
                data={data}
                radius={radio}
                donut={donut}
                innerRadius={radio * 0.6}
                innerCircleColor={colores.superficie}
                strokeWidth={1}
                strokeColor={colores.superficie}
                pieInnerComponent={porcentajeEnPorcion}
                labelsPosition="mid"
            />
        </View>
    );
}

/**
 * Una fila por categoría con su nombre, su valor y una barra horizontal. Así ningún nombre se pierde.
 * radial: radialBar de ApexCharts, cada valor es un porcentaje (barra sobre 100, con fondo y "%").
 * Si no, barras del chat: cada barra relativa al valor más alto y, con varias series, una por serie.
 */
function Filas({ datos, radial = false }: { datos: DatosGrafica; radial?: boolean }) {
    const colores = useColores();
    const k = datos.series.length;
    const n = Math.max(datos.categorias.length, ...datos.series.map((s) => s.valores.length));
    const escala = radial ? 100 : Math.max(...datos.series.flatMap((s) => s.valores.map(Math.abs)), 0) || 1;
    const sufijo = radial ? ' %' : '';

    // Sin flex-1: con una serie va en una columna, y ahí flex-1 le quita el alto y a veces no se ve.
    const barra = (valor: number, colorBarra: string) => (
        <View
            className="h-2 w-full shrink overflow-hidden rounded-full"
            style={{ backgroundColor: radial ? colores['superficie-alt'] : 'transparent' }}
        >
            <View
                className="h-full rounded-full"
                style={{ width: `${Math.min(Math.abs(valor) / escala, 1) * 100}%`, backgroundColor: colorBarra }}
            />
        </View>
    );

    return (
        <View className="gap-3">
            {Array.from({ length: n }, (_, j) => (
                <View key={j} className="gap-1">
                    <View className="flex-row justify-between gap-2">
                        <Text className="flex-1 text-xs text-texto-secundario" numberOfLines={1}>
                            {datos.categorias[j] ?? ''}
                        </Text>
                        {k === 1 && (
                            <Text className="text-xs font-semibold text-texto">
                                {numero(datos.series[0].valores[j] ?? 0)}{sufijo}
                            </Text>
                        )}
                    </View>
                    {k === 1
                        ? barra(datos.series[0].valores[j] ?? 0, color(j))
                        : datos.series.map((s, i) => (
                            <View key={i} className="flex-row items-center gap-2">
                                {barra(s.valores[j] ?? 0, color(i))}
                                <Text className="text-xs font-semibold text-texto">{numero(s.valores[j] ?? 0)}{sufijo}</Text>
                            </View>
                        ))}
                </View>
            ))}
        </View>
    );
}

// Circulares: cada porción con su valor. Cartesianas con varias series: el nombre de cada una.
function Leyenda({ datos }: { datos: DatosGrafica }) {
    const circular = datos.tipo === 'circular' || datos.tipo === 'donut';
    if (!circular && datos.series.length < 2) return null;

    const elementos = circular
        ? datos.series[0].valores.map((v, i) => ({ nombre: datos.categorias[i] ?? '', valor: numero(v) }))
        : datos.series.map((s) => ({ nombre: s.nombre, valor: undefined }));

    return (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
            {elementos.map((e, i) => (
                <View key={i} className="flex-row items-center gap-1.5">
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color(i) }} />
                    <Text className="text-xs text-texto-secundario">
                        {e.nombre}
                        {e.valor !== undefined && <Text className="font-semibold text-texto"> {e.valor}</Text>}
                    </Text>
                </View>
            ))}
        </View>
    );
}
