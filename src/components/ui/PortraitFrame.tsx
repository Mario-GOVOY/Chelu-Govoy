import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

type Size = { width: number; height: number };

/**
 * Da a su contenido el tamaño fijo de su hueco medido en vertical, y no lo cambia mientras el hueco está en horizontal
 * (con la gráfica ampliada abierta encima, o un momento al volver de ella). Si no, Android vuelve a maquetar la lista
 * del chat a lo ancho, los mensajes cambian de alto, el scroll se recorta y al volver la conversación aparece en otro sitio.
 * El tamaño tiene que estar puesto antes del giro: con la ampliada abierta el chat está congelado (freezeOnBlur) y no se
 * vuelve a pintar, pero Android sí lo maqueta.
 */
export function PortraitFrame({ children }: { children: ReactNode }) {
    const [portraitSize, setPortraitSize] = useState<Size | null>(null);

    return (
        <View
            className="flex-1"
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width < height) setPortraitSize({ width, height });
            }}
        >
            <View style={portraitSize ?? { flex: 1 }}>{children}</View>
        </View>
    );
}
