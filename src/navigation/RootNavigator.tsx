import { ActivityIndicator, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { navigationRef } from '@/auth/RootNavigation';
import { LogoChelu } from '@/components/LogoChelu';
import { Boton } from '@/components/ui/Boton';
import { Pantalla } from '@/components/ui/Pantalla';
import { useSesion } from '@/context/SesionContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import GraficaScreen from '@/screens/GraficaScreen';
import LoginScreen from '@/screens/LoginScreen';
import MapaScreen from '@/screens/MapaScreen';
import SuplantarScreen from '@/screens/SuplantarScreen';
import { useColores, useEsquema } from '@/theme/ThemeProvider';
import type { Grafica, Mapa } from '@/types/Chat';

export type RootStackParamList = {
    Login: undefined;
    Suplantar: undefined;
    App: undefined;
    Grafica: { grafica: Grafica };
    Mapa: { mapa: Mapa };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Colores de la navegación (fondos entre transiciones, cabeceras...) sacados de la paleta.
function useTemaNavegacion(): Theme {
    const colores = useColores();
    const base = useEsquema() === 'dark' ? DarkTheme : DefaultTheme;
    return {
        ...base,
        colors: {
            ...base.colors,
            primary: colores.primario,
            background: colores.fondo,
            card: colores.superficie,
            text: colores.texto,
            border: colores.borde,
            notification: colores.peligro,
        },
    };
}

export function RootNavigator() {
    const { estado, reintentar } = useSesion();
    const colores = useColores();
    const tema = useTemaNavegacion();

    if (estado.tipo === 'cargando') {
        return (
            <Pantalla className="items-center justify-center gap-6">
                <LogoChelu />
                <ActivityIndicator color={colores.primario} />
            </Pantalla>
        );
    }

    if (estado.tipo === 'sin-conexion') {
        return (
            <Pantalla className="items-center justify-center gap-6 px-6">
                <LogoChelu />
                <View className="items-center gap-1">
                    <Text className="text-base font-semibold text-texto">No se pudo conectar con el servidor</Text>
                    <Text className="text-center text-sm text-texto-secundario">
                        Revisa tu conexión a internet e inténtalo de nuevo.
                    </Text>
                </View>
                <View className="w-full">
                    <Boton texto="Reintentar" onPress={reintentar} />
                </View>
            </Pantalla>
        );
    }

    return (
        <NavigationContainer ref={navigationRef} theme={tema}>
            {/* La app va en vertical; solo la gráfica ampliada gira (app.json deja girar para eso). */}
            <Stack.Navigator screenOptions={{ headerShown: false, orientation: 'portrait' }}>
                {estado.tipo === 'fuera' && <Stack.Screen name="Login" component={LoginScreen} />}
                {estado.tipo === 'staff' && <Stack.Screen name="Suplantar" component={SuplantarScreen} />}
                {estado.tipo === 'dentro' && (
                    <>
                        {/* Congelada mientras la gráfica está encima: así no se vuelve a pintar al girar. */}
                        <Stack.Screen name="App" component={AppNavigator} options={{ freezeOnBlur: true }} />
                        <Stack.Screen
                            name="Grafica"
                            component={GraficaScreen}
                            options={{
                                orientation: 'landscape',
                                animation: 'fade',
                                statusBarHidden: true,
                                navigationBarHidden: true,
                            }}
                        />
                        <Stack.Screen name="Mapa" component={MapaScreen} options={{ animation: 'slide_from_bottom' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
