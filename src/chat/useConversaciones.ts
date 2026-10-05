import { useCallback, useEffect, useState } from 'react';

import { obtenerChats, ResumenChat } from '@/chat/chatApi';

export function useConversaciones(activo: boolean) {
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

    // Se recarga cada vez que se abre el menú, para ver las conversaciones nuevas.
    useEffect(() => {
        if (activo) recargar();
    }, [activo, recargar]);

    return { chats, cargando, error, recargar };
}
