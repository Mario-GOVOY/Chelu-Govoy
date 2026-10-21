import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Warning } from '@/components/ui/form/Warning';
import { useColores } from '@/theme/ThemeProvider';

/**
 * Tarjeta de un formulario en el chat: cabecera, avisos, el resumen (`children`) y los botones (`footer`).
 * `dimmed` atenúa los avisos y el resumen, p. ej. en un formulario de una conversación anterior.
 */
export function FormCard({ icon: Icon, title, subtitle, warnings = [], dimmed = false, footer, children }: {
    icon: LucideIcon;
    title: string;
    subtitle?: string | null;
    warnings?: string[];
    dimmed?: boolean;
    footer?: ReactNode;
    children: ReactNode;
}) {
    const colores = useColores();

    return (
        <View className="gap-2 rounded-xl border border-borde bg-superficie px-3 py-3">
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primario-suave">
                    <Icon size={20} color={colores.primario} />
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-texto">{title}</Text>
                    {!!subtitle && <Text className="text-xs text-texto-tenue">{subtitle}</Text>}
                </View>
            </View>

            {/* Opacidad en style: al cambiar la clase de una vista ya montada, NativeWind puede no repintarla. */}
            <View className="gap-2" style={{ opacity: dimmed ? 0.5 : 1 }}>
                {warnings.map((warning) => <Warning key={warning} text={warning} />)}
                <View>{children}</View>
            </View>

            {footer}
        </View>
    );
}
