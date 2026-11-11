// Canvas drawing for the Evanescent field page: the interface diagram (glass below, sample above, beams, decaying
// field on a z axis in nm) and the two plots. Pure drawing; the numbers come from tirf_optics.js.
import { penetrationDepthNm, criticalAngleDeg, refractionAngleDeg, evanescentIntensity, maxObjectiveAngleDeg, toRad } from './tirf_optics.js';
import { wavelengthRGB, rgba, linePlot, fmt, ink, mute } from './ui.js';

export const ZMAX_NM = 500;            // height shown above the interface
const DEMO_Z_NM = [15, 60, 140, 260, 420]; // illustrative fluorophore heights

export function drawInterface(ctx, s) {
  const W = ctx.canvas.width, H = ctx.canvas.height, y0 = Math.round(H * 0.62), top = 34, cx = W * 0.52, left = 74;
  const zpx = (y0 - top) / ZMAX_NM, col = wavelengthRGB(s.wavelength_nm);
  const d = penetrationDepthNm(s.wavelength_nm, s.angle_deg, s.n1, s.n2), tc = criticalAngleDeg(s.n1, s.n2);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#04070f'; ctx.fillRect(0, 0, W, y0);
  ctx.fillStyle = '#0b2233'; ctx.fillRect(0, y0, W, H - y0);
  // field above the interface
  if (Number.isFinite(d)) {
    for (let y = top; y < y0; y++) {
      const I = evanescentIntensity((y0 - y) / zpx, d);
      ctx.fillStyle = rgba(col, 0.75 * I); ctx.fillRect(left, y, W - left, 1);
    }
  } else {
    const t2 = toRad(refractionAngleDeg(s.angle_deg, s.n1, s.n2) ?? 0), L = (y0 - top) / Math.cos(t2);
    beam(ctx, cx, y0, cx + L * Math.sin(t2), y0 - L * Math.cos(t2), col, 0.85, 10);
  }
  // beams in the glass
  const th = toRad(s.angle_deg), Lg = (H - y0) / Math.cos(th) * 1.1;
  beam(ctx, cx - Lg * Math.sin(th), y0 + Lg * Math.cos(th), cx, y0, col, 1, 8);
  beam(ctx, cx, y0, cx + Lg * Math.sin(th), y0 + Lg * Math.cos(th), col, Number.isFinite(d) ? 0.95 : 0.3, 8);
  // normal and critical-angle guides
  ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(148,163,198,.6)';
  ctx.beginPath(); ctx.moveTo(cx, y0 - 40); ctx.lineTo(cx, H); ctx.stroke();
  if (tc !== null) {
    const tcr = toRad(tc), Lc = (H - y0) / Math.cos(tcr);
    ctx.strokeStyle = 'rgba(255,92,122,.8)'; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx - Lc * Math.sin(tcr), y0 + Lc * Math.cos(tcr)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // interface line
  ctx.strokeStyle = ink(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
  // demo fluorophores, brightness = excitation
  DEMO_Z_NM.forEach((z, i) => {
    const I = evanescentIntensity(z, d), xx = i < 2 ? cx - 150 + i * 70 : cx + 70 + (i - 2) * 75;
    ctx.fillStyle = `rgba(124,255,107,${0.12 + 0.88 * I})`; ctx.beginPath(); ctx.arc(xx, y0 - z * zpx, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(124,255,107,.5)'; ctx.lineWidth = 1; ctx.stroke();
  });
  // z axis in nm
  ctx.font = '13px ui-monospace, Menlo, monospace'; ctx.fillStyle = mute(); ctx.textAlign = 'right'; ctx.strokeStyle = mute();
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, y0); ctx.stroke();
  for (let z = 0; z <= ZMAX_NM; z += 100) { const y = y0 - z * zpx; ctx.fillText(`${z}`, left - 8, y + 4); ctx.beginPath(); ctx.moveTo(left - 4, y); ctx.lineTo(left, y); ctx.stroke(); }
  ctx.save(); ctx.translate(16, (top + y0) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('height above glass z (nm)', 0, 0); ctx.restore();
  if (Number.isFinite(d) && d <= ZMAX_NM) {
    const y = y0 - d * zpx; ctx.strokeStyle = ink(); ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W - 10, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ink(); ctx.textAlign = 'right'; ctx.fillText(`z = d = ${fmt(d)} nm  (I = I0/e)`, W - 12, y - 6);
  }
  // labels
  ctx.textAlign = 'left'; ctx.fillStyle = ink();
  ctx.fillText(`sample  n2 = ${s.n2.toFixed(3)}`, left + 10, top + 14);
  ctx.fillText(`glass  n1 = ${s.n1.toFixed(3)}`, 12, H - 14);
  ctx.fillStyle = rgba(col); ctx.fillText(`θ = ${s.angle_deg.toFixed(1)}°  λ = ${Math.round(s.wavelength_nm)} nm`, 12, y0 + 22);
  if (tc !== null) { ctx.fillStyle = '#ff5c7a'; ctx.fillText(`θc = ${tc.toFixed(1)}°`, 12, y0 + 40); }
  ctx.textAlign = 'right'; ctx.fillStyle = Number.isFinite(d) ? '#7cff6b' : '#ffd23f';
  ctx.fillText(Number.isFinite(d) ? 'total internal reflection' : 'below θc: beam enters the sample', W - 12, y0 + 22);
}

function beam(ctx, x1, y1, x2, y2, col, a, w) {
  ctx.strokeStyle = rgba(col, a * 0.25); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

export function drawProfile(ctx, s) {
  const d = penetrationDepthNm(s.wavelength_nm, s.angle_deg, s.n1, s.n2), col = rgba(wavelengthRGB(s.wavelength_nm));
  const pts = Array.from({ length: 101 }, (_, i) => [i * 5, evanescentIntensity(i * 5, d)]);
  linePlot(ctx, { xr: [0, ZMAX_NM], yr: [0, 1.05], xlabel: 'z (nm)', ylabel: 'I(z) / I0', xticks: [0, 100, 200, 300, 400, 500],
    yticks: [0, 0.25, 0.5, 0.75, 1],
    series: [{ pts: [[0, 1], [ZMAX_NM, 1]], color: 'rgba(148,163,198,.7)', dash: [6, 5], width: 1.5 }, { pts, color: col }],
    marks: Number.isFinite(d) && d < ZMAX_NM ? [{ x: d, label: `d = ${fmt(d)} nm`, color: '#e8f1ff' }] : [] });
}

export function drawDepthCurve(ctx, s) {
  const tc = criticalAngleDeg(s.n1, s.n2), tmax = maxObjectiveAngleDeg(s.na, s.n1), col = rgba(wavelengthRGB(s.wavelength_nm));
  const pts = [];
  for (let a = Math.max(0, tc ?? 90); a <= 90.0001; a += 0.05) {
    const d = penetrationDepthNm(s.wavelength_nm, a, s.n1, s.n2); if (Number.isFinite(d)) pts.push([a, Math.min(d, 2000)]);
  }
  const d = penetrationDepthNm(s.wavelength_nm, s.angle_deg, s.n1, s.n2);
  const marks = [];
  if (tc !== null) marks.push({ x: tc, label: `θc ${tc.toFixed(1)}°`, color: '#ff5c7a' });
  marks.push({ x: tmax, label: `NA ${s.na.toFixed(2)} max ${tmax.toFixed(1)}°`, color: '#a18cff', row: 1 });
  linePlot(ctx, { xr: [45, 90], yr: [0, 500], xlabel: 'angle of incidence θ (°)', ylabel: 'penetration depth d (nm)',
    xticks: [45, 55, 65, 75, 85], yticks: [0, 100, 200, 300, 400, 500], marks,
    series: [{ pts, color: col, dot: Number.isFinite(d) && s.angle_deg >= 45 ? [s.angle_deg, Math.min(d, 500)] : null }] });
}
