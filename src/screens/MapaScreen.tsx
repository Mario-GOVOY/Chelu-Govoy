import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
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
import type { FeatureCollection } from 'geojson';
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
import { getLinesByStreets } from '@/chat/rutas';
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

const SIN_LINEAS: FeatureCollection = { type: 'FeatureCollection', features: [] };

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
    const [generatedImages, setGeneratedImages] = useState<Record<string, ImageEntry>>({});
    const [iconsReady, setIconsReady] = useState(false);
    const imagenes = useMemo(() => ({ ...IMAGENES_PNG, ...generatedImages }), [generatedImages]);
    const [lineas, setLineas] = useState<FeatureCollection | null>(null);
    const [esperaRutasAgotada, setEsperaRutasAgotada] = useState(false);
    const datos = useMemo(() => ({ ...elementos, lineas: lineas ?? SIN_LINEAS }), [elementos, lineas]);
    const listo = iconsReady && (lineas !== null || esperaRutasAgotada);
    const [mapaCargado, setMapaCargado] = useState(false);
    const [rendersAfterReady, setRendersAfterReady] = useState(0);
    const [mapaPintado, setMapaPintado] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    const handleGenerationProgress = useCallback((newImages: Record<string, ImageEntry>) => {
        setGenerationProgress((count) => count + 1);
        setGeneratedImages((images) => ({ ...images, ...newImages }));
    }, []);

    const handleIconsReady = useCallback((allImages: Record<string, ImageEntry>) => {
        setGeneratedImages((images) => ({ ...images, ...allImages }));
        setIconsReady(true);
    }, []);

    const textosCarga = useMemo(() => {
        const textos = elementos.iconos.length ? [...TEXTOS_CON_PARADAS] : [...TEXTOS_SIN_PARADAS];
        if (elementos.lineas.features.length) textos.splice(1, 0, 'Trazando las rutas…');
        return textos;
    }, [elementos]);

    // Si las rutas tardan más de 5 s, el mapa se abre sin ellas y se pintan al llegar.
    useEffect(() => {
        let cancelado = false;
        const drawRoutes = async () => {
            const routes = await getLinesByStreets(elementos.lineas);
            if (!cancelado) setLineas(routes);
        };
        drawRoutes();
        const tope = setTimeout(() => setEsperaRutasAgotada(true), 5000);
        return () => {
            cancelado = true;
            clearTimeout(tope);
        };
    }, [elementos]);

    // El mapa y los iconos se montan al acabar la animación de entrada.
    useEffect(
        () =>
            navigation.addListener('transitionEnd', (evento) => {
                if (!evento.data.closing) setEntradaTerminada(true);
            }),
        [navigation],
    );

    // Con todo listo, la carga se quita en el segundo aviso de pintado del mapa (el primero llega antes
    // de que MapLibre ponga las últimas imágenes), 1,5 s después del primero o a los 3 s si no avisa.
    useEffect(() => {
        if (!listo) return;
        const tope = setTimeout(() => setMapaPintado(true), 3000);
        return () => clearTimeout(tope);
    }, [listo]);

    useEffect(() => {
        if (rendersAfterReady >= 2) {
            setMapaPintado(true);
            return;
        }
        if (rendersAfterReady === 0) return;
        const tope = setTimeout(() => setMapaPintado(true), 1500);
        return () => clearTimeout(tope);
    }, [rendersAfterReady]);

    // A los 10 s de pintar el mapa con sus capas por primera vez, la carga se quita aunque falte algo;
    // lo que falte se pinta al llegar. Cada tanda de iconos generada reinicia la cuenta.
    useEffect(() => {
        if (!mapaCargado) return;
        const tope = setTimeout(() => setMapaPintado(true), 10000);
        return () => clearTimeout(tope);
    }, [mapaCargado, generationProgress]);

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
                        <GeneradorIconos
                            iconos={elementos.iconos}
                            onListos={handleIconsReady}
                            onProgress={handleGenerationProgress}
                        />
                        {/* Sin giro ni inclinación: siempre con el norte arriba. */}
                        <Map
                            mapStyle={ESTILO_MAPA}
                            logo={false}
                            attribution={false}
                            compass={false}
                            touchRotate={false}
                            touchPitch={false}
                            onDidFinishRenderingMapFully={() => {
                                setMapaCargado(true);
                                if (listo) setRendersAfterReady((count) => count + 1);
                            }}
                        >
                            <Camera initialViewState={vista} maxZoom={19} />
                            <Images images={imagenes} />
                            {TIPOS_ELEMENTO.map((tipo) => (
                                <GeoJSONSource key={tipo} id={tipo} data={datos[tipo]}>
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
                {!mapaPintado && <CargaMapa textos={textosCarga} />}
            </View>
            {conLeyenda && (
                <View className="border-t border-borde bg-superficie px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
                    <ScrollView style={{ maxHeight: 144 }} persistentScrollbar>
                        <LeyendaMapa capas={leyenda} />
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
