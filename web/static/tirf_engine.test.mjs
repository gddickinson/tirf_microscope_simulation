// Node test: the JS engines reproduce the Python code on the same inputs and seeds.
// Fixture: tests/fixtures/engine_fixture.json, written by `python scripts/make_engine_fixture.py` from physics/ and the
// desktop Laser/Camera/LightTable classes; tests/test_web.py checks it is current.
// Run: node web/static/tirf_engine.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rng } from './core.js';
import { DEFAULTS, opticsSummary, normal, poisson } from './tirf_optics.js';
import { erf, makeSample, stepSample, renderExpected, addNoise, signalSplit, samplePixelNm, psfSigmaNm } from './tirf_imaging.js';
import { simulateTable } from './light_table.js';

const FIX = JSON.parse(readFileSync(new URL('../../tests/fixtures/engine_fixture.json', import.meta.url)));
const close = (a, b, what, tol = 1e-9) => {
  if (b === null || typeof b === 'boolean') return assert.equal(a, b, what);
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: js ${a} vs py ${b}`);
};
let n = 0;

// 1. defaults mirrored in the engine equal physics/defaults.py
assert.deepEqual(DEFAULTS, FIX.defaults); n++;

// 2. random numbers: Mulberry32 uniforms, Box-Muller normals, Poisson samples
const r1 = rng(1); FIX.rand.forEach((v, i) => close(r1(), v, `rand[${i}]`, 0)); n++;
const r42 = rng(42); FIX.normals.forEach((v, i) => close(normal(r42), v, `normal[${i}]`, 1e-12)); n++;
const r7 = rng(7); FIX.poisson.forEach(([lam, k]) => assert.equal(poisson(lam, r7), k, `poisson(${lam})`)); n++;
FIX.erf.forEach(([x, v]) => close(erf(x), v, `erf(${x})`, 1e-14)); n++;

// 3. interface optics on a grid of wavelengths, angles and index pairs
for (const [wl, th, n1, n2, py] of FIX.optics) {
  const js = opticsSummary(wl, th, n1, n2, 1.49);
  for (const k of Object.keys(py)) close(js[k], py[k], `${k}(${wl} nm, ${th} deg, ${n1}/${n2})`);
  n++;
}

// 4. imaging: seeded sample, expected TIRF and epi images, noisy image, Brownian steps, signal split
const im = FIX.imaging, p = im.params;
close(samplePixelNm(p), im.pixel_nm, 'pixel size'); close(psfSigmaNm(p), im.psf_sigma_nm, 'psf sigma');
const s = makeSample(p, rng(p.seed));
const tirf = renderExpected(s, p, 'tirf'), epi = renderExpected(s, p, 'epi');
im.tirf.forEach((v, i) => close(tirf[i], v, `tirf[${i}]`));
im.epi.forEach((v, i) => close(epi[i], v, `epi[${i}]`));
const noisy = addNoise(tirf, p, rng(11));
const off = im.noisy_tirf.filter((v, i) => Math.abs(noisy[i] - v) > 1e-9 * Math.max(1, Math.abs(v))).length;
assert.ok(off <= noisy.length * 1e-3, `noisy image: ${off} of ${noisy.length} pixels differ`);
const sr = rng(5); for (let k = 0; k < 3; k++) stepSample(s, p, sr);
for (const ax of ['x', 'y', 'z']) im.moved[ax].forEach((v, i) => close(s[ax][i], v, `moved ${ax}[${i}]`));
for (const [mode, py] of [['tirf', im.split_tirf], ['epi', im.split_epi]]) {
  const js = signalSplit(s, p, mode); close(js.surface, py.surface, `${mode} surface`); close(js.bulk, py.bulk, `${mode} bulk`);
}
n += 6;

// 5. the desktop light table (laser angles in degrees -> camera hit pixel, spot image)
for (const c of FIX.table) {
  const js = simulateTable(FIX.table_setup, c.ax_deg, c.ay_deg);
  c.direction.forEach((v, i) => close(js.direction[i], v, `dir ${c.ax_deg},${c.ay_deg}`));
  close(js.length, c.length, 'ray length');
  if (c.hit === null) { assert.equal(js.hit, null, `no hit at ${c.ax_deg},${c.ay_deg}`); assert.equal(c.image_sum, 0); n++; continue; }
  close(js.hit[0], c.hit[0], 'hit x'); close(js.hit[1], c.hit[1], 'hit y');
  const sp = js.spot;
  close(sp.values.reduce((a, b) => a + b, 0), c.image_sum, 'spot sum');
  close(Math.max(...sp.values), c.image_max, 'spot max');
  c.patch.values.forEach((row, j) => row.forEach((v, i) => {
    const x = c.patch.x0 + i - sp.x0, y = c.patch.y0 + j - sp.y0;
    close(sp.values[y * sp.w + x], v, `patch ${c.ax_deg},${c.ay_deg} [${j},${i}]`);
  }));
  n++;
}
console.log(`tirf engine: ${n} checks ok (JS matches the Python code)`);
