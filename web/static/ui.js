// Shared page helpers: control panel layout, segmented buttons, selects, readouts, line plots, colours and image drawing.
import { esc, api } from './core.js';
import { DEFAULTS } from './tirf_optics.js';

// Presets and defaults from the Python code (/api/presets); the engine DEFAULTS fill any gaps.
export async function loadPresets() {
  const pr = await api('/presets');
  return { ...pr, defaults: { ...DEFAULTS, ...pr.defaults } };
}

export function layout(host, cls = '') {
  host.insertAdjacentHTML('beforeend', `<div class="sim ${cls}"><div class="controls"></div><div class="view"></div></div>`);
  const sim = host.querySelector('.sim:last-of-type');
  return { controls: sim.querySelector('.controls'), view: sim.querySelector('.view') };
}

export function seg(host, label, options, value, cb) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  wrap.innerHTML = `<label>${esc(label)}</label><div class="seg" role="group" aria-label="${esc(label)}">${options.map(([v, l]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(value)}" class="${String(v) === String(value) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  host.appendChild(wrap);
  const set = v => wrap.querySelectorAll('button').forEach(b => {
    const on = b.dataset.v === String(v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  });
  wrap.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { set(b.dataset.v); cb(b.dataset.v); } });
  return { set };
}

export function select(host, id, label, options, value, cb) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  wrap.innerHTML = `<label for="${id}">${esc(label)}</label><select id="${id}">${options.map(([v, l]) =>
    `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  host.appendChild(wrap);
  const el = wrap.querySelector('select');
  el.addEventListener('change', () => cb(el.value));
  return el;
}

export function check(host, id, label, value, cb) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl chk';
  wrap.innerHTML = `<label for="${id}"><input type="checkbox" id="${id}" ${value ? 'checked' : ''}> ${esc(label)}</label>`;
  host.appendChild(wrap);
  const el = wrap.querySelector('input');
  el.addEventListener('change', () => cb(el.checked));
  return el;
}

export function button(host, label, cb, alt = false) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = label; if (alt) b.className = 'alt';
  b.addEventListener('click', cb);
  host.appendChild(b);
  return b;
}

export function readout(host) {
  const el = document.createElement('div');
  el.className = 'readout';
  host.appendChild(el);
  return rows => { el.innerHTML = rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join(''); };
}

export function setSlider(input, value, fmt = v => v, unit = '') {
  input.value = value;
  const b = input.closest('.ctl')?.querySelector('label b');
  if (b) b.textContent = fmt(+input.value) + unit;
}

export const fmt = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : v.toFixed(d);

// Approximate RGB of a visible wavelength in nm (for drawing the laser beam).
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else r = 1;
  r = Math.max(0, Math.min(1, r)); g = Math.max(0, Math.min(1, g)); b = Math.max(0, Math.min(1, b));
  return [Math.round(255 * r), Math.round(255 * g), Math.round(255 * b)];
}
export const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export const ink = () => getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#e8f1ff';
export const mute = () => getComputedStyle(document.body).getPropertyValue('--mute').trim() || '#94a3c6';

// Line plot with labelled axes. series: [{ pts: [[x, y]...], color, dash }]; marks: [{ x, label, color }].
export function linePlot(ctx, { xr, yr, xlabel, ylabel, series, marks = [], xticks, yticks, logy = false }) {
  const W = ctx.canvas.width, H = ctx.canvas.height, L = 62, R = 14, T = 14, B = 44;
  const fy = v => logy ? Math.log10(Math.max(v, 1e-12)) : v;
  const X = x => L + (x - xr[0]) / (xr[1] - xr[0]) * (W - L - R);
  const Y = y => H - B - (fy(y) - fy(yr[0])) / (fy(yr[1]) - fy(yr[0])) * (H - T - B);
  ctx.clearRect(0, 0, W, H);
  ctx.font = '13px ui-monospace, Menlo, monospace'; ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148,163,198,.25)'; ctx.fillStyle = mute();
  ctx.textAlign = 'center';
  for (const t of xticks) { ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), H - B); ctx.stroke(); ctx.fillText(String(t), X(t), H - B + 17); }
  ctx.textAlign = 'right';
  for (const t of yticks) { ctx.beginPath(); ctx.moveTo(L, Y(t)); ctx.lineTo(W - R, Y(t)); ctx.stroke(); ctx.fillText(String(t), L - 6, Y(t) + 4); }
  ctx.textAlign = 'center'; ctx.fillText(xlabel, (L + W - R) / 2, H - 6);
  ctx.save(); ctx.translate(14, (T + H - B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(ylabel, 0, 0); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(L, T, W - L - R, H - T - B); ctx.clip();
  for (const m of marks) {
    ctx.strokeStyle = m.color; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(m.x), T); ctx.lineTo(X(m.x), H - B); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = m.color; const rt = X(m.x) > W - R - 150;
    ctx.textAlign = rt ? 'right' : 'left'; ctx.fillText(m.label, X(m.x) + (rt ? -5 : 5), T + 14 + (m.row || 0) * 16);
  }
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2.2; ctx.setLineDash(s.dash || []);
    ctx.beginPath(); s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
    if (s.dot) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(s.dot[0]), Y(s.dot[1]), 5, 0, 7); ctx.fill(); }
  }
  ctx.restore(); ctx.setLineDash([]);
}

// Greyscale-to-colour lookup (black -> green emission -> white) for fluorescence images.
export function lut(v) { // v in [0, 1]
  const t = Math.max(0, Math.min(1, v));
  return [Math.round(255 * Math.max(0, t * 2 - 1) ** 1.2), Math.round(255 * Math.min(1, t * 1.35)), Math.round(255 * Math.max(0, t * 2 - 1) ** 1.2 * 0.9 + 40 * t)];
}

// Draw a row-major n x n image into a canvas of the same pixel size, scaled from lo..hi.
export function drawImage(ctx, img, n, lo, hi) {
  const id = ctx.createImageData(n, n), span = hi - lo || 1;
  for (let i = 0; i < n * n; i++) {
    const c = lut((img[i] - lo) / span);
    id.data[4 * i] = c[0]; id.data[4 * i + 1] = c[1]; id.data[4 * i + 2] = c[2]; id.data[4 * i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
}

export function range(img) {
  let lo = Infinity, hi = -Infinity;
  for (const v of img) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
}
