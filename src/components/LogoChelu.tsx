import { Text, View } from 'react-native';

export function LogoChelu({ subtitulo }: { subtitulo?: string }) {
    return (
        <View className="items-center">
            <Text className="text-4xl font-bold tracking-wide text-texto">
                CHE<Text className="text-primario">LU</Text>
            </Text>
            {subtitulo && <Text className="mt-1 text-sm text-texto-tenue">{subtitulo}</Text>}
        </View>
    );
}
