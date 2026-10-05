import './global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SesionProvider } from '@/context/SesionContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <SesionProvider>
                        <RootNavigator />
                    </SesionProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
