import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOW_TOOLS_KEY = 'mostrar_herramientas';

/** "Mostrar herramientas" de Ajustes, guardado en el móvil. Activado por defecto. */
export async function loadShowTools(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(SHOW_TOOLS_KEY)) !== '0';
    } catch {
        return true;
    }
}

export function saveShowTools(show: boolean) {
    AsyncStorage.setItem(SHOW_TOOLS_KEY, show ? '1' : '0').catch(() => {});
}
