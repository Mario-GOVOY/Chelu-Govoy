// Paleta de la app, con nombres según su uso. Es la única fuente de colores:
// los componentes usan las clases de Tailwind (bg-fondo, text-texto...) y, donde
// no se pueden usar clases (navegación, iconos, gráficas...), useColores().
//
// Si se añade o quita un color, hay que hacerlo también en tailwind.config.js.
// La paleta clara sale del Chat Chelu web; la oscura es propia de la app.

export type Esquema = 'light' | 'dark';

const claro = {
    fondo: '#f4f6f9',
    superficie: '#ffffff',
    'superficie-alt': '#f7f9fb',
    borde: '#e6eaef',
    'borde-fuerte': '#d1d5db',
    texto: '#1c242b',
    'texto-secundario': '#6b7280',
    'texto-tenue': '#9ca3af',
    primario: '#128bec',
    'primario-presionado': '#0c6fbe',
    'primario-suave': '#e7f3fd',
    'sobre-primario': '#ffffff',
    peligro: '#c0392b',
    'peligro-suave': '#fdecec',
    exito: '#059669',
    'exito-suave': '#d1fae5',
    aviso: '#d97706',
    'aviso-suave': '#fffbeb',
    'cabecera-tabla': '#0e1b2a',
    'sobre-cabecera-tabla': '#ffffff',
};

export type NombreColor = keyof typeof claro;
export type Paleta = Record<NombreColor, string>;

const oscuro: Paleta = {
    fondo: '#0b1520',
    superficie: '#121f2c',
    'superficie-alt': '#182736',
    borde: '#223345',
    'borde-fuerte': '#3a4d62',
    texto: '#e6edf3',
    'texto-secundario': '#a3b3c2',
    'texto-tenue': '#6f8294',
    primario: '#1a8fe3',
    'primario-presionado': '#1477c8',
    'primario-suave': '#102a42',
    'sobre-primario': '#ffffff',
    peligro: '#f2726a',
    'peligro-suave': '#3b1d1f',
    exito: '#34d399',
    'exito-suave': '#0f2e25',
    aviso: '#fbbf24',
    'aviso-suave': '#33270d',
    'cabecera-tabla': '#1d3044',
    'sobre-cabecera-tabla': '#ffffff',
};

export const paletas: Record<Esquema, Paleta> = { light: claro, dark: oscuro };

// '#128bec' -> '18 139 236', el formato que espera rgb(var(--color-x) / <alpha-value>)
export function hexACanales(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
