import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Boton } from '@/components/ui/Boton';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { useColores } from '@/theme/ThemeProvider';
import type { SectorsForm } from '@/types/SectorsForm';

/** Hoja para pedirle a Chelu que ajuste el formulario con un texto. Va la última dentro del chat. */
export function SectorsRefineSheet({ form, onSend, onClose }: {
    // null: cerrada.
    form: SectorsForm | null;
    onSend: (form: SectorsForm, question: string) => void;
    onClose: () => void;
}) {
    return (
        <HojaInferior visible={!!form} titulo="Afinar con Chelu" onCerrar={onClose}>
            {form && (
                <RefineFields isCustomFleet={form.flota.tipo === 'personalizada'} onSend={(question) => onSend(form, question)} />
            )}
        </HojaInferior>
    );
}

function RefineFields({ isCustomFleet, onSend }: { isCustomFleet: boolean; onSend: (question: string) => void }) {
    const colores = useColores();
    const [question, setQuestion] = useState('');
    const trimmedQuestion = question.trim();

    return (
        <View className="gap-3">
            <TextInput
                value={question}
                onChangeText={setQuestion}
                multiline
                placeholder={isCustomFleet ? 'Describe la flota' : '¿Qué quieres cambiar?'}
                placeholderTextColor={colores['texto-tenue']}
                accessibilityLabel="Algo que afinar"
                className="min-h-[96px] rounded-xl border border-borde-medio bg-superficie px-3 py-2 text-sm text-texto"
                style={{ textAlignVertical: 'top' }}
            />
            <Text className="text-xs text-texto-tenue">
                No se lanza nada: Chelu ajusta el formulario y te lo devuelve para optimizar o volver a afinar.
            </Text>
            <Boton texto="Revisar" onPress={() => onSend(trimmedQuestion)} deshabilitado={!trimmedQuestion} />
        </View>
    );
}
