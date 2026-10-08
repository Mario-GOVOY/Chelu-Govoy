import { Text, View } from 'react-native';
import { Info, Layers } from 'lucide-react-native';

import { useColores } from '@/theme/ThemeProvider';
import type { SectorsResult, SectorsSummary } from '@/types/Chat';
import { formatInteger } from '@/utils/numbers';

/** "N vehículos · N celdas asignadas · N sin asignar", con lo que traiga el resumen. */
export function SectorsSummaryLine({ summary }: { summary: SectorsSummary }) {
    const { usedVehicles, assignedCells, unassignedCells } = summary;
    const parts = [];
    if (usedVehicles != null) parts.push(`${formatInteger(usedVehicles)} ${usedVehicles === 1 ? 'vehículo' : 'vehículos'}`);
    if (assignedCells != null) parts.push(`${formatInteger(assignedCells)} celdas asignadas`);
    return (
        <Text className="text-xs text-texto-tenue">
            {parts.join(' · ')}
            {!!unassignedCells && (
                <Text className="font-medium text-aviso">
                    {parts.length ? ' · ' : ''}
                    {formatInteger(unassignedCells)} sin asignar
                </Text>
            )}
        </Text>
    );
}

// En la app no se abre nada en SmartZone.
export function OpenOnWebNote({ text }: { text: string }) {
    const colores = useColores();

    return (
        <View className="flex-row items-center gap-1.5">
            <Info size={12} color={colores['texto-tenue']} />
            <Text className="shrink text-[11px] text-texto-tenue">{text}</Text>
        </View>
    );
}

export function SectorsResultCard({ result }: { result: SectorsResult }) {
    const colores = useColores();

    return (
        <View className="gap-2 rounded-xl border border-borde bg-superficie px-2 py-2">
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primario-suave">
                    <Layers size={20} color={colores.primario} />
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-texto" numberOfLines={1}>
                        {result.summary.group || 'Sectorización'}
                    </Text>
                    <SectorsSummaryLine summary={result.summary} />
                </View>
            </View>
            <OpenOnWebNote text="Puedes abrirla en SmartZone desde la web" />
        </View>
    );
}
