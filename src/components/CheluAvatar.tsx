import { SvgXml } from 'react-native-svg';


const CHELU_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" fill="none">
  <defs>
    <linearGradient id="chBody" x1="60" y1="40" x2="190" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4aa8ff"/>
      <stop offset="0.5" stop-color="#1f86f5"/>
      <stop offset="1" stop-color="#0a5ed6"/>
    </linearGradient>
    <linearGradient id="chLimb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fb4ff"/>
      <stop offset="1" stop-color="#1670e0"/>
    </linearGradient>
    <radialGradient id="chScreen" cx="0.4" cy="0.35" r="0.9">
      <stop offset="0" stop-color="#0b2740"/>
      <stop offset="1" stop-color="#04101d"/>
    </radialGradient>
    <radialGradient id="chGloss" cx="0.35" cy="0.25" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <line x1="150" y1="58" x2="170" y2="20" stroke="#2f93ff" stroke-width="6" stroke-linecap="round"/>
  <circle cx="173" cy="16" r="11" fill="#7fd1ff"/>
  <circle cx="170" cy="13" r="3.5" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="92" cy="250" rx="30" ry="20" fill="url(#chLimb)"/>
  <ellipse cx="158" cy="250" rx="30" ry="20" fill="url(#chLimb)"/>
  <ellipse cx="48" cy="168" rx="20" ry="30" transform="rotate(18 48 168)" fill="url(#chLimb)"/>
  <ellipse cx="202" cy="168" rx="20" ry="30" transform="rotate(-18 202 168)" fill="url(#chLimb)"/>
  <circle cx="44" cy="190" r="11" fill="#7fd1ff" opacity="0.85"/>
  <circle cx="206" cy="190" r="11" fill="#7fd1ff" opacity="0.85"/>
  <rect x="62" y="132" width="116" height="106" rx="40" fill="url(#chBody)"/>
  <rect x="86" y="158" width="68" height="46" rx="12" fill="url(#chScreen)" stroke="#0a5ed6" stroke-width="2"/>
  <text x="120" y="187" text-anchor="middle" font-family="monospace" font-size="17" font-weight="700" letter-spacing="1.5" fill="#6fe0ff">CHELU</text>
  <rect x="52" y="44" width="136" height="104" rx="46" fill="url(#chBody)"/>
  <rect x="74" y="62" width="92" height="70" rx="30" fill="url(#chScreen)" stroke="#0a5ed6" stroke-width="2"/>
  <path d="M92 92 q9 -12 18 0" stroke="#6fe0ff" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M130 92 q9 -12 18 0" stroke="#6fe0ff" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M104 106 q16 16 32 0" stroke="#6fe0ff" stroke-width="5" stroke-linecap="round" fill="none"/>
  <ellipse cx="96" cy="70" rx="34" ry="20" fill="url(#chGloss)" opacity="0.5"/>
</svg>`;

export function CheluAvatar({ ancho = '100%', alto = '100%' }: { ancho?: number | string; alto?: number | string }) {
    return <SvgXml xml={CHELU_SVG} width={ancho} height={alto} />;
}
