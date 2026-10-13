import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';

import { Boton } from '@/components/ui/Boton';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { useColores } from '@/theme/ThemeProvider';

// El back corta los nombres de conversaciones y carpetas a 120 caracteres.
const MAX_NAME_LENGTH = 120;

/** Hoja para poner nombre a algo (conversación, carpeta). Va la última dentro de su pantalla. */
export function NameSheet({ visible, title, initialName, placeholder, onSave, onClose }: {
    visible: boolean;
    title: string;
    initialName: string;
    placeholder: string;
    // Recibe el nombre sin espacios sobrantes; solo se llama si ha cambiado.
    onSave: (name: string) => void;
    onClose: () => void;
}) {
    return (
        <HojaInferior visible={visible} titulo={title} onCerrar={onClose}>
            <NameField initialName={initialName} placeholder={placeholder} onSave={onSave} />
        </HojaInferior>
    );
}

function NameField({ initialName, placeholder, onSave }: {
    initialName: string;
    placeholder: string;
    onSave: (name: string) => void;
}) {
    const colores = useColores();
    const [name, setName] = useState(initialName);
    const trimmedName = name.trim();
    const canSave = !!trimmedName && trimmedName !== initialName;

    // Guardar cierra la hoja: el teclado se quita antes, o se quedaría abierto.
    const save = () => {
        Keyboard.dismiss();
        onSave(trimmedName);
    };

    return (
        <View className="gap-3">
            <TextInput
                value={name}
                onChangeText={setName}
                maxLength={MAX_NAME_LENGTH}
                selectTextOnFocus
                placeholder={placeholder}
                placeholderTextColor={colores['texto-tenue']}
                returnKeyType="done"
                onSubmitEditing={() => canSave && save()}
                accessibilityLabel={placeholder}
                className="h-14 rounded-xl border border-borde-medio bg-superficie px-3 text-base text-texto"
            />
            <Boton texto="Guardar" onPress={save} deshabilitado={!canSave} />
        </View>
    );
}
