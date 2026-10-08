import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { CircleCheck, Mail, Paperclip, Send, TriangleAlert } from 'lucide-react-native';

import { MensajeError } from '@/components/ui/MensajeError';
import { useColores } from '@/theme/ThemeProvider';
import type { BorradorCorreo, EditedEmail } from '@/types/Chat';
import { formatBytes } from '@/utils/numbers';

// Topes que también valida el back al enviar.
const MAX_SUBJECT_LENGTH = 200;
const MAX_RECIPIENTS = 10;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENTS_BYTES = 8 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Separa las direcciones por comas, puntos y coma o saltos de línea.
const parseRecipients = (text: string) => text.split(/[,;\n]/).map((recipient) => recipient.trim()).filter(Boolean);

function EmailField({ label, highlighted = false, ...props }: TextInputProps & { label: string; highlighted?: boolean }) {
    const colores = useColores();
    const box = highlighted ? 'border-peligro bg-peligro-suave' : 'border-borde bg-superficie';

    return (
        <TextInput
            {...props}
            accessibilityLabel={label}
            placeholderTextColor={colores['texto-tenue']}
            cursorColor={colores.primario}
            selectionColor={colores.primario}
            className={`rounded-lg border px-3 py-2 text-sm ${box} ${props.editable === false ? 'text-texto-secundario' : 'text-texto'}`}
        />
    );
}

export function TarjetaBorradorCorreo({ borrador, onSend }: {
    borrador: BorradorCorreo;
    // Envía con lo editado; si falla, lanza el error que se enseña en la tarjeta.
    onSend: (edited: EditedEmail) => Promise<void>;
}) {
    const colores = useColores();
    const [recipientsText, setRecipientsText] = useState(borrador.recipients.join(', '));
    const [subject, setSubject] = useState(borrador.subject);
    const [body, setBody] = useState(borrador.bodyMarkdown);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sent = !!borrador.sentMessageId;
    const locked = sent || sending;
    const recipients = parseRecipients(recipientsText);
    const invalidRecipients = recipients.filter((recipient) => !EMAIL_REGEX.test(recipient));
    const attachmentsBytes = borrador.attachments.reduce((total, adjunto) => total + (adjunto.tamano ?? 0), 0);

    const warnings: string[] = [];
    if (subject.length > MAX_SUBJECT_LENGTH) warnings.push(`El asunto pasa de ${MAX_SUBJECT_LENGTH} caracteres.`);
    if (recipients.length > MAX_RECIPIENTS) warnings.push(`Como mucho ${MAX_RECIPIENTS} destinatarios.`);
    if (invalidRecipients.length) warnings.push(`Dirección no válida: ${invalidRecipients.join(', ')}`);
    if (borrador.attachments.length > MAX_ATTACHMENTS) {
        warnings.push(`Como mucho ${MAX_ATTACHMENTS} adjuntos; este borrador trae ${borrador.attachments.length}.`);
    }
    if (attachmentsBytes > MAX_ATTACHMENTS_BYTES) {
        warnings.push(`Los adjuntos suman ${formatBytes(attachmentsBytes)} y el tope son ${formatBytes(MAX_ATTACHMENTS_BYTES)}.`);
    }

    const missing = !recipients.length
        ? 'Falta el destinatario'
        : !subject.trim()
            ? 'Falta el asunto'
            : !body.trim()
                ? 'Falta el mensaje'
                : null;
    const canSend = !missing && !warnings.length && !locked;

    const send = async () => {
        setError(null);
        setSending(true);
        try {
            await onSend({ subject: subject.trim(), bodyMarkdown: body, recipients });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo enviar el correo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <View className={`gap-3 rounded-xl border px-3 py-3 ${sent ? 'border-exito/30 bg-exito-suave/40' : 'border-borde bg-superficie'}`}>
            <View className="flex-row items-center gap-3">
                <View className={`h-10 w-10 items-center justify-center rounded-lg ${sent ? 'bg-exito-suave' : 'bg-primario-suave'}`}>
                    {sent ? <CircleCheck size={20} color={colores.exito} /> : <Mail size={20} color={colores.primario} />}
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-texto" numberOfLines={1}>
                        {sent ? 'Correo enviado' : 'Borrador de correo'}
                    </Text>
                    <Text className="text-xs text-texto-tenue" numberOfLines={1}>
                        {sent
                            ? borrador.sentMessageId === 'enviado' ? 'El correo ya salió' : `ID del envío: ${borrador.sentMessageId}`
                            : 'Revisa y completa los destinatarios antes de enviar'}
                    </Text>
                </View>
            </View>

            <View className="gap-1">
                <Text className="text-xs font-semibold text-texto-secundario">
                    Para (separa varios con comas)
                    {!sent && !recipients.length && <Text className="text-peligro"> · obligatorio</Text>}
                </Text>
                <EmailField
                    label="Para"
                    value={recipientsText}
                    onChangeText={setRecipientsText}
                    editable={!locked}
                    highlighted={!sent && !recipients.length}
                    placeholder="nombre@empresa.com, otro@empresa.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View className="gap-1">
                <View className="flex-row items-baseline justify-between">
                    <Text className="text-xs font-semibold text-texto-secundario">Asunto</Text>
                    <Text className={`text-[11px] ${subject.length > MAX_SUBJECT_LENGTH ? 'font-semibold text-peligro' : 'text-texto-tenue'}`}>
                        {subject.length}/{MAX_SUBJECT_LENGTH}
                    </Text>
                </View>
                <EmailField label="Asunto" value={subject} onChangeText={setSubject} editable={!locked} placeholder="Asunto del correo" />
            </View>

            <View className="gap-1">
                <Text className="text-xs font-semibold text-texto-secundario">Mensaje</Text>
                <EmailField
                    label="Mensaje"
                    value={body}
                    onChangeText={setBody}
                    editable={!locked}
                    placeholder="Cuerpo del correo"
                    multiline
                    textAlignVertical="top"
                    style={{ minHeight: 120 }}
                />
            </View>

            {/* Los adjuntos vienen con el borrador y no se pueden cambiar. */}
            {borrador.attachments.length > 0 && (
                <View className="gap-1">
                    <Text className="text-xs font-semibold text-texto-secundario">
                        {borrador.attachments.length === 1 ? '1 adjunto' : `${borrador.attachments.length} adjuntos`}
                        {attachmentsBytes > 0 ? ` · ${formatBytes(attachmentsBytes)}` : ''}
                    </Text>
                    {borrador.attachments.map((adjunto) => (
                        <View
                            key={adjunto.fileId}
                            className="flex-row items-center gap-2 rounded-lg border border-borde bg-superficie-alt px-3 py-2"
                        >
                            <Paperclip size={13} color={colores['texto-tenue']} />
                            <Text className="flex-1 text-[13px] text-texto-secundario" numberOfLines={1}>
                                {adjunto.nombre}
                            </Text>
                            {adjunto.tamano != null && (
                                <Text className="text-[13px] text-texto-tenue">{formatBytes(adjunto.tamano)}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {!sent && warnings.map((warning) => (
                <View key={warning} className="flex-row items-start gap-1.5">
                    <TriangleAlert size={13} color={colores.aviso} style={{ marginTop: 2 }} />
                    <Text className="flex-1 text-xs text-aviso">{warning}</Text>
                </View>
            ))}

            <MensajeError texto={error} />

            <View className="flex-row items-center justify-end gap-3">
                {!sent && missing && (
                    <Text className={`shrink text-xs ${!recipients.length ? 'font-semibold text-peligro' : 'text-texto-tenue'}`}>
                        {missing}
                    </Text>
                )}
                {sent ? (
                    <View className="flex-row items-center gap-1.5 rounded-full bg-exito-suave px-3 py-1.5">
                        <CircleCheck size={14} color={colores.exito} />
                        <Text className="text-[13px] font-semibold text-exito">Enviado</Text>
                    </View>
                ) : (
                    <Pressable
                        onPress={send}
                        disabled={!canSend}
                        accessibilityRole="button"
                        accessibilityLabel="Enviar correo"
                        accessibilityState={{ disabled: !canSend, busy: sending }}
                        className={`flex-row items-center gap-1.5 rounded-full bg-primario px-3 py-1.5 active:bg-primario-presionado ${canSend ? '' : 'opacity-60'}`}
                    >
                        {sending ? (
                            <ActivityIndicator size={14} color={colores['sobre-primario']} />
                        ) : (
                            <Send size={14} color={colores['sobre-primario']} />
                        )}
                        <Text className="text-[13px] font-semibold text-sobre-primario">{sending ? 'Enviando…' : 'Enviar'}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}
