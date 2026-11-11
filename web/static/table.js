// Light table: the desktop app's optical table (a laser and a camera) ported line by line in light_table.js.
// Positions are light-table units (the desktop model has no physical length unit); the camera has 1000 x 1000 px of 1 unit.
import { route, app, slider, esc } from './core.js';
import { simulateTable } from './light_table.js';
import { loadPresets, layout, check, button, readout, fmt, ink, mute } from './ui.js';

route('table', async (args, query) => {
  const { table: T } = await loadPresets();
  const st = { ax: +(query.ax ?? 15), ay: +(query.ay ?? 10), power: T.power_default, laserOn: true, cameraOn: true, running: query.run !== '0' };
  app().innerHTML = `<p class="kicker">The desktop app, in the browser</p><h1 class="glow">Light table</h1>
  <p class="lead">The PyQt app's optical table: a ${T.laser.wavelength} nm laser and a camera, with the same sliders
  (laser angles X and Y, ${T.angle_range_deg[0]}° to ${T.angle_range_deg[1]}°, and power) and the same ray–camera geometry and
  diffraction spot as <span class="mono">optical_components/</span>. Coordinates are in light-table units; the model has no physical length unit.</p>`;
  const { controls, view } = layout(app());
  view.innerHTML = `<div class="two"><figure class="fig"><canvas id="top" width="520" height="420" role="img" aria-label="Top view (x-y) of the light table, as in the desktop Light Table View"></canvas>
    <figcaption class="small mute">Top view x–y (the desktop Light Table View)</figcaption></figure>
    <figure class="fig"><canvas id="sideT" width="520" height="420" role="img" aria-label="Side view (x-z) of the light table"></canvas>
    <figcaption class="small mute">Side view x–z (web addition: Angle Y tilts the beam out of the table plane)</figcaption></figure></div>
    <div class="two"><figure class="fig"><canvas id="cam" width="1000" height="1000" role="img" aria-label="Camera image, 1000 by 1000 pixels"></canvas>
    <figcaption class="small mute">Camera View: ${T.sensor_px[0]} × ${T.sensor_px[1]} px, pixel = 1 unit (row = sensor y, from top)</figcaption></figure>
    <figure class="fig"><canvas id="zoom" width="410" height="410" role="img" aria-label="Close-up of the diffraction spot, 41 by 41 pixels"></canvas>
    <figcaption class="small mute">Close-up: the 41 × 41 px spot window, 10× (Gaussian, σ = 5 px)</figcaption></figure></div>`;

  const run = button(controls, st.running ? 'Stop Simulation' : 'Start Simulation', () => {
    st.running = !st.running; run.textContent = st.running ? 'Stop Simulation' : 'Start Simulation'; draw();
  });
  slider(controls, { id: 'ax', label: 'Laser Angle X', min: T.angle_range_deg[0], max: T.angle_range_deg[1], value: st.ax, unit: '°' }, v => { st.ax = v; draw(); });
  slider(controls, { id: 'ay', label: 'Laser Angle Y', min: T.angle_range_deg[0], max: T.angle_range_deg[1], value: st.ay, unit: '°' }, v => { st.ay = v; draw(); });
  slider(controls, { id: 'pw', label: 'Laser Power', min: T.power_range[0], max: T.power_range[1], value: st.power }, v => { st.power = v; draw(); });
  check(controls, 'lon', 'Laser on', true, v => { st.laserOn = v; draw(); });
  check(controls, 'con', 'Camera on', true, v => { st.cameraOn = v; draw(); });
  const out = readout(controls);
  controls.insertAdjacentHTML('beforeend', `<p class="small mute">The beam leaves along the laser's orientation; Angle X turns it
    within the table plane and Angle Y tilts it out of the plane. The ${T.sensor_px[0]}-px sensor is centred on the camera
    ${T.camera.position[0] - T.laser.position[0]} units away, so the whole slider range lands on it.
    Power (% of full scale) scales the spot: peak 255 at 100%.</p>`);

  const cTop = document.getElementById('top').getContext('2d'), cSide = document.getElementById('sideT').getContext('2d'),
    cCam = document.getElementById('cam').getContext('2d'), cZoom = document.getElementById('zoom').getContext('2d');

  function draw() {
    const r = st.running ? simulateTable(T, st.ax, st.ay, { laserOn: st.laserOn, cameraOn: st.cameraOn, power: st.power }) : null;
    plan(cTop, T, r, 0, 1, 'x', 'y'); plan(cSide, T, r, 0, 2, 'x', 'z');
    camera(cCam, cZoom, r && r.spot);
    out(!r ? [['simulation', 'stopped']] : [
      ['direction', r.direction ? r.direction.map(v => v.toFixed(3)).join(', ') : '—'],
      ['ray length', `${fmt(r.length, 0)} units`],
      ['camera hit (px)', r.hit ? `${fmt(r.hit[0], 1)}, ${fmt(r.hit[1], 1)}` : esc(r.why)],
      ['spot peak', r.spot ? fmt(Math.max(...r.spot.values), 1) : '0'], ['power', `${st.power}%`],
    ]);
  }
  draw();
});

// Plan view of components (laser 20 x 20, camera 100 x 100 units) and the ray, axes a, b of the 3D positions.
function plan(ctx, T, r, a, b, la, lb) {
  const W = ctx.canvas.width, H = ctx.canvas.height, M = 46;
  const lo = [0, 0], hi = [1000, 1000];
  if (b === 2) { lo[1] = -500; hi[1] = 500; }
  const sx = (W - 2 * M) / (hi[0] - lo[0]), sy = (H - 2 * M) / (hi[1] - lo[1]);
  const X = v => M + (v - lo[0]) * sx, Y = v => H - M - (v - lo[1]) * sy;
  ctx.clearRect(0, 0, W, H); ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.strokeStyle = 'rgba(148,163,198,.18)'; ctx.fillStyle = mute(); ctx.lineWidth = 1; ctx.textAlign = 'center';
  for (let v = lo[0]; v <= hi[0]; v += 250) { ctx.beginPath(); ctx.moveTo(X(v), Y(lo[1])); ctx.lineTo(X(v), Y(hi[1])); ctx.stroke(); ctx.fillText(v, X(v), H - M + 16); }
  ctx.textAlign = 'right';
  for (let v = Math.ceil(lo[1] / 250) * 250; v <= hi[1]; v += 250) { ctx.beginPath(); ctx.moveTo(X(lo[0]), Y(v)); ctx.lineTo(X(hi[0]), Y(v)); ctx.stroke(); ctx.fillText(v, M - 6, Y(v) + 4); }
  ctx.textAlign = 'center'; ctx.fillText(`${la} (units)`, W / 2, H - 10);
  ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${lb} (units)`, 0, 0); ctx.restore();
  ctx.strokeStyle = ink(); ctx.lineWidth = 1.5;
  for (const [pos, size, name] of [[T.laser.position, 20, 'Laser'], [T.camera.position, 100, 'Camera']]) {
    ctx.strokeRect(X(pos[a] - size / 2), Y(pos[b] + size / 2), size * sx, size * sy);
    ctx.fillStyle = ink(); ctx.fillText(name, X(pos[a]), Y(pos[b] + size / 2) - 6);
  }
  if (r && r.direction) {
    const o = r.origin, e = o.map((v, i) => v + r.direction[i] * r.length);
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(o[a]), Y(o[b])); ctx.lineTo(X(e[a]), Y(e[b])); ctx.stroke();
  }
}

function camera(ctx, zoom, spot) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1000, 1000);
  zoom.fillStyle = '#000'; zoom.fillRect(0, 0, 410, 410);
  if (!spot) return;
  const id = ctx.createImageData(spot.w, spot.h);
  for (let k = 0; k < spot.values.length; k++) { const v = spot.values[k]; id.data.set([v, v, v, 255], 4 * k); }
  ctx.putImageData(id, spot.x0, spot.y0);
  ctx.strokeStyle = '#3ee0ff'; ctx.lineWidth = 4; ctx.strokeRect(spot.x0 - 30, spot.y0 - 30, spot.w + 60, spot.h + 60);
  zoom.imageSmoothingEnabled = false;
  zoom.drawImage(ctx.canvas, spot.x0, spot.y0, spot.w, spot.h, 0, 0, spot.w * 10, spot.h * 10);
}
