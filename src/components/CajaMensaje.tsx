import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Check, Mic, Send, Square, X } from 'lucide-react-native';
import Animated, { FadeIn, LayoutAnimationConfig, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVoiceNote } from '@/chat/useVoiceNote';
import { useTecladoVisible } from '@/hooks/useTecladoVisible';
import { useColores } from '@/theme/ThemeProvider';
import { hapticSend, hapticStopResponse, hapticVoiceNote } from '@/utils/haptics';

// Medidas de la onda en px. Van en style y no en clases: NativeWind usa rem de 14 px y no darían px exactos.
const WAVE_BAR_WIDTH = 2;
const WAVE_BAR_GAP = 2;
const WAVE_HEIGHT = 20;

const BUTTON_ENTERING = ZoomIn.duration(200);
const ROW_ENTERING = FadeIn.duration(200);

const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function CajaMensaje({ onEnviar, onParar, stopping = false, respondiendo = false, desactivada = false, voiceNotes = false, sessionId }: {
    // fromVoice: el texto salió (en parte) de una nota de voz.
    onEnviar: (texto: string, fromVoice: boolean) => void;
    onParar: () => void;
    // Se ha pedido parar y aún no ha terminado: spinner en el botón y sin poder pulsarlo.
    stopping?: boolean;
    respondiendo?: boolean;
    desactivada?: boolean;
    // Muestra el micro para dictar la pregunta (HAS_AUDIO_CHAT_CHELU).
    voiceNotes?: boolean;
    // Conversación abierta: el back une con ella la traza de la transcripción.
    sessionId?: string;
}) {
    const colores = useColores();
    const teclado = useTecladoVisible();
    const [texto, setTexto] = useState('');
    const [fromVoice, setFromVoice] = useState(false);
    const sinEnvio = texto.trim() === '' || desactivada;

    // El texto dictado se añade a lo escrito para revisarlo antes de enviarlo; no se envía solo.
    const voiceNote = useVoiceNote({
        sessionId,
        onText: (text) => {
            setTexto((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
            setFromVoice(true);
        },
    });
    const recording = voiceNote.status === 'recording';
    const transcribing = voiceNote.status === 'transcribing';

    // Barras que caben en la onda; se rellena por la izquierda con silencio para que entre por la derecha.
    const [waveBarCount, setWaveBarCount] = useState(0);
    const shownLevels = voiceNote.levels.slice(Math.max(0, voiceNote.levels.length - waveBarCount));
    const waveLevels = [...Array<number>(Math.max(0, waveBarCount - shownLevels.length)).fill(0), ...shownLevels];

    const cambiarTexto = (nuevo: string) => {
        setTexto(nuevo);
        if (!nuevo) setFromVoice(false);
    };

    const enviar = () => {
        if (sinEnvio) return;
        hapticSend();
        onEnviar(texto.trim(), fromVoice);
        setTexto('');
        setFromVoice(false);
    };

    const parar = () => {
        hapticStopResponse();
        onParar();
    };

    const startRecording = () => {
        hapticVoiceNote();
        voiceNote.start();
    };

    const cancelRecording = () => {
        hapticVoiceNote();
        voiceNote.cancel();
    };

    const finishRecording = () => {
        hapticVoiceNote();
        voiceNote.finish();
    };

    // El margen de la barra de navegación lo pone el sistema al maquetar. Con el teclado abierto la barra queda debajo y sobra.
    return (
        <SafeAreaView
            edges={teclado ? [] : ['bottom']}
            style={{ backgroundColor: colores.superficie, borderTopWidth: 1, borderTopColor: colores.borde }}
        >
            {/* Los botones entran con animación al cambiar, no al abrir la pantalla. */}
            <LayoutAnimationConfig skipEntering>
                <View className="px-3 py-2">
                    {voiceNote.error && <Text className="px-2 pb-1 text-xs text-peligro">{voiceNote.error}</Text>}
                    <View className="flex-row items-end gap-2 rounded-3xl bg-fondo py-1.5 pl-4 pr-1.5">
                        {recording ? (
                            // Mientras se graba, la fila de grabación ocupa el sitio del campo y de enviar.
                            <>
                                <Animated.View entering={ROW_ENTERING} style={{ flex: 1 }}>
                                    <View className="h-10 justify-center gap-1">
                                        <View className="flex-row items-center gap-1.5">
                                            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colores.peligro }} />
                                            <Text className="flex-1 text-xs italic text-texto-secundario" numberOfLines={1}>
                                                Chelu te escucha…
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <View
                                                onLayout={(event) => setWaveBarCount(
                                                    Math.floor((event.nativeEvent.layout.width + WAVE_BAR_GAP) / (WAVE_BAR_WIDTH + WAVE_BAR_GAP)),
                                                )}
                                                className="flex-1 flex-row items-center justify-end overflow-hidden"
                                                style={{ height: WAVE_HEIGHT, gap: WAVE_BAR_GAP }}
                                            >
                                                {waveLevels.map((level, index) => (
                                                    // Silencio = punto; voz = barra proporcional al volumen.
                                                    <View
                                                        key={index}
                                                        className="rounded-full"
                                                        style={{
                                                            width: WAVE_BAR_WIDTH,
                                                            height: Math.max(2, Math.round(level * WAVE_HEIGHT)),
                                                            backgroundColor: level > 0.08 ? colores['texto-secundario'] : colores['borde-medio'],
                                                        }}
                                                    />
                                                ))}
                                            </View>
                                            <Text className="text-xs text-texto-tenue" style={{ fontVariant: ['tabular-nums'] }}>
                                                {formatDuration(voiceNote.durationMillis)}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                                <Animated.View entering={BUTTON_ENTERING}>
                                    <Pressable
                                        onPress={cancelRecording}
                                        accessibilityRole="button"
                                        accessibilityLabel="Descartar nota de voz"
                                        className="h-10 w-10 items-center justify-center rounded-full bg-borde active:bg-borde-medio"
                                    >
                                        <X size={18} color={colores['texto-secundario']} />
                                    </Pressable>
                                </Animated.View>
                                <Animated.View entering={BUTTON_ENTERING}>
                                    <Pressable
                                        onPress={finishRecording}
                                        accessibilityRole="button"
                                        accessibilityLabel="Transcribir nota de voz"
                                        className="h-10 w-10 items-center justify-center rounded-full bg-primario active:bg-primario-presionado"
                                    >
                                        <Check size={18} color={colores['sobre-primario']} />
                                    </Pressable>
                                </Animated.View>
                            </>
                        ) : (
                            <>
                                <TextInput
                                    value={texto}
                                    onChangeText={cambiarTexto}
                                    multiline
                                    editable={!transcribing}
                                    placeholder={transcribing ? 'Transcribiendo…' : 'Pregunta a CHELU…'}
                                    accessibilityLabel="Mensaje para CHELU"
                                    placeholderTextColor={colores['texto-tenue']}
                                    cursorColor={colores.primario}
                                    selectionColor={colores.primario}
                                    textAlignVertical="center"
                                    className="max-h-32 flex-1 py-2 text-base text-texto"
                                />
                                {voiceNotes && (
                                    transcribing ? (
                                        <Animated.View key="transcribiendo" entering={BUTTON_ENTERING}>
                                            <View className="h-10 w-10 items-center justify-center">
                                                <ActivityIndicator size="small" color={colores.primario} />
                                            </View>
                                        </Animated.View>
                                    ) : (
                                        <Animated.View key="micro" entering={BUTTON_ENTERING}>
                                            <Pressable
                                                onPress={startRecording}
                                                disabled={respondiendo || desactivada}
                                                accessibilityRole="button"
                                                accessibilityLabel="Dictar la pregunta"
                                                accessibilityState={{ disabled: respondiendo || desactivada }}
                                                className="h-10 w-10 items-center justify-center rounded-full active:bg-borde"
                                            >
                                                <Mic size={20} color={respondiendo || desactivada ? colores['texto-tenue'] : colores['texto-secundario']} />
                                            </Pressable>
                                        </Animated.View>
                                    )
                                )}
                                {/* El fondo va en style: con la clase bg-peligro NativeWind lo dejaba gris. */}
                                {respondiendo ? (
                                    <Animated.View key="parar" entering={BUTTON_ENTERING}>
                                        <Pressable
                                            onPress={parar}
                                            disabled={stopping}
                                            accessibilityRole="button"
                                            accessibilityLabel="Detener respuesta"
                                            accessibilityState={{ disabled: stopping, busy: stopping }}
                                            className="h-10 w-10 items-center justify-center rounded-full"
                                            style={{ backgroundColor: colores.peligro }}
                                        >
                                            {stopping ? (
                                                <ActivityIndicator size="small" color={colores['sobre-primario']} />
                                            ) : (
                                                <Square size={14} color={colores['sobre-primario']} fill={colores['sobre-primario']} />
                                            )}
                                        </Pressable>
                                    </Animated.View>
                                ) : (
                                    <Animated.View key="enviar" entering={BUTTON_ENTERING}>
                                        <Pressable
                                            onPress={enviar}
                                            disabled={sinEnvio}
                                            accessibilityRole="button"
                                            accessibilityLabel="Enviar"
                                            accessibilityState={{ disabled: sinEnvio }}
                                            className={`h-10 w-10 items-center justify-center rounded-full ${sinEnvio ? 'bg-borde' : 'bg-primario active:bg-primario-presionado'}`}
                                        >
                                            <Send size={18} color={sinEnvio ? colores['texto-tenue'] : colores['sobre-primario']} />
                                        </Pressable>
                                    </Animated.View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </LayoutAnimationConfig>
        </SafeAreaView>
    );
}
