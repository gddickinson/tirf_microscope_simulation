// Drawing for the TIRF vs epi page and the home hero: camera images (scaled, pixelated, with a scale bar in µm) and
// the x-z side view of the sample with the excitation profile.
import { drawImage, range, wavelengthRGB, rgba, ink, mute } from './ui.js';
import { samplePixelNm, fieldNm, excitationFn } from './tirf_imaging.js';

const off = document.createElement('canvas');

// Draw an n x n image (e-) into ctx (any size) with nearest-neighbour scaling, plus a scale bar of barUm µm.
export function drawCamera(ctx, img, p, lo, hi, barUm = 2) {
  const n = p.image_px, W = ctx.canvas.width, H = ctx.canvas.height;
  off.width = n; off.height = n;
  drawImage(off.getContext('2d'), img, n, lo, hi);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, W, H);
  const barPx = barUm * 1000 / samplePixelNm(p) * (W / n);
  if (barPx < W * 0.8) {
    ctx.fillStyle = '#fff'; ctx.fillRect(W - 14 - barPx, H - 16, barPx, 5);
    ctx.font = '600 14px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${barUm} µm`, W - 14, H - 24);
  }
}

export function contrast(a, b, shared) {
  const ra = range(a), rb = range(b);
  if (!shared) return [ra, rb];
  const r = [Math.min(ra[0], rb[0]), Math.max(ra[1], rb[1])];
  return [r, r];
}

// x-z side view: x across the field (µm), z from the glass up to zTopNm; dots coloured by relative excitation.
export function drawSide(ctx, s, p, mode, zTopNm) {
  const W = ctx.canvas.width, H = ctx.canvas.height, L = 66, R = 12, T = 12, B = 40;
  const w = fieldNm(p), exc = excitationFn(p, mode), col = wavelengthRGB(p.wavelength_nm);
  const X = x => L + x / w * (W - L - R), Y = z => H - B - z / zTopNm * (H - T - B);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#02040a'; ctx.fillRect(L, T, W - L - R, H - T - B);
  for (let y = T; y < H - B; y += 2) {
    const z = (H - B - y) / (H - T - B) * zTopNm;
    ctx.fillStyle = rgba(col, 0.42 * exc(z)); ctx.fillRect(L, y, W - L - R, 2);
  }
  for (let i = 0; i < s.x.length; i++) {
    if (s.z[i] > zTopNm) continue;
    const e = exc(s.z[i]);
    ctx.fillStyle = `rgba(124,255,107,${0.15 + 0.85 * e})`;
    ctx.beginPath(); ctx.arc(X(s.x[i]), Y(s.z[i]), s.surface[i] ? 3 : 2.2, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#0b2233'; ctx.fillRect(L, H - B, W - L - R, 6);
  ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.fillStyle = mute(); ctx.strokeStyle = mute();
  ctx.textAlign = 'right';
  const zt = zTopNm >= 2000 ? 1000 : zTopNm >= 1000 ? 200 : 100;
  for (let z = 0; z <= zTopNm + 1e-6; z += zt) ctx.fillText(zTopNm >= 2000 ? `${z / 1000} µm` : `${z} nm`, L - 6, Y(z) + 4);
  ctx.textAlign = 'center';
  const um = w / 1000, xt = um > 12 ? 4 : 2;
  for (let x = 0; x <= um + 1e-6; x += xt) ctx.fillText(`${x}`, X(x * 1000), H - B + 20);
  ctx.fillText('x (µm)', (L + W - R) / 2, H - 4);
  ctx.save(); ctx.translate(12, (T + H - B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = ink(); ctx.fillText('z above glass', 0, 0); ctx.restore();
}
