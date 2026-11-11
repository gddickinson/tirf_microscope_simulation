// Home page: hero with a live TIRF/epi pair of the same diffusing sample, counts from the API, entry cards.
import { route, api, app, animate, rng } from './core.js';
import { makeSample, stepSample, renderExpected, addNoise } from './tirf_imaging.js';
import { loadPresets, fmt } from './ui.js';
import { drawCamera, contrast } from './imaging_draw.js';

const DOORS = [
  ['#/field', 'Evanescent field', 'Angle, wavelength and refractive indices to critical angle, penetration depth and the decay I(z) = I0·exp(−z/d), all in nm and degrees.'],
  ['#/imaging', 'TIRF vs widefield', 'A seeded sample of diffusing fluorophores imaged by TIRF and by epi illumination with the same camera: PSF, pixel size, shot and read noise.'],
  ['#/table', 'Light table', 'The desktop PyQt app’s optical table (laser, camera, angle sliders, diffraction spot), ported line by line.'],
  ['#/check', 'Cross-check', 'The browser engines against the Python code: the same inputs and seeds, compared number by number.'],
  ['#/about', 'About', 'The physics, what the model includes and leaves out, how to run the desktop and web apps, credits.'],
];

route('home', async () => {
  const [info, pr] = await Promise.all([api('/info'), loadPresets()]);
  app().innerHTML = `
  <section class="hero two herogrid">
    <div>
      <p class="kicker">Total internal reflection fluorescence</p>
      <h1 class="glow">TIRF Microscope Simulation</h1>
      <p class="lead">Light totally reflected at the glass/water interface leaves an evanescent field only about 100 nm deep,
      so only fluorophores next to the coverslip light up. Explore the physics and simulated camera images, running in your browser
      as a port of the Python code.</p>
      <a class="btn" href="#/imaging">Compare TIRF and epi</a><a class="btn alt" href="#/field">Evanescent field</a>
    </div>
    <figure class="fig"><canvas id="hero" width="640" height="320" role="img" aria-label="Live simulation: the same sample imaged by TIRF (left) and widefield epi (right)"></canvas>
      <figcaption class="small mute" id="herocap"></figcaption></figure>
  </section>
  <div class="tiles">
    <div class="tile"><b>${fmt(info.default_penetration_depth_nm, 0)} nm</b><span>penetration depth at ${pr.defaults.angle_deg}°, ${pr.defaults.wavelength_nm} nm</span></div>
    <div class="tile"><b>${fmt(info.default_critical_angle_deg, 1)}°</b><span>critical angle, glass ${pr.defaults.n1} / water ${pr.defaults.n2}</span></div>
    <div class="tile"><b>${info.fluorophores.toLocaleString('en')}</b><span>simulated fluorophores</span></div>
    <div class="tile"><b>${fmt(info.pixel_nm, 0)} nm</b><span>camera pixel in the sample</span></div>
    <div class="tile"><b>${info.component_classes.length}</b><span>optical component classes</span></div>
  </div>
  <div class="grid wide">${DOORS.map(([href, t, d]) => `<a class="card door" href="${href}"><b>${t}</b><span>${d}</span></a>`).join('')}</div>`;
  hero(pr.defaults);
});

// Small live pair: 64 x 64 px, default optics, 1 µm²/s; left TIRF, right epi, each auto-contrasted.
function hero(D) {
  const p = { ...D, image_px: 64, n_surface: 60, n_bulk: 1100, d_bulk_um2_s: 1.0 };
  const canvas = document.getElementById('hero'), ctx = canvas.getContext('2d');
  const half = document.createElement('canvas'); half.width = 320; half.height = 320;
  const hctx = half.getContext('2d');
  const s = makeSample(p, rng(4)), sr = rng(5), nt = rng(6), ne = rng(7);
  document.getElementById('herocap').textContent =
    `Left: TIRF at ${p.angle_deg}°, right: epi. ${p.image_px} × ${p.image_px} px of ${p.camera_pixel_um * 1000 / p.magnification} nm, 2 µm scale bars.`;
  const draw = () => {
    const a = addNoise(renderExpected(s, p, 'tirf'), p, nt), b = addNoise(renderExpected(s, p, 'epi'), p, ne);
    const [ra, rb] = contrast(a, b, false);
    drawCamera(hctx, a, p, ra[0], ra[1]); ctx.drawImage(half, 0, 0);
    drawCamera(hctx, b, p, rb[0], rb[1]); ctx.drawImage(half, 320, 0);
    ctx.font = '600 14px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#3ee0ff';
    ctx.fillText('TIRF', 10, 22); ctx.fillText('EPI', 330, 22);
  };
  draw();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last = 0;
  animate(t => { if (t - last < 100) return; last = t; stepSample(s, p, sr); draw(); });
}
