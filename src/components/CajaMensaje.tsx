import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTecladoVisible } from '@/hooks/useTecladoVisible';
import { useColores } from '@/theme/ThemeProvider';

export function CajaMensaje({ onEnviar }: { onEnviar: (texto: string) => void }) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const teclado = useTecladoVisible();
    const [texto, setTexto] = useState('');
    const vacio = texto.trim() === '';

    const enviar = () => {
        if (vacio) return;
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
                <Pressable
                    onPress={enviar}
                    disabled={vacio}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar"
                    accessibilityState={{ disabled: vacio }}
                    className={`h-10 w-10 items-center justify-center rounded-full ${vacio ? 'bg-borde' : 'bg-primario active:bg-primario-presionado'}`}
                >
                    <Send size={18} color={vacio ? colores['texto-tenue'] : colores['sobre-primario']} />
                </Pressable>
            </View>
        </View>
    );
}
