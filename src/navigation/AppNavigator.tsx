import { createDrawerNavigator } from '@react-navigation/drawer';

import { MenuLateral } from '@/components/MenuLateral';
import ChatScreen from '@/screens/ChatScreen';

export type AppDrawerParamList = {
    Chat: undefined;
};

const Drawer = createDrawerNavigator<AppDrawerParamList>();

export function AppNavigator() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <MenuLateral {...props} />}
            screenOptions={{ headerShown: false, drawerStyle: { width: '85%' } }}
        >
            <Drawer.Screen name="Chat" component={ChatScreen} />
        </Drawer.Navigator>
    );
}
