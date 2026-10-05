import { ScrollView, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { LogoChelu } from '@/components/LogoChelu';
import { Boton } from '@/components/ui/Boton';
import { Pantalla } from '@/components/ui/Pantalla';
import { useSesion } from '@/context/SesionContext';

// Pantalla provisional tras el login: se sustituye por el chat en la fase 2.
export default function InicioScreen() {
    const { estado, salirDeSuplantacion, cerrarSesion } = useSesion();
    const { colorScheme, toggleColorScheme } = useColorScheme();

    if (estado.tipo !== 'dentro') return null;
    const { sesion, staff } = estado;

    return (
        <Pantalla>
            <ScrollView contentContainerClassName="flex-grow justify-center gap-4 px-6 py-10">
                <LogoChelu />

                {sesion.isImpersonation && (
                    <View className="rounded-xl bg-aviso-suave px-4 py-3">
                        <Text className="text-sm text-aviso">
                            Suplantando a <Text className="font-bold">{sesion.username}</Text> como{' '}
                            {sesion.impersonatedBy}
                            {sesion.isMaster ? ' (con maestro)' : ' (sin maestro)'}
                        </Text>
                    </View>
                )}

                <View className="gap-1 rounded-2xl border border-borde bg-superficie p-5">
                    <Text className="text-lg font-bold text-texto">Hola, {sesion.username}</Text>
                    <Text className="text-texto-secundario">{sesion.nombreEmpresa}</Text>
                    <Text className="text-sm text-texto-tenue">
                        Empresa {sesion.empresaId} · {sesion.rol}
                    </Text>
                    <Text className="mt-3 text-sm text-texto-tenue">Aquí irá el chat.</Text>
                </View>

                <Boton
                    texto={colorScheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    variante="secundario"
                    onPress={toggleColorScheme}
                />
                {staff && <Boton texto="Salir de suplantación" variante="secundario" onPress={salirDeSuplantacion} />}
                <Boton texto="Cerrar sesión" variante="peligro" onPress={cerrarSesion} />
            </ScrollView>
        </Pantalla>
    );
}
