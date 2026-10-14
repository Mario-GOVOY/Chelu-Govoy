import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Check, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/navigation/RootNavigator';
import type { Esquema } from '@/theme/palette';
import { useColores, useTema } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const THEME_OPTIONS: { value: Esquema; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
];

export default function SettingsScreen({ navigation }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const { esquema, setEsquema } = useTema();

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
            </ScrollView>
        </View>
    );
}
