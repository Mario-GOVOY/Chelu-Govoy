import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';

export type Opcion<T extends string> = { value: T; label: string };

const ALTO_MAX = 240;
const SEPARACION = 4;
const MARGEN = 16;

/**
 * Campo tipo select: al tocarlo, la lista flota junto a él, debajo o encima según quepa.
 * La lista va en un Modal transparente: así queda por encima de todo y su scroll no se mete
 * dentro de otro (en una hoja con scroll, Android dejaba el de la lista pillado).
 * @param opcionVacia texto de una primera opción que deja el valor a null (para campos opcionales).
 */
export function Selector<T extends string>({ opciones, valor, onCambiar, placeholder = 'Selecciona…', opcionVacia, etiqueta }: {
    opciones: Opcion<T>[];
    valor: T | null;
    onCambiar: (valor: T | null) => void;
    placeholder?: string;
    opcionVacia?: string;
    // Para lectores de pantalla
    etiqueta?: string;
}) {
    const colores = useColores();
    const { height: altoVentana } = useWindowDimensions();
    const campo = useRef<View>(null);
    // Posición del campo en la ventana, medida al abrir; null con la lista cerrada.
    const [posicion, setPosicion] = useState<{ x: number; y: number; ancho: number; alto: number } | null>(null);
    const elegida = opciones.find((o) => o.value === valor);
    const lista: Opcion<T | ''>[] = opcionVacia ? [{ value: '', label: opcionVacia }, ...opciones] : opciones;

    const abrir = () =>
        campo.current?.measureInWindow((x, y, ancho, alto) => setPosicion({ x, y, ancho, alto }));
    const cerrar = () => setPosicion(null);
    const elegir = (v: T | '') => {
        onCambiar(v === '' ? null : v);
        cerrar();
    };

    // Debajo del campo si cabe; si no, encima si allí hay más sitio.
    let colocacion = null;
    if (posicion) {
        const sitioAbajo = altoVentana - (posicion.y + posicion.alto) - SEPARACION - MARGEN;
        const sitioArriba = posicion.y - SEPARACION - MARGEN;
        const arriba = sitioAbajo < ALTO_MAX && sitioArriba > sitioAbajo;
        colocacion = {
            left: posicion.x,
            width: posicion.ancho,
            maxHeight: Math.min(ALTO_MAX, arriba ? sitioArriba : sitioAbajo),
            ...(arriba
                ? { bottom: altoVentana - posicion.y + SEPARACION }
                : { top: posicion.y + posicion.alto + SEPARACION }),
        };
    }

    const Flecha = posicion ? ChevronUp : ChevronDown;

    return (
        <>
            <Pressable
                ref={campo}
                onPress={abrir}
                accessibilityRole="button"
                accessibilityLabel={`${etiqueta ? `${etiqueta}: ` : ''}${elegida?.label ?? 'sin elegir'}`}
                accessibilityState={{ expanded: !!posicion }}
                className="flex-row items-center gap-2 rounded-xl border border-borde-medio bg-superficie px-3 py-3"
            >
                <Text
                    className="flex-1 text-base"
                    style={{ color: elegida ? colores.texto : colores['texto-tenue'] }}
                    numberOfLines={1}
                >
                    {elegida?.label ?? placeholder}
                </Text>
                <Flecha size={18} color={colores['texto-tenue']} />
            </Pressable>

            <Modal visible={!!posicion} transparent animationType="fade" onRequestClose={cerrar} statusBarTranslucent navigationBarTranslucent>
                {/* Tocar fuera de la lista la cierra. */}
                <Pressable onPress={cerrar} style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar" />
                {colocacion && (
                    // Sombra con elevation en Android y shadow* en iOS.
                    <View
                        className="absolute overflow-hidden rounded-xl border border-borde-medio bg-superficie"
                        style={[
                            colocacion,
                            {
                                elevation: 8,
                                shadowColor: '#000',
                                shadowOpacity: 0.15,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 4 },
                            },
                        ]}
                    >
                        <ScrollView keyboardShouldPersistTaps="handled">
                            {lista.map((o, i) => {
                                const actual = o.value === (valor ?? '');
                                const vacia = o.value === '';
                                // Colores en style: al cambiar la clase de un Pressable ya montado, NativeWind puede no repintarlo.
                                return (
                                    <View key={o.value || 'vacia'}>
                                        {/* Separador entre opciones (no encima de la primera). */}
                                        {i > 0 && <View className="mx-3" style={{ height: 1, backgroundColor: colores.borde }} />}
                                        <Pressable
                                            onPress={() => elegir(o.value)}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected: actual }}
                                            className="flex-row items-center gap-2 px-3 py-3"
                                            style={({ pressed }) => ({
                                                backgroundColor: actual || pressed ? colores['primario-suave'] : 'transparent',
                                            })}
                                        >
                                            <Text
                                                className="flex-1 text-sm"
                                                style={{ color: actual ? colores.primario : vacia ? colores['texto-tenue'] : colores.texto }}
                                            >
                                                {o.label}
                                            </Text>
                                            {actual && <Check size={16} color={colores.primario} />}
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </>
    );
}
