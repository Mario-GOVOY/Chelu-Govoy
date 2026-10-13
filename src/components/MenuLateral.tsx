import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import {
    Check,
    CopyPlus,
    Folder,
    FolderInput,
    FolderMinus,
    FolderPlus,
    LogOut,
    Moon,
    Pencil,
    Plus,
    RefreshCw,
    Sun,
    Trash2,
    UserRoundX,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borrarChat } from '@/chat/chatApi';
import { CheluAvatar } from '@/components/CheluAvatar';
import { ListaConversaciones } from '@/components/ListaConversaciones';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { NameSheet } from '@/components/ui/NameSheet';
import { useConversaciones } from '@/context/ConversacionesContext';
import { useSesion, useSesionActiva } from '@/context/SesionContext';
import type { AppDrawerParamList } from '@/navigation/AppNavigator';
import type { ChatFolder, ResumenChat } from '@/types/Chat';
import { useColores, useTema } from '@/theme/ThemeProvider';
import { esSesionMaster, HAS_FOLDERS_CHAT_CHELU, validatorUserHasOption } from '@/utils/ControlOpcionesUsuarios';

const ROLES: Record<string, string> = {
    administrador: 'Administrador',
    jefeDeOperaciones: 'Jefe de operaciones',
};

function OpcionMenu({ texto, icono: Icono, onPress, peligro = false }: {
    texto: string;
    icono: typeof LogOut;
    onPress: () => void;
    peligro?: boolean;
}) {
    const colores = useColores();
    return (
        <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-fondo">
            <Icono size={20} color={peligro ? colores.peligro : colores['texto-secundario']} />
            <Text className={`text-base ${peligro ? 'text-peligro' : 'text-texto'}`}>{texto}</Text>
        </Pressable>
    );
}

export function MenuLateral({ navigation, state }: DrawerContentComponentProps) {
    const insets = useSafeAreaInsets();
    const colores = useColores();
    const { esquema, setEsquema } = useTema();
    const { salirDeSuplantacion, cerrarSesion } = useSesion();
    const { sesion, staff } = useSesionActiva();
    const isMenuOpen = useDrawerStatus() === 'open';
    const conversaciones = useConversaciones();
    const { chats, folders, recargar, renameChat, duplicateChat, createFolder, moveChatToFolder, renameFolder, deleteFolder } =
        conversaciones;
    const chatActivo = (state.routes[state.index].params as AppDrawerParamList['Chat'])?.chatId;

    // Último chat por el que se recargó: si el back no lo devuelve, no se vuelve a pedir al abrir el menú.
    const reloadedForChatRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isMenuOpen || !chatActivo || !chats || chats.some((chat) => chat.id === chatActivo)) return;
        if (reloadedForChatRef.current === chatActivo) return;
        reloadedForChatRef.current = chatActivo;
        recargar();
    }, [isMenuOpen]);

    const abrirChat = useCallback(
        (chatId?: string) => {
            navigation.navigate('Chat', { chatId });
            navigation.closeDrawer();
        },
        [navigation],
    );

    const openChatFromList = useCallback((chat: ResumenChat) => abrirChat(chat.id), [abrirChat]);

    // Conversación con una acción en curso, para pintar su "⋯" cargando.
    const [busyChatId, setBusyChatId] = useState<string | null>(null);
    // Conversación cuya hoja de acciones está abierta.
    const [actionsChat, setActionsChat] = useState<ResumenChat | null>(null);
    const closeActions = useCallback(() => setActionsChat(null), []);

    const duplicar = (chat: ResumenChat) => {
        Alert.alert('Duplicar conversación', `Se creará una copia de «${chat.titulo}».`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Duplicar',
                onPress: async () => {
                    setBusyChatId(chat.id);
                    try {
                        abrirChat(await duplicateChat(chat));
                    } catch {
                        Alert.alert('No se pudo duplicar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setBusyChatId(null);
                    }
                },
            },
        ]);
    };

    const eliminar = (chat: ResumenChat) => {
        Alert.alert('Eliminar conversación', `Se eliminará «${chat.titulo}».`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    setBusyChatId(chat.id);
                    try {
                        await borrarChat(chat.id);
                        // Si era la abierta, se pasa a una nueva; el menú sigue abierto.
                        if (chat.id === chatActivo) navigation.navigate('Chat', { chatId: undefined });
                        await recargar();
                    } catch {
                        Alert.alert('No se pudo eliminar la conversación', 'Inténtalo de nuevo.');
                    } finally {
                        setBusyChatId(null);
                    }
                },
            },
        ]);
    };

    // Conversación cuya hoja de nombre está abierta.
    const [renamingChat, setRenamingChat] = useState<ResumenChat | null>(null);
    const closeRename = useCallback(() => setRenamingChat(null), []);

    const rename = async (chat: ResumenChat, title: string) => {
        setRenamingChat(null);
        try {
            await renameChat(chat, title);
        } catch (e) {
            Alert.alert('No se pudo renombrar la conversación', (e as Error).message);
        }
    };

    // Cierra la hoja y lanza la acción elegida.
    const chooseAction = (action: (chat: ResumenChat) => void) => {
        if (!actionsChat) return;
        setActionsChat(null);
        action(actionsChat);
    };

    const canManageFolders = validatorUserHasOption(HAS_FOLDERS_CHAT_CHELU, sesion.empresaId, esSesionMaster(sesion));
    // Carpeta cuya hoja de acciones está abierta.
    const [actionsFolder, setActionsFolder] = useState<ChatFolder | null>(null);
    const closeFolderActions = useCallback(() => setActionsFolder(null), []);
    // Hoja de nombre de carpeta: para crear una o para renombrar renamingFolder.
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<ChatFolder | null>(null);
    // Conversación que se guarda en la carpeta que se está creando ("Nueva carpeta…" de "Guardar en carpeta").
    const [chatForNewFolder, setChatForNewFolder] = useState<ResumenChat | null>(null);
    const closeFolderName = useCallback(() => {
        setCreatingFolder(false);
        setRenamingFolder(null);
        setChatForNewFolder(null);
    }, []);

    const saveFolderName = async (name: string) => {
        const folder = renamingFolder;
        const chat = chatForNewFolder;
        closeFolderName();
        if (folder) {
            try {
                await renameFolder(folder, name);
            } catch (e) {
                Alert.alert('No se pudo renombrar la carpeta', (e as Error).message);
            }
            return;
        }
        let newFolder: ChatFolder;
        try {
            newFolder = await createFolder(name);
        } catch (e) {
            Alert.alert('No se pudo crear la carpeta', (e as Error).message);
            return;
        }
        if (chat) moveChat(chat, newFolder.id);
    };

    // Conversación cuya hoja "Guardar en carpeta" está abierta.
    const [movingChat, setMovingChat] = useState<ResumenChat | null>(null);
    const closeMoveSheet = useCallback(() => setMovingChat(null), []);

    const moveChat = async (chat: ResumenChat, folderId: number | null) => {
        setMovingChat(null);
        try {
            await moveChatToFolder(chat, folderId);
        } catch (e) {
            Alert.alert('No se pudo mover la conversación', (e as Error).message);
        }
    };

    const createFolderForChat = (chat: ResumenChat) => {
        setMovingChat(null);
        setChatForNewFolder(chat);
        setCreatingFolder(true);
    };

    const removeFolder = async (folder: ChatFolder, withChats: boolean) => {
        try {
            const deletedChatIds = await deleteFolder(folder, withChats);
            // Si la abierta se ha eliminado, se pasa a una nueva; el menú sigue abierto.
            if (chatActivo && deletedChatIds.includes(chatActivo)) navigation.navigate('Chat', { chatId: undefined });
        } catch (e) {
            Alert.alert('No se pudo eliminar la carpeta', (e as Error).message);
        }
    };

    // Con conversaciones dentro se elige si se eliminan también o pasan a la lista general.
    const confirmDeleteFolder = (folder: ChatFolder) => {
        const chatCount = chats?.filter((chat) => chat.folderId === folder.id).length ?? 0;
        if (chatCount === 0) {
            Alert.alert('Eliminar carpeta', `Se eliminará «${folder.name}».`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => removeFolder(folder, false) },
            ]);
            return;
        }
        const chatsText = chatCount === 1 ? 'una conversación' : `${chatCount} conversaciones`;
        Alert.alert(
            'Eliminar carpeta',
            `«${folder.name}» tiene ${chatsText}. Puedes eliminar solo la carpeta (pasan a la lista general) o también sus conversaciones.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Solo la carpeta', onPress: () => removeFolder(folder, false) },
                { text: 'Carpeta y conversaciones', style: 'destructive', onPress: () => removeFolder(folder, true) },
            ],
        );
    };

    const chooseFolderAction = (action: (folder: ChatFolder) => void) => {
        if (!actionsFolder) return;
        setActionsFolder(null);
        action(actionsFolder);
    };

    return (
        <View className="flex-1 bg-superficie" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}>
            <View className="flex-row items-center gap-3 px-5">
                <View className="h-11 w-10">
                    <CheluAvatar />
                </View>
                <View className="flex-1">
                    <Text className="text-lg font-bold tracking-wide text-texto">
                        CHE<Text className="text-primario">LU</Text>
                    </Text>
                    <Text className="text-xs text-texto-tenue" numberOfLines={1}>
                        {sesion.nombreEmpresa}
                    </Text>
                </View>
            </View>

            <Pressable
                onPress={() => abrirChat()}
                className="mx-4 mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primario active:bg-primario-presionado"
            >
                <Plus size={20} color={colores['sobre-primario']} />
                <Text className="text-base font-semibold text-sobre-primario">Nueva conversación</Text>
            </Pressable>

            <View className="ml-5 mr-3 mt-4 flex-row items-center justify-between">
                <Text className="flex-1 text-xs font-bold uppercase tracking-wider text-texto-tenue">Conversaciones</Text>
                {canManageFolders && (
                    <Pressable
                        onPress={() => setCreatingFolder(true)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Nueva carpeta"
                        className="h-9 w-9 items-center justify-center rounded-full active:bg-fondo"
                    >
                        <FolderPlus size={16} color={colores['texto-tenue']} />
                    </Pressable>
                )}
                <Pressable
                    onPress={conversaciones.recargar}
                    disabled={conversaciones.cargando}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Recargar conversaciones"
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-fondo"
                >
                    {conversaciones.cargando ? (
                        <ActivityIndicator size="small" color={colores['texto-tenue']} />
                    ) : (
                        <RefreshCw size={16} color={colores['texto-tenue']} />
                    )}
                </Pressable>
            </View>
            <View className="mt-1 flex-1">
                <ListaConversaciones
                    {...conversaciones}
                    activoId={chatActivo}
                    onReintentar={conversaciones.recargar}
                    onAbrir={openChatFromList}
                    onOpenActions={setActionsChat}
                    onOpenFolderActions={canManageFolders ? setActionsFolder : undefined}
                    busyChatId={busyChatId}
                />
            </View>

            <View className="mx-3 border-t border-borde pt-2">
                {sesion.isImpersonation && (
                    <View className="mx-2 mb-2 rounded-xl bg-aviso-suave px-3 py-2">
                        <Text className="text-xs text-aviso">
                            Suplantando a <Text className="font-bold">{sesion.username}</Text>
                            {sesion.isMaster ? ' (con maestro)' : ' (sin maestro)'}
                        </Text>
                    </View>
                )}
                <View className="mx-1 mb-1 flex-row items-center gap-3 rounded-2xl bg-fondo px-3 py-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primario">
                        <Text className="text-base font-bold text-sobre-primario">
                            {sesion.username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-texto" numberOfLines={1}>
                            {sesion.username}
                        </Text>
                        {sesion.rol && (
                            <Text className="text-xs text-texto-secundario" numberOfLines={1}>
                                {ROLES[sesion.rol] ?? sesion.rol}
                            </Text>
                        )}
                    </View>
                </View>
                <OpcionMenu
                    texto={esquema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    icono={esquema === 'dark' ? Sun : Moon}
                    onPress={() => setEsquema(esquema === 'dark' ? 'light' : 'dark')}
                />
                {staff && <OpcionMenu texto="Salir de suplantación" icono={UserRoundX} onPress={salirDeSuplantacion} />}
                <OpcionMenu texto="Cerrar sesión" icono={LogOut} onPress={cerrarSesion} peligro />
            </View>

            <HojaInferior visible={!!actionsChat} titulo={actionsChat?.titulo ?? ''} onCerrar={closeActions}>
                <View className="overflow-hidden rounded-2xl bg-superficie">
                    <Pressable
                        onPress={() => chooseAction(setRenamingChat)}
                        className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                    >
                        <Pencil size={20} color={colores['texto-secundario']} />
                        <Text className="text-base text-texto">Renombrar</Text>
                    </Pressable>
                    <View className="mx-4 h-px bg-borde" />
                    <Pressable
                        onPress={() => chooseAction(duplicar)}
                        className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                    >
                        <CopyPlus size={20} color={colores['texto-secundario']} />
                        <Text className="text-base text-texto">Duplicar</Text>
                    </Pressable>
                    <View className="mx-4 h-px bg-borde" />
                    {canManageFolders && (
                        <>
                            <Pressable
                                onPress={() => chooseAction(setMovingChat)}
                                className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                            >
                                <FolderInput size={20} color={colores['texto-secundario']} />
                                <Text className="text-base text-texto">Guardar en carpeta</Text>
                            </Pressable>
                            <View className="mx-4 h-px bg-borde" />
                        </>
                    )}
                    <Pressable
                        onPress={() => chooseAction(eliminar)}
                        className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                    >
                        <Trash2 size={20} color={colores.peligro} />
                        <Text className="text-base text-peligro">Eliminar</Text>
                    </Pressable>
                </View>
            </HojaInferior>
            <NameSheet
                visible={!!renamingChat}
                title="Renombrar conversación"
                initialName={renamingChat?.titulo ?? ''}
                placeholder="Nombre de la conversación"
                onSave={(title) => rename(renamingChat!, title)}
                onClose={closeRename}
            />

            <HojaInferior visible={!!movingChat} titulo="Guardar en carpeta" onCerrar={closeMoveSheet}>
                {movingChat && (
                    // Solo hacen scroll las carpetas: "Nueva carpeta…" y "Sacar de la carpeta" quedan siempre a la vista.
                    <View className="shrink overflow-hidden rounded-2xl bg-superficie">
                        <ScrollView className="shrink">
                            {folders.map((folder) => {
                                const current = folder.id === movingChat.folderId;
                                return (
                                    <Pressable
                                        key={folder.id}
                                        onPress={() => (current ? closeMoveSheet() : moveChat(movingChat, folder.id))}
                                        accessibilityState={{ selected: current }}
                                        className="flex-row items-center gap-3 border-b border-borde px-4 py-4 active:bg-superficie-alt"
                                    >
                                        <Folder size={20} color={colores.primario} />
                                        <Text className={`flex-1 text-base text-texto ${current ? 'font-semibold' : ''}`} numberOfLines={1}>
                                            {folder.name}
                                        </Text>
                                        {current && <Check size={20} color={colores.primario} />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        <Pressable
                            onPress={() => createFolderForChat(movingChat)}
                            className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                        >
                            <FolderPlus size={20} color={colores['texto-secundario']} />
                            <Text className="text-base text-texto">Nueva carpeta…</Text>
                        </Pressable>
                        {movingChat.folderId !== null && (
                            <Pressable
                                onPress={() => moveChat(movingChat, null)}
                                className="flex-row items-center gap-3 border-t border-borde px-4 py-4 active:bg-superficie-alt"
                            >
                                <FolderMinus size={20} color={colores['texto-secundario']} />
                                <Text className="text-base text-texto">Sacar de la carpeta</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </HojaInferior>

            <HojaInferior visible={!!actionsFolder} titulo={actionsFolder?.name ?? ''} onCerrar={closeFolderActions}>
                <View className="overflow-hidden rounded-2xl bg-superficie">
                    <Pressable
                        onPress={() => chooseFolderAction(setRenamingFolder)}
                        className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                    >
                        <Pencil size={20} color={colores['texto-secundario']} />
                        <Text className="text-base text-texto">Renombrar</Text>
                    </Pressable>
                    <View className="mx-4 h-px bg-borde" />
                    <Pressable
                        onPress={() => chooseFolderAction(confirmDeleteFolder)}
                        className="flex-row items-center gap-3 px-4 py-4 active:bg-superficie-alt"
                    >
                        <Trash2 size={20} color={colores.peligro} />
                        <Text className="text-base text-peligro">Eliminar</Text>
                    </Pressable>
                </View>
            </HojaInferior>
            <NameSheet
                visible={creatingFolder || !!renamingFolder}
                title={renamingFolder ? 'Renombrar carpeta' : 'Nueva carpeta'}
                initialName={renamingFolder?.name ?? ''}
                placeholder="Nombre de la carpeta"
                onSave={saveFolderName}
                onClose={closeFolderName}
            />
        </View>
    );
}
