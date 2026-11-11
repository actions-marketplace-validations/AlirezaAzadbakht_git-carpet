// Knot the carpet. Every knot is decided from its distance to the carpet's center
// lines (u, v), so the rug is mirror-symmetric left/right and top/bottom by
// construction, the way a Persian weaver repeats one quarter of the cartoon.

export function weave(d) {
  const { W, H } = d;
  const roles = [];
  const index = new Map();
  const id = (role) => {
    if (!index.has(role)) { index.set(role, roles.length); roles.push(role); }
    return index.get(role);
  };
  const knot = layout(d);
  const grid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      grid[y * W + x] = id(knot(Math.abs(x + 0.5 - W / 2), Math.abs(y + 0.5 - H / 2)));
    }
  }
  return { W, H, grid, roles };
}

// Bands from the edge inward: outer guard, main border, inner guard, stripes, field.
function layout(d) {
  const { W, H } = d;
  const K = W / 192; // motif sizes grow with the grid; walnut outlines stay 1 knot
  const c = { ...d.harmony };
  if (d.gold.vine) c.vine = 'gold';
  if (d.gold.rich) Object.assign(c, { rosetteIn: 'gold', medalBand: 'gold' });
  const G0 = (d.elder ? 6 : 0) * K, G1 = 9 * K, BW = d.border.width * K, G2 = 8 * K, S = 2 * d.stripes * K;
  const F = G0 + G1 + BW + G2 + S; // field starts this far from the edge
  const fw = W / 2 - F, fh = H / 2 - F; // field half extents

  const zig = [period(W / 2, 9 * K), period(H / 2, 9 * K)];
  const dots = [period(W / 2 - (G0 + G1 + BW + G2 / 2), 6 * K), period(H / 2 - (G0 + G1 + BW + G2 / 2), 6 * K)];
  const corner = G0 + G1 + BW / 2; // corner rosette center, measured from both edges
  const hp = [period(W / 2 - corner, d.border.halfPeriod * K), period(H / 2 - corner, d.border.halfPeriod * K)];

  const med = { ...d.medallion, rx: fw * d.medallion.rx, ry: fh * d.medallion.ry };
  // Heriz corners stay small so the open field around the medallion still shows.
  const lach = c.layout === 'geometric' ? { rx: fw * 0.46, ry: fw * 0.5 } : { rx: fw * 0.62, ry: fw * 0.68 };
  const lat = { ...d.field, sx: period(fw, d.field.sx * K), sy: period(fh, d.field.sy * K) }; // herati lattice

  return (u, v) => {
    const dx = W / 2 - u, dy = H / 2 - v;
    const edge = Math.min(dx, dy);
    // Mitred corners: the diagonal decides whether a knot belongs to the top/bottom or the side border.
    const side = dy <= dx ? 0 : 1;
    const along = side ? dy : dx, cross = side ? dx : dy;

    if (edge < G0) return guardTeeth(cross, along, G0, zig[side], c);
    if (edge < G0 + G1) return guardZigzag(cross - G0, along, G1, zig[side], c, K);
    if (edge < G0 + G1 + BW) return mainBorder(cross - G0 - G1, along - corner, BW, hp[side], c, K);
    if (edge < G0 + G1 + BW + G2) return guardDots(cross - G0 - G1 - BW, along, G2, dots[side], c, K);
    if (edge < F) return c.stripes[Math.floor((edge - G0 - G1 - BW - G2) / (2 * K)) % c.stripes.length];
    if (edge < F + 1.5) return 'walnut';
    return field(u, v, fw, fh, med, lach, lat, c, K);
  };
}

// Pick a spacing near `target` that divides `length` evenly, so motifs land
// symmetrically on the center line instead of being cut by the mirror.
function period(length, target) {
  return length / Math.max(1, Math.round(length / target));
}

function guardZigzag(cross, along, w, p, c, K) {
  if (cross < 1.5 || cross >= w - 1.5) return 'walnut';
  const t = Math.abs((((along / p) % 1) + 1) % 1 - 0.5) * 2; // triangle wave 0..1
  const margin = 2.2 * K;
  const line = margin + t * (w - 2 * margin);
  const dist = Math.abs(cross - line);
  if (dist < 1) return c.guardOutMotif;
  // Reciprocal teeth: the ground on either side of the zigzag alternates.
  return c.guardOut;
}

// Reciprocal teeth: two colors interlock along a sawtooth, the elder's outermost guard.
function guardTeeth(cross, along, w, p, c) {
  if (cross < 1.5) return 'walnut';
  const t = Math.abs((((along / p) % 1) + 1) % 1 - 0.5) * 2;
  return cross - 1.5 < t * (w - 1.5) ? c.guardInMotif : c.guardIn;
}

function guardDots(cross, along, w, p, c, K) {
  if (cross < 1.5 || cross >= w - 1.5) return 'walnut';
  const a = ((along / p) % 1) * p - p / 2;
  const r = Math.hypot(a, cross - w / 2);
  if (r < 0.9 * K) return 'gold';
  return r < 2.1 * K ? c.guardInMotif : c.guardIn;
}

// Main border: rosettes on a meandering vine, palmettes in the vine's bends.
function mainBorder(cross, a, w, h, c, K) {
  if (cross < 1.5 || cross >= w - 1.5) return 'walnut';
  const mid = w / 2;
  const k = Math.round(a / h);
  const da = a - k * h, dc = cross - mid;
  const ros = rosette(da, dc, Math.min(h * 0.3, mid - 2.4 * K), c.rosette, c.rosetteIn, 'gold');
  if (ros) return ros;
  if (a < 0) return c.border; // the corner square holds only its rosette

  const amp = mid * 0.25; // room left for the palmette; scales with the border
  const wave = (t) => amp * Math.sin((Math.PI * t) / h);
  const s = wave(a);

  // Palmette at each bend, opening toward the border edge the vine swings to.
  const km = Math.floor(a / h) + 0.5;
  const sign = Math.sign(Math.sin(Math.PI * km));
  const pa = a - km * h, pq = sign * (cross - mid) - amp + 1.2;
  const pal = palmette(pa, pq, Math.min(h * 0.45, mid - amp - 0.3 * K), c);
  if (pal) return pal;

  if (Math.abs(cross - mid - s) < 1) return c.vine;

  // A leaf on the inside of each bend, lying along the vine.
  for (const off of [-0.27, 0.27]) {
    const ta = (km + off) * h;
    const slope = (amp * Math.PI / h) * Math.cos((Math.PI * ta) / h);
    const len = Math.hypot(1, slope), tx = 1 / len, ty = slope / len;
    const cx = ta, cy = mid + wave(ta) - sign * 1.9 * K * tx; // offset toward the inside of the bend
    const px = a - cx, py = cross - cy;
    const t = px * tx + py * ty, n = -px * ty + py * tx;
    const e = (t / (3.2 * K)) ** 2 + (n / (1.25 * K)) ** 2;
    if (e < 1) return e < 0.2 ? c.vine : c.bud;
  }
  return c.border;
}

// A three-lobed palmette rooted at (0,0) on the vine, opening toward +q.
// Built from circles, so the outline is an even 1 knot all the way round.
function palmette(p, q, R, c) {
  const circle = (x, y, r) => Math.hypot(p - x, q - y) - r;
  const lobes = Math.min(
    circle(0, R * 0.55, R * 0.45),
    circle(-R * 0.48, R * 0.3, R * 0.3),
    circle(R * 0.48, R * 0.3, R * 0.3),
    circle(0, R * 0.12, R * 0.34), // the cup the lobes rise from
  );
  if (lobes > 0) return null;
  if (lobes > -1.1) return 'walnut';
  const core = circle(0, R * 0.5, R * 0.2);
  if (core < 0) return core > -0.9 ? 'walnut' : 'gold';
  return circle(0, R * 0.45, R * 0.36) < 0 ? c.rosetteIn : c.bud;
}

// An eight-petal rosette: walnut outline, outer petals, offset inner petals, gold heart.
function rosette(x, y, R, petal, inner, heart) {
  const r = Math.hypot(x, y);
  if (r > R) return null;
  const th = Math.atan2(y, x);
  const edge = R * (0.7 + 0.3 * Math.abs(Math.cos(4 * th)));
  if (r > edge) return null;
  if (r > edge - 1.1) return 'walnut';
  if (r < R * 0.2) return heart;
  const innerEdge = R * (0.36 + 0.2 * Math.abs(Math.sin(4 * th)));
  if (r < innerEdge) return r > innerEdge - 0.9 ? 'walnut' : inner;
  return petal;
}

function field(u, v, fw, fh, med, lach, lat, c, K) {
  if (c.layout === 'geometric') return geomMedallion(u, v, med, c) || geomCorner(fw - u, fh - v, lach, c) || geomField(u, v, lat, K, c);
  const ground = c.layout === 'palmette' ? palmetteField(u, v, lat, c) : herati(u, v, lat, c, K);
  return medallion(u, v, med, c) || lachak(fw - u, fh - v, lach, c) || ground;
}

// Central medallion (toranj) with pendants (sar-toranj) above and below.
function medallion(u, v, { rx, ry, lobes, pendants, petals, nested }, c) {
  const ex = u / rx, ey = v / ry;
  const r = Math.hypot(ex, ey), th = Math.atan2(ey, ex); // th: 0 at the side, PI/2 at the tip
  // Scalloped edge, drawn out to points at top and bottom.
  const R = (1 - 0.05 * (1 - Math.abs(Math.cos((lobes * th) / 2)))) * (1 + 0.24 * Math.sin(th) ** 10);
  const g = slope(ex, ey, r, rx, ry);
  const q = r / R;
  if (q <= 1) {
    const depth = (R - r) / g; // knots in from the edge
    if (depth < 1.6) return 'walnut';
    if (depth < 4.6) return c.medalBand;
    if (depth < 5.8) return 'walnut';
    // Eight-pointed star (shamseh) at the heart.
    const sr = r / 0.52;
    const star = 0.6 + 0.4 * Math.abs(Math.cos(4 * th)) ** 1.6;
    if (sr < star) {
      if ((star - sr) * 0.52 / g < 1.4) return 'walnut';
      const m = Math.min(rx, ry);
      return rosette(ex * m, ey * m, 0.3 * m, c.petal, 'ivory', 'gold') || c.star;
    }
    // An inner lobed outline echoes the edge, with gold dots strung between.
    const inner = (R * 0.84 - r) / g;
    if (nested && inner < 0) return Math.cos(lobes * 2 * th) > 0.8 && inner < -1.2 && depth > 7 ? c.medalDot : c.medal;
    if (nested && inner < 1.1) return 'walnut';
    // A smaller petal ring between the star and the inner frame.
    if (nested) {
      const innerPetal = Math.cos(10 * th);
      const ir = r - 0.58;
      if (Math.abs(ir) < 0.05 && innerPetal > 0.3 + 8 * Math.abs(ir)) return c.petal;
    }
    // Ring of petals around the star, gold dots between them.
    const ring = Math.cos(16 * th);
    const rr = r - 0.72;
    if (!petals) return c.medal;
    if (Math.abs(rr) < 0.1 && ring > 0.3 + 5 * Math.abs(rr)) return Math.abs(rr) < 0.03 && ring > 0.8 ? c.medalDot : c.petal;
    if (Math.abs(rr) < 0.04 && ring < -0.85) return c.medalDot;
    return c.medal;
  }
  // Pendant: a small cartouche on the long axis, joined by a stem.
  const tip = 1.24;
  if (!pendants) return q < 1.12 ? halo(q, th, rx, c) : null;
  const pr = Math.hypot(u / (rx * 0.2), (v - ry * (tip + 0.15)) / (ry * 0.12));
  if (pr < 1) {
    if ((1 - pr) * ry * 0.12 < 1.4) return 'walnut';
    return pr < 0.45 ? c.medalBand : c.medal;
  }
  if (u < 1.2 && v > ry * 1.1 && v < ry * (tip + 0.06)) return 'walnut';
  if (q < 1.12) return halo(q, th, rx, c); // a halo of field around it, with a cloud band
  return null;
}

// Chi: a gold ribbon waving around the medallion. A sine of the angle, so the mirror still holds.
function halo(q, th, rx, c) {
  const w = 2.4 / Math.max(rx, 1); // about five knots across
  const wave = 1.06 + Math.min(0.035, 3 / Math.max(rx, 1)) * Math.sin(8 * th);
  if (Math.abs(q - wave) < w) return 'gold';
  return c.field;
}

// How fast the normalized radius r = |(u/rx, v/ry)| grows per knot, so outlines
// keep a constant thickness in knots around a stretched shape.
function slope(ex, ey, r, rx, ry) {
  return r > 1e-6 ? Math.hypot(ex / rx, ey / ry) / r : 1 / Math.max(rx, ry);
}

// Corner piece (lachak): a quarter medallion measured from the field corner.
function lachak(cu, cv, { rx, ry }, c) {
  const ex = cu / rx, ey = cv / ry;
  const r = Math.hypot(ex, ey), th = Math.atan2(ey, ex);
  const R = 1 - 0.06 * (1 - Math.abs(Math.cos(6 * th)));
  if (r > R * 1.1) return null;
  if (r > R) return c.field;
  const g = slope(ex, ey, r, rx, ry);
  const depth = (R - r) / g;
  if (depth < 1.6) return 'walnut';
  if (depth < 4.6) return c.medalBand;
  if (depth < 5.8) return 'walnut';
  // A quarter of the medallion's star in the corner, then a scalloped inner arc.
  const sr = r / 0.5;
  const star = 0.6 + 0.4 * Math.abs(Math.cos(4 * th)) ** 1.6;
  if (sr < star) {
    if ((star - sr) * 0.5 / g < 1.4) return 'walnut';
    return rosette(cu, cv, Math.min(rx, ry) * 0.24, c.petal, 'ivory', 'gold') || c.star;
  }
  const ring = Math.cos(16 * th), rr = r - 0.68;
  if (Math.abs(rr) < 0.08 && ring > 0.3 + 6 * Math.abs(rr)) return c.petal;
  if (Math.abs(rr) < 0.03 && ring < -0.85) return c.medalDot;
  return c.medal;
}

// Herati: a diamond lattice with a flower on every node and four leaves around it.
function herati(u, v, { sx, sy, leaves, lattice, florets, shah }, c, K) {
  // Nearest node of the diamond lattice {(i*sx, j*sy) : i+j even}.
  let i = Math.round(u / sx), j = Math.round(v / sy);
  if ((i + j) % 2) {
    let best = Infinity;
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      const dist = Math.abs(u / sx - a) + Math.abs(v / sy - b);
      if (dist < best) { best = dist; i = a; j = b; }
    }
  }
  const x = u - i * sx, y = v - j * sy; // knots from the node
  const nx = x / sx, ny = y / sy;
  const diamond = Math.abs(nx) + Math.abs(ny);
  if (shah && j !== 0 && (i + j) % 4 === 0) { // large palmette on alternate nodes, opening along the rug
    const pal = palmette(x, y, Math.min(sx, sy) * 0.36, { rosetteIn: c.fieldFlower, bud: c.fieldLeaf });
    if (pal) return pal;
  }
  if (lattice && diamond > 1 - 0.8 / Math.min(sx, sy)) return c.fieldLine; // lattice vines
  if (florets) { // a small floret where four diamonds meet
    const vx = Math.abs(x) - (Math.abs(nx) > Math.abs(ny) ? sx : 0), vy = Math.abs(y) - (Math.abs(nx) > Math.abs(ny) ? 0 : sy);
    const vr = Math.hypot(vx, vy);
    if (vr < 2.2 * K) return vr < K ? 'gold' : c.fieldFlower;
  }
  const ros = rosette(x, y, 4.4 * K, c.fieldFlower, c.fieldDot, c.fieldDot);
  if (ros) return ros;
  if (!leaves) return c.field;
  // Four lancet leaves, one per diamond edge, lying along the edge.
  const gx = Math.sign(nx) || 1, gy = Math.sign(ny) || 1;
  const lx = x - gx * 0.5 * sx * 0.92, ly = y - gy * 0.5 * sy * 0.92;
  const len = Math.hypot(sx, sy);
  const ex = (gx * sx) / len, ey = (-gy * sy) / len;
  const t = lx * ex + ly * ey, n = -lx * ey + ly * ex;
  const leaf = (t / (0.27 * len)) ** 2 + (n / (1.6 * K)) ** 2;
  if (leaf < 1) return leaf < 0.3 && Math.abs(n) < 0.5 ? c.fieldDot : c.fieldLeaf;
  return c.field;
}

// Isfahan: Shah Abbasi palmettes on a vine grid. Quiet rugs keep every other flower and no vine.
function palmetteField(u, v, { sx, sy, leaves, lattice }, c) {
  const i = Math.round(u / sx), j = Math.round(v / sy);
  const x = u - i * sx, y = v - j * sy;
  const open = (i + j) % 2 ? -1 : 1;
  if ((leaves || open > 0) && j !== 0) {
    const pal = palmette(x, open * y, Math.min(sx, sy) * 0.44, { rosetteIn: c.fieldFlower, bud: c.fieldLeaf });
    if (pal) return pal;
  }
  if (lattice && (Math.abs(x) < 0.85 || Math.abs(y) < 0.85)) return c.fieldLine;
  return c.field;
}

// Octagon leaning toward a diamond. Quantized so the edge steps, the way a Heriz medallion is drawn.
function geomR(ex, ey) {
  const ax = Math.abs(ex), ay = Math.abs(ey);
  const r = 0.55 * (ax + ay) + 0.45 * Math.max(ax, ay);
  return Math.round(r * 18) / 18;
}

function geomMedallion(u, v, { rx, ry, pendants }, c) {
  const ex = u / rx, ey = v / ry;
  const r = geomR(ex, ey);
  const g = slope(ex, ey, Math.hypot(ex, ey) || 1e-6, rx, ry);
  if (r <= 1) {
    const depth = (1 - r) / g;
    if (depth < 1.6) return 'walnut';
    if (depth < 4.6) return c.medalBand;
    if (depth < 5.8) return 'walnut';
    const inner = (0.72 - r) / g;
    if (inner < 0) return c.medal;
    if (inner < 1.2) return 'walnut';
    const cr = geomR(ex / 0.34, ey / 0.34);
    if (cr <= 1) {
      if ((1 - cr) * 0.34 / g < 1.3) return 'walnut';
      if (cr < 0.35) return 'gold';
      return c.star;
    }
    return c.medal;
  }
  if (!pendants) return r < 1.12 ? c.field : null;
  const pr = geomR(u / (rx * 0.16), (v - ry * 1.28) / (ry * 0.1));
  if (pr < 1) {
    if ((1 - pr) * ry * 0.1 < 1.3) return 'walnut';
    return pr < 0.4 ? c.medalBand : c.medal;
  }
  if (u < 1.2 && v > ry * 1.05 && v < ry * 1.22) return 'walnut';
  if (r < 1.12) return c.field;
  return null;
}

function geomCorner(cu, cv, { rx, ry }, c) {
  const ex = cu / rx, ey = cv / ry;
  const r = geomR(ex, ey);
  if (r > 1.08) return null;
  if (r > 1) return c.field;
  const g = slope(ex, ey, Math.hypot(ex, ey) || 1e-6, rx, ry);
  const depth = (1 - r) / g;
  if (depth < 1.6) return 'walnut';
  if (depth < 4.6) return c.medalBand;
  if (depth < 5.8) return 'walnut';
  const cr = geomR(ex / 0.4, ey / 0.4);
  if (cr <= 1) {
    if ((1 - cr) * 0.4 / g < 1.3) return 'walnut';
    return c.star;
  }
  return c.medal;
}

// Angular flowers on every field node. No lattice: a Heriz field stays open.
function geomField(u, v, { sx, sy }, K, c) {
  const i = Math.round(u / sx), j = Math.round(v / sy);
  const r = geomR((u - i * sx) / (3.2 * K), (v - j * sy) / (3.2 * K));
  if (r > 1) return c.field;
  if (r > 0.7) return 'walnut';
  if (r < 0.3) return c.fieldDot;
  return c.fieldFlower;
}
