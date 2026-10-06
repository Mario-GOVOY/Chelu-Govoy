import { ActivityIndicator, Text, View } from 'react-native';
import { BarChart3, Check, CloudSun, Database, Map, TrafficCone } from 'lucide-react-native';

import type { Herramienta } from '@/types/Chat';
import { useColores } from '@/theme/ThemeProvider';

// Como la web: el icono se deduce de la etiqueta.
const icono = (etiqueta: string) => {
    const e = etiqueta.toLowerCase();
    if (e.includes('gráfica')) return BarChart3;
    if (e.includes('mapa')) return Map;
    if (e.includes('tráfico')) return TrafficCone;
    if (e.includes('tiempo') || e.includes('clima')) return CloudSun;
    return Database;
};

export function TarjetasHerramientas({ herramientas }: { herramientas: Herramienta[] }) {
    const colores = useColores();

    return (
        <View className="gap-2">
            {herramientas.map((h) => {
                const Icono = icono(h.etiqueta);
                return (
                    <View
                        key={h.clave}
                        className="flex-row items-center gap-2 rounded-xl border border-borde bg-superficie px-3 py-2"
                    >
                        <View className="h-6 w-6 items-center justify-center rounded-lg bg-primario-suave">
                            <Icono size={13} color={colores.primario} />
                        </View>
                        <Text className="flex-1 text-[13px] font-semibold text-texto" numberOfLines={1}>
                            {h.etiqueta}
                        </Text>
                        {h.veces > 1 && <Text className="text-[11px] font-bold text-texto-tenue">×{h.veces}</Text>}
                        {h.enCurso > 0 ? (
                            <View className="flex-row items-center gap-1.5">
                                <ActivityIndicator size="small" color={colores.primario} />
                            </View>
                        ) : (
                            <View className="flex-row items-center gap-1.5">
                                <Check size={12} color={colores.exito} />
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}
