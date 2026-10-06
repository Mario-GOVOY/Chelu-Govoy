import { SvgXml } from 'react-native-svg';


const CHELU_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 26 220 257" fill="none">
  <defs>
    <linearGradient id="chCuerpo" x1="60" y1="50" x2="200" y2="260" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5cb6ff"/>
      <stop offset="0.45" stop-color="#1c84f2"/>
      <stop offset="1" stop-color="#0650c4"/>
    </linearGradient>
    <linearGradient id="chMiembro" x1="0" y1="100" x2="0" y2="280" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4aa8ff"/>
      <stop offset="1" stop-color="#0b5fd4"/>
    </linearGradient>
    <linearGradient id="chLado" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#03307a" stop-opacity="0"/>
      <stop offset="1" stop-color="#03307a" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="chPantalla" cx="0.35" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#1b2a3c"/>
      <stop offset="1" stop-color="#03070d"/>
    </radialGradient>
    <radialGradient id="chBrillo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="chLuz" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7ff6ff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#2ee6ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <path d="M146 62 Q151 46 163 40" stroke="#1c84f2" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="166" cy="38" r="6" fill="#2f93ff"/>
  <circle cx="164" cy="36" r="2" fill="#ffffff" opacity="0.85"/>

  <rect x="70" y="222" width="50" height="50" rx="22" fill="url(#chMiembro)"/>
  <rect x="140" y="222" width="54" height="50" rx="22" fill="url(#chMiembro)"/>
  <rect x="140" y="222" width="54" height="50" rx="22" fill="url(#chLado)"/>

  <path d="M84 150 Q58 148 40 130" stroke="url(#chMiembro)" stroke-width="20" stroke-linecap="round"/>
  <ellipse cx="31" cy="119" rx="14" ry="17" transform="rotate(-20 31 119)" fill="#3a9dff"/>
  <ellipse cx="44" cy="126" rx="5" ry="8" transform="rotate(50 44 126)" fill="#3a9dff"/>
  <ellipse cx="27" cy="113" rx="4" ry="7" transform="rotate(-35 27 113)" fill="#ffffff" opacity="0.35"/>
  <circle cx="27" cy="104" r="11" fill="url(#chLuz)" opacity="0.7"/>
  <ellipse cx="27" cy="105" rx="7" ry="4.5" transform="rotate(-20 27 105)" fill="#5ef0ff"/>
  <path d="M192 156 Q209 168 212 194" stroke="url(#chMiembro)" stroke-width="18" stroke-linecap="round"/>
  <circle cx="213" cy="203" r="11" fill="url(#chLuz)" opacity="0.7"/>
  <ellipse cx="213" cy="202" rx="7" ry="4.5" fill="#5ef0ff"/>
  <path d="M84 134 Q134 124 182 134 Q202 150 202 192 Q202 236 170 246 L92 246 Q58 236 58 192 Q58 150 84 134 Z" fill="url(#chCuerpo)"/>
  <path d="M84 134 Q134 124 182 134 Q202 150 202 192 Q202 236 170 246 L92 246 Q58 236 58 192 Q58 150 84 134 Z" fill="url(#chLado)"/>
  <ellipse cx="160" cy="150" rx="18" ry="7" fill="url(#chBrillo)" opacity="0.35"/>


  <g transform="translate(21 0)">
    <rect x="64" y="146" width="90" height="66" rx="14" fill="url(#chPantalla)" stroke="#0a4fb0" stroke-width="2"/>
    <text x="109" y="187" text-anchor="middle" font-family="monospace" font-size="20" font-weight="700" letter-spacing="1" fill="#8ff7ff">CHELU</text>
  </g>


  <ellipse cx="134" cy="134" rx="54" ry="7" fill="#0a4fb0"/>

  <path d="M76 118 Q70 58 132 56 Q194 58 190 118 Q188 140 132 140 Q78 140 76 118 Z" fill="url(#chCuerpo)"/>
  <path d="M76 118 Q70 58 132 56 Q194 58 190 118 Q188 140 132 140 Q78 140 76 118 Z" fill="url(#chLado)"/>
  <ellipse cx="104" cy="68" rx="24" ry="8" fill="url(#chBrillo)" opacity="0.6"/>

  <g transform="translate(10 0)">
    <rect x="87" y="77" width="66" height="48" rx="22" fill="url(#chPantalla)" stroke="#0a4fb0" stroke-width="2"/>
    <ellipse cx="106" cy="84" rx="14" ry="4" fill="#ffffff" opacity="0.12"/>
    <g stroke="#2ee6ff" stroke-linecap="round" fill="none" opacity="0.15" stroke-width="9">
      <path d="M98 99 q6 -8 12 0"/>
      <path d="M128 99 q6 -8 12 0"/>
      <path d="M111 109 q8 7 16 0"/>
    </g>
    <g stroke="#8ff7ff" stroke-linecap="round" fill="none" stroke-width="3.5">
      <path d="M98 99 q6 -8 12 0"/>
      <path d="M128 99 q6 -8 12 0"/>
      <path d="M111 109 q8 7 16 0"/>
    </g>
  </g>
</svg>`;

export function CheluAvatar({ ancho = '100%', alto = '100%' }: { ancho?: number | string; alto?: number | string }) {
    return <SvgXml xml={CHELU_SVG} width={ancho} height={alto} />;
}
