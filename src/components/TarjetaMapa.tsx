import { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Map as IconoMapa, Maximize2 } from 'lucide-react-native';

import { capasLeyenda, IMAGENES_PNG, iconoMarcador, marcadorCapa, tipoCapa } from '@/chat/mapas';
import { SvgIcono } from '@/components/IconosMapa';
import { useColores } from '@/theme/ThemeProvider';
import type { CapaMapa, Mapa } from '@/types/Chat';

function resumen({ numPuntos, numPoligonos, truncado }: Mapa) {
    const partes = [];
    if (numPuntos != null) partes.push(`${numPuntos} ${numPuntos === 1 ? 'punto' : 'puntos'}`);
    if (numPoligonos != null) partes.push(`${numPoligonos} ${numPoligonos === 1 ? 'zona' : 'zonas'}`);
    if (!partes.length) return null;
    return partes.join(' · ') + (truncado ? ' (recortado)' : '');
}

const TAMANO_MUESTRA = 16;

// Zonas: cuadrado translúcido con borde, como en el mapa. Puntos: el icono de su marcador.
function MuestraCapa({ capa }: { capa: CapaMapa }) {
    if (tipoCapa(capa) === 'zonas') {
        return (
            <View className="h-4 w-4 items-center justify-center">
                <View className="h-3 w-3 overflow-hidden rounded-sm" style={{ borderWidth: 1.5, borderColor: capa.color }}>
                    <View className="flex-1" style={{ backgroundColor: capa.color, opacity: 0.35 }} />
                </View>
            </View>
        );
    }
    const icono = iconoMarcador(marcadorCapa(capa), capa.color);
    if ('png' in icono) {
        return (
            <Image
                source={IMAGENES_PNG[icono.png]}
                style={{ width: TAMANO_MUESTRA, height: TAMANO_MUESTRA }}
                resizeMode="contain"
            />
        );
    }
    return <SvgIcono icono={icono.generado} tamano={TAMANO_MUESTRA} />;
}

/** Color y nombre de cada capa (las de capasLeyenda). Con menos de dos no se pinta. */
export function LeyendaMapa({ capas }: { capas: CapaMapa[] }) {
    if (capas.length < 2) return null;
    return (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
            {capas.map((capa) => (
                <View key={capa.nombre} className="flex-row items-center gap-1.5">
                    <MuestraCapa capa={capa} />
                    <Text className="text-xs text-texto-secundario">{capa.nombre}</Text>
                </View>
            ))}
        </View>
    );
}

/** Tarjeta del chat: título, cuántos elementos tiene y la leyenda. Al tocarla se abre el mapa. */
export function TarjetaMapa({ mapa, onAbrir }: { mapa: Mapa; onAbrir?: () => void }) {
    const colores = useColores();
    const leyenda = useMemo(() => capasLeyenda(mapa), [mapa]);
    const cuantos = resumen(mapa);

    return (
        <Pressable
            onPress={onAbrir}
            disabled={!onAbrir}
            accessibilityRole="button"
            accessibilityLabel={`Abrir mapa${mapa.titulo ? `: ${mapa.titulo}` : ''}`}
            className="gap-3 rounded-xl border border-borde bg-superficie p-3 active:bg-superficie-alt"
        >
            <View className="flex-row items-center gap-2">
                <IconoMapa size={16} color={colores['texto-secundario']} />
                <Text className="flex-1 text-sm font-semibold text-texto">{mapa.titulo ?? 'Mapa'}</Text>
                {onAbrir && <Maximize2 size={16} color={colores['texto-tenue']} />}
            </View>
            {cuantos && <Text className="text-xs text-texto-tenue">{cuantos}</Text>}
            <LeyendaMapa capas={leyenda} />
        </Pressable>
    );
}
