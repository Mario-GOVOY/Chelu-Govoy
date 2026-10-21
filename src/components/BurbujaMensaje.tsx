import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { createLucideIcon, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { BorradorCorreo, EditedEmail, Grafica, Mapa, Mensaje, Voto } from '@/types/Chat';
import type { FormMap, SectorsForm } from '@/types/SectorsForm';
import { CheluAvatar } from '@/components/CheluAvatar';
import { ComparisonCard } from '@/components/ComparisonCard';
import { PuntosEscribiendo } from '@/components/PuntosEscribiendo';
import { SectorsFormCard } from '@/components/SectorsFormCard';
import { SectorsResultCard } from '@/components/SectorsResultCard';
import { TarjetaBorradorCorreo } from '@/components/TarjetaBorradorCorreo';
import { TarjetaDocumento } from '@/components/TarjetaDocumento';
import { TarjetaGrafica } from '@/components/TarjetaGrafica';
import { TarjetaMapa } from '@/components/TarjetaMapa';
import { TarjetasHerramientas } from '@/components/TarjetasHerramientas';
import { TextoMarkdown } from '@/components/TextoMarkdown';
import { useSesionActiva } from '@/context/SesionContext';
import { useColores } from '@/theme/ThemeProvider';

const GitBranch = createLucideIcon('git-branch-web', [
    ['path', { d: 'M6 15V3', key: '35l0bk' }],
    ['path', { d: 'M18 9a9 9 0 0 1-9 9', key: '142qza' }],
    ['circle', { cx: '18', cy: '6', r: '3', key: '1h7g24' }],
    ['circle', { cx: '6', cy: '18', r: '3', key: 'fqmcym' }],
]);

// La lista va invertida y le da la vuelta a cada fila: FadeInDown se ve subir desde abajo.
const USER_ENTERING = FadeInDown.duration(250);
const CHELU_ENTERING = FadeIn.duration(300);
const CARD_ENTERING = FadeIn.duration(300);

// Las funciones llegan estables (useCallback): así memo solo repinta la burbuja cuyo mensaje cambia.
export const BurbujaMensaje = memo(function BurbujaMensaje({ mensaje, animateEntry = false, onDuplicarDesde, duplicando = false, onPreguntar, onValorar, onAmpliarGrafica, onAbrirMapa, onSendEmail, onLaunchSectorsForm, onRefineSectorsForm, onChangeSectorsFormMap, onEditSectorsForm }: {
    mensaje: Mensaje;
    // Entra con animación al montarse.
    animateEntry?: boolean;
    onSendEmail: (borrador: BorradorCorreo, edited: EditedEmail) => Promise<void>;
    onLaunchSectorsForm?: (form: SectorsForm) => void;
    onRefineSectorsForm?: (form: SectorsForm) => void;
    onChangeSectorsFormMap: (form: SectorsForm, mapId?: number) => Promise<void>;
    onEditSectorsForm: (form: SectorsForm, map: FormMap) => void;
    onAmpliarGrafica?: (grafica: Grafica) => void;
    onAbrirMapa?: (mapa: Mapa) => void;
    onDuplicarDesde?: (runId: string) => void;
    duplicando?: boolean;
    // Envía una pregunta sugerida. Sin él no se pintan las sugerencias.
    onPreguntar?: (pregunta: string) => void;
    // Abre la valoración con ese pulgar. Sin él no se pintan los pulgares.
    onValorar?: (runId: string, valoracion: 1 | -1, anterior: Voto | null) => void;
}) {
    const { sesion } = useSesionActiva();
    const colores = useColores();

    if (mensaje.rol === 'usuario') {
        // Las clases de NativeWind no se aplican en Animated.View: van en el View de dentro.
        return (
            <Animated.View entering={animateEntry ? USER_ENTERING : undefined}>
                <View className="items-end gap-2">
                    {/* Avatar y nombre algo más pegados al borde que el contenido. */}
                    <View className="-mr-2 flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-texto">Tú</Text>
                        <View className="h-7 w-7 items-center justify-center rounded-lg bg-texto-secundario">
                            <Text className="text-sm font-bold text-superficie">
                                {sesion.username.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <View className="max-w-[85%] rounded-xl rounded-tr-sm bg-primario px-4 py-3">
                        <Text selectable className="text-base text-sobre-primario">
                            {mensaje.texto}
                        </Text>
                    </View>
                </View>
            </Animated.View>
        );
    }

    // Solo las respuestas guardadas y completas se valoran o duplican: las detenidas o con error no tienen turno en el back.
    const savedRunId = mensaje.estado ? undefined : mensaje.runId;
    // Las tarjetas que llegan por el stream entran con un fundido; las de una respuesta ya terminada salen sin él.
    const cardEntering = mensaje.estado === 'escribiendo' ? CARD_ENTERING : undefined;

    return (
        <Animated.View entering={animateEntry ? CHELU_ENTERING : undefined}>
            <View className="gap-1">
                <View className="-ml-2 flex-row items-center gap-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg border border-borde bg-superficie p-0.5">
                        <CheluAvatar />
                    </View>
                    <Text className="text-sm font-bold text-texto">CHELU</Text>
                </View>
                <View className="gap-2">
                    {!!mensaje.herramientas?.length && <TarjetasHerramientas herramientas={mensaje.herramientas} />}
                    {mensaje.progress && (
                        <View className="flex-row items-center gap-2 self-start rounded-xl bg-primario-suave px-3 py-2">
                            <ActivityIndicator size={15} color={colores.primario} />
                            <Text className="shrink text-[13px] font-medium text-primario">{mensaje.progress}</Text>
                        </View>
                    )}
                    {!!mensaje.texto && <TextoMarkdown texto={mensaje.texto} writing={mensaje.estado === 'escribiendo'} />}
                    {mensaje.graficas?.map((g, i) => (
                        <Animated.View key={i} entering={cardEntering}>
                            <TarjetaGrafica
                                grafica={g}
                                animate={mensaje.estado === 'escribiendo'}
                                onAmpliar={onAmpliarGrafica && (() => onAmpliarGrafica(g))}
                            />
                        </Animated.View>
                    ))}
                    {mensaje.mapas?.map((mapa, i) => (
                        <Animated.View key={i} entering={cardEntering}>
                            <TarjetaMapa mapa={mapa} onAbrir={onAbrirMapa && (() => onAbrirMapa(mapa))} />
                        </Animated.View>
                    ))}
                    {mensaje.documentos?.map((d) => (
                        <Animated.View key={d.fileId} entering={cardEntering}>
                            <TarjetaDocumento documento={d} />
                        </Animated.View>
                    ))}
                    {mensaje.borradoresCorreo?.map((borrador, i) => (
                        <Animated.View key={i} entering={cardEntering}>
                            <TarjetaBorradorCorreo borrador={borrador} onSend={(edited) => onSendEmail(borrador, edited)} />
                        </Animated.View>
                    ))}
                    {mensaje.sectorsForms?.map((form, i) => (
                        <Animated.View key={i} entering={cardEntering}>
                            <SectorsFormCard
                                form={form}
                                onLaunch={onLaunchSectorsForm && (() => onLaunchSectorsForm(form))}
                                onRefine={onRefineSectorsForm && (() => onRefineSectorsForm(form))}
                                onChangeMap={(mapId) => onChangeSectorsFormMap(form, mapId)}
                                onEdit={(map) => onEditSectorsForm(form, map)}
                            />
                        </Animated.View>
                    ))}
                    {mensaje.sectorsResults?.map((result) => (
                        <Animated.View key={result.optimizationId} entering={cardEntering}>
                            <SectorsResultCard result={result} />
                        </Animated.View>
                    ))}
                    {mensaje.comparisons?.map((comparison, i) => (
                        <Animated.View key={i} entering={cardEntering}>
                            <ComparisonCard comparison={comparison} />
                        </Animated.View>
                    ))}
                    {/* También tras el texto: si Chelu está llamando a una herramienta, pasan segundos sin texto nuevo. */}
                    {mensaje.estado === 'escribiendo' && <PuntosEscribiendo />}
                    {mensaje.estado === 'detenida' && (
                        <Text className="text-sm italic text-texto-tenue">Respuesta detenida.</Text>
                    )}
                    {mensaje.estado === 'error' && (
                        <View className="rounded-xl bg-peligro-suave px-3 py-2">
                            <Text className="text-sm text-peligro">
                                {mensaje.errorMessage ?? 'No se pudo completar la respuesta. Inténtalo de nuevo.'}
                            </Text>
                        </View>
                    )}
                    {onPreguntar && !!mensaje.sugerencias?.length && (
                        <View className="mt-1 flex-row flex-wrap gap-2">
                            {mensaje.sugerencias.map((pregunta) => (
                                <Pressable
                                    key={pregunta}
                                    onPress={() => onPreguntar(pregunta)}
                                    accessibilityRole="button"
                                    className="rounded-full border border-borde-medio bg-superficie px-3 py-2 active:bg-primario-suave"
                                >
                                    <Text className="text-[11px] font-medium text-primario">{pregunta}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    {savedRunId !== undefined && (onValorar || onDuplicarDesde) && (
                        <View className="mt-1 flex-row items-center gap-1">
                            {onValorar && ([1, -1] as const).map((valoracion) => {
                                const Icono = valoracion === 1 ? ThumbsUp : ThumbsDown;
                                const activo = mensaje.voto?.valoracion === valoracion;
                                return (
                                    <Pressable
                                        key={valoracion}
                                        onPress={() => onValorar(savedRunId, valoracion, mensaje.voto ?? null)}
                                        accessibilityRole="button"
                                        accessibilityLabel={valoracion === 1 ? 'Buena respuesta' : 'Mala respuesta'}
                                        accessibilityState={{ selected: activo }}
                                        className="h-8 w-8 items-center justify-center rounded-lg active:bg-superficie-alt"
                                    >
                                        {/* El votado, relleno, como en la web. */}
                                        <Icono
                                            size={16}
                                            color={activo ? colores['texto-secundario'] : colores['texto-tenue']}
                                            fill={activo ? colores['texto-secundario'] : 'none'}
                                        />
                                    </Pressable>
                                );
                            })}
                            {onDuplicarDesde && (
                                <Pressable
                                    onPress={() => onDuplicarDesde(savedRunId)}
                                    disabled={duplicando}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Duplicar chat desde aquí"
                                    accessibilityState={{ busy: duplicando }}
                                    className="ml-1 flex-row items-center gap-1.5 rounded-full border border-borde-medio px-3 py-1.5 active:bg-superficie-alt"
                                >
                                    {duplicando ? (
                                        <ActivityIndicator size={14} color={colores['texto-secundario']} />
                                    ) : (
                                        <GitBranch size={14} color={colores['texto-secundario']} />
                                    )}
                                    <Text className="text-xs font-medium text-texto-secundario">
                                        {duplicando ? 'Duplicando…' : 'Duplicar desde aquí'}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
});
