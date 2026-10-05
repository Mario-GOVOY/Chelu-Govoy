import './global.css';

import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { ThemeProvider } from './src/theme/ThemeProvider';

// Pantalla provisional para comprobar NativeWind y el modo oscuro.
// Se sustituye por la navegación cuando empecemos con el login.
function PruebaTema() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-fondo p-6">
      <View className="w-full rounded-2xl border border-borde bg-superficie p-5">
        <Text className="text-lg font-bold text-texto">Chelu Govoy</Text>
        <Text className="mt-1 text-texto-secundario">Tema actual: {colorScheme}</Text>
        <Text className="mt-1 text-texto-tenue">Texto tenue</Text>
      </View>

      <Pressable
        onPress={toggleColorScheme}
        className="w-full items-center rounded-xl bg-primario py-3 active:bg-primario-presionado"
      >
        <Text className="font-semibold text-sobre-primario">Cambiar tema</Text>
      </Pressable>

      <View className="w-full flex-row gap-2">
        <Text className="flex-1 rounded-lg bg-primario-suave p-2 text-center text-primario">Primario</Text>
        <Text className="flex-1 rounded-lg bg-peligro-suave p-2 text-center text-peligro">Peligro</Text>
      </View>
      <View className="w-full flex-row gap-2">
        <Text className="flex-1 rounded-lg bg-exito-suave p-2 text-center text-exito">Éxito</Text>
        <Text className="flex-1 rounded-lg bg-aviso-suave p-2 text-center text-aviso">Aviso</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PruebaTema />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
