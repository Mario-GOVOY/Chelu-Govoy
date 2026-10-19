import { Children, cloneElement, isValidElement, memo, useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, View, type StyleProp, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Renderer, useMarkdown, type useMarkdownHookOptions } from 'react-native-marked';

import type { Paleta } from '@/theme/palette';
import { useColores, useEsquema } from '@/theme/ThemeProvider';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const ANCHO_MIN_COLUMNA = 140;
const TEXTO_CELDA: TextStyle = { fontSize: 14, lineHeight: 20 };

// Las celdas llegan ya pintadas con el estilo del texto normal; aquí se les añade el suyo.
function conEstilo(nodo: ReactNode, estilo: TextStyle): ReactNode {
    return Children.map(nodo, (n) =>
        isValidElement<{ style?: StyleProp<TextStyle>; children?: ReactNode }>(n)
            ? cloneElement(n, { style: [n.props.style, estilo], children: conEstilo(n.props.children, estilo) })
            : n,
    );
}

// Oscura y no del color de fondo: así se nota igual sobre la cabecera que sobre las filas.
// En oscuro más intensa, porque sobre grises oscuros apenas se ve.
function SombraBorde({ lado }: { lado: 'izquierda' | 'derecha' }) {
    const intensidad = useEsquema() === 'dark' ? 0.4 : 0.08;
    const colores = ['rgba(0,0,0,0)', `rgba(0,0,0,${intensidad})`] as const;
    return (
        <LinearGradient
            pointerEvents="none"
            colors={lado === 'derecha' ? colores : [colores[1], colores[0]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, width: 24, [lado === 'derecha' ? 'right' : 'left']: 0 }}
        />
    );
}

// Como la web: cabecera oscura y filas alternas. Las columnas se reparten el ancho
// disponible y, si no caben, la tabla se desplaza en horizontal.
function TablaMarkdown({ cabecera, filas, colores }: {
    cabecera: ReactNode[][];
    filas: ReactNode[][][];
    colores: Paleta;
}) {
    const [ancho, setAncho] = useState(0);
    const [desplazado, setDesplazado] = useState(0);
    const anchoColumna = Math.max(ANCHO_MIN_COLUMNA, ancho / cabecera.length);
    // Sombra en el lado por el que queda tabla, para que se vea que se puede desplazar.
    const sobrante = anchoColumna * cabecera.length - ancho;
    const hayIzquierda = desplazado > 1;
    const hayDerecha = desplazado < sobrante - 1;

    const celdas = (fila: ReactNode[][], estilo: TextStyle) =>
        fila.map((celda, i) => (
            <View key={i} style={{ width: anchoColumna, paddingVertical: 9, paddingHorizontal: 12 }}>
                {conEstilo(celda, estilo)}
            </View>
        ));

    return (
        // El redondeo va en el marco y no en el contenido, para que el corte de la derecha también lo tenga.
        <View
            onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
            style={{ marginVertical: 4, borderRadius: 10, overflow: 'hidden' }}
        >
            <ScrollView
                horizontal
                persistentScrollbar
                scrollEventThrottle={16}
                onScroll={(e) => setDesplazado(e.nativeEvent.contentOffset.x)}
            >
                {/* El contenedor de un ScrollView horizontal va en fila; aquí se apilan las filas. */}
                <View>
                    <View style={{ flexDirection: 'row', backgroundColor: colores['cabecera-tabla'] }}>
                        {celdas(cabecera, { ...TEXTO_CELDA, color: colores['sobre-cabecera-tabla'], fontWeight: '600' })}
                    </View>
                    {filas.map((fila, i) => (
                        <View
                            key={i}
                            style={{
                                flexDirection: 'row',
                                borderTopWidth: 1,
                                borderTopColor: colores.borde,
                                backgroundColor: i % 2 ? colores['superficie-alt'] : colores.superficie,
                            }}
                        >
                            {celdas(fila, TEXTO_CELDA)}
                        </View>
                    ))}
                </View>
            </ScrollView>
            {hayIzquierda && <SombraBorde lado="izquierda" />}
            {hayDerecha && <SombraBorde lado="derecha" />}
        </View>
    );
}

// La tabla de react-native-marked da el mismo estilo a la cabecera que al resto de filas.
class RendererChelu extends Renderer {
    private colores: Paleta;

    constructor(colores: Paleta) {
        super();
        this.colores = colores;
    }

    table(cabecera: ReactNode[][], filas: ReactNode[][][]): ReactNode {
        return <TablaMarkdown key={this.getKey()} cabecera={cabecera} filas={filas} colores={this.colores} />;
    }
}

const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s/;

// Parte el texto por las líneas en blanco. No corta dentro de un bloque de código, antes de una línea
// sangrada (sigue el elemento de lista anterior) ni entre elementos de una misma lista.
function splitIntoBlocks(texto: string): string[] {
    const blocks: string[] = [];
    let current: string[] = [];
    let insideCode = false;
    let afterBlankLine = false;
    for (const line of texto.split('\n')) {
        if (!insideCode && line.trim() === '') {
            afterBlankLine = current.length > 0;
            continue;
        }
        if (afterBlankLine) {
            const continuesBlock = /^\s/.test(line) || (LIST_ITEM.test(line) && LIST_ITEM.test(current[0]));
            if (continuesBlock) {
                current.push('');
            } else {
                blocks.push(current.join('\n'));
                current = [];
            }
            afterBlankLine = false;
        }
        if (line.trimStart().startsWith('```')) insideCode = !insideCode;
        current.push(line);
    }
    if (current.length) blocks.push(current.join('\n'));
    return blocks;
}

// Cierra la negrita y el código en línea que aún no se han cerrado (**ejemp → **ejemp**) y quita los
// asteriscos o comillas sueltos del final. Los bloques de código se dejan como están.
function closeOpenMarkers(block: string): string {
    if (block.includes('```')) return block;
    const text = block.replace(/[*`]+$/, '');
    const code = (text.match(/`/g) ?? []).length % 2 ? '`' : '';
    const bold = (text.match(/\*\*/g) ?? []).length % 2 ? '**' : '';
    return text + code + bold;
}

// Mientras Chelu escribe solo cambia el último bloque: los anteriores no se vuelven a analizar.
const MarkdownBlock = memo(function MarkdownBlock({ texto, opciones }: { texto: string; opciones: useMarkdownHookOptions }) {
    return <>{useMarkdown(texto, opciones)}</>;
});

// writing: el texto se está escribiendo; en el último bloque se cierra lo que quedó abierto.
export function TextoMarkdown({ texto, writing = false }: { texto: string; writing?: boolean }) {
    const colores = useColores();
    const esquema = useEsquema();

    const opciones = useMemo<useMarkdownHookOptions>(() => ({
        colorScheme: esquema,
        renderer: new RendererChelu(colores),
        theme: {
            colors: {
                text: colores.texto,
                link: colores.primario,
                code: colores['superficie-alt'],
                border: colores.borde,
            },
        },
        styles: {
            paragraph: { paddingVertical: 6 },
            // Va al elemento y a su viñeta, así que siguen alineados.
            li: { paddingVertical: 4 },
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
        },
    }), [colores, esquema]);

    const blocks = useMemo(() => {
        const split = splitIntoBlocks(texto);
        return split.map((block, i) => (writing && i === split.length - 1 ? closeOpenMarkers(block) : block));
    }, [texto, writing]);

    return (
        <View>
            {blocks.map((block, i) => <MarkdownBlock key={i} texto={block} opciones={opciones} />)}
        </View>
    );
}
