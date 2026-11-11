// Cross-check: the browser engines recompute the Python reference cases (/api/check: computed live by the local server,
// or exported at build time for the static site) and report the largest difference per group.
import { route, app, api, esc, rng } from './core.js';
import { opticsSummary, normal, poisson } from './tirf_optics.js';
import { erf, makeSample, stepSample, renderExpected, addNoise } from './tirf_imaging.js';
import { simulateTable } from './light_table.js';

const rel = (a, b) => (a === null || b === null) ? (a === b ? 0 : Infinity) : Math.abs(a - b) / Math.max(1, Math.abs(b));
const maxRel = pairs => pairs.reduce((m, [a, b]) => Math.max(m, rel(a, b)), 0);

route('check', async () => {
  app().innerHTML = '<p class="kicker">JavaScript vs Python</p><h1 class="glow">Cross-check</h1><p class="mute">Computing...</p>';
  const F = await api('/check');
  const rows = [];
  const r1 = rng(1); rows.push(['Mulberry32 uniforms (seed 1)', F.rand.length, maxRel(F.rand.map(v => [r1(), v]))]);
  const r42 = rng(42); rows.push(['Box–Muller normals (seed 42)', F.normals.length, maxRel(F.normals.map(v => [normal(r42), v]))]);
  const r7 = rng(7); rows.push(['Poisson samples (seed 7)', F.poisson.length, maxRel(F.poisson.map(([l, k]) => [poisson(l, r7), k]))]);
  rows.push(['erf (A&S 7.1.26)', F.erf.length, maxRel(F.erf.map(([x, v]) => [erf(x), v]))]);
  const op = [];
  for (const [wl, th, n1, n2, py] of F.optics) {
    const js = opticsSummary(wl, th, n1, n2, 1.49);
    for (const k of ['critical_angle_deg', 'refraction_angle_deg', 'penetration_depth_nm', 'effective_na', 'max_objective_angle_deg']) op.push([js[k], py[k]]);
  }
  rows.push(['Critical angle, refraction angle, penetration depth', F.optics.length, maxRel(op)]);
  const im = F.imaging, p = im.params, s = makeSample(p, rng(p.seed));
  const t = renderExpected(s, p, 'tirf'), e = renderExpected(s, p, 'epi');
  rows.push([`Expected TIRF image (${p.image_px}² px)`, t.length, maxRel(im.tirf.map((v, i) => [t[i], v]))]);
  rows.push([`Expected epi image (${p.image_px}² px)`, e.length, maxRel(im.epi.map((v, i) => [e[i], v]))]);
  const nz = addNoise(t, p, rng(11));
  rows.push(['Noisy TIRF image (seed 11)', nz.length, maxRel(im.noisy_tirf.map((v, i) => [nz[i], v]))]);
  const sr = rng(5); for (let k = 0; k < 3; k++) stepSample(s, p, sr);
  rows.push(['Fluorophore positions after 3 Brownian steps', 60, maxRel(['x', 'y', 'z'].flatMap(a => im.moved[a].map((v, i) => [s[a][i], v])))]);
  const tb = [];
  for (const c of F.table) {
    const js = simulateTable(F.table_setup, c.ax_deg, c.ay_deg);
    c.direction.forEach((v, i) => tb.push([js.direction[i], v]));
    tb.push([js.hit ? js.hit[0] : null, c.hit ? c.hit[0] : null], [js.hit ? js.hit[1] : null, c.hit ? c.hit[1] : null]);
    tb.push([js.spot ? js.spot.values.reduce((a, b) => a + b, 0) : 0, c.image_sum]);
  }
  rows.push(['Light table: beam, camera hit, spot (8 angle pairs)', F.table.length, maxRel(tb)]);
  const ok = rows.every(r => r[2] <= 1e-9);
  app().innerHTML = `<p class="kicker">JavaScript vs Python</p><h1 class="glow">Cross-check</h1>
  <p class="lead">The simulation on this site runs in JavaScript. These are the Python reference cases from
  <span class="mono">physics/</span> and the desktop <span class="mono">Laser</span>/<span class="mono">Camera</span>/<span class="mono">LightTable</span>
  classes, recomputed here with the same inputs and random seeds.</p>
  <p class="status ${ok ? 'ok' : 'err'}">${ok ? 'All groups agree to within 1e-9 (relative).' : 'Some groups differ: see below.'}</p>
  <div class="scroll"><table class="check"><tr><th>Quantity</th><th>Cases</th><th>Largest relative difference</th></tr>
  ${rows.map(([n, c, d]) => `<tr><td>${esc(n)}</td><td class="num">${c}</td><td class="num ${d <= 1e-9 ? 'ok' : 'err'}">${d === 0 ? '0 (identical)' : d.toExponential(1)}</td></tr>`).join('')}
  </table></div>
  <p class="small mute">The same comparison runs as a node test (<span class="mono">web/static/tirf_engine.test.mjs</span>) in
  <span class="mono">tests/test_web.py</span>.</p>`;
});
