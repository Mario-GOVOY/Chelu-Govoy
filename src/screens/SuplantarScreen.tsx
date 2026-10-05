import { useState } from 'react';
import { Keyboard, Pressable, Switch, Text, View } from 'react-native';
import { ShieldCheck, UserRound } from 'lucide-react-native';

import { mensajeErrorAuth } from '@/auth/mensajesError';
import { PantallaAcceso } from '@/components/PantallaAcceso';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { MensajeError } from '@/components/ui/MensajeError';
import { useSesion } from '@/context/SesionContext';
import { useColores } from '@/theme/ThemeProvider';

// Solo para el staff de Govoy: entra como un usuario cliente escribiendo su nombre.
export default function SuplantarScreen() {
    const { estado, suplantar, cerrarSesion } = useSesion();
    const colores = useColores();
    const [username, setUsername] = useState('');
    const [sinMaestro, setSinMaestro] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const staff = estado.tipo === 'staff' ? estado.staff : null;

    const entrar = async () => {
        if (!username.trim()) {
            setError('Escribe el usuario que quieres suplantar.');
            return;
        }
        Keyboard.dismiss();
        setCargando(true);
        setError(null);
        try {
            await suplantar(username.trim(), sinMaestro);
        } catch (e) {
            setError(mensajeErrorAuth(e));
            setCargando(false);
        }
    };

    return (
        <PantallaAcceso titulo="Suplantar usuario" subtitulo="Entra en Chelu como un usuario cliente. La sesión dura como máximo 6 horas.">
            {staff && (
                <View className="mb-5 flex-row items-center gap-2 self-start rounded-full bg-primario-suave px-3 py-1.5">
                    <ShieldCheck size={16} color={colores.primario} />
                    <Text className="text-sm font-medium text-primario">Staff · {staff.username}</Text>
                </View>
            )}

            <View className="gap-3">
                <CampoTexto
                    etiqueta="Usuario a suplantar"
                    icono={UserRound}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={entrar}
                    error={!!error}
                />

                {/* Toda la fila cambia el interruptor, no solo el Switch. */}
                <Pressable
                    onPress={() => setSinMaestro((v) => !v)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: sinMaestro }}
                    className="flex-row items-center rounded-2xl bg-fondo px-4 py-3 active:opacity-80"
                >
                    <View className="flex-1 pr-3">
                        <Text className="text-base text-texto">Entrar sin maestro</Text>
                        <Text className="text-sm text-texto-tenue">Ver la app como la ve el cliente</Text>
                    </View>
                    <Switch
                        value={sinMaestro}
                        onValueChange={setSinMaestro}
                        trackColor={{ true: colores.primario, false: colores['borde-fuerte'] }}
                        thumbColor={colores.superficie}
                    />
                </Pressable>

                <MensajeError texto={error} />
            </View>

            <View className="h-6" />
            <Boton texto="Entrar" onPress={entrar} cargando={cargando} />
            <View className="mt-2">
                <Boton texto="Cerrar sesión" variante="texto" onPress={cerrarSesion} />
            </View>
        </PantallaAcceso>
    );
}
