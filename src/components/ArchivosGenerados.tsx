import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { TarjetaDocumento } from '@/components/TarjetaDocumento';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { useColores } from '@/theme/ThemeProvider';
import type { Documento } from '@/types/Chat';
import { normalizeForSearch } from '@/utils/text';

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
                <DocumentList documents={documentos} />
            )}
        </HojaInferior>
    );
}

// Aparte para que la búsqueda empiece vacía cada vez que se abre la hoja.
function DocumentList({ documents }: { documents: Documento[] }) {
    const colores = useColores();
    const [query, setQuery] = useState('');
    const searchText = normalizeForSearch(query.trim());
    const visibleDocuments = searchText
        ? documents.filter((document) => normalizeForSearch(document.nombre).includes(searchText))
        : documents;

    return (
        <View className="shrink gap-3">
            <View className="h-11 flex-row items-center gap-2 rounded-xl bg-superficie pl-3">
                <Search size={16} color={colores['texto-tenue']} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar por nombre"
                    placeholderTextColor={colores['texto-tenue']}
                    returnKeyType="search"
                    className="flex-1 py-0 text-base text-texto"
                />
                {query !== '' && (
                    <Pressable
                        onPress={() => setQuery('')}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar búsqueda"
                        className="h-11 w-11 items-center justify-center"
                    >
                        <X size={16} color={colores['texto-tenue']} />
                    </Pressable>
                )}
            </View>
            {visibleDocuments.length === 0 ? (
                <Text className="py-6 text-center text-sm text-texto-tenue">No hay archivos que coincidan.</Text>
            ) : (
                // Con el teclado abierto, el primer toque descarga en vez de solo cerrarlo.
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-2 pb-2">
                    {visibleDocuments.map((d) => (
                        <TarjetaDocumento key={d.fileId} documento={d} />
                    ))}
                </ScrollView>
            )}
        </View>
    );
}
