import { createDrawerNavigator } from '@react-navigation/drawer';

import { MenuLateral } from '@/components/MenuLateral';
import { ConversacionesProvider } from '@/context/ConversacionesContext';
import ChatScreen from '@/screens/ChatScreen';

export type AppDrawerParamList = {
    Chat: { chatId?: string } | undefined;
};

const Drawer = createDrawerNavigator<AppDrawerParamList>();

export function AppNavigator() {
    return (
        <ConversacionesProvider>
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
        </ConversacionesProvider>
    );
}
