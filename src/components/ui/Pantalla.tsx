import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Contenedor de pantalla: fondo del tema y márgenes de la barra de estado y de navegación.
// Con margenInferior={false} el margen de abajo lo pone la propia pantalla (p. ej. el chat, en su caja de texto),
// y con margenSuperior={false} el de arriba (p. ej. el chat, en su cabecera, para que se pinte del color de esta).
export function Pantalla({ children, className = '', margenInferior = true, margenSuperior = true }: {
    children: ReactNode;
    className?: string;
    margenInferior?: boolean;
    margenSuperior?: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View
            className={`flex-1 bg-fondo ${className}`}
            style={{ paddingTop: margenSuperior ? insets.top : 0, paddingBottom: margenInferior ? insets.bottom : 0 }}
        >
            {children}
        </View>
    );
}
