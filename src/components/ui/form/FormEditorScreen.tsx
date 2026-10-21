import { ReactNode, useEffect } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColores } from '@/theme/ThemeProvider';

/**
 * Edición de un formulario a pantalla completa. Es una capa encima del chat, así que va la última dentro de él.
 * Con cambios sin guardar, cerrar (la X o el botón atrás) pide confirmación.
 * `overlays` va fuera del scroll: hojas que se abren encima del formulario.
 */
export function FormEditorScreen({
    title,
    subtitle,
    changed,
    saveLabel = 'Guardar',
    saveDisabled = false,
    onSave,
    onClose,
    overlays,
    children,
}: {
    title: string;
    subtitle?: string;
    changed: boolean;
    saveLabel?: string;
    saveDisabled?: boolean;
    onSave: () => void;
    onClose: () => void;
    overlays?: ReactNode;
    children: ReactNode;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();

    const close = () => {
        if (!changed) {
            onClose();
            return;
        }
        Alert.alert('Descartar cambios', 'Los cambios del formulario se perderán.', [
            { text: 'Seguir editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: onClose },
        ]);
    };

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            close();
            return true;
        });
        return () => subscription.remove();
    }, [changed, onClose]);

    // Animated.View no pasa por NativeWind: sus estilos van en style y las clases en el contenido.
    return (
        <Animated.View
            entering={SlideInDown.duration(380).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.cubic))}
            style={StyleSheet.absoluteFill}
        >
            <View className="flex-1 bg-fondo">
                <View
                    className="flex-row items-center gap-2 border-b border-borde bg-superficie px-2"
                    style={{ paddingTop: insets.top, height: insets.top + 56 }}
                >
                    <Pressable
                        onPress={close}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar"
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                    >
                        <X size={22} color={colores.texto} />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-lg font-semibold text-texto" numberOfLines={1}>{title}</Text>
                        {!!subtitle && <Text className="text-xs text-texto-tenue" numberOfLines={1}>{subtitle}</Text>}
                    </View>
                    <Pressable
                        onPress={onSave}
                        disabled={saveDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={saveLabel}
                        accessibilityState={{ disabled: saveDisabled }}
                        className="mr-2 rounded-full bg-primario px-4 py-2 active:bg-primario-presionado"
                        style={{ opacity: saveDisabled ? 0.6 : 1 }}
                    >
                        <Text className="text-sm font-semibold text-sobre-primario">{saveLabel}</Text>
                    </Pressable>
                </View>

                <KeyboardAvoidingView behavior="padding" className="flex-1">
                    <ScrollView
                        contentContainerClassName="gap-4 px-4 pt-4"
                        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {children}
                    </ScrollView>
                </KeyboardAvoidingView>

                {overlays}
            </View>
        </Animated.View>
    );
}
