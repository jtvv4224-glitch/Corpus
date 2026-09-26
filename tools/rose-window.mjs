// Generates assets/img/rose-window.svg — the stained-glass rose window used in the hero.
// Run with:  node tools/rose-window.mjs
// Tweak GLASS colours or the ring radii below, then re-run to regenerate the SVG.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../assets/img/rose-window.svg', import.meta.url));

// [highlight, body, edge] for each glass colour.
const GLASS = {
  ruby:    ['#ff7a5c', '#b3261e', '#4a0a09'],
  amber:   ['#ffe29a', '#d8952e', '#5e3309'],
  emerald: ['#9adf86', '#3f7a3a', '#122d14'],
  cobalt:  ['#8fb3ff', '#244a9e', '#0a1838'],
  violet:  ['#c3a2f5', '#6a4a8c', '#231436'],
  pearl:   ['#fffdf6', '#efe6d2', '#8f8267'],
  night:   ['#3a5fae', '#142a62', '#060d22'],
};

const STONE = '#140d09';
const f = (n) => Number(n.toFixed(2));
const polar = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [f(r * Math.cos(a)), f(r * Math.sin(a))];
};

const glass = []; // { shape, fill }
const ground = []; // deep glass behind the tracery
const leading = []; // thin lead lines inside glass
const circle = (cx, cy, r, color) => glass.push({ shape: `<circle cx="${cx}" cy="${cy}" r="${r}"`, fill: color });

ground.push(`<path d="M0 -405A405 405 0 1 1 0 405A405 405 0 1 1 0 -405ZM0 -160A160 160 0 1 0 0 160A160 160 0 1 0 0 -160Z" fill-rule="evenodd" fill="url(#g-night)"/>`);

// ---- Petals: 12 lancet windows radiating from the centre ------------------
const R0 = 165; // base of petal
const RS = 300; // springing line of the pointed arch
const R1 = 398; // tip
const W0 = 28; // half-width at base
const W1 = 58; // half-width at springing
const ARC = f((W1 ** 2 + (R1 - RS) ** 2) / (2 * W1)); // radius of the pointed arch
const petal = `M${-W0} ${-R0} L${-W1} ${-RS} A${ARC} ${ARC} 0 0 1 0 ${-R1} A${ARC} ${ARC} 0 0 1 ${W1} ${-RS} L${W0} ${-R0} A${R0} ${R0} 0 0 0 ${-W0} ${-R0}Z`;
const halfWidth = (r) => W0 + ((W1 - W0) * (r - R0)) / (RS - R0);
const PETALS = ['ruby', 'emerald', 'amber'];

for (let i = 0; i < 12; i++) {
  const deg = i * 30;
  glass.push({ shape: `<path d="${petal}" transform="rotate(${deg})"`, fill: PETALS[i % 3] });
  // lead lines across the petal and a central mullion
  for (const r of [205, 240]) {
    const w = f(halfWidth(r));
    leading.push(`<path d="M${-w} ${-r}L${w} ${-r}" transform="rotate(${deg})"/>`);
  }
  leading.push(`<path d="M0 ${-R0}L0 ${-262}M0 ${-306}L0 ${-R1}M${-W1} ${-RS}L${W1} ${-RS}" transform="rotate(${deg})"/>`);
  // pearl roundel inside each petal
  circle(...polar(284, deg), 20, 'pearl');
  // spandrel roundels between petals
  circle(...polar(362, deg + 15), 18, 'amber');
  circle(...polar(228, deg + 15), 9, 'violet');
}

// ---- Outer band of roundels ----------------------------------------------
for (let i = 0; i < 24; i++) {
  circle(...polar(442, i * 15), 30, i % 2 ? 'ruby' : 'cobalt');
  circle(...polar(442, i * 15 + 7.5), 8, 'amber');
}

// ---- Inner ring ------------------------------------------------------------
for (let i = 0; i < 12; i++) {
  circle(...polar(118, i * 30 + 15), 21, i % 2 ? 'emerald' : 'ruby');
}

// ---- Centre medallion --------------------------------------------------------
circle(0, 0, 76, 'amber');

// ---- Build the SVG ---------------------------------------------------------------
const gradients = Object.entries(GLASS)
  .map(
    ([name, [hi, body, edge]]) =>
      `<radialGradient id="g-${name}" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${body}"/><stop offset="1" stop-color="${edge}"/></radialGradient>`,
  )
  .join('');

const glassPass = glass.map(({ shape, fill }) => `${shape} fill="url(#g-${fill})"/>`).join('');
const outlinePass = glass.map(({ shape }) => `${shape}/>`).join('');
const rings = [160, 405, 480].map((r) => `<circle r="${r}"/>`).join('');

// Stone cross over the centre medallion.
const cross = `<path d="M-8 -64h16v56h56v16h-56v56h-16v-56h-56v-16h56z"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="1000" height="1000">
<defs>${gradients}
<radialGradient id="sheen" r=".5"><stop offset="0" stop-color="#fff4dc" stop-opacity=".22"/><stop offset=".6" stop-color="#fff4dc" stop-opacity=".04"/><stop offset="1" stop-color="#fff4dc" stop-opacity="0"/></radialGradient>
<radialGradient id="stone" r=".5"><stop offset=".7" stop-color="#1d140e"/><stop offset="1" stop-color="${STONE}"/></radialGradient>
<filter id="mottle" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="3" seed="4" result="n"/>
<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .9 0 0 0 -.28" result="spots"/>
<feComposite in="spots" in2="SourceGraphic" operator="in" result="dark"/>
<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dark"/></feMerge>
</filter>
</defs>
<circle r="498" fill="url(#stone)"/>
<g filter="url(#mottle)">${ground.join('')}${glassPass}</g>
<g fill="none" stroke="${STONE}" stroke-width="2.5" stroke-linecap="round">${leading.join('')}</g>
<g fill="none" stroke="${STONE}" stroke-width="9" stroke-linejoin="round">${outlinePass}${rings}</g>
<g fill="none" stroke="#e9c98f" stroke-opacity=".13" stroke-width="1.4">${outlinePass}${rings}</g>
<g fill="${STONE}">${cross}</g>
<circle r="496" fill="none" stroke="#e9c98f" stroke-opacity=".18" stroke-width="2"/>
<circle r="498" fill="url(#sheen)"/>
</svg>
`;

writeFileSync(OUT, svg);
console.log(`Wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB)`);
