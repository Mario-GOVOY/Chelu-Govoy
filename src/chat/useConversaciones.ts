import { useCallback, useEffect, useState } from 'react';

import { obtenerChats } from '@/chat/chatApi';
import type { ResumenChat } from '@/types/Chat';

export function useConversaciones() {
    const [chats, setChats] = useState<ResumenChat[] | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(false);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(false);
        try {
            setChats(await obtenerChats());
        } catch {
            setError(true);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        recargar();
    }, [recargar]);

    return { chats, cargando, error, recargar };
}
