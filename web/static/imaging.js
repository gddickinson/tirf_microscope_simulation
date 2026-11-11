// TIRF vs epi: one seeded sample of diffusing fluorophores imaged two ways with the same camera. Computed in the browser
// by tirf_imaging.js (port of physics/tirf_imaging.py); pixel size = camera pixel / magnification, stated below.
import { route, app, slider, animate, rng } from './core.js';
import { opticsSummary, maxObjectiveAngleDeg } from './tirf_optics.js';
import { makeSample, stepSample, renderExpected, addNoise, signalSplit, samplePixelNm, psfSigmaNm, fieldNm } from './tirf_imaging.js';
import { loadPresets, layout, seg, select, check, button, readout, fmt } from './ui.js';
import { drawCamera, contrast, drawSide } from './imaging_draw.js';

route('imaging', async (args, query) => {
  const pr = await loadPresets();
  const p = { ...pr.defaults };
  if (query.angle) p.angle_deg = +query.angle;
  const ui = { noise: true, shared: false, zTop: 1000, playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches };
  app().innerHTML = `<p class="kicker">Simulated camera images</p><h1 class="glow">TIRF vs widefield</h1>
  <p class="lead">The same sample imaged two ways: <b>TIRF</b> excites only the evanescent layer next to the glass,
  <b>epi</b> (widefield) excites every fluorophore through the depth of the cell. Fluorophores near the coverslip stand out
  in TIRF; in epi they sit on a haze from the out-of-focus volume.</p>`;
  const { controls, view } = layout(app());
  view.innerHTML = `<div class="pair">
    <figure><canvas id="camT" width="384" height="384" role="img" aria-label="Simulated TIRF camera image"></canvas><figcaption id="capT"></figcaption></figure>
    <figure><canvas id="camE" width="384" height="384" role="img" aria-label="Simulated widefield (epi) camera image"></canvas><figcaption id="capE"></figcaption></figure></div>
    <h3>Side view (x–z): what the light reaches</h3>
    <div id="zseg"></div>
    <canvas id="side" width="760" height="230" role="img" aria-label="Side view of the sample: fluorophores by height above the glass, brightness = TIRF excitation"></canvas>
    <p class="small mute">Bright dots are excited by the TIRF beam (relative excitation exp(−z/d)); the cyan band is the evanescent field.
    Larger dots are the near-surface population. Model: physics/tirf_imaging.py (see About).</p>`;
  seg(view.querySelector('#zseg'), 'Height shown', [[500, '0.5 µm'], [1000, '1 µm'], ['full', 'whole cell']], ui.zTop, v => { ui.zTop = v; draw(); });

  let s, stepR, nT, nE, last = 0;
  const reset = () => { s = makeSample(p, rng(p.seed)); stepR = rng(p.seed + 1000); nT = rng(p.seed + 2000); nE = rng(p.seed + 3000); };
  const regen = () => { reset(); frame(); };

  const play = button(controls, ui.playing ? 'Pause' : 'Play', () => { ui.playing = !ui.playing; play.textContent = ui.playing ? 'Pause' : 'Play'; });
  button(controls, 'New sample', () => { p.seed += 1; regen(); }, true);
  const amax = () => maxObjectiveAngleDeg(p.na, p.n1);
  slider(controls, { id: 'iang', label: 'Angle of incidence θ', min: 40, max: Math.floor(amax() * 10) / 10, step: 0.1, value: p.angle_deg, unit: '°', fmt: v => v.toFixed(1) },
    v => { p.angle_deg = v; frame(); });
  seg(controls, 'Excitation laser', pr.laser_lines_nm.map(l => [l, `${l} nm`]), p.wavelength_nm, v => { p.wavelength_nm = +v; frame(); });
  select(controls, 'in2', 'Sample index n2', pr.media.n2.filter(([, n]) => n > 1.2).map(([name, n]) => [n, `${name} (${n})`]), p.n2, v => { p.n2 = +v; frame(); });
  slider(controls, { id: 'nsurf', label: 'Near-surface fluorophores (0–50 nm)', min: 0, max: 400, step: 10, value: p.n_surface }, v => { p.n_surface = v; regen(); });
  slider(controls, { id: 'nbulk', label: 'Fluorophores in the volume', min: 0, max: 6000, step: 100, value: p.n_bulk }, v => { p.n_bulk = v; regen(); });
  slider(controls, { id: 'depth', label: 'Cell height', min: 1, max: 10, step: 0.5, value: p.depth_um, unit: ' µm' }, v => { p.depth_um = v; regen(); });
  slider(controls, { id: 'dif', label: 'Diffusion in the volume D', min: 0, max: 5, step: 0.1, value: p.d_bulk_um2_s, unit: ' µm²/s', fmt: v => v.toFixed(1) }, v => { p.d_bulk_um2_s = v; });
  seg(controls, 'Objective magnification', [[60, '60×'], [100, '100×'], [150, '150×']], p.magnification, v => { p.magnification = +v; regen(); });
  seg(controls, 'Camera pixel', [[6.5, '6.5 µm'], [11, '11 µm'], [16, '16 µm']], p.camera_pixel_um, v => { p.camera_pixel_um = +v; regen(); });
  check(controls, 'noise', 'Shot and read noise', ui.noise, v => { ui.noise = v; frame(); });
  check(controls, 'shared', 'Same contrast for both images', ui.shared, v => { ui.shared = v; draw(); });
  const out = readout(controls);

  const cT = document.getElementById('camT').getContext('2d'), cE = document.getElementById('camE').getContext('2d'),
    cS = document.getElementById('side').getContext('2d');
  let imT, imE;
  function frame() {
    const eT = renderExpected(s, p, 'tirf'), eE = renderExpected(s, p, 'epi');
    imT = ui.noise ? addNoise(eT, p, nT) : eT; imE = ui.noise ? addNoise(eE, p, nE) : eE;
    draw();
  }
  function draw() {
    const [rT, rE] = contrast(imT, imE, ui.shared);
    drawCamera(cT, imT, p, rT[0], rT[1]); drawCamera(cE, imE, p, rE[0], rE[1]);
    drawSide(cS, s, p, 'tirf', ui.zTop === 'full' ? p.depth_um * 1000 : +ui.zTop);
    const o = opticsSummary(p.wavelength_nm, p.angle_deg, p.n1, p.n2, p.na), px = samplePixelNm(p);
    document.getElementById('capT').innerHTML = `<b>TIRF</b> θ ${p.angle_deg.toFixed(1)}° · ${o.tir ? `d ${fmt(o.penetration_depth_nm, 0)} nm` : 'below θc: no TIR'} · ${fmt(rT[0], 0)}–${fmt(rT[1], 0)} e⁻`;
    document.getElementById('capE').innerHTML = `<b>Epi</b> widefield · ${fmt(rE[0], 0)}–${fmt(rE[1], 0)} e⁻`;
    const sT = signalSplit(s, p, 'tirf'), sE = signalSplit(s, p, 'epi'), share = x => x.surface + x.bulk > 0 ? `${fmt(100 * x.surface / (x.surface + x.bulk), 0)}%` : '—';
    out([
      ['pixel size (sample)', `${fmt(px, 1)} nm`], ['', `${p.camera_pixel_um} µm / ${p.magnification}×`],
      ['field of view', `${fmt(fieldNm(p) / 1000, 2)} µm (${p.image_px} px)`],
      ['PSF σ in focus', `${fmt(psfSigmaNm(p), 0)} nm`], ['critical angle', `${fmt(o.critical_angle_deg, 1)}°`],
      ['penetration depth d', o.tir ? `${fmt(o.penetration_depth_nm, 0)} nm` : '∞'],
      ['light from surface, TIRF', share(sT)], ['light from surface, epi', share(sE)],
      ['frame time', `${p.dt_s * 1000} ms`], ['seed', String(p.seed)],
    ]);
  }
  reset(); frame();
  animate(t => {
    if (!ui.playing || t - last < p.dt_s * 1000) return;
    last = t; stepSample(s, p, stepR); frame();
  });
});
