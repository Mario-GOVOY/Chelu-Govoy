import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Check, Mic, Send, Square, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoiceNote } from '@/chat/useVoiceNote';
import { useTecladoVisible } from '@/hooks/useTecladoVisible';
import { useColores } from '@/theme/ThemeProvider';

const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function CajaMensaje({ onEnviar, onParar, respondiendo = false, desactivada = false, voiceNotes = false, sessionId }: {
    // fromVoice: el texto salió (en parte) de una nota de voz.
    onEnviar: (texto: string, fromVoice: boolean) => void;
    onParar: () => void;
    respondiendo?: boolean;
    desactivada?: boolean;
    // Muestra el micro para dictar la pregunta (HAS_AUDIO_CHAT_CHELU).
    voiceNotes?: boolean;
    // Conversación abierta: el back une con ella la traza de la transcripción.
    sessionId?: string;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
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

    const cambiarTexto = (nuevo: string) => {
        setTexto(nuevo);
        if (!nuevo) setFromVoice(false);
    };

    const enviar = () => {
        if (sinEnvio) return;
        onEnviar(texto.trim(), fromVoice);
        setTexto('');
        setFromVoice(false);
    };

    // Con el teclado abierto la barra de navegación queda debajo, así que sobra su margen.
    return (
        <View
            className="border-t border-borde bg-superficie px-3 pt-2"
            style={{ paddingBottom: (teclado ? 0 : insets.bottom) + 8 }}
        >
            {voiceNote.error && <Text className="px-2 pb-1 text-xs text-peligro">{voiceNote.error}</Text>}
            <View className="flex-row items-end gap-2 rounded-3xl bg-fondo py-1.5 pl-4 pr-1.5">
                {recording ? (
                    // Mientras se graba, la fila de grabación ocupa el sitio del campo y de enviar.
                    <>
                        <View className="h-10 flex-1 flex-row items-center gap-2">
                            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colores.peligro }} />
                            <Text className="flex-1 text-base italic text-texto-secundario" numberOfLines={1}>
                                Chelu te escucha…
                            </Text>
                            <Text className="text-sm text-texto-tenue" style={{ fontVariant: ['tabular-nums'] }}>
                                {formatDuration(voiceNote.durationMillis)}
                            </Text>
                        </View>
                        <Pressable
                            onPress={voiceNote.cancel}
                            accessibilityRole="button"
                            accessibilityLabel="Descartar nota de voz"
                            className="h-10 w-10 items-center justify-center rounded-full bg-borde active:bg-borde-medio"
                        >
                            <X size={18} color={colores['texto-secundario']} />
                        </Pressable>
                        <Pressable
                            onPress={voiceNote.finish}
                            accessibilityRole="button"
                            accessibilityLabel="Transcribir nota de voz"
                            className="h-10 w-10 items-center justify-center rounded-full bg-primario active:bg-primario-presionado"
                        >
                            <Check size={18} color={colores['sobre-primario']} />
                        </Pressable>
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
                                <View className="h-10 w-10 items-center justify-center">
                                    <ActivityIndicator size="small" color={colores.primario} />
                                </View>
                            ) : (
                                <Pressable
                                    onPress={voiceNote.start}
                                    disabled={respondiendo || desactivada}
                                    accessibilityRole="button"
                                    accessibilityLabel="Dictar la pregunta"
                                    accessibilityState={{ disabled: respondiendo || desactivada }}
                                    className="h-10 w-10 items-center justify-center rounded-full active:bg-borde"
                                >
                                    <Mic size={20} color={respondiendo || desactivada ? colores['texto-tenue'] : colores['texto-secundario']} />
                                </Pressable>
                            )
                        )}
                        {/* El fondo va en style: con la clase bg-peligro NativeWind lo dejaba gris. */}
                        {respondiendo ? (
                            <Pressable
                                key="parar"
                                onPress={onParar}
                                accessibilityRole="button"
                                accessibilityLabel="Detener respuesta"
                                className="h-10 w-10 items-center justify-center rounded-full"
                                style={{ backgroundColor: colores.peligro }}
                            >
                                <Square size={14} color={colores['sobre-primario']} fill={colores['sobre-primario']} />
                            </Pressable>
                        ) : (
                            <Pressable
                                key="enviar"
                                onPress={enviar}
                                disabled={sinEnvio}
                                accessibilityRole="button"
                                accessibilityLabel="Enviar"
                                accessibilityState={{ disabled: sinEnvio }}
                                className={`h-10 w-10 items-center justify-center rounded-full ${sinEnvio ? 'bg-borde' : 'bg-primario active:bg-primario-presionado'}`}
                            >
                                <Send size={18} color={sinEnvio ? colores['texto-tenue'] : colores['sobre-primario']} />
                            </Pressable>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}
