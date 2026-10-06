import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TarjetaDocumento } from '@/components/TarjetaDocumento';
import { useColores } from '@/theme/ThemeProvider';
import type { Documento } from '@/types/Chat';

/**
 * Hoja inferior con los documentos de la conversación abierta.
 * No es un Modal: en Android su ventana no llegaba al borde inferior y asomaba la caja de texto.
 * Es una capa encima de la pantalla, así que va la última dentro de ella.
 */
export function ArchivosGenerados({ visible, documentos, onCerrar }: {
    visible: boolean;
    documentos: Documento[];
    onCerrar: () => void;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();

    // El botón atrás de Android cierra la hoja en vez de salir de la pantalla.
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
                {/* Tocar fuera de la hoja la cierra. */}
                <Pressable onPress={onCerrar} className="flex-1 bg-black/40" accessibilityLabel="Cerrar" />
            </Animated.View>
            <Animated.View
                entering={SlideInDown.duration(380).easing(Easing.out(Easing.cubic))}
                exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.cubic))}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%' }}
            >
                <View
                    className="shrink rounded-t-3xl bg-fondo px-4 pt-4"
                    style={{ paddingBottom: insets.bottom + 16 }}
                >
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-lg font-semibold text-texto">Archivos generados</Text>
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
                    {documentos.length === 0 ? (
                        <Text className="py-8 text-center text-sm text-texto-tenue">
                            Aún no se han generado archivos en esta conversación.
                        </Text>
                    ) : (
                        <ScrollView contentContainerClassName="gap-2 pb-2">
                            {documentos.map((d) => (
                                <TarjetaDocumento key={d.fileId} documento={d} />
                            ))}
                        </ScrollView>
                    )}
                </View>
            </Animated.View>
        </>
    );
}
