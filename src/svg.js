// Draw the knot grid as an SVG with a soft light sweeping across the pile.

import { DYES, hash } from './design.js';

const SCALE = 4 / 3; // pixels per knot; 288 knots stay 384px wide
const FRINGE = 15; // knots of warp fringe at each end
const KILIM = 3; // flat-woven band the warps leave through
const CYCLE = 7; // seconds between shimmers
const PAD = 4; // room for the drop shadow

export function tone(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f));
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function render({ W, H, grid, roles }, d, login) {
  const hexes = roles.map((r) => DYES[r]);
  // One stroked path per dye. A run of equal knots in a row is a 1-knot-thick segment.
  const paths = new Map();
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const k = grid[y * W + x];
      let e = x + 1;
      while (e < W && grid[y * W + e] === k) e++;
      const color = hexes[k];
      const p = paths.get(color) || { d: '', y: -1, x: 0 };
      p.d += p.y === y ? `m${x - p.x} 0h${e - x}` : `M${x} ${y + 0.5}h${e - x}`;
      p.y = y; p.x = e;
      paths.set(color, p);
      x = e;
    }
  }

  const ivory = DYES.ivory;
  const fringe = [];
  const bundle = 6;
  for (let x = 0; x < W; x++) {
    const j = (hash(`${login}:${x}`) % 100) / 100;
    const mid = Math.floor(x / bundle) * bundle + (bundle - 1) / 2;
    const lean = ((mid - x) * 0.22).toFixed(2); // free end pulls in toward the bundle
    const up = (FRINGE - KILIM - 1.2 + j * 1.6).toFixed(1);
    const dn = (FRINGE - KILIM - 1.2 + (1 - j) * 1.6).toFixed(1);
    fringe.push(`M${x + 0.5} ${-KILIM}l${lean} -${up}`, `M${x + 0.5} ${H + KILIM}l${lean} ${dn}`);
  }

  const edge = tone(DYES[d.elder ? d.harmony.guardIn : d.harmony.guardOut], 0.55);
  const css = `
.shine{animation:shine ${CYCLE}s ease-in-out infinite}
@keyframes shine{0%{transform:translateX(-${W * 1.5}px)}40%,100%{transform:translateX(${W * 1.5}px)}}
@media (prefers-reduced-motion:reduce){.shine{animation:none}}`;

  const vbW = W + PAD * 2, vbH = H + 2 * FRINGE + PAD;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-FRINGE - 1} ${vbW} ${vbH}" width="${vbW * SCALE}" height="${vbH * SCALE}" role="img" aria-label="A Persian carpet woven from ${escape(login)}'s GitHub activity">
<title>${escape(login)}'s carpet</title>
<style>${css}</style>
<defs>
<filter id="shadow" x="-8%" y="-6%" width="116%" height="114%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#2a1a12" flood-opacity=".4"/></filter>
<linearGradient id="pile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
<pattern id="knots" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="url(#pile)"/><path d="M.18 .82L.5 .28L.82 .82" fill="none" stroke="#000" stroke-width=".07" opacity=".22"/></pattern>
<pattern id="overcast" width="1.1" height="1.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.1" height="1.1" fill="${edge}"/><rect width=".42" height="1.1" fill="#000" opacity=".28"/></pattern>
<pattern id="kilim" width="2" height="1" patternUnits="userSpaceOnUse"><rect width="2" height="1" fill="${ivory}"/><rect width=".65" height="1" fill="${DYES.walnut}" opacity=".4"/></pattern>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="insetV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".045" stop-color="#000" stop-opacity="0"/><stop offset=".955" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
<linearGradient id="insetH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".03" stop-color="#000" stop-opacity="0"/><stop offset=".97" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<clipPath id="rug"><rect width="${W}" height="${H}"/></clipPath>
</defs>
<g filter="url(#shadow)">
<rect x="0" y="${-KILIM}" width="${W}" height="${KILIM}" fill="url(#kilim)"/>
<rect x="0" y="${H}" width="${W}" height="${KILIM}" fill="url(#kilim)"/>
<path d="${fringe.join('')}" stroke="${ivory}" stroke-width=".42" opacity=".9"/>
<g fill="none" stroke-width="1" shape-rendering="crispEdges">
${[...paths].map(([color, p]) => `<path stroke="${color}" d="${p.d}"/>`).join('\n')}
</g>
<g clip-path="url(#rug)">${abrash(d.level, W, H, login)}</g>
<rect width="${W}" height="${H}" fill="url(#knots)"/>
<rect width="1" height="${H}" fill="url(#overcast)"/>
<rect x="${W - 1}" width="1" height="${H}" fill="url(#overcast)"/>
<rect width="${W}" height="${H}" fill="url(#insetV)"/>
<rect width="${W}" height="${H}" fill="url(#insetH)"/>
<g clip-path="url(#rug)"><rect class="shine" x="${-W * 0.25}" y="${-H * 0.1}" width="${W * 0.5}" height="${H * 1.2}" fill="url(#sheen)" transform="translate(-${W * 1.5})" style="mix-blend-mode:soft-light"/></g>
</g>
</svg>
`;
}

// One translucent band per week. White is a lighter dye batch, black a richer one.
// Shared wavy edges, phase from the login, so the same account always weaves the same bands.
function abrash(level, W, H, login) {
  const n = level.length;
  if (!n) return '';
  const mean = level.reduce((s, v) => s + v, 0) / n;
  const phase = (hash(login) % 360) * Math.PI / 180;
  const step = 8;
  const xs = [];
  for (let x = 0; x <= W; x += step) xs.push(x);
  if (xs[xs.length - 1] !== W) xs.push(W);
  const yAt = (b, x) => {
    if (b <= 0) return 0;
    if (b >= n) return H;
    return (b / n) * H + Math.sin((x / W) * Math.PI * 4 + phase + b) * 1.4;
  };
  const bands = [];
  for (let i = 0; i < n; i++) {
    const delta = level[i] - mean; // positive = busier week = darker dye
    const opacity = Math.min(0.12, Math.abs(delta) * 0.35);
    if (opacity < 0.02) continue;
    const top = n - i - 1, bot = n - i; // week 0 sits at the bottom
    let path = `M0 ${yAt(top, 0).toFixed(1)}`;
    for (let k = 1; k < xs.length; k++) path += `L${xs[k]} ${yAt(top, xs[k]).toFixed(1)}`;
    for (let k = xs.length - 1; k >= 0; k--) path += `L${xs[k]} ${yAt(bot, xs[k]).toFixed(1)}`;
    bands.push(`<path d="${path}Z" fill="${delta > 0 ? '#000' : '#fff'}" opacity="${opacity.toFixed(2)}"/>`);
  }
  return bands.join('\n');
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
