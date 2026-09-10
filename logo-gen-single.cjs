const fs = require('fs');
const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='512' height='512'>
  <defs>
    <filter id='paper-texture' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='4' result='noise' />
      <feColorMatrix type='matrix' values='0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.07 0' />
      <feComposite operator='in' in2='SourceGraphic' result='monoNoise'/>
      <feBlend mode='multiply' in='SourceGraphic' in2='monoNoise'/>
    </filter>
  </defs>
  <rect width='512' height='512' rx='24' fill='#F4F1EA' />
  <g filter='url(#paper-texture)'>
    <rect x='16' y='16' width='480' height='480' rx='16' fill='none' stroke='#0D1F3C' stroke-width='16' />
    <rect x='24' y='24' width='464' height='464' rx='10' fill='#F4F1EA' />
    <path d='M 24,288 L 488,288 L 488,472 C 488,476 484,480 480,480 L 32,480 C 28,480 24,476 24,472 Z' fill='#C53A31' stroke='#0D1F3C' stroke-width='8' />
    <line x1='24' y1='288' x2='488' y2='288' stroke='#0D1F3C' stroke-width='14' />
    <text x='256' y='234' font-family="'Space Grotesk', 'Impact', 'Arial Black', sans-serif" font-weight='900' font-size='142' fill='#0D1F3C' text-anchor='middle' letter-spacing='-5'>KEMS</text>
    <circle cx='446' cy='112' r='15' fill='none' stroke='#0D1F3C' stroke-width='4' />
    <text x='446' y='117' font-family='"Space Grotesk", "Arial", sans-serif' font-weight='bold' font-size='15' fill='#0D1F3C' text-anchor='middle'>R</text>
    <text x='256' y='408' font-family="'Space Grotesk', 'Impact', 'Arial Black', sans-serif" font-weight='800' font-size='74' fill='#F4F1EA' text-anchor='middle' letter-spacing='4'>COMPANY</text>
  </g>
</svg>`;

// Convert to base64 and remove any newlines
const b64 = Buffer.from(svg).toString('base64').replace(/\r?\n|\r/g, '');
const fullDataUri = 'data:image/svg+xml;base64,' + b64;
console.log('Length:', fullDataUri.length);
fs.writeFileSync('logo-b64-single.txt', fullDataUri);
