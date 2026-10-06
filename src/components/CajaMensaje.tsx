import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Send, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTecladoVisible } from '@/hooks/useTecladoVisible';
import { useColores } from '@/theme/ThemeProvider';

export function CajaMensaje({ onEnviar, onParar, respondiendo = false, desactivada = false }: {
    onEnviar: (texto: string) => void;
    onParar: () => void;
    respondiendo?: boolean;
    desactivada?: boolean;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const teclado = useTecladoVisible();
    const [texto, setTexto] = useState('');
    const sinEnvio = texto.trim() === '' || desactivada;

    const enviar = () => {
        if (sinEnvio) return;
        onEnviar(texto.trim());
        setTexto('');
    };

    // Con el teclado abierto la barra de navegación queda debajo, así que sobra su margen.
    return (
        <View
            className="border-t border-borde bg-superficie px-3 pt-2"
            style={{ paddingBottom: (teclado ? 0 : insets.bottom) + 8 }}
        >
            <View className="flex-row items-end gap-2 rounded-3xl bg-fondo py-1.5 pl-4 pr-1.5">
                <TextInput
                    value={texto}
                    onChangeText={setTexto}
                    multiline
                    placeholder="Pregunta a CHELU…"
                    accessibilityLabel="Mensaje para CHELU"
                    placeholderTextColor={colores['texto-tenue']}
                    cursorColor={colores.primario}
                    selectionColor={colores.primario}
                    textAlignVertical="center"
                    className="max-h-32 flex-1 py-2 text-base text-texto"
                />
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
            </View>
        </View>
    );
}
