import { ScrollView, Text } from 'react-native';

import { TarjetaDocumento } from '@/components/TarjetaDocumento';
import { HojaInferior } from '@/components/ui/HojaInferior';
import type { Documento } from '@/types/Chat';

// Hoja con los documentos de la conversación abierta.
export function ArchivosGenerados({ visible, documentos, onCerrar }: {
    visible: boolean;
    documentos: Documento[];
    onCerrar: () => void;
}) {
    return (
        <HojaInferior visible={visible} titulo="Archivos generados" onCerrar={onCerrar}>
            {documentos.length === 0 ? (
                <Text className="py-8 text-center text-sm text-texto-tenue">
                    Aún no se han generado archivos en esta conversación.
                </Text>
            ) : (
                <ScrollView contentContainerClassName="gap-2 pb-2">
                    {documentos.map((d) => (
                        <TarjetaDocumento key={d.fileId} documento={d} />
                    ))}
                </ScrollView>
            )}
        </HojaInferior>
    );
}
