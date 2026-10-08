import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Download, FileSpreadsheet, FileText } from 'lucide-react-native';

import { descargarDocumento } from '@/chat/chatApi';
import type { NombreColor } from '@/theme/palette';
import { useColores } from '@/theme/ThemeProvider';
import type { Documento } from '@/types/Chat';
import { formatBytes } from '@/utils/numbers';

// Como la web (fileMeta.ts): icono y color según el formato.
// Los colores van por nombre y se pintan con style: las clases elegidas al vuelo no siempre las genera NativeWind.
function tipo(formato: string): { Icono: typeof FileText; etiqueta: string; color: NombreColor; fondo: NombreColor } {
    switch (formato.toLowerCase()) {
        case 'pdf':
            return { Icono: FileText, etiqueta: 'PDF', color: 'peligro', fondo: 'peligro-suave' };
        case 'docx':
        case 'doc':
            return { Icono: FileText, etiqueta: 'Word', color: 'primario', fondo: 'primario-suave' };
        case 'xlsx':
        case 'xls':
            return { Icono: FileSpreadsheet, etiqueta: 'Excel', color: 'exito', fondo: 'exito-suave' };
        default:
            return { Icono: FileText, etiqueta: (formato || 'Archivo').toUpperCase(), color: 'texto-tenue', fondo: 'superficie-alt' };
    }
}

export function TarjetaDocumento({ documento }: { documento: Documento }) {
    const colores = useColores();
    const [descargando, setDescargando] = useState(false);
    const [fallo, setFallo] = useState(false);
    const { Icono, etiqueta, color, fondo } = tipo(documento.formato);
    const tamano = formatBytes(documento.tamano);

    const descargar = async () => {
        if (descargando) return;
        setFallo(false);
        setDescargando(true);
        try {
            await descargarDocumento(documento);
        } catch {
            setFallo(true);
        } finally {
            setDescargando(false);
        }
    };

    return (
        <View className="flex-row items-center gap-3 rounded-xl border border-borde bg-superficie px-2 py-2">
            <View className="h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: colores[fondo] }}>
                <Icono size={20} color={colores[color]} />
            </View>
            <View className="flex-1">
                <Text className="text-sm font-semibold text-texto" numberOfLines={1}>
                    {documento.nombre}
                </Text>
                <Text className="text-xs text-texto-tenue" numberOfLines={1}>
                    {etiqueta}
                    {tamano ? ` · ${tamano}` : ''}
                    {fallo && <Text className="text-peligro"> · No disponible, vuelve a pedirlo</Text>}
                </Text>
            </View>
            <Pressable
                onPress={descargar}
                disabled={descargando}
                accessibilityRole="button"
                accessibilityLabel={`Descargar ${documento.nombre}`}
                accessibilityState={{ busy: descargando }}
                className="flex-row items-center gap-1.5 rounded-full bg-primario px-3 py-1.5 active:bg-primario-presionado"
            >
                {descargando ? (
                    <ActivityIndicator size={14} color={colores['sobre-primario']} />
                ) : (
                    <Download size={14} color={colores['sobre-primario']} />
                )}
                <Text className="text-[13px] font-semibold text-sobre-primario">Descargar</Text>
            </Pressable>
        </View>
    );
}
