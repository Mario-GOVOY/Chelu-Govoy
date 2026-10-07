import { fetch as fetchStreaming } from 'expo/fetch';
import { Linking, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { authFetch } from '@/auth/authManager';
import { API_URL } from '@/auth/Constants';
import { aMapa } from '@/chat/mapas';
import type { Chat, Documento, Grafica, Mapa, Mensaje, ResumenChat, Voto } from '@/types/Chat';

// El enlace que trae el back caduca; se descarga siempre pidiendo uno nuevo con el fileId.
const aDocumento = (d: any): Documento => ({
    fileId: d.file_id,
    nombre: d.nombre || 'documento',
    formato: d.formato || '',
    tamano: d.tamano_bytes ?? undefined,
});

const aGrafica = (g: any): Grafica => ({
    grafico: g.grafico ?? undefined,
    titulo: g.titulo ?? undefined,
    series: Array.isArray(g.series) ? g.series : [],
    options: g.options ?? undefined,
});

// El back manda los tiempos en segundos.
const aMs = (ts?: number | null) => (ts == null ? Date.now() : ts < 1e12 ? ts * 1000 : ts);

export async function obtenerChats(): Promise<ResumenChat[]> {
    const respuesta = await authFetch(`${API_URL}chat-cex/get_chats`);
    if (!respuesta.ok) throw new Error(`get_chats ${respuesta.status}`);
    const json = await respuesta.json();
    const chats: any[] = Array.isArray(json?.chats) ? json.chats : [];
    return chats.map((c) => ({
        id: c.session_id,
        titulo: c.title || 'Conversación',
        actualizado: aMs(c.updated_at ?? c.created_at),
    }));
}

// Lanzar desde el formulario de sectores guarda esta línea de resumen; la web tampoco la pinta.
const esResumenFormulario = (texto: string) => /^Optimizar sectores —/.test(texto.trim());

export async function obtenerChat(id: string): Promise<Chat> {
    const respuesta = await authFetch(`${API_URL}chat-cex/get_chat?session_id=${encodeURIComponent(id)}`);
    if (!respuesta.ok) throw new Error(`get_chat ${respuesta.status}`);
    const json = await respuesta.json();
    const chat = json?.chat;
    const mensajes: any[] = Array.isArray(chat?.messages) ? chat.messages : [];
    return {
        id,
        titulo: chat?.title || 'Conversación',
        mensajes: mensajes.flatMap((m, i): Mensaje[] => {
            const texto = typeof m.content === 'string' ? m.content : '';
            if (m.role === 'user') return texto && !esResumenFormulario(texto) ? [{ id: String(i), rol: 'usuario', texto }] : [];
            if (m.role !== 'assistant') return [];
            const documentos = Array.isArray(m.docs) ? m.docs.filter((d: any) => d?.file_id).map(aDocumento) : [];
            const graficas = Array.isArray(m.charts) ? m.charts.map(aGrafica) : [];
            const mapas = Array.isArray(m.maps) ? m.maps.map(aMapa).filter((mapa: Mapa | null) => mapa !== null) : [];
            // Una respuesta sin texto pero con tarjetas (p. ej. solo una gráfica) sí se muestra, como en la web.
            if (!texto && !documentos.length && !graficas.length && !mapas.length) return [];
            return [{
                id: m.run_id ?? String(i),
                rol: 'chelu',
                texto,
                runId: m.run_id ?? undefined,
                sugerencias: Array.isArray(m.suggestions) ? m.suggestions : [],
                documentos,
                graficas,
                mapas,
                voto: m.feedback ?? null,
            }];
        }),
    };
}

/**
 * Valora una respuesta; votar otra vez sustituye el voto anterior.
 * Devuelve el voto tal como quedó guardado.
 */
export async function votarRespuesta(sessionId: string, runId: string, voto: Voto): Promise<Voto> {
    const respuesta = await authFetch(`${API_URL}chat-cex/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, run_id: runId, ...voto }),
    });
    const json = await respuesta.json().catch(() => null);
    // El detail del back ya viene en español (p. ej. el 409 si el cliente no tiene valoraciones).
    if (!respuesta.ok) throw new Error(json?.detail || 'No se pudo guardar la valoración.');
    return json?.feedback ?? voto;
}

// Sin el tipo, el gestor de descargas de Android lo guarda como texto.
const MIME: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    csv: 'text/csv',
};

/**
 * Pide al back un enlace nuevo del documento y lo descarga.
 * Android: con su gestor de descargas, a Descargas y con notificación, sin salir de la app.
 * iOS: lo abre en el navegador, que lo descarga a Archivos › Descargas (el enlace lleva Content-Disposition: attachment).
 */
export async function descargarDocumento(documento: Documento): Promise<void> {
    // La clave de S3 lleva barras y el back la recibe como ruta: se codifica por partes, como la web.
    const ruta = documento.fileId.split('/').map(encodeURIComponent).join('/');
    const respuesta = await authFetch(`${API_URL}chat-cex/archivo/${ruta}`);
    if (!respuesta.ok) throw new Error(`archivo ${respuesta.status}`);
    const json = await respuesta.json();
    if (!json?.url) throw new Error('archivo sin url');

    if (Platform.OS !== 'android') {
        await Linking.openURL(json.url);
        return;
    }
    
    await ReactNativeBlobUtil.config({
        addAndroidDownloads: {
            useDownloadManager: true,
            storeInDownloads: true,
            title: documento.nombre,
            mime: MIME[documento.formato.toLowerCase()],
            mediaScannable: true,
            notification: true,
        },
    }).fetch('GET', json.url);
}

// Borrado lógico: el back la marca como borrada y deja de listarla.
export async function borrarChat(sessionId: string): Promise<void> {
    const respuesta = await authFetch(`${API_URL}chat-cex/delete_chat?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
    });
    if (!respuesta.ok) throw new Error(`delete_chat ${respuesta.status}`);
}

/**
 * Copia una conversación en otra nueva y devuelve su id; la original no cambia.
 * Con hastaRunId la copia acaba en esa respuesta y descarta lo posterior.
 */
export async function duplicarChat(sessionId: string, hastaRunId?: string): Promise<string> {
    const respuesta = await authFetch(`${API_URL}chat-cex/duplicate_chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, hasta_run_id: hastaRunId ?? null }),
    });
    if (!respuesta.ok) throw new Error(`duplicate_chat ${respuesta.status}`);
    const json = await respuesta.json();
    if (!json?.session_id) throw new Error('duplicate_chat sin session_id');
    return json.session_id;
}

// Como la web. Más adelante, guardado en AsyncStorage y con selector para master.
const MODELO = 'deepseek-v4-flash';

// Eventos del stream que usa la app por ahora; el resto se ignoran.
export type EventoChat =
    | { tipo: 'session'; session_id: string }
    | { tipo: 'delta'; texto: string }
    | { tipo: 'tool'; fase: 'inicio' | 'fin'; nombre: string; args?: Record<string, unknown> }
    | { tipo: 'sugerencias'; preguntas: string[] }
    | { tipo: 'documento'; documento: Documento }
    | { tipo: 'grafica'; grafica: Grafica }
    | { tipo: 'mapa'; mapa: Mapa }
    | { tipo: 'done'; run_id?: string }
    | { tipo: 'error'; detail?: string };

// 'documento', 'grafica' y 'mapa' se tratan aparte: se convierten antes de pasarlos.
const TIPOS = ['session', 'delta', 'tool', 'sugerencias', 'done', 'error'];

/**
 * Manda una pregunta y va pasando a onEvento cada evento según llega.
 * Sin sessionId, el back crea una conversación nueva y devuelve su id en el evento 'session'.
 * Al abortar con signal, lanza un AbortError.
 */
export async function enviarMensaje({ pregunta, sessionId, signal, onEvento }: {
    pregunta: string;
    sessionId?: string;
    signal?: AbortSignal;
    onEvento: (evento: EventoChat) => void;
}): Promise<void> {
    const respuesta = await authFetch(
        `${API_URL}chat-cex/stream`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pregunta,
                session_id: sessionId,
                modelo: MODELO,
                incluir_herramientas: true,
                incluir_metricas: false,
            }),
            signal,
        },
        fetchStreaming,
    );
    if (!respuesta.ok || !respuesta.body) throw new Error(`stream ${respuesta.status}`);

    // Cada evento llega como "data: {json}\n\n"; un trozo puede traer varios o cortar uno a medias.
    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = '';
    while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        pendiente += decodificador.decode(value, { stream: true });
        const bloques = pendiente.split('\n\n');
        pendiente = bloques.pop() ?? '';
        for (const bloque of bloques) {
            const linea = bloque.split('\n').find((l) => l.startsWith('data:'));
            if (!linea) continue;
            try {
                const evento = JSON.parse(linea.slice(5));
                if (evento?.tipo === 'documento') {
                    if (evento.file_id) onEvento({ tipo: 'documento', documento: aDocumento(evento) });
                } else if (evento?.tipo === 'grafica') {
                    onEvento({ tipo: 'grafica', grafica: aGrafica(evento) });
                } else if (evento?.tipo === 'mapa') {
                    const mapa = aMapa(evento);
                    if (mapa) onEvento({ tipo: 'mapa', mapa });
                } else if (TIPOS.includes(evento?.tipo)) {
                    onEvento(evento);
                }
            } catch {
                // Línea mal formada: se salta, como en la web.
            }
        }
    }
}
