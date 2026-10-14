import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';

import { transcribeAudio } from '@/chat/chatApi';

export type VoiceNoteStatus = 'idle' | 'recording' | 'transcribing';

// Una pregunta no necesita más; al llegar, para y transcribe.
const MAX_RECORDING_MS = 120_000;

/**
 * Nota de voz: graba la pregunta en m4a, la pasa a texto en el back y la entrega con onText
 * para que se revise antes de enviarla. El audio no se guarda en el back.
 */
export function useVoiceNote({ sessionId, onText }: {
    sessionId?: string;
    // Texto transcrito, nunca vacío.
    onText: (text: string) => void;
}) {
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder, 100);
    const [status, setStatus] = useState<VoiceNoteStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const statusRef = useRef(status);
    statusRef.current = status;

    // El aviso de error se va solo.
    useEffect(() => {
        if (!error) return;
        const timeout = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(timeout);
    }, [error]);

    const start = async () => {
        if (status !== 'idle') return;
        setError(null);
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
            setError('No hay permiso para usar el micrófono.');
            return;
        }
        try {
            await setAudioModeAsync({ allowsRecording: true });
            await recorder.prepareToRecordAsync();
            recorder.record();
            setStatus('recording');
        } catch {
            setError('No se pudo empezar a grabar.');
        }
    };

    // Para y transcribe.
    const finish = async () => {
        if (statusRef.current !== 'recording') return;
        setStatus('transcribing');
        let audio: File | null = null;
        try {
            await recorder.stop();
            await setAudioModeAsync({ allowsRecording: false });
            audio = new File(recorder.uri!);
            const text = await transcribeAudio(audio, sessionId);
            if (text) onText(text);
            else setError('No se ha entendido nada. Prueba otra vez.');
        } catch (e) {
            setError((e as Error).message || 'No se pudo transcribir el audio.');
        } finally {
            // La grabación no se guarda en el móvil.
            audio?.delete();
            setStatus('idle');
        }
    };

    // Para y descarta.
    const cancel = async () => {
        if (statusRef.current !== 'recording') return;
        setStatus('idle');
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        new File(recorder.uri!).delete();
    };

    useEffect(() => {
        if (status === 'recording' && recorderState.durationMillis >= MAX_RECORDING_MS) finish();
    }, [status, recorderState.durationMillis]);

    // Si la app pasa a segundo plano mientras se graba, se descarta.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active') cancel();
        });
        return () => subscription.remove();
    }, []);

    return { status, error, durationMillis: recorderState.durationMillis, start, finish, cancel };
}
