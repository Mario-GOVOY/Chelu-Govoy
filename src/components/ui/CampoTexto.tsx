import { Ref, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';

type Props = TextInputProps & {
    ref?: Ref<TextInput>;
    etiqueta: string;
    icono?: LucideIcon;
    error?: boolean;
    // Campo de contraseña, con el ojo para mostrarla.
    secreto?: boolean;
};

export function CampoTexto({ ref, etiqueta, icono: Icono, error = false, secreto = false, ...props }: Props) {
    const colores = useColores();
    const [oculto, setOculto] = useState(secreto);
    const [enfocado, setEnfocado] = useState(false);

    const caja = error
        ? 'border-peligro bg-superficie'
        : enfocado
          ? 'border-primario bg-superficie'
          : 'border-transparent bg-fondo';
    const colorIcono = error ? colores.peligro : enfocado ? colores.primario : colores['texto-tenue'];

    return (
        <View className={`h-14 flex-row items-center rounded-2xl border-2 px-4 ${caja}`}>
            {Icono && <Icono size={20} color={colorIcono} />}
            <TextInput
                {...props}
                ref={ref}
                placeholder={etiqueta}
                accessibilityLabel={etiqueta}
                secureTextEntry={oculto}
                placeholderTextColor={colores['texto-tenue']}
                cursorColor={colores.primario}
                selectionColor={colores.primario}
                onFocus={(e) => {
                    setEnfocado(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setEnfocado(false);
                    props.onBlur?.(e);
                }}
                className={`h-full flex-1 text-base text-texto ${Icono ? 'ml-3' : ''}`}
            />
            {secreto && (
                <Pressable
                    onPress={() => setOculto((o) => !o)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
                    className="pl-3"
                >
                    {oculto ? (
                        <Eye size={22} color={colores['texto-tenue']} />
                    ) : (
                        <EyeOff size={22} color={colores['texto-tenue']} />
                    )}
                </Pressable>
            )}
        </View>
    );
}
