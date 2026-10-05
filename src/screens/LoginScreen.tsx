import { useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { LockKeyhole, UserRound } from 'lucide-react-native';

import { mensajeErrorAuth } from '@/auth/mensajesError';
import { leerCredenciales } from '@/auth/tokenStorage';
import { PantallaAcceso } from '@/components/PantallaAcceso';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { MensajeError } from '@/components/ui/MensajeError';
import { useSesion } from '@/context/SesionContext';

export default function LoginScreen() {
    const { iniciarSesion } = useSesion();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<TextInput>(null);

    useEffect(() => {
        leerCredenciales().then((guardadas) => {
            if (guardadas.username) setUsername((actual) => actual || guardadas.username!);
            if (guardadas.password) setPassword((actual) => actual || guardadas.password!);
        });
    }, []);

    const entrar = async () => {
        if (!username.trim() || !password) {
            setError('Rellena el usuario y la contraseña.');
            return;
        }
        Keyboard.dismiss();
        setCargando(true);
        setError(null);
        try {
            await iniciarSesion(username.trim(), password);
        } catch (e) {
            setError(mensajeErrorAuth(e));
            setCargando(false);
        }
    };

    return (
        <PantallaAcceso titulo="Hola de nuevo" subtitulo="Entra con tu usuario de Govoy para hablar con Chelu.">
            <View className="gap-3">
                <CampoTexto
                    etiqueta="Usuario"
                    icono={UserRound}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={!!error}
                />
                <CampoTexto
                    ref={passwordRef}
                    etiqueta="Contraseña"
                    icono={LockKeyhole}
                    value={password}
                    onChangeText={setPassword}
                    secreto
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={entrar}
                    error={!!error}
                />
                <MensajeError texto={error} />
            </View>

            <View className="h-6" />
            <Boton texto="Entrar" onPress={entrar} cargando={cargando} />
        </PantallaAcceso>
    );
}
