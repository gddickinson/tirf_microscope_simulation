// Static-site data layer: answers api() calls from the JSON files exported by scripts/build_static.py, and computes
// the parameterised /optics and /table answers in the browser with the JS engines (tested against the Python code).
import { DEFAULTS, opticsSummary, penetrationDepthNm, evanescentIntensity } from './tirf_optics.js';
import { simulateTable } from './light_table.js';

const files = new Map();
async function file(rel) {
  if (!files.has(rel)) files.set(rel, fetch('api/' + rel + '.json').then(r => { if (!r.ok) throw new Error(`${r.status} ${rel}`); return r.json(); }));
  return files.get(rel);
}

export async function staticApi(path) {
  const [p, qs] = path.split('?');
  const clean = p.replace(/^\/+/, '');
  const q = Object.fromEntries([...new URLSearchParams(qs || '')].map(([k, v]) => [k, +v]));
  if (clean === 'optics') {
    const a = { ...DEFAULTS, ...q };
    const out = opticsSummary(a.wavelength_nm, a.angle_deg, a.n1, a.n2, a.na);
    const d = penetrationDepthNm(a.wavelength_nm, a.angle_deg, a.n1, a.n2);
    out.profile = Array.from({ length: 51 }, (_, i) => [i * 10, evanescentIntensity(i * 10, d)]);
    return out;
  }
  if (clean === 'table') {
    const { table } = await file('presets');
    const r = simulateTable(table, q.ax_deg || 0, q.ay_deg || 0);
    return { ax_deg: q.ax_deg || 0, ay_deg: q.ay_deg || 0, origin: r.origin, direction: r.direction, length: r.length, hit: r.hit };
  }
  return file(clean);
}
