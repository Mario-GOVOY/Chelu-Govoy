import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CHAT_MODELS, DEFAULT_CHAT_MODEL } from '@/chat/models';
import { useSesion, useSesionActiva } from '@/context/SesionContext';
import { esSesionMaster } from '@/utils/ControlOpcionesUsuarios';

const MODEL_KEY = 'modelo_chat';

type ChatModelContextType = { chosenModel: string; setChosenModel: (model: string) => void };

const ChatModelContext = createContext<ChatModelContextType>({ chosenModel: DEFAULT_CHAT_MODEL, setChosenModel: () => {} });

/** Modelo elegido en Ajustes (solo master), guardado en el móvil. */
export function ChatModelProvider({ children }: { children: ReactNode }) {
    const [chosenModel, setModel] = useState(DEFAULT_CHAT_MODEL);

    useEffect(() => {
        const loadModel = async () => {
            try {
                const saved = await AsyncStorage.getItem(MODEL_KEY);
                // Uno que ya no está en la lista se ignora.
                if (saved && CHAT_MODELS.some((model) => model.key === saved)) setModel(saved);
            } catch {}
        };
        loadModel();
    }, []);

    // Al cerrar sesión o salir de una suplantación se olvida: la siguiente empieza con el de por defecto.
    const { estado } = useSesion();
    const wasInsideRef = useRef(false);
    useEffect(() => {
        const inside = estado.tipo === 'dentro';
        if (wasInsideRef.current && !inside) {
            setModel(DEFAULT_CHAT_MODEL);
            AsyncStorage.removeItem(MODEL_KEY).catch(() => {});
        }
        wasInsideRef.current = inside;
    }, [estado.tipo]);

    const setChosenModel = useCallback((model: string) => {
        setModel(model);
        AsyncStorage.setItem(MODEL_KEY, model).catch(() => {});
    }, []);

    return <ChatModelContext.Provider value={{ chosenModel, setChosenModel }}>{children}</ChatModelContext.Provider>;
}

export const useChosenModel = () => useContext(ChatModelContext);

// El que se manda al back: el elegido solo en sesión master; para el resto, el de por defecto.
export function useChatModel() {
    const { sesion } = useSesionActiva();
    const { chosenModel } = useChosenModel();
    return esSesionMaster(sesion) ? chosenModel : DEFAULT_CHAT_MODEL;
}
