import { Ref, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bold, Italic, List, Underline } from 'lucide-react-native';
import { EnrichedTextInput, type EnrichedTextInputInstance } from 'react-native-enriched-html';

import { editorHtmlToMarkdown, markdownToEditorHtml } from '@/chat/cuerpoCorreo';
import { useColores } from '@/theme/ThemeProvider';

export type EditorCuerpoCorreoHandle = {
    // Contenido actual del editor en markdown.
    getMarkdown: () => Promise<string>;
};

// Mismos nombres que el estado de formatos que manda el editor (onChangeState).
type Format = 'bold' | 'italic' | 'underline' | 'unorderedList';

const FORMATS: { format: Format; label: string; Icon: typeof Bold; toggle: (editor: EnrichedTextInputInstance) => void }[] = [
    { format: 'bold', label: 'Negrita', Icon: Bold, toggle: (editor) => editor.toggleBold() },
    { format: 'italic', label: 'Cursiva', Icon: Italic, toggle: (editor) => editor.toggleItalic() },
    { format: 'underline', label: 'Subrayado', Icon: Underline, toggle: (editor) => editor.toggleUnderline() },
    { format: 'unorderedList', label: 'Lista con viñetas', Icon: List, toggle: (editor) => editor.toggleUnorderedList() },
];

/** Cuerpo del correo con negrita, cursiva, subrayado y viñetas. Sin editable, solo muestra el texto con su formato. */
export function EditorCuerpoCorreo({ ref, initialMarkdown, editable, onChangeText }: {
    ref: Ref<EditorCuerpoCorreoHandle>;
    initialMarkdown: string;
    editable: boolean;
    // Texto sin formato, para saber si está vacío.
    onChangeText: (text: string) => void;
}) {
    const colores = useColores();
    const editorRef = useRef<EnrichedTextInputInstance>(null);
    const [initialHtml] = useState(() => markdownToEditorHtml(initialMarkdown));
    const [activeFormats, setActiveFormats] = useState<Record<Format, boolean>>({
        bold: false,
        italic: false,
        underline: false,
        unorderedList: false,
    });

    useImperativeHandle(ref, () => ({
        getMarkdown: async () => editorHtmlToMarkdown(await editorRef.current!.getHTML()),
    }), []);

    return (
        <View className="overflow-hidden rounded-lg border border-borde bg-superficie">
            <EnrichedTextInput
                ref={editorRef}
                defaultValue={initialHtml}
                editable={editable}
                accessibilityLabel="Mensaje"
                placeholder="Cuerpo del correo"
                placeholderTextColor={colores['texto-tenue']}
                cursorColor={colores.primario}
                selectionColor={colores.primario}
                scrollEnabled={false}
                // Escribir "- " al principio de una línea empieza una lista con viñetas. Sin enlaces.
                textShortcuts={[{ trigger: '- ', style: 'unordered_list' }]}
                linkRegex={null}
                onChangeText={(event) => onChangeText(event.nativeEvent.value)}
                onChangeState={(event) => setActiveFormats({
                    bold: event.nativeEvent.bold.isActive,
                    italic: event.nativeEvent.italic.isActive,
                    underline: event.nativeEvent.underline.isActive,
                    unorderedList: event.nativeEvent.unorderedList.isActive,
                })}
                style={{
                    minHeight: 120,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: editable ? colores.texto : colores['texto-secundario'],
                }}
            />
            {editable && (
                <View className="flex-row gap-1 border-t border-borde bg-superficie-alt px-1.5 py-1" accessibilityRole="toolbar">
                    {FORMATS.map(({ format, label, Icon, toggle }) => (
                        <Pressable
                            key={format}
                            onPress={() => toggle(editorRef.current!)}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            accessibilityState={{ selected: activeFormats[format] }}
                            className={`h-8 w-8 items-center justify-center rounded-md ${activeFormats[format] ? 'bg-primario-suave' : 'active:bg-fondo'}`}
                        >
                            <Icon size={16} color={activeFormats[format] ? colores.primario : colores['texto-secundario']} />
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}
