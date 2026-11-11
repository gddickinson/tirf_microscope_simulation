// Evanescent field: angle, wavelength and refractive indices -> critical angle, penetration depth and I(z).
// Everything is computed in the browser by tirf_optics.js (port of physics/tirf_optics.py).
import { route, app, slider, esc } from './core.js';
import { opticsSummary, penetrationDepthNm, evanescentIntensity } from './tirf_optics.js';
import { loadPresets, layout, seg, select, readout, setSlider, fmt } from './ui.js';
import { drawInterface, drawProfile, drawDepthCurve } from './field_draw.js';

route('field', async (args, query) => {
  const pr = await loadPresets(), D = pr.defaults;
  const s = { wavelength_nm: +query.wl || D.wavelength_nm, angle_deg: +query.angle || D.angle_deg, n1: D.n1, n2: D.n2, na: D.na };
  app().innerHTML = `<p class="kicker">Total internal reflection</p><h1 class="glow">Evanescent field</h1>
  <p class="lead">A laser beam in the glass meets the glass/sample interface at angle θ from the normal. Above the critical
  angle θc it is totally reflected and only an evanescent field reaches into the sample, decaying as
  <span class="mono">I(z) = I0·exp(−z/d)</span>. Change the angle, wavelength and media and watch d change.</p>`;
  const { controls, view } = layout(app());
  view.innerHTML = `<figure class="fig"><canvas id="iface" width="760" height="440" role="img" aria-label="Interface diagram: incident and reflected beams in the glass, evanescent field above"></canvas></figure>
    <div class="plots"><canvas id="prof" width="420" height="280" role="img" aria-label="Plot of relative intensity against height z in nm"></canvas>
    <canvas id="dcurve" width="420" height="280" role="img" aria-label="Plot of penetration depth in nm against angle of incidence"></canvas></div>
    <p class="small mute">Formulas from the README (Snell's law, θc = arcsin(n2/n1), d = λ / (4π·√(n1²sin²θ − n2²))). d is the
    depth at which the <i>intensity</i> falls to 1/e; I0 is the intensity at the interface (z = 0), shown as 1.</p>`;

  slider(controls, { id: 'ang', label: 'Angle of incidence θ', min: 0, max: 89.5, step: 0.1, value: s.angle_deg, unit: '°', fmt: v => v.toFixed(1) },
    v => { s.angle_deg = v; draw(); });
  const lines = pr.laser_lines_nm.map(l => [l, `${l} nm`]);
  const wlSeg = seg(controls, 'Laser line', lines, s.wavelength_nm, v => { s.wavelength_nm = +v; setSlider(wl, s.wavelength_nm, v => v.toFixed(0), ' nm'); draw(); });
  const wl = slider(controls, { id: 'wl', label: 'Wavelength λ (vacuum)', min: 380, max: 700, step: 1, value: s.wavelength_nm, unit: ' nm', fmt: v => v.toFixed(0) },
    v => { s.wavelength_nm = v; wlSeg.set(v); draw(); });
  select(controls, 'n1', 'Glass side, n1', pr.media.n1.map(([name, n]) => [n, `${name} (${n})`]), s.n1, v => { s.n1 = +v; draw(); });
  select(controls, 'n2', 'Sample side, n2', pr.media.n2.map(([name, n]) => [n, `${name} (${n})`]), s.n2, v => { s.n2 = +v; draw(); });
  slider(controls, { id: 'na', label: 'Objective NA', min: 1.0, max: 1.7, step: 0.01, value: s.na, fmt: v => v.toFixed(2) }, v => { s.na = v; draw(); });
  const out = readout(controls);
  controls.insertAdjacentHTML('beforeend', `<p class="small mute">Try θ just above θc (d grows without bound) and the 405 vs 640 nm lines (d ∝ λ).</p>`);

  const c1 = document.getElementById('iface').getContext('2d'), c2 = document.getElementById('prof').getContext('2d'),
    c3 = document.getElementById('dcurve').getContext('2d');
  function draw() {
    const o = opticsSummary(s.wavelength_nm, s.angle_deg, s.n1, s.n2, s.na), d = penetrationDepthNm(s.wavelength_nm, s.angle_deg, s.n1, s.n2);
    out([
      ['critical angle θc', o.critical_angle_deg === null ? 'none (n2 ≥ n1)' : `${fmt(o.critical_angle_deg, 2)}°`],
      ['regime', o.tir ? 'TIR' : `refracted at ${fmt(o.refraction_angle_deg, 1)}°`],
      ['penetration depth d', o.tir ? `${fmt(d, 1)} nm` : '∞ (no TIR)'],
      ['I(100 nm) / I0', fmt(evanescentIntensity(100, d), 3)],
      ['10% depth (d·ln10)', o.tir ? `${fmt(d * Math.LN10, 0)} nm` : '—'],
      ['n1·sinθ (needs > n2)', fmt(o.effective_na, 3)],
      ['max θ through objective', `${fmt(o.max_objective_angle_deg, 1)}°`],
    ]);
    drawInterface(c1, s); drawProfile(c2, s); drawDepthCurve(c3, s);
    const warn = s.angle_deg > o.max_objective_angle_deg ? 'This angle is beyond what the objective NA can deliver (objective-type TIRF).' : '';
    document.getElementById('iface').setAttribute('aria-label', `Interface diagram at ${s.angle_deg.toFixed(1)} degrees: ${o.tir ? 'total internal reflection, d = ' + fmt(d) + ' nm' : 'beam refracted into the sample'}. ${esc(warn)}`);
  }
  draw();
});
