import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchSectorsFleet, fetchSectorsProviders, fetchSectorsZone } from '@/chat/chatApi';
import { isProviderSelected } from '@/chat/sectorsForm';
import { SectorsZoneSection } from '@/components/SectorsZoneSection';
import { useColores } from '@/theme/ThemeProvider';
import type { FormMap, FormProvider, SectorsForm, ZoneMode } from '@/types/SectorsForm';

// Espera tras tocar un CP antes de recalcular, para no pedir la zona en cada toque.
const RECALCULATE_DELAY_MS = 400;

export type SectorsFormEditing = { form: SectorsForm; map: FormMap };

/**
 * Edición del formulario de sectores a pantalla completa. Es una capa encima del chat, así que va la última dentro de él.
 * Trabaja sobre una copia: los cambios pasan al chat solo al pulsar "Guardar".
 */
export function SectorsFormEditor({ editing, onSave, onClose }: {
    editing: SectorsFormEditing | null;
    onSave: (form: SectorsForm, editedForm: SectorsForm) => void;
    onClose: () => void;
}) {
    if (!editing) return null;

    // Animated.View no pasa por NativeWind: sus estilos van en style y las clases en el contenido.
    return (
        <Animated.View
            entering={SlideInDown.duration(380).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(300).easing(Easing.in(Easing.cubic))}
            style={StyleSheet.absoluteFill}
        >
            <EditorContent
                form={editing.form}
                map={editing.map}
                onSave={(editedForm) => onSave(editing.form, editedForm)}
                onClose={onClose}
            />
        </Animated.View>
    );
}

function EditorContent({ form, map, onSave, onClose }: {
    form: SectorsForm;
    map: FormMap;
    onSave: (editedForm: SectorsForm) => void;
    onClose: () => void;
}) {
    const colores = useColores();
    const insets = useSafeAreaInsets();
    const [borrador, setBorrador] = useState(form);
    const [loading, setLoading] = useState<'zone' | 'fleet' | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Proveedores del mapa; null hasta que se piden.
    const [providers, setProviders] = useState<FormProvider[] | null>(null);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const changed = borrador !== form;

    const cancelRecalculation = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        abortRef.current?.abort();
    };

    // Al cerrar se cancela lo pendiente.
    useEffect(() => cancelRecalculation, []);

    const close = () => {
        if (!changed) {
            onClose();
            return;
        }
        Alert.alert('Descartar cambios', 'Los cambios del formulario se perderán.', [
            { text: 'Seguir editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: onClose },
        ]);
    };

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            close();
            return true;
        });
        return () => subscription.remove();
    }, [changed, onClose]);

    // La flota depende de la zona: al cambiar los CP se piden las dos.
    const recalculateZone = async (postcodes: string[]) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setError(null);
        setLoading('zone');
        try {
            const zone = await fetchSectorsZone(map.id, postcodes, controller.signal);
            // Se mantiene el modo elegido. Los avisos del back eran del formulario tal como llegó.
            setBorrador((prev) => ({ ...prev, zona: { ...zone, modo: prev.zona.modo }, avisos: [] }));
            setLoading('fleet');
            const fleet = await fetchSectorsFleet(map.id, postcodes, controller.signal);
            // Se mezcla: el back no devuelve el tipo de flota, que es elección del usuario.
            setBorrador((prev) => ({ ...prev, flota: { ...prev.flota, ...fleet } }));
            setLoading(null);
        } catch (e) {
            // Cancelada por otra petición o al cerrar: la siguiente pone el estado.
            if (controller.signal.aborted) return;
            setError(e instanceof Error ? e.message : 'No se pudo recalcular la zona.');
            setLoading(null);
        }
    };

    // Cambia los CP elegidos y recalcula tras una espera, para no pedir la zona en cada toque.
    const changePostcodes = (postcodes: string[]) => {
        setBorrador((prev) => ({ ...prev, zona: { ...prev.zona, cps_seleccionados: postcodes } }));
        // Se cancela ya la petición en curso: su respuesta quitaría los CP tocados después.
        cancelRecalculation();
        setLoading('zone');
        timerRef.current = setTimeout(() => recalculateZone(postcodes), RECALCULATE_DELAY_MS);
    };

    const togglePostcode = (postcode: string) => {
        const selected = borrador.zona.cps_seleccionados;
        changePostcodes(selected.includes(postcode)
            ? selected.filter((item) => item !== postcode)
            : [...selected, postcode]);
    };

    // Se piden la primera vez que se acota por proveedor.
    const loadProviders = async () => {
        setError(null);
        setLoadingProviders(true);
        try {
            setProviders(await fetchSectorsProviders(map.id));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar los proveedores.');
        } finally {
            setLoadingProviders(false);
        }
    };

    const changeZoneMode = (mode: ZoneMode) => {
        if (mode === borrador.zona.modo) return;
        const hadPostcodes = borrador.zona.cps_seleccionados.length > 0;
        setBorrador((prev) => ({
            ...prev,
            zona: { ...prev.zona, modo: mode, cps_seleccionados: mode === 'mapa_entero' ? [] : prev.zona.cps_seleccionados },
        }));
        if (mode === 'mapa_entero' && hadPostcodes) {
            cancelRecalculation();
            recalculateZone([]);
        }
        if (mode === 'proveedor' && !providers) loadProviders();
    };

    // Marcar un proveedor añade sus CP a los elegidos; desmarcarlo quita todos los suyos.
    const toggleProvider = (provider: FormProvider) => {
        const selected = borrador.zona.cps_seleccionados;
        changePostcodes(isProviderSelected(provider, selected)
            ? selected.filter((cp) => !provider.cps.includes(cp))
            : [...new Set([...selected, ...provider.cps])]);
    };

    return (
        <View className="flex-1 bg-fondo">
            <View
                className="flex-row items-center gap-2 border-b border-borde bg-superficie px-2"
                style={{ paddingTop: insets.top, height: insets.top + 56 }}
            >
                <Pressable
                    onPress={close}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                    className="h-10 w-10 items-center justify-center rounded-full active:bg-fondo"
                >
                    <X size={22} color={colores.texto} />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-texto" numberOfLines={1}>Editar optimización</Text>
                    <Text className="text-xs text-texto-tenue" numberOfLines={1}>{map.nombre} · {map.deposito}</Text>
                </View>
                {/* Mientras se recalcula, lo que se ve aún no cuadra con los CP elegidos. */}
                <Pressable
                    onPress={() => onSave(borrador)}
                    disabled={!!loading}
                    accessibilityRole="button"
                    accessibilityLabel="Guardar"
                    accessibilityState={{ disabled: !!loading }}
                    className="mr-2 rounded-full bg-primario px-4 py-2 active:bg-primario-presionado"
                    style={{ opacity: loading ? 0.6 : 1 }}
                >
                    <Text className="text-sm font-semibold text-sobre-primario">Guardar</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView
                    contentContainerClassName="gap-4 px-4 pt-4"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <SectorsZoneSection
                        zone={borrador.zona}
                        fleet={borrador.flota}
                        loading={loading}
                        error={error}
                        providers={providers}
                        loadingProviders={loadingProviders}
                        onChangeMode={changeZoneMode}
                        onTogglePostcode={togglePostcode}
                        onToggleProvider={toggleProvider}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
