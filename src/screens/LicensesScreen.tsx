import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { License, loadLicenses } from '@/licenses/licenses';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useColores } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Licenses'>;

export default function LicensesScreen({ navigation }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const [licenses, setLicenses] = useState<License[] | null>(null);
    const [openKey, setOpenKey] = useState<string | null>(null);

    // Tras pintar la pantalla, para que la transición no espere a leer los JSON.
    useEffect(() => setLicenses(loadLicenses()), []);

    const openUrl = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch {
            // Sin navegador para abrirla; el texto de la licencia ya está en pantalla.
        }
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
                <Text className="flex-1 text-lg font-semibold text-texto">Licencias de terceros</Text>
            </View>

            {!licenses ? (
                <ActivityIndicator className="mt-8" color={colores.primario} />
            ) : (
                <FlatList
                    data={licenses}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                    ListHeaderComponent={
                        <Text className="mb-4 ml-1 text-sm text-texto-secundario">
                            Chelu usa {licenses.length} componentes de software de terceros. Pulsa uno para ver su licencia.
                        </Text>
                    }
                    renderItem={({ item, index }) => {
                        const open = openKey === item.key;
                        const { url } = item;
                        return (
                            <View
                                className={`bg-superficie ${index === 0 ? 'rounded-t-2xl' : 'border-t border-borde'} ${index === licenses.length - 1 ? 'rounded-b-2xl' : ''}`}
                            >
                                <Pressable
                                    onPress={() => setOpenKey(open ? null : item.key)}
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: open }}
                                    className="flex-row items-center gap-3 px-4 py-3 active:bg-superficie-alt"
                                >
                                    <View className="flex-1 gap-0.5">
                                        <Text className="text-base text-texto">{item.name}</Text>
                                        {item.mavenId && <Text className="text-xs text-texto-tenue">{item.mavenId}</Text>}
                                        <Text className="text-sm text-texto-secundario">
                                            {item.version ? `${item.license} · ${item.version}` : item.license}
                                        </Text>
                                    </View>
                                    {open ? (
                                        <ChevronDown size={20} color={colores['texto-tenue']} />
                                    ) : (
                                        <ChevronRight size={20} color={colores['texto-tenue']} />
                                    )}
                                </Pressable>
                                {open && (
                                    <View className="gap-3 px-4 pb-4">
                                        {url && (
                                            <Pressable
                                                onPress={() => openUrl(url)}
                                                accessibilityRole="link"
                                                className="flex-row items-center gap-1.5 self-start"
                                            >
                                                <ExternalLink size={14} color={colores.primario} />
                                                <Text className="text-sm text-primario">{url}</Text>
                                            </Pressable>
                                        )}
                                        <Text selectable className="text-xs text-texto-secundario">
                                            {item.text}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}
