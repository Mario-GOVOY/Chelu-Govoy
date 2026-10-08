import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BarChart3, FileText, Menu, RefreshCw, TrendingUp, TriangleAlert, Truck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duplicarChat } from '@/chat/chatApi';
import { useChat } from '@/chat/useChat';
import { ArchivosGenerados } from '@/components/ArchivosGenerados';
import { BurbujaMensaje } from '@/components/BurbujaMensaje';
import { CajaMensaje } from '@/components/CajaMensaje';
import { CheluAvatar } from '@/components/CheluAvatar';
import { HojaValoracion, type Valorando } from '@/components/HojaValoracion';
import { Boton } from '@/components/ui/Boton';
import { CapaGiro } from '@/components/ui/CapaGiro';
import { Pantalla } from '@/components/ui/Pantalla';
import { AppDrawerParamList } from '@/navigation/AppNavigator';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useColores } from '@/theme/ThemeProvider';
import { useSesionActiva } from '@/context/SesionContext';
import type { Documento } from '@/types/Chat';
import { esSesionMaster, HAS_FEEDBACK_CHAT_CHELU, validatorUserHasOption } from '@/utils/ControlOpcionesUsuarios';

// Del drawer y, por encima, del stack raíz (para abrir la gráfica ampliada).
type Props = CompositeScreenProps<
    DrawerScreenProps<AppDrawerParamList, 'Chat'>,
    NativeStackScreenProps<RootStackParamList>
>;

// Los mismos ejemplos que la web (EXAMPLES en ChatChelu/constants.ts).
const EJEMPLOS = [
    { pregunta: '¿Cuántas rutas con alerta hubo en Madrid ayer?', icono: TriangleAlert },
    { pregunta: 'Dame las 5 rutas con mayor RAIS en Sevilla esta semana', icono: TrendingUp },
    { pregunta: 'Reparto de alertas por delegación en una gráfica', icono: BarChart3 },
    { pregunta: '¿Qué proveedores acumulan más incidencias este mes?', icono: Truck },
];

export default function ChatScreen({ navigation, route }: Props) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const { sesion } = useSesionActiva();
    const chatId = route.params?.chatId;
    // Al crearse la conversación se pone su id en la ruta, para que el menú la marque como activa.
    const alCrearse = useCallback((id: string) => navigation.setParams({ chatId: id }), [navigation]);
    const { mensajes, titulo, cargando, error, recargar, enviar, parar, respondiendo, votar, sendEmail } = useChat(chatId, alCrearse);
    const puedeValorar = validatorUserHasOption(HAS_FEEDBACK_CHAT_CHELU, sesion.empresaId, esSesionMaster(sesion));
    // Respuesta que se está valorando (su runId y el pulgar pulsado); null con la hoja cerrada.
    const [valorando, setValorando] = useState<(Valorando & { runId: string }) | null>(null);
    const cerrarValoracion = useCallback(() => setValorando(null), []);
    // La lista va invertida para que empiece abajo, en el último mensaje.
    const invertidos = useMemo(() => [...mensajes].reverse(), [mensajes]);

    // Documentos de la conversación, los más recientes primero y sin repetir.
    const documentos = useMemo(() => {
        const unicos = new Map<string, Documento>();
        for (const m of invertidos) {
            for (const d of [...(m.documentos ?? [])].reverse()) {
                if (!unicos.has(d.fileId)) unicos.set(d.fileId, d);
            }
        }
        return [...unicos.values()];
    }, [invertidos]);
    const [archivosAbierto, setArchivosAbierto] = useState(false);

    // La copia la hace el back; aquí solo se abre. La conversación actual no cambia.
    // Respuesta desde la que se está duplicando, para pintar su botón cargando.
    const [duplicando, setDuplicando] = useState<string | null>(null);
    const duplicarDesde = (runId: string) => {
        if (!chatId || duplicando) return;
        Alert.alert('Duplicar desde aquí', 'Se creará una conversación nueva hasta esta respuesta.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Duplicar',
                onPress: async () => {
                    setDuplicando(runId);
                    try {
                        navigation.setParams({ chatId: await duplicarChat(chatId, runId) });
                    } catch {
                        Alert.alert('No se pudo duplicar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setDuplicando(null);
                    }
                },
            },
        ]);
    };

    const cabecera = chatId ? titulo ?? '' : 'Nueva conversación';

    return (
        <Pantalla margenInferior={false} margenSuperior={false}>
            <View
                className="flex-row items-center gap-2 border-b border-borde bg-superficie px-2"
                style={{ paddingTop: insets.top, height: insets.top + 56 }}
            >
                <Pressable
                    onPress={() => navigation.openDrawer()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Abrir menú"
                    className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                >
                    <Menu size={24} color={colores.texto} />
                </Pressable>
                <Text className="flex-1 text-lg font-semibold text-texto" numberOfLines={1}>
                    {cabecera}
                </Text>
                {chatId && (
                    <Pressable
                        onPress={() => setArchivosAbierto(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Archivos generados (${documentos.length})`}
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                    >
                        <FileText size={20} color={colores['texto-secundario']} />
                        {documentos.length > 0 && (
                            <View className="absolute right-0.5 top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-primario px-1">
                                <Text className="text-[10px] font-bold text-sobre-primario">{documentos.length}</Text>
                            </View>
                        )}
                    </Pressable>
                )}
                {/* Vuelve a pedir la conversación al back; con una respuesta en curso no, porque la cortaría. */}
                {chatId && (
                    <Pressable
                        onPress={recargar}
                        disabled={cargando || respondiendo}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Actualizar conversación"
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                    >
                        {cargando ? (
                            <ActivityIndicator size="small" color={colores['texto-secundario']} />
                        ) : (
                            <RefreshCw size={20} color={respondiendo ? colores['texto-tenue'] : colores['texto-secundario']} />
                        )}
                    </Pressable>
                )}
            </View>

            <KeyboardAvoidingView behavior="padding" className="flex-1">
                {error ? (
                    <View className="flex-1 items-center justify-center gap-4 px-8">
                        <Text className="text-center text-base text-texto-secundario">No se pudo cargar la conversación.</Text>
                        <Boton texto="Reintentar" variante="secundario" onPress={recargar} />
                    </View>
                ) : cargando ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colores.primario} />
                    </View>
                ) : mensajes.length === 0 ? (
                    // Con scroll por si con el teclado abierto no cabe; si cabe, queda centrado.
                    <ScrollView
                        contentContainerClassName="flex-grow items-center justify-center px-6 py-6"
                        keyboardShouldPersistTaps="handled"
                    >
                        <View className="h-32 w-28">
                            <CheluAvatar />
                        </View>
                        <Text className="mt-4 text-2xl font-bold text-texto">¿En qué te ayudo <Text className="text-primario">hoy</Text>?</Text>
                        <Text className="mt-2 text-center text-base text-texto-secundario">
                            Pregúntame en chat CHELU sobre rutas, alertas, paradas, proveedores, depots, recogidas o PUDOS de {sesion.nombreEmpresa}.
                        </Text>
                        <View className="mt-6 w-full gap-3">
                            <Text className="text-xs font-bold uppercase tracking-wider text-primario">Prueba a preguntar</Text>
                            {EJEMPLOS.map(({ pregunta, icono: Icono }) => (
                                <Pressable
                                    key={pregunta}
                                    onPress={() => enviar(pregunta)}
                                    accessibilityRole="button"
                                    className="flex-row items-center gap-3 rounded-xl border border-borde-medio bg-superficie px-4 py-3 active:bg-primario-suave"
                                >
                                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-primario-suave">
                                        <Icono size={16} color={colores.primario} />
                                    </View>
                                    <Text className="flex-1 text-sm text-texto">{pregunta}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <FlatList
                        inverted
                        data={invertidos}
                        keyExtractor={(m) => m.id}
                        contentContainerClassName="gap-5 px-6 py-4"
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item, index }) => (
                            <BurbujaMensaje
                                mensaje={item}
                                // Sugerencias solo en la última respuesta (la lista va invertida: es la 0).
                                onPreguntar={index === 0 && !respondiendo ? enviar : undefined}
                                // Solo respuestas guardadas y completas: las detenidas o con error no tienen turno en el back.
                                onDuplicarDesde={item.runId && !item.estado && !respondiendo
                                    ? () => duplicarDesde(item.runId!)
                                    : undefined}
                                duplicando={!!item.runId && item.runId === duplicando}
                                // Igual que duplicar: solo respuestas con turno guardado en el back.
                                onValorar={puedeValorar && item.runId && !item.estado
                                    ? (valoracion) => setValorando({ runId: item.runId!, valoracion, anterior: item.voto ?? null })
                                    : undefined}
                                onAmpliarGrafica={(grafica) => navigation.navigate('Grafica', { grafica })}
                                onAbrirMapa={(mapa) => navigation.navigate('Mapa', { mapa })}
                                onSendEmail={sendEmail}
                            />
                        )}
                    />
                )}
                <CajaMensaje
                    onEnviar={enviar}
                    onParar={parar}
                    respondiendo={respondiendo}
                    desactivada={cargando || error}
                />
            </KeyboardAvoidingView>
            <ArchivosGenerados
                visible={archivosAbierto}
                documentos={documentos}
                onCerrar={() => setArchivosAbierto(false)}
            />
            <HojaValoracion
                valorando={valorando}
                onCerrar={cerrarValoracion}
                onEnviar={(voto) => votar(valorando!.runId, voto, valorando!.anterior)}
            />
            <CapaGiro />
        </Pantalla>
    );
}
