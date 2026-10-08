import { Text, View } from 'react-native';

import { OpenOnWebNote, SectorsSummaryLine } from '@/components/SectorsResultCard';
import type { ScenarioComparison } from '@/types/Chat';
import { formatDecimal, formatInteger } from '@/utils/numbers';

export function ComparisonCard({ comparison }: { comparison: ScenarioComparison }) {
    return (
        <View className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <Text className="bg-superficie-alt px-3 py-2 text-xs font-semibold uppercase text-texto-tenue">
                Comparativa de escenarios
            </Text>
            {comparison.scenarios.map((scenario, i) => (
                <View key={i} className="gap-0.5 border-t border-borde px-3 py-2">
                    <Text className="text-sm font-semibold text-texto">{scenario.name}</Text>
                    {'error' in scenario ? (
                        <Text className="text-xs text-peligro">{scenario.error}</Text>
                    ) : (
                        <>
                            <SectorsSummaryLine summary={scenario.summary} />
                            <Text className="text-xs text-texto-tenue">
                                {formatInteger(scenario.summary.totalTimeMin)} min · {formatDecimal(scenario.summary.totalDistanceKm)} km
                            </Text>
                        </>
                    )}
                </View>
            ))}
            <View className="border-t border-borde px-3 py-2">
                <OpenOnWebNote text="Puedes abrir los escenarios en SmartZone desde la web" />
            </View>
        </View>
    );
}
