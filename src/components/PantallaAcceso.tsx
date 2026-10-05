import { ReactNode, useEffect } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheluAvatar } from '@/components/CheluAvatar';
import { useTecladoVisible } from '@/hooks/useTecladoVisible';

const TAMANO_AVATAR = 170;
const TAMANO_AVATAR_TECLADO = 100;

// Chelu flotando, como en la pantalla vacía del chat web (animación chelu-float).
// Con el teclado abierto se encoge un poco, de forma suave, para dejar sitio al formulario.
function CheluFlotante({ compacto }: { compacto: boolean }) {
    const flotar = useSharedValue(0);
    const tamano = useSharedValue(TAMANO_AVATAR);

    useEffect(() => {
        flotar.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
        );
    }, [flotar]);

    useEffect(() => {
        tamano.value = withTiming(compacto ? TAMANO_AVATAR_TECLADO : TAMANO_AVATAR, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
    }, [compacto, tamano]);

    const estilo = useAnimatedStyle(() => ({
        width: tamano.value,
        height: tamano.value * (280 / 240),
        transform: [{ translateY: flotar.value }],
    }));

    return (
        <Animated.View style={estilo}>
            <CheluAvatar />
        </Animated.View>
    );
}

type Props = {
    titulo: string;
    subtitulo: string;
    children: ReactNode;
};


export function PantallaAcceso({ titulo, subtitulo, children }: Props) {
    const insets = useSafeAreaInsets();
    const teclado = useTecladoVisible();

    return (
        <View className="flex-1 bg-primario-suave">
            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView
                    contentContainerClassName="flex-grow"
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    {/* La zona de Chelu ocupa el espacio que sobra; la hoja mide lo que su contenido. */}
                    <View className="flex-1 items-center justify-center pb-8" style={{ paddingTop: insets.top + 24 }}>
                        <CheluFlotante compacto={teclado} />
                    </View>

                    {/* El margen inferior sube el formulario; con el teclado abierto no hace falta. */}
                    <View
                        className="rounded-t-[32px] bg-superficie px-6 pt-8"
                        style={{ paddingBottom: insets.bottom + (teclado ? 16 : 56) }}
                    >
                        <Text className="text-3xl font-bold text-texto">{titulo}</Text>
                        <Text className="mt-2 text-base leading-6 text-texto-secundario">{subtitulo}</Text>
                        <View className="mt-6">{children}</View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
