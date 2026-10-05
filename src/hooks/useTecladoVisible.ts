import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// true mientras el teclado está abierto.
export function useTecladoVisible() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const mostrar = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
        const ocultar = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
        return () => {
            mostrar.remove();
            ocultar.remove();
        };
    }, []);

    return visible;
}
