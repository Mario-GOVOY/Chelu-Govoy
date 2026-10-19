import { useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PortalProvider } from '@gorhom/portal';
import * as Notifications from 'expo-notifications';

import { MenuLateral } from '@/components/MenuLateral';
import { ConversacionesProvider } from '@/context/ConversacionesContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import ChatScreen from '@/screens/ChatScreen';

export type AppDrawerParamList = {
    Chat: { chatId?: string } | undefined;
};

const Drawer = createDrawerNavigator<AppDrawerParamList>();

export function AppNavigator() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'App'>>();
    const notificationResponse = Notifications.useLastNotificationResponse();

    // Al tocar el aviso de una respuesta terminada (también con la app cerrada), se abre ese chat.
    useEffect(() => {
        if (!notificationResponse || notificationResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
            return;
        }
        const chatId = notificationResponse.notification.request.content.data?.chatId;
        if (typeof chatId !== 'string') return;
        Notifications.clearLastNotificationResponse();
        navigation.navigate('App', { screen: 'Chat', params: { chatId } });
    }, [notificationResponse, navigation]);

    return (
        <ConversacionesProvider>
            {/* Lo que va en un Portal se pinta encima del drawer, a pantalla completa. */}
            <PortalProvider>
                <Drawer.Navigator
                    drawerContent={(props) => <MenuLateral {...props} />}
                    screenOptions={{
                        headerShown: false,
                        drawerStyle: { width: '85%' },
                        swipeEdgeWidth: 50,
                    }}
                >
                    <Drawer.Screen name="Chat" component={ChatScreen} />
                </Drawer.Navigator>
            </PortalProvider>
        </ConversacionesProvider>
    );
}
