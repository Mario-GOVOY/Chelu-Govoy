import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { createLucideIcon } from 'lucide-react-native';

import { Mensaje } from '@/chat/chatApi';
import { CheluAvatar } from '@/components/CheluAvatar';
import { PuntosEscribiendo } from '@/components/PuntosEscribiendo';
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

export function BurbujaMensaje({ mensaje, onDuplicarDesde, duplicando = false, onPreguntar }: {
    mensaje: Mensaje;
    onDuplicarDesde?: () => void;
    duplicando?: boolean;
    // Envía una pregunta sugerida. Sin él no se pintan las sugerencias.
    onPreguntar?: (pregunta: string) => void;
}) {
    const { sesion } = useSesionActiva();
    const colores = useColores();

    if (mensaje.rol === 'usuario') {
        return (
            <View className="items-end gap-2">
                <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-texto">Tú</Text>
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-texto-secundario">
                        <Text className="text-sm font-bold text-superficie">
                            {sesion.username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>
                <View className="mr-9 max-w-[85%] rounded-xl rounded-tr-sm bg-primario px-4 py-3">
                    <Text selectable className="text-base text-sobre-primario">
                        {mensaje.texto}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="gap-1">
            <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-lg border border-borde bg-superficie p-0.5">
                    <CheluAvatar />
                </View>
                <Text className="text-sm font-bold text-texto">CHELU</Text>
            </View>
            <View className="gap-2 pl-9">
                {!!mensaje.herramientas?.length && <TarjetasHerramientas herramientas={mensaje.herramientas} />}
                {!!mensaje.texto && <TextoMarkdown texto={mensaje.texto} />}
                {/* También tras el texto: si Chelu está llamando a una herramienta, pasan segundos sin texto nuevo. */}
                {mensaje.estado === 'escribiendo' && <PuntosEscribiendo />}
                {mensaje.estado === 'detenida' && (
                    <Text className="text-sm italic text-texto-tenue">Respuesta detenida.</Text>
                )}
                {mensaje.estado === 'error' && (
                    <View className="rounded-xl bg-peligro-suave px-3 py-2">
                        <Text className="text-sm text-peligro">No se pudo completar la respuesta. Inténtalo de nuevo.</Text>
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
                {onDuplicarDesde && (
                    <Pressable
                        onPress={onDuplicarDesde}
                        disabled={duplicando}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Duplicar chat desde aquí"
                        accessibilityState={{ busy: duplicando }}
                        className="mt-1 flex-row items-center gap-1.5 self-start rounded-full border border-borde-medio px-3 py-1.5 active:bg-superficie-alt"
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
        </View>
    );
}
