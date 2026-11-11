// node test/check.js — symmetry, determinism and size budget for every fixture.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { carpet } from '../src/index.js';

const dir = new URL('./fixtures/', import.meta.url);
const now = new Date('2026-11-07');
for (const file of readdirSync(dir)) {
  const profile = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const { svg, knots: { W, H, grid } } = carpet(profile, now);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = grid[y * W + x];
      assert.equal(k, grid[y * W + (W - 1 - x)], `${file}: left/right mirror broken at ${x},${y}`);
      assert.equal(k, grid[(H - 1 - y) * W + x], `${file}: top/bottom mirror broken at ${x},${y}`);
    }
  }
  assert.equal(svg, carpet(profile, now).svg, `${file}: same input gave a different carpet`);
  assert.ok(svg.length < 360_000, `${file}: ${svg.length} bytes is over the 360 KB budget`);
  console.log(`ok ${file} (${(svg.length / 1024).toFixed(0)} KB)`);
}
