import { Image } from 'react-native';

// Ocupa todo su contenedor sin deformarse. En Android se decodifica al tamaño en pantalla, no al de la imagen.
export function CheluAvatar() {
    return (
        <Image
            source={require('../../assets/chelu.png')}
            resizeMode="contain"
            resizeMethod="resize"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
