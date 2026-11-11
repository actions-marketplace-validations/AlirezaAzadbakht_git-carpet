// Turn a profile summary into carpet design parameters. Same profile in, same carpet out.

// Natural dyes of the Persian dyer's pot.
export const DYES = {
  madder: '#9b2226', madderDark: '#6a1517', pomegranate: '#b1343f', rose: '#cf7a6e',
  indigo: '#1c2b4d', indigoLight: '#46638f', sky: '#7d9cbf',
  ivory: '#efe3c6', camel: '#c19a68', gold: '#d6a44a', saffron: '#e6b94f',
  green: '#4f6c3a', pistachio: '#8fa45e', turquoise: '#3c8c86',
  walnut: '#2a1a12',
};

// Each harmony names the dye for every role a knot can play. Modeled on classic city rugs.
const HARMONIES = [
  { name: 'Kashan', layout: 'herati', field: 'madder', fieldLine: 'madderDark', fieldFlower: 'ivory', fieldLeaf: 'indigoLight', fieldDot: 'gold',
    medal: 'indigo', medalBand: 'ivory', star: 'madder', petal: 'rose', medalDot: 'gold',
    border: 'indigo', vine: 'gold', rosette: 'madder', rosetteIn: 'ivory', bud: 'pistachio',
    guardOut: 'madder', guardOutMotif: 'ivory', guardIn: 'ivory', guardInMotif: 'madder', stripes: ['gold', 'indigoLight', 'rose'] },
  { name: 'Tabriz', layout: 'herati', field: 'ivory', fieldLine: 'camel', fieldFlower: 'madder', fieldLeaf: 'green', fieldDot: 'indigoLight',
    medal: 'madder', medalBand: 'indigo', star: 'ivory', petal: 'gold', medalDot: 'indigo',
    border: 'madder', vine: 'ivory', rosette: 'indigo', rosetteIn: 'gold', bud: 'green',
    guardOut: 'indigo', guardOutMotif: 'gold', guardIn: 'indigo', guardInMotif: 'ivory', stripes: ['gold', 'madderDark', 'sky'] },
  { name: 'Isfahan', layout: 'palmette', field: 'indigo', fieldLine: 'indigoLight', fieldFlower: 'ivory', fieldLeaf: 'pistachio', fieldDot: 'gold',
    medal: 'ivory', medalBand: 'madder', star: 'indigo', petal: 'rose', medalDot: 'madder',
    border: 'madder', vine: 'gold', rosette: 'ivory', rosetteIn: 'indigo', bud: 'pistachio',
    guardOut: 'ivory', guardOutMotif: 'madder', guardIn: 'gold', guardInMotif: 'indigo', stripes: ['madder', 'ivory', 'turquoise'] },
  { name: 'Nain', layout: 'herati', fine: true, field: 'ivory', fieldLine: 'sky', fieldFlower: 'indigo', fieldLeaf: 'indigoLight', fieldDot: 'turquoise',
    medal: 'indigo', medalBand: 'sky', star: 'ivory', petal: 'turquoise', medalDot: 'gold',
    border: 'indigo', vine: 'ivory', rosette: 'ivory', rosetteIn: 'turquoise', bud: 'sky',
    guardOut: 'ivory', guardOutMotif: 'indigo', guardIn: 'sky', guardInMotif: 'ivory', stripes: ['indigoLight', 'gold', 'turquoise'] },
  { name: 'Heriz', layout: 'geometric', field: 'pomegranate', fieldLine: 'madderDark', fieldFlower: 'ivory', fieldLeaf: 'indigo', fieldDot: 'saffron',
    medal: 'ivory', medalBand: 'indigo', star: 'pomegranate', petal: 'indigoLight', medalDot: 'saffron',
    border: 'indigo', vine: 'saffron', rosette: 'pomegranate', rosetteIn: 'ivory', bud: 'turquoise',
    guardOut: 'ivory', guardOutMotif: 'pomegranate', guardIn: 'saffron', guardInMotif: 'indigo', stripes: ['ivory', 'turquoise', 'saffron'] },
];

export function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function design(profile, now = new Date()) {
  const W = 288;
  const H = 432;
  const harmony = HARMONIES[hash(`${profile.languages[0] || ''}/${profile.login}`) % HARMONIES.length];
  const fine = harmony.fine; // Nain: tighter knots, a narrower border

  const years = (now - new Date(profile.createdAt)) / (365.25 * 864e5);
  // Richness: 0 for ten contributions a year or fewer, 1 from about five thousand.
  const rich = clamp01((Math.log10(profile.total + 1) - 1) / 2.7);
  const streak = profile.longestStreak;

  // Abrash: one level per week, smoothed so bands read as dye batches, not stripes.
  // Drawn bottom-up, quiet weeks lighter and busy weeks richer.
  const weeks = profile.weeks;
  const max = Math.max(1, ...weeks);
  const level = weeks.map((w, i) => {
    const a = weeks[Math.max(0, i - 1)], b = weeks[Math.min(weeks.length - 1, i + 1)];
    return Math.sqrt((a + 2 * w + b) / 4 / max);
  });

  return {
    W, H, harmony,
    elder: years >= 8, // a second, outermost guard border
    stripes: 1 + Math.min(2, Math.floor(years / 4)), // older account, more stripes
    border: { width: fine ? 18 : 24, halfPeriod: (fine ? 24 : 30) - 6 * clamp01(streak / 60) },
    // Gold thread: a month-long streak gilds the border vine; three months gild the rosettes and medallion band.
    gold: { vine: streak >= 30, rich: streak >= 90 },
    medallion: {
      rx: 0.5 + 0.14 * rich, ry: 0.3 + 0.16 * rich,
      lobes: profile.total < 100 ? 12 : profile.total < 1000 ? 16 : 20,
      pendants: rich >= 0.15, petals: rich >= 0.3, nested: rich >= 0.6,
    },
    // The field fills in as activity grows: flowers, then leaves, then the lattice, then florets on every crossing.
    field: {
      sx: (fine ? 12 : 16) - (fine ? 2 : 4) * rich,
      sy: (fine ? 14 : 19) - (fine ? 2 : 4) * rich,
      leaves: rich >= 0.25, lattice: rich >= 0.55, florets: rich >= 0.8,
      shah: rich >= 0.4, // Shah Abbasi palmettes on alternate herati nodes
    },
    level,
  };
}
