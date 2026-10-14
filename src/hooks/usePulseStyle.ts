import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Parpadeo suave de los skeletons de carga, para un Animated.View.
export function usePulseStyle() {
    const opacity = useSharedValue(1);
    useEffect(() => {
        opacity.value = withRepeat(withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, [opacity]);
    return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
