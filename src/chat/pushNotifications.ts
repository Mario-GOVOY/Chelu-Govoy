import type { Route } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { navigationRef } from '@/auth/RootNavigation';
import { deletePushToken, savePushToken } from '@/chat/chatApi';
import type { AppDrawerParamList } from '@/navigation/AppNavigator';

// Token registrado en el back con la sesión actual; hace falta para borrarlo al cerrarla.
let registeredToken: string | null = null;

/**
 * Pide permiso y registra el móvil en el back para que avise cuando termine una respuesta.
 * Sin permiso no hace nada. Si falla (sin red, o un emulador sin servicios de Google), lanza el error.
 */
export async function registerForPushNotifications(): Promise<void> {
    // En Android, el canal tiene que existir antes de pedir permiso. El back manda los avisos por 'default'.
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Respuestas de Chelu',
            importance: Notifications.AndroidImportance.HIGH,
        });
    }
    // Con la app abierta, el aviso sale igual salvo que ya estés en ese chat.
    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const route = navigationRef.getCurrentRoute() as Route<string, AppDrawerParamList['Chat']> | undefined;
            const inThatChat = route?.name === 'Chat' && route.params?.chatId === notification.request.content.data?.chatId;
            return {
                shouldShowBanner: !inThatChat,
                shouldShowList: !inThatChat,
                shouldPlaySound: !inThatChat,
                shouldSetBadge: false,
            };
        },
    });
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    await savePushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
}

/** Borra el móvil del back, sin esperar: se llama al cerrar la sesión, mientras su token de acceso aún vale. */
export function unregisterFromPushNotifications(): void {
    if (!registeredToken) return;
    const token = registeredToken;
    registeredToken = null;
    deletePushToken(token).catch(() => {
        // Si falla, al iniciar sesión otro usuario en este móvil la fila pasa a él.
    });
}
