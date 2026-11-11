// TIRF optics at a glass/sample interface: JS port of physics/tirf_optics.py and physics/rng.py (normal, Poisson).
// Angles in degrees from the interface normal; wavelengths and distances in nm. Tested against Python by
// tirf_engine.test.mjs (fixture from scripts/make_engine_fixture.py).
export const toDeg = r => r * (180 / Math.PI);   // math.degrees
export const toRad = d => d * (Math.PI / 180);   // math.radians

// Defaults mirrored from physics/defaults.py (the pages load the live values from /api/presets).
export const DEFAULTS = {
  wavelength_nm: 488.0, angle_deg: 66.0, n1: 1.518, n2: 1.333, na: 1.49, magnification: 100.0, camera_pixel_um: 16.0,
  em_wavelength_nm: 520.0, image_px: 96, n_surface: 120, surface_band_nm: 50.0, n_bulk: 2500, depth_um: 4.0,
  brightness_photons: 400.0, background_photons: 2.0, read_noise_e: 1.6, d_bulk_um2_s: 0.5, d_surface_um2_s: 0.05,
  dt_s: 0.05, seed: 1,
};

// Critical angle (deg), or null when n2 >= n1.
export function criticalAngleDeg(n1, n2) { return n2 >= n1 ? null : toDeg(Math.asin(n2 / n1)); }

// Transmitted-beam angle (deg) by Snell's law, or null beyond the critical angle.
export function refractionAngleDeg(theta, n1, n2) {
  const s = n1 * Math.sin(toRad(theta)) / n2;
  return s >= 1 ? null : toDeg(Math.asin(s));
}

// Intensity penetration depth d (nm); Infinity at or below the critical angle.
export function penetrationDepthNm(wl, theta, n1, n2) {
  const k = (n1 * Math.sin(toRad(theta))) ** 2 - n2 ** 2;
  return k <= 0 ? Infinity : wl / (4 * Math.PI * Math.sqrt(k));
}

// I(z) = I0 exp(-z/d); I0 everywhere when d is infinite (no TIR).
export function evanescentIntensity(z, d, i0 = 1) { return Number.isFinite(d) ? i0 * Math.exp(-z / d) : i0; }

// Largest angle of incidence an objective of numerical aperture na can deliver into glass of index n1.
export function maxObjectiveAngleDeg(na, n1) { const s = na / n1; return s >= 1 ? 90 : toDeg(Math.asin(s)); }

export function opticsSummary(wl, theta, n1, n2, na = null) {
  const d = penetrationDepthNm(wl, theta, n1, n2);
  const out = {
    critical_angle_deg: criticalAngleDeg(n1, n2), refraction_angle_deg: refractionAngleDeg(theta, n1, n2),
    tir: Number.isFinite(d), penetration_depth_nm: Number.isFinite(d) ? d : null,
    effective_na: n1 * Math.sin(toRad(theta)),
  };
  if (na !== null) out.max_objective_angle_deg = maxObjectiveAngleDeg(na, n1);
  return out;
}

// --- random numbers (physics/rng.py; the uniform generator is core.js rng = Mulberry32) ---
export function normal(rand) {
  const u1 = 1 - rand(), u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function poisson(lam, rand) {
  if (lam <= 0) return 0;
  if (lam < 30) {
    const limit = Math.exp(-lam);
    let k = 0, p = 1;
    for (;;) { k++; p *= rand(); if (p <= limit) return k - 1; }
  }
  return Math.max(0, Math.floor(lam + Math.sqrt(lam) * normal(rand) + 0.5));
}
