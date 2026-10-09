import { fetch as fetchStreaming } from 'expo/fetch';
import { Linking, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { authFetch } from '@/auth/authManager';
import { API_URL } from '@/auth/Constants';
import { getSentMessageId, markEmailSent, readSentEmails } from '@/chat/correosEnviados';
import { aMapa } from '@/chat/mapas';
import type {
    BorradorCorreo,
    Chat,
    Documento,
    EditedEmail,
    Grafica,
    Mapa,
    Mensaje,
    ResumenChat,
    ScenarioComparison,
    SectorsResult,
    SectorsSummary,
    Voto,
} from '@/types/Chat';
import type { FormFleet, FormZone, SectorsForm, SectorsFormPayload } from '@/types/SectorsForm';

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

// Las advertencias del back son para el modelo, no para el usuario.
const toBorradorCorreo = (c: any): BorradorCorreo | null =>
    c.asunto || c.cuerpo_markdown
        ? {
            subject: c.asunto || '',
            bodyMarkdown: c.cuerpo_markdown || '',
            recipients: Array.isArray(c.destinatarios) ? c.destinatarios : [],
            attachments: Array.isArray(c.adjuntos) ? c.adjuntos.filter((a: any) => a?.file_id).map(aDocumento) : [],
        }
        : null;

const toSectorsSummary = (r: any): SectorsSummary => ({
    group: r?.grupo ?? undefined,
    assignedCells: r?.celdas_asignadas ?? undefined,
    unassignedCells: r?.celdas_sin_asignar ?? undefined,
    usedVehicles: r?.vehiculos_usados ?? undefined,
    totalTimeMin: r?.tiempo_total_min ?? undefined,
    totalDistanceKm: r?.distancia_total_km ?? undefined,
});

const toSectorsResult = (s: any): SectorsResult | null =>
    s.optimizacion_id ? { optimizationId: s.optimizacion_id, summary: toSectorsSummary(s.resumen) } : null;

const toComparison = (c: any): ScenarioComparison | null =>
    Array.isArray(c.escenarios) && c.escenarios.length
        ? {
            scenarios: c.escenarios.map((e: any) => {
                const name = e.nombre || 'Escenario';
                return e.resumen && !e.error
                    ? { name, summary: toSectorsSummary(e.resumen) }
                    : { name, error: e.error || 'Escenario no disponible' };
            }),
        }
        : null;

const toSectorsForm = ({ tipo, ...form }: any): SectorsForm | null => (form.zona || form.flota ? form : null);
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
    const sentEmails = await readSentEmails();
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
            const borradoresCorreo = Array.isArray(m.correos)
                ? m.correos
                    .map(toBorradorCorreo)
                    .filter((borrador: BorradorCorreo | null) => borrador !== null)
                    .map((borrador: BorradorCorreo) => ({
                        ...borrador,
                        sentMessageId: getSentMessageId(sentEmails, id, borrador),
                    }))
                : [];
            const sectorsForms = Array.isArray(m.formularios)
                ? m.formularios
                    .map(toSectorsForm)
                    .filter((form: SectorsForm | null) => form !== null)
                    .map((form: SectorsForm) => ({ ...form, readOnly: true }))
                : [];
            const sectorsResults = Array.isArray(m.sectores)
                ? m.sectores.map(toSectorsResult).filter((result: SectorsResult | null) => result !== null)
                : [];
            const comparisons = Array.isArray(m.comparativas)
                ? m.comparativas.map(toComparison).filter((comparison: ScenarioComparison | null) => comparison !== null)
                : [];
            const cards = [documentos, graficas, mapas, borradoresCorreo, sectorsForms, sectorsResults, comparisons];
            // Una respuesta sin texto pero con tarjetas (p. ej. solo una gráfica) sí se muestra, como en la web.
            if (!texto && cards.every((list) => !list.length)) return [];
            return [{
                id: m.run_id ?? String(i),
                rol: 'chelu',
                texto,
                runId: m.run_id ?? undefined,
                sugerencias: Array.isArray(m.suggestions) ? m.suggestions : [],
                documentos,
                graficas,
                mapas,
                borradoresCorreo,
                sectorsForms,
                sectorsResults,
                comparisons,
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

/**
 * Envía un borrador con lo editado en la tarjeta y lo apunta como enviado. Devuelve el messageId del envío.
 * Los adjuntos son los del borrador; de ellos solo viaja el fileId.
 */
export async function sendEmail(
    sessionId: string,
    borrador: BorradorCorreo,
    edited: EditedEmail,
): Promise<string> {
    const respuesta = await authFetch(`${API_URL}chat-cex/correo/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            asunto: edited.subject,
            cuerpo_markdown: edited.bodyMarkdown,
            destinatarios: edited.recipients,
            adjuntos: borrador.attachments.map((adjunto) => adjunto.fileId),
            session_id: sessionId,
        }),
    });
    const json = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
        throw new Error(
            json?.detail ||
            (respuesta.status === 429
                ? 'Has llegado al límite de correos por hora. Inténtalo más tarde.'
                : respuesta.status === 502
                    ? 'El servicio de correo rechazó el envío. Inténtalo de nuevo.'
                    : `No se pudo enviar el correo (error ${respuesta.status}).`),
        );
    }
    const messageId: string = json?.message_id || 'enviado';
    await markEmailSent(sessionId, borrador, messageId);
    return messageId;
}

/**
 * Consulta del formulario de sectores para un mapa (y unos CP; sin ellos, el mapa entero). No gasta turno de chat.
 * Si el back falla, lanza su detail. Al abortar con signal, lanza un AbortError.
 */
async function fetchSectorsFormPart<T>(operation: string, mapId?: number, postcodes: string[] = [], signal?: AbortSignal): Promise<T> {
    const mapParam = mapId === undefined ? '' : `&id_cell_group=${mapId}`;
    const postcodesParam = postcodes.length ? `&cps=${encodeURIComponent(postcodes.join(','))}` : '';
    const respuesta = await authFetch(
        `${API_URL}chat-cex/formulario-sectores?op=${operation}${mapParam}${postcodesParam}`,
        { signal },
    );
    const json = await respuesta.json().catch(() => null);
    if (!respuesta.ok) throw new Error(json?.detail || `No se pudo cargar el formulario (error ${respuesta.status}).`);
    return json;
}

/** Formulario completo del mapa, con lo recomendado para él. Sin mapa, sin elegir y con todos los mapas disponibles. */
export const fetchSectorsForm = (mapId?: number) => fetchSectorsFormPart<SectorsFormPayload>('formulario', mapId);

/** Zona recalculada para los CP elegidos. */
export const fetchSectorsZone = (mapId: number, postcodes: string[], signal: AbortSignal) =>
    fetchSectorsFormPart<FormZone>('zona', mapId, postcodes, signal);

/** Flota que sirve la zona de esos CP. No trae el tipo de flota, que es elección del usuario. */
export const fetchSectorsFleet = (mapId: number, postcodes: string[], signal: AbortSignal) =>
    fetchSectorsFormPart<Omit<FormFleet, 'tipo'>>('flota', mapId, postcodes, signal);

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
    | { tipo: 'correo_borrador'; borradorCorreo: BorradorCorreo }
    | { tipo: 'formulario_sectores'; sectorsForm: SectorsForm }
    | { tipo: 'sectores'; sectorsResult: SectorsResult }
    | { tipo: 'comparativa'; comparison: ScenarioComparison }
    | { tipo: 'progreso'; mensaje: string }
    | { tipo: 'done'; run_id?: string }
    | { tipo: 'error'; detail?: string };

// Los que traen tarjetas se convierten antes de pasarlos; se descartan si no traen nada que pintar.
const toEvent = (evento: any): EventoChat | null => {
    switch (evento?.tipo) {
        case 'session':
        case 'delta':
        case 'tool':
        case 'sugerencias':
        case 'done':
        case 'error':
            return evento;
        case 'documento':
            return evento.file_id ? { tipo: 'documento', documento: aDocumento(evento) } : null;
        case 'grafica':
            return { tipo: 'grafica', grafica: aGrafica(evento) };
        case 'mapa': {
            const mapa = aMapa(evento);
            return mapa && { tipo: 'mapa', mapa };
        }
        case 'correo_borrador': {
            const borradorCorreo = toBorradorCorreo(evento);
            return borradorCorreo && { tipo: 'correo_borrador', borradorCorreo };
        }
        case 'formulario_sectores': {
            const sectorsForm = toSectorsForm(evento);
            return sectorsForm && { tipo: 'formulario_sectores', sectorsForm };
        }
        case 'sectores': {
            const sectorsResult = toSectorsResult(evento);
            return sectorsResult && { tipo: 'sectores', sectorsResult };
        }
        case 'comparativa': {
            const comparison = toComparison(evento);
            return comparison && { tipo: 'comparativa', comparison };
        }
        case 'progreso':
            return { tipo: 'progreso', mensaje: evento.mensaje || 'Optimizando…' };
        default:
            return null;
    }
};

/**
 * Manda una pregunta y va pasando a onEvento cada evento según llega.
 * Sin sessionId, el back crea una conversación nueva y devuelve su id en el evento 'session'.
 * Con sectorsForm y sin pregunta, el back lanza la optimización de sectores directamente.
 * Al abortar con signal, lanza un AbortError.
 */
export async function enviarMensaje({ pregunta, sessionId, sectorsForm, signal, onEvento }: {
    pregunta: string;
    sessionId?: string;
    sectorsForm?: SectorsFormPayload;
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
                formulario: sectorsForm,
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
                const evento = toEvent(JSON.parse(linea.slice(5)));
                if (evento) onEvento(evento);
            } catch {
                // Línea mal formada: se salta, como en la web.
            }
        }
    }
}
