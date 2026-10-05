import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Contenedor de pantalla: fondo del tema y márgenes de la barra de estado y de navegación.
export function Pantalla({ children, className = '' }: { children: ReactNode; className?: string }) {
    const insets = useSafeAreaInsets();
    return (
        <View
            className={`flex-1 bg-fondo ${className}`}
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {children}
        </View>
    );
}
