// Los valores de cada color están en src/theme/palette.ts (claro y oscuro).
// Aquí solo se declaran los nombres; tienen que coincidir con los de la paleta.
const nombres = [
  'fondo',
  'superficie',
  'superficie-alt',
  'borde',
  'borde-fuerte',
  'texto',
  'texto-secundario',
  'texto-tenue',
  'primario',
  'primario-presionado',
  'primario-suave',
  'sobre-primario',
  'peligro',
  'peligro-suave',
  'exito',
  'exito-suave',
  'aviso',
  'aviso-suave',
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(nombres.map((n) => [n, `rgb(var(--color-${n}) / <alpha-value>)`])),
    },
  },
  plugins: [],
};
