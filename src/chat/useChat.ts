import { useCallback, useEffect, useState } from 'react';

import { Chat, obtenerChat } from '@/chat/chatApi';

export function useChat(chatId?: string) {
    const [chat, setChat] = useState<Chat | null>(null);
    const [error, setError] = useState(false);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        setChat(null);
        setError(false);
        if (!chatId) return;

        // Si se cambia de conversación antes de que llegue la respuesta, se descarta.
        let vigente = true;
        obtenerChat(chatId)
            .then((c) => {
                if (vigente) setChat(c);
            })
            .catch(() => {
                if (vigente) setError(true);
            });
        return () => {
            vigente = false;
        };
    }, [chatId, intento]);

    const reintentar = useCallback(() => setIntento((n) => n + 1), []);

    return { chat, cargando: !!chatId && !chat && !error, error, reintentar };
}
