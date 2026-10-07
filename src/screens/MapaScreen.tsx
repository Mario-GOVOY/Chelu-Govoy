import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import {
    Camera,
    GeoJSONSource,
    type ImageEntry,
    Images,
    Layer,
    Map,
    TransformRequestManager,
} from '@maplibre/maplibre-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_AGENT_MAPAS } from '@/auth/Constants';
import {
    CAPAS_ELEMENTOS,
    capasLeyenda,
    elementosPorTipo,
    ESTILO_MAPA,
    IMAGENES_PNG,
    type TipoElemento,
    URL_ATRIBUCION_OSM,
    vistaInicial,
} from '@/chat/mapas';
import { GeneradorIconos } from '@/components/IconosMapa';
import { CargaMapa } from '@/components/Spinners/CargaMapa';
import { LeyendaMapa } from '@/components/TarjetaMapa';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useColores } from '@/theme/ThemeProvider';

// En este orden se apilan: zonas debajo y puntos encima.
const TIPOS_ELEMENTO: TipoElemento[] = ['zonas', 'lineas', 'puntos'];

const TEXTOS_CON_PARADAS = [
    'Colocando las paradas…',
    'Numerando las paradas…',
    'Repasando las rutas…',
    'Buscando el mejor encuadre…',
    'Ajustando el mapa…',
    'Descargando las calles…'
];
const TEXTOS_SIN_PARADAS = ['Cargando el mapa…', 'Descargando las calles…', 'Buscando el mejor encuadre…'];

// Se añade al cargar el módulo, antes de la primera petición de teselas.
TransformRequestManager.addHeader({ id: 'user-agent', name: 'User-Agent', value: USER_AGENT_MAPAS });

type Props = NativeStackScreenProps<RootStackParamList, 'Mapa'>;

/** Mapa a pantalla completa, con zoom y desplazamiento. */
export default function MapaScreen({ navigation, route }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const { mapa } = route.params;
    const vista = useMemo(() => vistaInicial(mapa), [mapa]);
    const elementos = useMemo(() => elementosPorTipo(mapa), [mapa]);
    const leyenda = useMemo(() => capasLeyenda(mapa), [mapa]);
    const conLeyenda = leyenda.length > 1;
    const [entradaTerminada, setEntradaTerminada] = useState(false);
    const [iconos, setIconos] = useState<Record<string, ImageEntry> | null>(null);
    const imagenes = useMemo(() => ({ ...IMAGENES_PNG, ...iconos }), [iconos]);
    const [mapaPintado, setMapaPintado] = useState(false);

    // El mapa y los iconos se montan al acabar la animación de entrada.
    useEffect(
        () =>
            navigation.addListener('transitionEnd', (evento) => {
                if (!evento.data.closing) setEntradaTerminada(true);
            }),
        [navigation],
    );

    // La carga se quita cuando el mapa avisa de que ha pintado los iconos, o a los 3 s si no avisa.
    useEffect(() => {
        if (!iconos) return;
        const tope = setTimeout(() => setMapaPintado(true), 3000);
        return () => clearTimeout(tope);
    }, [iconos]);

    return (
        <View className="flex-1 bg-fondo">
            <View
                className="flex-row items-center gap-2 border-b border-borde bg-superficie pl-4 pr-1"
                style={{ paddingTop: insets.top, height: insets.top + 56 }}
            >
                <Text className="flex-1 text-base font-semibold text-texto" numberOfLines={1}>
                    {mapa.titulo ?? 'Mapa'}
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
            <View className="flex-1">
                {entradaTerminada && (
                    <>
                        {/* Antes que el mapa para que quede debajo. */}
                        <GeneradorIconos iconos={elementos.iconos} onListos={setIconos} />
                        {/* Sin giro ni inclinación: siempre con el norte arriba. */}
                        <Map
                            mapStyle={ESTILO_MAPA}
                            logo={false}
                            attribution={false}
                            compass={false}
                            touchRotate={false}
                            touchPitch={false}
                            onDidFinishRenderingMapFully={() => iconos && setMapaPintado(true)}
                        >
                            <Camera initialViewState={vista} maxZoom={19} />
                            <Images images={imagenes} />
                            {TIPOS_ELEMENTO.map((tipo) => (
                                <GeoJSONSource key={tipo} id={tipo} data={elementos[tipo]}>
                                    {CAPAS_ELEMENTOS.filter((capa) => capa.source === tipo).map((capa) => (
                                        <Layer key={capa.id} {...capa} />
                                    ))}
                                </GeoJSONSource>
                            ))}
                        </Map>
                    </>
                )}
                {/* Atribución de OSM, siempre visible, con enlace a su página de copyright. */}
                <Pressable
                    onPress={() => Linking.openURL(URL_ATRIBUCION_OSM)}
                    accessibilityRole="link"
                    className="absolute right-0 bg-white/80 px-1.5 py-0.5"
                    // Con leyenda, el mapa acaba encima de ella; sin ella, llega hasta la barra de botones.
                    style={{ bottom: conLeyenda ? 0 : insets.bottom }}
                >
                    {/* Solo el nombre como enlace. Colores fijos: el mapa es siempre claro. */}
                    <Text className="text-[11px] text-neutral-800">
                        © <Text className="text-[#0078a8] underline">OpenStreetMap</Text> contributors
                    </Text>
                </Pressable>
                {!mapaPintado && <CargaMapa textos={elementos.iconos.length ? TEXTOS_CON_PARADAS : TEXTOS_SIN_PARADAS} />}
            </View>
            {conLeyenda && (
                <View className="border-t border-borde bg-superficie px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
                    <LeyendaMapa capas={leyenda} />
                </View>
            )}
        </View>
    );
}
