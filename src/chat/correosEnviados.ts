import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BorradorCorreo } from '@/types/Chat';

// Borradores ya enviados desde este móvil, con el messageId de su envío.
const SENT_EMAILS_KEY = 'chelu_correos_enviados';
const MAX_SENT_EMAILS = 200;

type SentEmails = Record<string, { messageId: string; timestamp: number }>;

// Identifica el borrador dentro de su conversación por el asunto y el cuerpo con los que llegó, no por lo editado.
function getBorradorKey(sessionId: string, borrador: BorradorCorreo): string {
    const text = `${borrador.subject.length}:${borrador.subject}${borrador.bodyMarkdown}`;
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
    return `${sessionId}:${hash.toString(36)}:${text.length.toString(36)}`;
}

export async function readSentEmails(): Promise<SentEmails> {
    try {
        return JSON.parse((await AsyncStorage.getItem(SENT_EMAILS_KEY)) ?? '{}');
    } catch {
        return {};
    }
}

/** messageId del envío si este borrador está en el registro. */
export function getSentMessageId(sentEmails: SentEmails, sessionId: string, borrador: BorradorCorreo): string | undefined {
    return sentEmails[getBorradorKey(sessionId, borrador)]?.messageId;
}

/** Apunta un envío correcto; se guardan solo los más recientes. */
export async function markEmailSent(sessionId: string, borrador: BorradorCorreo, messageId: string): Promise<void> {
    const sentEmails = await readSentEmails();
    sentEmails[getBorradorKey(sessionId, borrador)] = { messageId, timestamp: Date.now() };
    const newest = Object.entries(sentEmails)
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, MAX_SENT_EMAILS);
    await AsyncStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(Object.fromEntries(newest))).catch(() => {});
}
