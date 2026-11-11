// The desktop app's light table (laser -> camera), ported line by line from optical_components/laser.py,
// camera.py and simulation/light_table.py. Units are the model's light-table units (no physical length unit);
// the camera is 1000 x 1000 pixels of 1 unit. Angles in degrees (the GUI sliders), converted to radians as in
// MainWindow.update_laser_angle.
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = v => Math.sqrt(dot(v, v));
const normalize = v => { const n = norm(v); return v.map(x => x / n); };

// Laser.calculate_direction: note it does not use the laser's orientation (z is "forward").
export function laserDirection(axDeg, ayDeg) {
  const ax = axDeg * (Math.PI / 180), ay = ayDeg * (Math.PI / 180);
  return normalize([Math.cos(ay) * Math.sin(ax), Math.sin(ay), Math.cos(ay) * Math.cos(ax)]);
}

// One frame: LightTable.simulate_light_path + Camera.ray_intersection + Camera.add_diffraction_spot.
export function simulateTable(setup, axDeg, ayDeg, { laserOn = true, cameraOn = true } = {}) {
  const lp = setup.laser.position, cp = setup.camera.position, co = normalize(setup.camera.orientation);
  const [W, H] = setup.sensor_px;
  const out = { origin: lp, direction: null, length: 0, hit: null, spot: null, why: '' };
  if (!laserOn) { out.why = 'laser off'; return out; }
  const dir = laserDirection(axDeg, ayDeg);
  out.direction = dir;
  out.length = norm(sub(cp, lp)) * 3;                      // extend_ray: 3 x laser-camera distance
  if (!cameraOn) { out.why = 'camera off'; return out; }
  const den = dot(co, dir);
  if (Math.abs(den) <= 1e-6) { out.why = 'ray parallel to the camera plane'; return out; }
  const t = dot(co, sub(cp, lp)) / den;
  if (!(t >= 0 && t <= out.length)) { out.why = 'camera plane not reached within the ray length'; return out; }
  const p = lp.map((v, i) => v + t * dir[i]);
  const lx = cross(co, [0, 0, 1]), ly = cross(lx, co);
  const x = dot(sub(p, cp), lx), y = dot(sub(p, cp), ly);
  if (!(x >= 0 && x < W && y >= 0 && y < H)) { out.why = 'ray misses the sensor'; out.miss = [x, y]; return out; }
  out.hit = [x, y];
  out.spot = diffractionSpot(x, y, W, H);
  return out;
}

// Camera.add_diffraction_spot: a Gaussian with covariance diag(5, 5) px^2 on a 41 x 41 window, scaled to max 255.
export function diffractionSpot(x, y, W, H, variance = 5) {
  const x0 = Math.max(0, Math.trunc(x) - 20), x1 = Math.min(W, Math.trunc(x) + 21);
  const y0 = Math.max(0, Math.trunc(y) - 20), y1 = Math.min(H, Math.trunc(y) + 21);
  const w = x1 - x0, h = y1 - y0, values = new Float64Array(w * h);
  let max = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = x0 + i - x, dy = y0 + j - y, g = Math.exp(-0.5 * (dx * dx + dy * dy) / variance);
    values[j * w + i] = g; if (g > max) max = g;
  }
  for (let k = 0; k < values.length; k++) values[k] = values[k] / max * 255;
  return { x0, y0, w, h, values };
}
