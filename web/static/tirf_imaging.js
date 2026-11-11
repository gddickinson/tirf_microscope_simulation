// Simulated TIRF and widefield (epi) camera images: JS port of physics/tirf_imaging.py (same model, same order of
// random numbers). Coordinates in nm, z = height above the glass; images are row-major Float64Arrays (photons or e-).
import { penetrationDepthNm, normal, poisson } from './tirf_optics.js';

const P = 0.3275911, A = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
// Abramowitz & Stegun 7.1.26, as in the Python reference.
export function erf(x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + P * x);
  return s * (1 - ((((A[4] * t + A[3]) * t + A[2]) * t + A[1]) * t + A[0]) * t * Math.exp(-x * x));
}

export const samplePixelNm = p => p.camera_pixel_um * 1000 / p.magnification;
export const psfSigmaNm = p => 0.21 * p.em_wavelength_nm / p.na;
export const depthOfFieldNm = p => p.em_wavelength_nm * p.n2 / p.na ** 2;
export const fieldNm = p => p.image_px * samplePixelNm(p);

export function makeSample(p, rand) {
  const n = p.n_surface + p.n_bulk, w = fieldNm(p);
  const s = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n), surface: new Uint8Array(n) };
  for (let i = 0; i < n; i++) {
    const surf = i < p.n_surface;
    s.x[i] = rand() * w; s.y[i] = rand() * w;
    s.z[i] = rand() * (surf ? p.surface_band_nm : p.depth_um * 1000);
    s.surface[i] = surf ? 1 : 0;
  }
  return s;
}

const wrap = (v, w) => v - w * Math.floor(v / w);
function reflect(z, top) { if (z < 0) z = -z; if (z > top) z = 2 * top - z; return Math.min(Math.max(z, 0), top); }

export function stepSample(s, p, rand) {
  const w = fieldNm(p), top = p.depth_um * 1000;
  const sb = Math.sqrt(2 * p.d_bulk_um2_s * p.dt_s) * 1000, ss = Math.sqrt(2 * p.d_surface_um2_s * p.dt_s) * 1000;
  for (let i = 0; i < s.x.length; i++) {
    if (s.surface[i]) {
      s.x[i] = wrap(s.x[i] + ss * normal(rand), w);
      s.y[i] = wrap(s.y[i] + ss * normal(rand), w);
    } else {
      s.x[i] = wrap(s.x[i] + sb * normal(rand), w);
      s.y[i] = wrap(s.y[i] + sb * normal(rand), w);
      s.z[i] = reflect(s.z[i] + sb * normal(rand), top);
    }
  }
  return s;
}

// Relative excitation I/I0 at height z: exp(-z/d) for TIRF above the critical angle, else 1.
export function excitationFn(p, mode) {
  if (mode !== 'tirf') return () => 1;
  const d = penetrationDepthNm(p.wavelength_nm, p.angle_deg, p.n1, p.n2);
  return Number.isFinite(d) ? z => Math.exp(-z / d) : () => 1;
}

export function renderExpected(s, p, mode) {
  const n = p.image_px, px = samplePixelNm(p), sig0 = psfSigmaNm(p), zdof = depthOfFieldNm(p), exc = excitationFn(p, mode);
  const img = new Float64Array(n * n).fill(p.background_photons);
  const gx = new Float64Array(n), gy = new Float64Array(n);
  for (let i = 0; i < s.x.length; i++) {
    const photons = p.brightness_photons * exc(s.z[i]);
    if (photons < 1e-3) continue;
    const sp = sig0 * Math.sqrt(1 + (s.z[i] / zdof) ** 2) / px, cx = s.x[i] / px, cy = s.y[i] / px;
    const r = Math.ceil(4 * sp) + 1;
    const i0 = Math.max(0, Math.floor(cx) - r), i1 = Math.min(n - 1, Math.floor(cx) + r);
    const j0 = Math.max(0, Math.floor(cy) - r), j1 = Math.min(n - 1, Math.floor(cy) + r);
    if (i0 > i1 || j0 > j1) continue;
    const k = 1 / (Math.sqrt(2) * sp);
    for (let c = i0; c <= i1; c++) gx[c - i0] = 0.5 * (erf((c + 1 - cx) * k) - erf((c - cx) * k));
    for (let c = j0; c <= j1; c++) gy[c - j0] = 0.5 * (erf((c + 1 - cy) * k) - erf((c - cy) * k));
    for (let jj = 0; jj <= j1 - j0; jj++) {
      const row = (j0 + jj) * n + i0, a = photons * gy[jj];
      for (let ii = 0; ii <= i1 - i0; ii++) img[row + ii] += a * gx[ii];
    }
  }
  return img;
}

// Poisson shot noise plus Gaussian read noise, pixel by pixel (row-major), in e-.
export function addNoise(expected, p, rand) {
  const out = new Float64Array(expected.length), rn = p.read_noise_e;
  for (let i = 0; i < expected.length; i++) {
    let v = poisson(expected[i], rand);
    if (rn > 0) v += rn * normal(rand);
    out[i] = v;
  }
  return out;
}

// Detected photons per frame from the near-surface and bulk populations (before PSF and noise).
export function signalSplit(s, p, mode) {
  const exc = excitationFn(p, mode);
  let surface = 0, bulk = 0;
  for (let i = 0; i < s.z.length; i++) {
    const v = p.brightness_photons * exc(s.z[i]);
    if (s.surface[i]) surface += v; else bulk += v;
  }
  return { surface, bulk };
}
