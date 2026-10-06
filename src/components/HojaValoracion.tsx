import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Boton } from '@/components/ui/Boton';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { Selector } from '@/components/ui/Selector';
import { useColores } from '@/theme/ThemeProvider';
import type { Voto } from '@/types/Chat';

const MOTIVOS = [
    { value: 'datos_incorrectos', label: 'Los datos no son correctos' },
    { value: 'no_entendio', label: 'No entendió mi pregunta' },
    { value: 'no_siguio_peticion', label: 'No siguió completamente mi solicitud' },
    { value: 'incompleta', label: 'Respuesta incompleta' },
    { value: 'consulta_incorrecta', label: 'Consultó datos que no tocaban' },
    { value: 'tarjeta_incorrecta', label: 'El mapa, la gráfica o la tarjeta no es correcta' },
    { value: 'error_interfaz', label: 'Error de interfaz' },
    { value: 'lenta', label: 'Tardó demasiado' },
    { value: 'otro', label: 'Otro' },
];

// Lo que se está valorando: el voto nuevo y el que ya había, para partir de él.
export type Valorando = { valoracion: 1 | -1; anterior: Voto | null };

export function HojaValoracion({ valorando, onCerrar, onEnviar }: {
    valorando: Valorando | null;
    onCerrar: () => void;
    // Si lanza, la hoja sigue abierta y enseña el error.
    onEnviar: (voto: Voto) => Promise<void>;
}) {
    return (
        <HojaInferior
            visible={!!valorando}
            titulo={valorando?.valoracion === 1 ? 'Valoración positiva' : 'Valoración negativa'}
            onCerrar={onCerrar}
        >
            {valorando && <Formulario valorando={valorando} onCerrar={onCerrar} onEnviar={onEnviar} />}
        </HojaInferior>
    );
}

// Aparte para que su estado empiece de cero cada vez que se abre la hoja.
function Formulario({ valorando, onCerrar, onEnviar }: {
    valorando: Valorando;
    onCerrar: () => void;
    onEnviar: (voto: Voto) => Promise<void>;
}) {
    const colores = useColores();
    const positiva = valorando.valoracion === 1;
    // Si se repite el mismo pulgar, se parte de lo que ya se había puesto.
    const mismo = valorando.anterior?.valoracion === valorando.valoracion ? valorando.anterior : null;
    const [motivo, setMotivo] = useState<string | null>(mismo?.motivo ?? null);
    const [nota, setNota] = useState(mismo?.nota ?? '');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enviar = async () => {
        setEnviando(true);
        setError(null);
        try {
            await onEnviar({
                valoracion: valorando.valoracion,
                motivo: positiva ? null : motivo,
                nota: nota.trim() || null,
            });
            onCerrar();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la valoración.');
            setEnviando(false);
        }
    };

    return (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 pb-1">
            {!positiva && (
                <View className="gap-2">
                    <Text className="text-sm text-texto-secundario">¿Qué tipo de problema quieres notificar? (opcional)</Text>
                    <Selector
                        opciones={MOTIVOS}
                        valor={motivo}
                        onCambiar={setMotivo}
                        opcionVacia="Sin especificar"
                        etiqueta="Motivo"
                    />
                </View>
            )}

            <View className="gap-2">
                <Text className="text-sm text-texto-secundario">Proporciona más detalles (opcional)</Text>
                <TextInput
                    value={nota}
                    onChangeText={setNota}
                    multiline
                    maxLength={2000}
                    placeholder={positiva ? '¿Qué te pareció útil de esta respuesta?' : '¿Qué esperabas que respondiera?'}
                    placeholderTextColor={colores['texto-tenue']}
                    cursorColor={colores.primario}
                    selectionColor={colores.primario}
                    textAlignVertical="top"
                    className="min-h-24 rounded-xl border border-borde-medio bg-superficie px-3 py-2.5 text-base text-texto"
                />
            </View>

            <Text className="text-xs italic text-texto-tenue">
                Al enviar la valoración se guardará esta respuesta junto con tu pregunta para que el equipo de Govoy pueda mejorar Chelu.
            </Text>

            {error && <Text className="text-sm text-peligro">{error}</Text>}

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Boton texto="Cancelar" variante="secundario" onPress={onCerrar} deshabilitado={enviando} />
                </View>
                <View className="flex-1">
                    <Boton texto="Enviar" onPress={enviar} cargando={enviando} />
                </View>
            </View>
        </ScrollView>
    );
}
