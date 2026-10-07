import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, type StyleProp, View, type ViewStyle } from 'react-native';
import type { ImageEntry } from '@maplibre/maplibre-react-native';
import Svg, { Circle, G, Path, Polygon, Text as TextoSvg } from 'react-native-svg';

import type { IconoGenerado } from '@/chat/mapas';

// Los iconos se generan a la densidad de la pantalla.
const ESCALA = PixelRatio.get();

// Cuántos SVG se montan y capturan a la vez.
const TAMANO_TANDA = 10;

// PNG ya generados (en data URI), por id. Con más de MAX_GENERADOS se borran los que llevan
// más tiempo sin usarse.
const generados = new Map<string, string>();
const MAX_GENERADOS = 3000;

// Tamaño de cada icono. Los números se ensanchan si el texto no cabe.
function getIconSize(icono: IconoGenerado) {
    switch (icono.tipo) {
        case 'numero': {
            const ancho = Math.max(icono.tamano, Math.ceil(icono.texto.length * icono.letra * 0.6) + 2);
            return { ancho, alto: icono.tamano };
        }
        case 'circulo':
            return { ancho: 16, alto: 16 };
        case 'alerta':
            return { ancho: 22, alto: 22 };
        case 'pudo':
            return { ancho: 24, alto: 24 };
    }
}

// Las imágenes para MapLibre. Las que se usan pasan al final de la caché: son las últimas en borrarse.
function getMapImages(iconos: IconoGenerado[]): Record<string, ImageEntry> {
    const imagenes: Record<string, ImageEntry> = {};
    for (const { id } of iconos) {
        const uri = generados.get(id);
        if (!uri) continue;
        generados.delete(id);
        generados.set(id, uri);
        imagenes[id] = { source: { uri, scale: ESCALA } };
    }
    return imagenes;
}

function recortarCache() {
    for (const id of generados.keys()) {
        if (generados.size <= MAX_GENERADOS) break;
        generados.delete(id);
    }
}

// Lo que se dibuja de cada icono, en las coordenadas de su viewBox.
function DibujoIcono({ icono, ancho, alto }: { icono: IconoGenerado; ancho: number; alto: number }) {
    switch (icono.tipo) {
        case 'numero': {
            const grosorBorde = 3;
            return (
                <>
                    {icono.circulo && (
                        <Circle
                            cx={ancho / 2}
                            cy={alto / 2}
                            r={alto / 2 - grosorBorde / 2 - 1}
                            fill={icono.circulo.relleno}
                            stroke={icono.circulo.borde}
                            strokeWidth={grosorBorde}
                        />
                    )}
                    <TextoSvg
                        x={ancho / 2}
                        y={alto / 2 + icono.letra * 0.03}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize={icono.letra}
                        fill={icono.colorTexto}
                    >
                        {icono.texto}
                    </TextoSvg>
                </>
            );
        }
        case 'circulo':
            return <Circle cx={ancho / 2} cy={alto / 2} r={ancho / 2 - 2} fill={icono.color} stroke="#ffffff" strokeWidth={1.5} />;
        case 'alerta':
            return (
                <>
                    <Polygon
                        points={`${ancho / 2},2 2,${alto - 2} ${ancho - 2},${alto - 2}`}
                        fill="#FFD600"
                        stroke="#111111"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                    />
                    <TextoSvg
                        x={ancho / 2}
                        y={alto * 0.59}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize={alto * 0.55}
                        fontWeight="bold"
                        fill="#111111"
                    >
                        !
                    </TextoSvg>
                </>
            );
        case 'pudo':
            // Un paquete dentro de un círculo.
            return (
                <>
                    <Circle cx={12} cy={12} r={11} fill="#ffffff" stroke="#000000" strokeWidth={2} />
                    <G fill="none" stroke="#000000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M16.5 9.4 L7.5 4.24" />
                        <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <Path d="M3.27 6.96 L12.27 12" />
                        <Path d="M12 12 L12 21.6" />
                        <Path d="M21 7.5 L12 12" />
                    </G>
                </>
            );
    }
}

/** Un icono dibujado con react-native-svg, encajado en un cuadrado de `tamano`. */
export function SvgIcono({
    icono,
    tamano,
    style,
    ref,
}: {
    icono: IconoGenerado;
    tamano: number;
    style?: StyleProp<ViewStyle>;
    ref?: (svg: Svg | null) => void;
}) {
    const { ancho, alto } = getIconSize(icono);
    return (
        <Svg ref={ref} width={tamano} height={tamano} viewBox={`0 0 ${ancho} ${alto}`} style={style}>
            <DibujoIcono icono={icono} ancho={ancho} alto={alto} />
        </Svg>
    );
}

type Props = {
    iconos: IconoGenerado[];
    // Con las imágenes de todos los iconos, cuando están listas.
    onListos: (imagenes: Record<string, ImageEntry>) => void;
};

/**
 * Pinta con react-native-svg los iconos que aún no se han generado y los pasa a PNG, por tandas.
 * Los SVG miden 1×1 px y se montan debajo del mapa.
 */
export function GeneradorIconos({ iconos, onListos }: Props) {
    const pendientes = useMemo(() => iconos.filter(({ id }) => !generados.has(id)), [iconos]);
    const [inicioTanda, setInicioTanda] = useState(0);
    const [terminado, setTerminado] = useState(false);
    const tanda = useMemo(() => pendientes.slice(inicioTanda, inicioTanda + TAMANO_TANDA), [pendientes, inicioTanda]);
    const svgs = useRef(new Map<string, Svg>());

    useEffect(() => {
        let cancelado = false;
        const capturas = tanda.map(
            (icono) =>
                new Promise<void>((resolve) => {
                    const svg = svgs.current.get(icono.id);
                    if (!svg) return resolve();
                    const { ancho, alto } = getIconSize(icono);
                    svg.toDataURL(
                        (base64) => {
                            generados.set(icono.id, `data:image/png;base64,${base64}`);
                            resolve();
                        },
                        { width: Math.round(ancho * ESCALA), height: Math.round(alto * ESCALA) },
                    );
                }),
        );
        Promise.all(capturas).then(() => {
            if (cancelado) return;
            if (inicioTanda + TAMANO_TANDA < pendientes.length) {
                setInicioTanda(inicioTanda + TAMANO_TANDA);
                return;
            }
            setTerminado(true);
            onListos(getMapImages(iconos));
            recortarCache();
        });
        return () => {
            cancelado = true;
        };
    }, [tanda, inicioTanda, pendientes, iconos, onListos]);

    if (terminado || !tanda.length) return null;
    return (
        <View pointerEvents="none" className="absolute left-0 top-0 h-px w-px overflow-hidden">
            {tanda.map((icono) => (
                <SvgIcono
                    key={icono.id}
                    icono={icono}
                    tamano={1}
                    style={{ position: 'absolute' }}
                    ref={(svg) => {
                        if (svg) svgs.current.set(icono.id, svg);
                        else svgs.current.delete(icono.id);
                    }}
                />
            ))}
        </View>
    );
}
