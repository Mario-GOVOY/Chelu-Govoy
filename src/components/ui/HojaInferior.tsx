import { ReactNode, useEffect } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTecladoVisible } from '@/hooks/useTecladoVisible';
import { useColores } from '@/theme/ThemeProvider';

/**
 * Hoja que sube desde abajo con fondo oscurecido. Tocar fuera, la X o el botón atrás la cierran.
 * Es una capa encima de la pantalla, así que va la última dentro de ella.
 * El contenido se monta al abrir, así que su estado empieza de cero cada vez.
 */
export function HojaInferior({ visible, titulo, onCerrar, children }: {
    visible: boolean;
    titulo: string;
    onCerrar: () => void;
    children: ReactNode;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const teclado = useTecladoVisible();

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onCerrar();
            return true;
        });
        return () => sub.remove();
    }, [visible, onCerrar]);

    if (!visible) return null;

    // Animated.View no pasa por NativeWind: sus estilos van en style y las clases en el View de dentro.
    return (
        <>
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
                <Pressable onPress={onCerrar} className="flex-1 bg-black/40" accessibilityLabel="Cerrar" />
            </Animated.View>
            {/* Con el teclado abierto la hoja sube por encima de él. */}
            <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                <Animated.View
                    entering={SlideInDown.duration(380).easing(Easing.out(Easing.cubic))}
                    exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.cubic))}
                    style={{ maxHeight: '80%' }}
                >
                    <View
                        className="shrink rounded-t-3xl bg-fondo px-4 pt-4"
                        style={{ paddingBottom: (teclado ? 0 : insets.bottom) + 16 }}
                    >
                        <View className="mb-3 flex-row items-center justify-between">
                            <Text className="text-lg font-semibold text-texto">{titulo}</Text>
                            <Pressable
                                onPress={onCerrar}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar"
                                className="h-9 w-9 items-center justify-center rounded-full active:bg-superficie-alt"
                            >
                                <X size={20} color={colores['texto-secundario']} />
                            </Pressable>
                        </View>
                        {children}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </>
    );
}
