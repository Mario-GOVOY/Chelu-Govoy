import './global.css';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SesionProvider } from '@/context/SesionContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function App() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <SesionProvider>
                    <RootNavigator />
                </SesionProvider>
                <StatusBar style="auto" />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
