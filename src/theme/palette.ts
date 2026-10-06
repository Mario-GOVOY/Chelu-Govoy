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
    'borde-medio': '#dbdfe5',
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

// Grises casi neutros (con un punto de azul) y el azul solo en los acentos.
const oscuro: Paleta = {
    fondo: '#0e1013',
    superficie: '#171a1e',
    'superficie-alt': '#1d2126',
    borde: '#2a2f36',
    'borde-medio': '#343a42',
    'borde-fuerte': '#3e454e',
    texto: '#d4d7dc',
    'texto-secundario': '#9fa6af',
    'texto-tenue': '#757d88',
    primario: '#128bec',
    'primario-presionado': '#0c6fbe',
    'primario-suave': '#14273a',
    'sobre-primario': '#ffffff',
    peligro: '#f2726a',
    'peligro-suave': '#3b1d1f',
    exito: '#34d399',
    'exito-suave': '#0f2e25',
    aviso: '#fbbf24',
    'aviso-suave': '#33270d',
    'cabecera-tabla': '#262c34',
    'sobre-cabecera-tabla': '#e2e5e9',
};

export const paletas: Record<Esquema, Paleta> = { light: claro, dark: oscuro };

// '#128bec' -> '18 139 236', el formato que espera rgb(var(--color-x) / <alpha-value>)
export function hexACanales(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
