import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { ArrowLeft, Bell, BellOff, Check, Moon, Sun, Wrench } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHAT_MODELS, DEFAULT_CHAT_MODEL } from '@/chat/models';
import { registerForPushNotifications } from '@/chat/pushNotifications';
import { loadShowTools, saveShowTools } from '@/chat/showToolsSetting';
import { useChosenModel } from '@/context/ChatModelContext';
import { useSesionActiva } from '@/context/SesionContext';
import { RootStackParamList } from '@/navigation/RootNavigator';
import type { Esquema } from '@/theme/palette';
import { useColores, useTema } from '@/theme/ThemeProvider';
import { esSesionMaster } from '@/utils/ControlOpcionesUsuarios';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const THEME_OPTIONS: { value: Esquema; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
];

export default function SettingsScreen({ navigation }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const { esquema, setEsquema } = useTema();
    const { sesion } = useSesionActiva();
    const isMaster = esSesionMaster(sesion);
    const { chosenModel, setChosenModel } = useChosenModel();
    const [showTools, setShowTools] = useState(true);
    const [notificationPermissions, setNotificationPermissions] = useState<Notifications.NotificationPermissionsStatus | null>(null);
    const notificationsGrantedRef = useRef<boolean | null>(null);

    // Se vuelve a mirar al volver a la app: el permiso se puede haber cambiado en los ajustes del sistema.
    // Si se acaba de conceder ahí, el móvil se registra en el back.
    useEffect(() => {
        const refresh = async () => {
            const permissions = await Notifications.getPermissionsAsync();
            const justGranted = notificationsGrantedRef.current === false && permissions.granted;
            notificationsGrantedRef.current = permissions.granted;
            setNotificationPermissions(permissions);
            if (!justGranted) return;
            try {
                await registerForPushNotifications();
            } catch {
                // Sin avisos en este móvil; el chat funciona igual.
            }
        };
        refresh();
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') refresh();
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const loadSettings = async () => setShowTools(await loadShowTools());
        loadSettings();
    }, []);

    const changeShowTools = (show: boolean) => {
        setShowTools(show);
        saveShowTools(show);
    };

    // Pide el permiso; si el sistema ya no deja preguntar, se abren sus ajustes.
    const enableNotifications = async () => {
        if (!notificationPermissions?.canAskAgain) {
            await Linking.openSettings();
            return;
        }
        try {
            await registerForPushNotifications();
        } catch {
            // Sin avisos en este móvil; el chat funciona igual.
        }
        const permissions = await Notifications.getPermissionsAsync();
        notificationsGrantedRef.current = permissions.granted;
        setNotificationPermissions(permissions);
    };

    return (
        <View className="flex-1 bg-fondo">
            <View
                className="flex-row items-center gap-2 border-b border-borde bg-superficie px-2"
                style={{ paddingTop: insets.top, height: insets.top + 56 }}
            >
                <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                >
                    <ArrowLeft size={24} color={colores.texto} />
                </Pressable>
                <Text className="flex-1 text-lg font-semibold text-texto">Ajustes</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
                <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-texto-tenue">Tema</Text>
                <View className="overflow-hidden rounded-2xl bg-superficie">
                    {THEME_OPTIONS.map(({ value, label, icon: Icon }, index) => {
                        const selected = esquema === value;
                        return (
                            <Pressable
                                key={value}
                                onPress={() => setEsquema(value)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: selected }}
                                className={`flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt ${index > 0 ? 'border-t border-borde' : ''}`}
                            >
                                <Icon size={20} color={colores['texto-secundario']} />
                                <Text className={`flex-1 text-base text-texto ${selected ? 'font-semibold' : ''}`}>{label}</Text>
                                {selected && <Check size={20} color={colores.primario} />}
                            </Pressable>
                        );
                    })}
                </View>

                <Text className="mb-2 ml-1 mt-6 text-xs font-bold uppercase tracking-wider text-texto-tenue">Chat</Text>
                <View className="flex-row items-center gap-3 rounded-2xl bg-superficie px-4 py-3">
                    <Wrench size={20} color={colores['texto-secundario']} />
                    <View className="flex-1 gap-0.5">
                        <Text className="text-base text-texto">Mostrar herramientas</Text>
                        <Text className="text-sm text-texto-secundario">Muestra que consulta Chelu mientras responde</Text>
                    </View>
                    <Switch
                        value={showTools}
                        onValueChange={changeShowTools}
                        accessibilityLabel="Mostrar herramientas"
                        trackColor={{ false: colores['borde-fuerte'], true: colores.primario }}
                        thumbColor={colores['sobre-primario']}
                    />
                </View>

                {notificationPermissions && (
                    <>
                        <Text className="mb-2 ml-1 mt-6 text-xs font-bold uppercase tracking-wider text-texto-tenue">
                            Notificaciones
                        </Text>
                        <Pressable
                            onPress={enableNotifications}
                            disabled={notificationPermissions.granted}
                            accessibilityRole="button"
                            className="flex-row items-center gap-3 rounded-2xl bg-superficie px-4 py-3 active:bg-superficie-alt"
                        >
                            {notificationPermissions.granted ? (
                                <Bell size={20} color={colores['texto-secundario']} />
                            ) : (
                                <BellOff size={20} color={colores['texto-secundario']} />
                            )}
                            <View className="flex-1 gap-0.5">
                                <Text className="text-base text-texto">Avisar cuando Chelu termine</Text>
                                <Text className="text-sm text-texto-secundario">
                                    {notificationPermissions.granted ? 'Activadas' : 'Desactivadas'}
                                </Text>
                            </View>
                            {!notificationPermissions.granted && (
                                <Text className="text-sm font-semibold text-primario">
                                    {notificationPermissions.canAskAgain ? 'Activar' : 'Abrir ajustes'}
                                </Text>
                            )}
                        </Pressable>
                        {!notificationPermissions.granted && !notificationPermissions.canAskAgain && (
                            <Text className="ml-1 mt-2 text-xs text-texto-tenue">
                                El sistema no deja volver a preguntar. Actívalas en los ajustes del móvil.
                            </Text>
                        )}
                    </>
                )}

                {isMaster && (
                    <>
                        <Text className="mb-2 ml-1 mt-6 text-xs font-bold uppercase tracking-wider text-texto-tenue">Modelo</Text>
                        <View className="overflow-hidden rounded-2xl bg-superficie">
                            {CHAT_MODELS.map(({ key, provider, description }, index) => {
                                const selected = chosenModel === key;
                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => setChosenModel(key)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: selected }}
                                        className={`flex-row items-center gap-3 px-4 py-3 active:bg-superficie-alt ${index > 0 ? 'border-t border-borde' : ''}`}
                                    >
                                        <View className="flex-1 gap-0.5">
                                            <Text className={`text-base text-texto ${selected ? 'font-semibold' : ''}`}>
                                                {key}
                                                <Text className="text-xs font-normal text-texto-tenue">  {provider}</Text>
                                                {key === DEFAULT_CHAT_MODEL && (
                                                    <Text className="text-xs font-normal text-primario">  · por defecto</Text>
                                                )}
                                            </Text>
                                            <Text className="text-sm text-texto-secundario">{description}</Text>
                                        </View>
                                        {selected && <Check size={20} color={colores.primario} />}
                                    </Pressable>
                                );
                            })}
                        </View>
                        <Text className="ml-1 mt-2 text-xs text-texto-tenue">
                            Cambiar de modelo empieza una conversación nueva.
                        </Text>
                    </>
                )}
            </ScrollView>
        </View>
    );
}
