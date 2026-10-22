import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// En Android, los hápticos del sistema (los del teclado); impactAsync allí usa el vibrador y se nota basto.
const haptic = (androidType: Haptics.AndroidHaptics, iosStyle: Haptics.ImpactFeedbackStyle) => () =>
    void (Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(androidType) : Haptics.impactAsync(iosStyle));

// Vibración corta en los momentos clave. Sin await: no debe retrasar la acción.
export const hapticSend = haptic(Haptics.AndroidHaptics.Confirm, Haptics.ImpactFeedbackStyle.Medium);
export const hapticStopResponse = haptic(Haptics.AndroidHaptics.Context_Click, Haptics.ImpactFeedbackStyle.Medium);
// Empezar, terminar o descartar una nota de voz.
export const hapticVoiceNote = haptic(Haptics.AndroidHaptics.Context_Click, Haptics.ImpactFeedbackStyle.Medium);
