import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BarChart3, FileText, ListOrdered, MapPin, Menu, RefreshCw, TrendingUp, TriangleAlert, Truck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChat } from '@/chat/useChat';
import { ArchivosGenerados } from '@/components/ArchivosGenerados';
import { BurbujaMensaje } from '@/components/BurbujaMensaje';
import { CajaMensaje } from '@/components/CajaMensaje';
import { ChatSkeleton } from '@/components/Spinners/ChatSkeleton';
import { CheluAvatar } from '@/components/CheluAvatar';
import { HojaValoracion, type Valorando } from '@/components/HojaValoracion';
import { QuestionsSheet, type Question } from '@/components/QuestionsSheet';
import { SectorsFormEditor, type SectorsFormEditing } from '@/components/SectorsFormEditor';
import { SectorsRefineSheet } from '@/components/SectorsRefineSheet';
import { Boton } from '@/components/ui/Boton';
import { CapaGiro } from '@/components/ui/CapaGiro';
import { SHEET_EXIT_MS } from '@/components/ui/HojaInferior';
import { Pantalla } from '@/components/ui/Pantalla';
import { AppDrawerParamList } from '@/navigation/AppNavigator';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useColores } from '@/theme/ThemeProvider';
import { useChatModel } from '@/context/ChatModelContext';
import { useConversaciones } from '@/context/ConversacionesContext';
import { useSesionActiva } from '@/context/SesionContext';
import type { Documento, Grafica, Mapa, Mensaje, Voto } from '@/types/Chat';
import type { FormMap, SectorsForm } from '@/types/SectorsForm';
import { DEMO_REVISORES, esSesionMaster, FARMACIAS_EN_VEZ_DE_PUDOS, HAS_AUDIO_CHAT_CHELU, HAS_FEEDBACK_CHAT_CHELU, validatorUserHasOption } from '@/utils/ControlOpcionesUsuarios';

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

// Empresa demo (DEMO_REVISORES): solo tiene datos del 14 al 25 de septiembre de 2026.
const EJEMPLOS_DEMO = [
    { pregunta: '¿Qué ruta tuvo más incidencias la semana del 21 de septiembre?', icono: TriangleAlert },
    { pregunta: 'Evolución diaria de servicios del 14 al 25 de septiembre en una gráfica', icono: BarChart3 },
    { pregunta: 'Mapa de las paradas de la ruta VN01 el 15 de septiembre', icono: MapPin },
    { pregunta: 'Compara la calidad de los proveedores', icono: Truck },
];

// Saltar a una pregunta: espera sin cambios de tamaño para quitar el skeleton, y tope de recolocaciones.
const JUMP_SETTLE_MS = 250;
const JUMP_MAX_MS = 2000;

// Una conversación montada. Con chatId undefined, una nueva hasta que el back le da id.
type Conversation = { key: string; chatId?: string; responding: boolean };

export default function ChatScreen({ navigation, route }: Props) {
    const routeChatId = route.params?.chatId;
    // En un ref y no en el módulo: con la recarga en caliente el módulo vuelve a empezar y repetiría claves.
    const nextKeyRef = useRef(1);
    const [conversations, setConversations] = useState<Conversation[]>([{ key: '0', chatId: routeChatId, responding: false }]);

    // Al cambiar la ruta se quedan las que responden y la de destino (o una nueva si no está montada).
    const [shownChatId, setShownChatId] = useState(routeChatId);
    if (routeChatId !== shownChatId) {
        setShownChatId(routeChatId);
        const newKey = String(nextKeyRef.current++);
        setConversations((prev) => {
            const target = routeChatId ? prev.find((c) => c.chatId === routeChatId) : undefined;
            const kept = prev.filter((c) => c.responding || c === target);
            return target ? kept : [...kept, { key: newKey, chatId: routeChatId, responding: false }];
        });
    }
    // La última: si se pide una nueva, la recién añadida y no otra nueva que aún esté esperando su id.
    const visibleKey = conversations.findLast((c) => c.chatId === routeChatId)?.key;
    const visibleKeyRef = useRef(visibleKey);
    visibleKeyRef.current = visibleKey;

    // Pone la conversación en la lista para poder volver a ella. Solo la visible pone su id en la ruta, para que el menú la marque como activa.
    const { addNewChatToList } = useConversaciones();
    const handleCreated = useCallback(
        (key: string, chatId: string, question: string) => {
            addNewChatToList(chatId, question);
            setConversations((prev) => prev.map((c) => (c.key === key ? { ...c, chatId } : c)));
            if (key === visibleKeyRef.current) navigation.setParams({ chatId });
        },
        [navigation, addNewChatToList],
    );

    // Una oculta que termina de responder se desmonta.
    const handleRespondingChange = useCallback((key: string, responding: boolean) => {
        setConversations((prev) =>
            prev
                .map((c) => (c.key === key ? { ...c, responding } : c))
                .filter((c) => c.key !== key || responding || key === visibleKeyRef.current),
        );
    }, []);

    return conversations.map((c) => (
        <ChatConversation
            key={c.key}
            conversationKey={c.key}
            navigation={navigation}
            chatId={c.chatId}
            visible={c.key === visibleKey}
            onCreated={handleCreated}
            onRespondingChange={handleRespondingChange}
        />
    ));
}

function ChatConversation({ conversationKey, navigation, chatId, visible, onCreated, onRespondingChange }: {
    conversationKey: string;
    navigation: Props['navigation'];
    chatId?: string;
    visible: boolean;
    onCreated: (key: string, chatId: string, question: string) => void;
    onRespondingChange: (key: string, responding: boolean) => void;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const { sesion } = useSesionActiva();
    const alCrearse = useCallback(
        (id: string, question: string) => onCreated(conversationKey, id, question),
        [onCreated, conversationKey],
    );
    const model = useChatModel();
    // Como la web: cambiar de modelo (en Ajustes) empieza una conversación nueva.
    const previousModelRef = useRef(model);
    useEffect(() => {
        if (model === previousModelRef.current) return;
        previousModelRef.current = model;
        if (chatId && visible) navigation.setParams({ chatId: undefined });
    }, [model]);
    const {
        mensajes,
        titulo,
        cargando,
        error,
        recargar,
        enviar,
        parar,
        stopping,
        respondiendo,
        votar,
        sendEmail,
        launchSectorsForm,
        changeSectorsFormMap,
        saveSectorsForm,
    } = useChat(chatId, alCrearse, model);
    useEffect(() => onRespondingChange(conversationKey, respondiendo), [respondiendo]);
    // Una nueva se marca en cuanto tiene id, que llega ya respondiendo.
    const { setChatResponding } = useConversaciones();
    useEffect(() => {
        if (chatId) setChatResponding(chatId, respondiendo);
    }, [chatId, respondiendo]);
    const { chats, duplicateChat } = useConversaciones();
    // La lista va invertida: el desplazamiento 0 es el último mensaje.
    const listRef = useRef<FlatList<Mensaje>>(null);
    const sendAndScroll = useCallback((pregunta: string, fromVoice = false) => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        enviar(pregunta, undefined, fromVoice);
    }, [enviar]);
    const [editingSectorsForm, setEditingSectorsForm] = useState<SectorsFormEditing | null>(null);
    const openSectorsFormEditor = useCallback((form: SectorsForm, map: FormMap) => setEditingSectorsForm({ form, map }), []);
    const closeSectorsFormEditor = useCallback(() => setEditingSectorsForm(null), []);
    // Con el editor abierto, los botones de las tarjetas se desactivan: así un toque que se quedó
    // en cola mientras se montaba el editor no lanza nada al llegar.
    const sectorsFormBusy = respondiendo || !!editingSectorsForm;
    // Sin texto: se optimiza tal cual.
    const launchSectorsFormAsIs = useCallback((form: SectorsForm) => launchSectorsForm(form, ''), [launchSectorsForm]);
    const openChart = useCallback((grafica: Grafica) => navigation.navigate('Grafica', { grafica }), [navigation]);
    const openMap = useCallback((mapa: Mapa) => navigation.navigate('Mapa', { mapa }), [navigation]);
    // Formulario que se manda a revisar con texto; null con la hoja cerrada.
    const [refiningSectorsForm, setRefiningSectorsForm] = useState<SectorsForm | null>(null);
    const closeRefineSheet = useCallback(() => setRefiningSectorsForm(null), []);
    const puedeValorar = validatorUserHasOption(HAS_FEEDBACK_CHAT_CHELU, sesion.empresaId, esSesionMaster(sesion));
    const puedeDictar = validatorUserHasOption(HAS_AUDIO_CHAT_CHELU, sesion.empresaId, esSesionMaster(sesion));
    const esDemo = validatorUserHasOption(DEMO_REVISORES, sesion.empresaId);
    // Respuesta que se está valorando (su runId y el pulgar pulsado); null con la hoja cerrada.
    const [valorando, setValorando] = useState<(Valorando & { runId: string }) | null>(null);
    const openRating = useCallback(
        (runId: string, valoracion: 1 | -1, anterior: Voto | null) => setValorando({ runId, valoracion, anterior }),
        [],
    );
    const cerrarValoracion = useCallback(() => setValorando(null), []);
    // La lista va invertida para que empiece abajo, en el último mensaje.
    const invertidos = useMemo(() => [...mensajes].reverse(), [mensajes]);
    // Mensajes nuevos que ya han entrado: si la lista los vuelve a montar al hacer scroll, no se animan otra vez.
    const enteredIdsRef = useRef(new Set<string>());

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

    const questions = useMemo(() => {
        const userQuestions: Question[] = [];
        for (const m of mensajes) {
            if (m.rol === 'usuario') userQuestions.push({ messageId: m.id, text: m.texto });
        }
        return userQuestions;
    }, [mensajes]);
    const [questionsOpen, setQuestionsOpen] = useState(false);
    const closeQuestions = useCallback(() => setQuestionsOpen(false), []);

    // El salto es sin animación y el skeleton lo tapa hasta que la lista deja de cambiar de tamaño.
    const [jumping, setJumping] = useState(false);
    const jumpEndTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const jumpIndexRef = useRef(0);
    const jumpStartedAtRef = useRef(0);
    // Con la lista invertida, viewPosition 1 deja la pregunta arriba de la pantalla.
    const jumpToIndex = (index: number) => {
        jumpIndexRef.current = index;
        setJumping(true);
        clearTimeout(jumpEndTimerRef.current);
        jumpEndTimerRef.current = setTimeout(() => setJumping(false), JUMP_SETTLE_MS);
        listRef.current?.scrollToIndex({ index, viewPosition: 1, animated: false });
    };
    // El skeleton sale ya; el salto espera a que se vaya la hoja, o su animación se traba mientras se pinta la lista.
    const jumpToQuestion = (messageId: string) => {
        setQuestionsOpen(false);
        setJumping(true);
        const index = invertidos.findIndex((m) => m.id === messageId);
        setTimeout(() => {
            jumpStartedAtRef.current = Date.now();
            jumpToIndex(index);
        }, SHEET_EXIT_MS);
    };
    // Mientras se pintan respuestas alrededor, la pregunta se vuelve a colocar; con un tope por si Chelu está respondiendo.
    const keepJumpPosition = () => {
        if (!jumping || Date.now() - jumpStartedAtRef.current > JUMP_MAX_MS) return;
        jumpToIndex(jumpIndexRef.current);
    };
    // La pregunta aún no está medida: se baja a su posición aproximada para que se pinte y se reintenta.
    const retryJump = (index: number, averageItemLength: number) => {
        clearTimeout(jumpEndTimerRef.current);
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => jumpToIndex(index), 100);
    };

    // La copia la hace el back; aquí solo se abre. La conversación actual no cambia.
    // Respuesta desde la que se está duplicando, para pintar su botón cargando.
    const [duplicando, setDuplicando] = useState<string | null>(null);

    // Primero el de la lista, que tiene el nombre puesto a mano (get_chat devuelve la primera pregunta).
    const listTitle = chats?.find((chat) => chat.id === chatId)?.titulo;
    const cabecera = chatId ? listTitle ?? titulo ?? '' : 'Nueva conversación';

    const duplicarDesde = useCallback((runId: string) => {
        if (!chatId || duplicando) return;
        Alert.alert('Duplicar desde aquí', 'Se creará una conversación nueva hasta esta respuesta.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Duplicar',
                onPress: async () => {
                    setDuplicando(runId);
                    try {
                        navigation.setParams({ chatId: await duplicateChat({ id: chatId, titulo: cabecera }, runId) });
                    } catch {
                        Alert.alert('No se pudo duplicar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setDuplicando(null);
                    }
                },
            },
        ]);
    }, [chatId, duplicando, navigation, duplicateChat, cabecera]);

    return (
        <View style={{ flex: 1, display: visible ? 'flex' : 'none' }}>
            <Pantalla margenInferior={false} margenSuperior={false}>
                <View
                    className="flex-row items-center gap-2 border-b border-borde bg-superficie px-2"
                    style={{ paddingTop: insets.top, height: insets.top + 56 }}
                >
                    <Pressable
                        onPress={() => {
                            Keyboard.dismiss();
                            navigation.openDrawer();
                        }}
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
                    {questions.length >= 2 && !cargando && (
                        <Pressable
                            onPress={() => setQuestionsOpen(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Ir a una pregunta"
                            className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                        >
                            <ListOrdered size={20} color={colores['texto-secundario']} />
                        </Pressable>
                    )}
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
                        <ChatSkeleton />
                    ) : mensajes.length === 0 ? (
                        // Con scroll por si con el teclado abierto no cabe; si cabe, queda centrado.
                        <ScrollView
                            contentContainerClassName="flex-grow items-center justify-center px-6 py-6"
                            keyboardShouldPersistTaps="handled"
                            onTouchStart={Keyboard.dismiss}
                        >
                            <View className="h-32 w-28">
                                <CheluAvatar />
                            </View>
                            <Text className="mt-4 text-2xl font-bold text-texto">¿En qué te ayudo <Text className="text-primario">hoy</Text>?</Text>
                            <Text className="mt-2 text-center text-base text-texto-secundario">
                                {esDemo
                                    ? `Pregúntame en chat CHELU sobre rutas, paradas, proveedores, depósitos o recogidas de ${sesion.nombreEmpresa}. Hay datos del 14 al 25 de septiembre de 2026.`
                                    : `Pregúntame en chat CHELU sobre rutas, alertas, paradas, proveedores, depots, recogidas o ${validatorUserHasOption(FARMACIAS_EN_VEZ_DE_PUDOS, sesion.empresaId) ? 'farmacias' : 'PUDOS'} de ${sesion.nombreEmpresa}.`}
                            </Text>
                            <View className="mt-6 w-full gap-3">
                                <Text className="text-xs font-bold uppercase tracking-wider text-primario">Prueba a preguntar</Text>
                                {(esDemo ? EJEMPLOS_DEMO : EJEMPLOS).map(({ pregunta, icono: Icono }) => (
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
                        <View className="flex-1">
                            <FlatList
                                ref={listRef}
                                inverted
                                data={invertidos}
                                keyExtractor={(m) => m.id}
                                contentContainerClassName="gap-5 px-6 py-4"
                                keyboardShouldPersistTaps="handled"
                                // Tocar cualquier parte del chat (también un mensaje o una tarjeta) cierra el teclado.
                                onTouchStart={Keyboard.dismiss}
                                onScrollToIndexFailed={({ index, averageItemLength }) => retryJump(index, averageItemLength)}
                                onContentSizeChange={keepJumpPosition}
                                renderItem={({ item, index }) => {
                                    const animateEntry = !!item.isNew && !enteredIdsRef.current.has(item.id);
                                    if (animateEntry) enteredIdsRef.current.add(item.id);
                                    return (
                                        <BurbujaMensaje
                                            mensaje={item}
                                            animateEntry={animateEntry}
                                            // Sugerencias solo en la última respuesta (la lista va invertida: es la 0).
                                            onPreguntar={index === 0 && !respondiendo ? sendAndScroll : undefined}
                                            onDuplicarDesde={respondiendo ? undefined : duplicarDesde}
                                            duplicando={!!item.runId && item.runId === duplicando}
                                            onValorar={puedeValorar ? openRating : undefined}
                                            onAmpliarGrafica={openChart}
                                            onAbrirMapa={openMap}
                                            onSendEmail={sendEmail}
                                            onLaunchSectorsForm={sectorsFormBusy ? undefined : launchSectorsFormAsIs}
                                            onRefineSectorsForm={sectorsFormBusy ? undefined : setRefiningSectorsForm}
                                            onChangeSectorsFormMap={changeSectorsFormMap}
                                            onEditSectorsForm={openSectorsFormEditor}
                                        />
                                    );
                                }}
                            />
                            {jumping && (
                                <View className="absolute inset-0 bg-fondo">
                                    <ChatSkeleton />
                                </View>
                            )}
                        </View>
                    )}
                    <CajaMensaje
                        onEnviar={sendAndScroll}
                        onParar={parar}
                        stopping={stopping}
                        respondiendo={respondiendo}
                        desactivada={cargando || error}
                        voiceNotes={puedeDictar}
                        sessionId={chatId}
                    />
                </KeyboardAvoidingView>
                <ArchivosGenerados
                    visible={archivosAbierto}
                    documentos={documentos}
                    onCerrar={() => setArchivosAbierto(false)}
                />
                <QuestionsSheet
                    visible={questionsOpen}
                    questions={questions}
                    onJump={jumpToQuestion}
                    onClose={closeQuestions}
                />
                <HojaValoracion
                    valorando={valorando}
                    onCerrar={cerrarValoracion}
                    onEnviar={(voto) => votar(valorando!.runId, voto, valorando!.anterior)}
                />
                <SectorsFormEditor
                    editing={editingSectorsForm}
                    onSave={(form, editedForm) => {
                        saveSectorsForm(form, editedForm);
                        closeSectorsFormEditor();
                    }}
                    onClose={closeSectorsFormEditor}
                />
                <SectorsRefineSheet
                    form={refiningSectorsForm}
                    onSend={(form, question) => {
                        listRef.current?.scrollToOffset({ offset: 0, animated: true });
                        launchSectorsForm(form, question);
                        closeRefineSheet();
                    }}
                    onClose={closeRefineSheet}
                />
                <CapaGiro />
            </Pantalla>
        </View>
    );
}
