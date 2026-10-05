import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { useMarkdown, type useMarkdownHookOptions } from 'react-native-marked';

import { useColores, useEsquema } from '@/theme/ThemeProvider';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function TextoMarkdown({ texto }: { texto: string }) {
    const colores = useColores();
    const esquema = useEsquema();

    const opciones = useMemo<useMarkdownHookOptions>(() => ({
        colorScheme: esquema,
        theme: {
            colors: {
                text: colores.texto,
                link: colores.primario,
                code: colores['superficie-alt'],
                border: colores.borde,
            },
        },
        styles: {
            paragraph: { paddingVertical: 4 },
            strong: { fontWeight: '700' },
            link: { fontStyle: 'normal', textDecorationLine: 'underline' },
            h1: { fontSize: 22, lineHeight: 30, borderBottomWidth: 0, paddingBottom: 0, marginVertical: 8 },
            h2: { fontSize: 20, lineHeight: 28, fontWeight: '700', borderBottomWidth: 0, paddingBottom: 0, marginVertical: 8 },
            h3: { fontSize: 18, lineHeight: 26, fontWeight: '700', marginVertical: 6 },
            h4: { fontSize: 16, lineHeight: 24, fontWeight: '700', marginVertical: 4 },
            codespan: { fontFamily: MONO, fontStyle: 'normal', fontWeight: '400', fontSize: 14 },
            code: { borderRadius: 12, padding: 12, marginVertical: 4 },
            codeText: { fontFamily: MONO, fontSize: 13, lineHeight: 20 },
            blockquote: { borderLeftColor: colores['borde-fuerte'], borderLeftWidth: 3, paddingLeft: 12, opacity: 1 },
            table: { borderColor: colores.borde, borderRadius: 8, marginVertical: 4 },
            tableCell: { padding: 8 },
        },
    }), [colores, esquema]);

    return <View>{useMarkdown(texto, opciones)}</View>;
}
