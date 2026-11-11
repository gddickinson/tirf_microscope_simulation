"""Python reference values for the web app: the desktop light-table model run through the real classes, and the
fixture that the JavaScript engines (static/*.test.mjs) and the Cross-check page compare against.

Everything here calls the repository's own code (tirf_sim.physics, tirf_sim.optical_components, tirf_sim.simulation).
"""
import logging
import math

import numpy as np

from package_loader import load_package

load_package()
from tirf_sim.microscope.default_setup import build_default_components, LASER, CAMERA  # noqa: E402
from tirf_sim.physics import DEFAULTS, optics_summary  # noqa: E402
from tirf_sim.physics.rng import mulberry32, normal, poisson  # noqa: E402
from tirf_sim.physics import tirf_imaging as ti  # noqa: E402
from tirf_sim.simulation.light_table import LightTable  # noqa: E402

logging.getLogger("tirf_sim").setLevel(logging.WARNING)  # the camera logs every ray at DEBUG

PATCH = 3  # half-width of the pixel patch around the spot reported for the light table


def light_table(ax_deg, ay_deg):
    """One frame of the desktop light table (laser + camera) with the laser angles in degrees."""
    laser, camera = build_default_components()
    table = LightTable()
    for c in (laser, camera):
        table.add_component(c)
    laser.set_angles(math.radians(ax_deg), math.radians(ay_deg))
    table.simulate_light_path()
    ray = table.rays[0]
    hit = camera.ray_intersection(ray)
    img = camera.get_image()
    out = {"ax_deg": ax_deg, "ay_deg": ay_deg, "origin": ray.origin.tolist(), "direction": ray.direction.tolist(),
           "length": float(ray.length), "hit": None if hit is None else [float(hit[0]), float(hit[1])],
           "image_sum": float(img.sum()), "image_max": float(img.max()), "patch": None}
    if hit is not None:
        x, y = int(hit[0]), int(hit[1])
        ys = slice(max(0, y - PATCH), y + PATCH + 1)
        xs = slice(max(0, x - PATCH), x + PATCH + 1)
        out["patch"] = {"x0": xs.start, "y0": ys.start, "values": img[ys, xs].tolist()}
    return out


def table_setup():
    return {"laser": {k: list(v) if isinstance(v, tuple) else v for k, v in LASER.items()},
            "camera": {k: list(v) for k, v in CAMERA.items()},
            "sensor_px": list(build_default_components()[1].sensor_size)}


SMALL = dict(DEFAULTS, image_px=32, n_surface=15, n_bulk=120, depth_um=2.0, seed=3)
OPTICS_CASES = [(wl, th, n1, n2) for wl in (405.0, 488.0, 640.0) for th in (45.0, 61.0, 62.0, 66.0, 72.5)
                for n1, n2 in ((1.518, 1.333), (1.518, 1.38), (1.77, 1.333))]
TABLE_CASES = [(0, 0), (20, 0), (27, 0), (30, 0), (30, 12), (29, -4), (-30, 5), (30, 30)]


def fixture():
    r = mulberry32(1)
    rand_seq = [r() for _ in range(20)]
    r = mulberry32(42)
    normals = [normal(r) for _ in range(10)]
    r = mulberry32(7)
    pois = [[lam, poisson(lam, r)] for lam in (0.0, 0.4, 3.0, 12.5, 29.9, 30.0, 85.0, 400.0)]
    erfs = [[x, ti.erf(x)] for x in (-3.0, -1.2, -0.3, 0.0, 0.01, 0.5, 1.0, 2.5)]
    optics = [[wl, th, n1, n2, optics_summary(wl, th, n1, n2, 1.49)] for wl, th, n1, n2 in OPTICS_CASES]

    p = SMALL
    s = ti.make_sample(p, mulberry32(p["seed"]))
    tirf = ti.render_expected(s, p, "tirf")
    epi = ti.render_expected(s, p, "epi")
    noisy = ti.add_noise(tirf, p, mulberry32(11))
    sr = mulberry32(5)
    for _ in range(3):
        ti.step_sample(s, p, sr)
    moved = {k: s[k][:20] for k in ("x", "y", "z")}
    imaging = {"params": p, "pixel_nm": ti.sample_pixel_nm(p), "psf_sigma_nm": ti.psf_sigma_nm(p),
               "tirf": tirf, "epi": epi, "noisy_tirf": noisy, "moved": moved,
               "split_tirf": ti.signal_split(s, p, "tirf"), "split_epi": ti.signal_split(s, p, "epi")}
    table = [light_table(ax, ay) for ax, ay in TABLE_CASES]
    return {"defaults": DEFAULTS, "rand": rand_seq, "normals": normals, "poisson": pois, "erf": erfs,
            "optics": optics, "imaging": imaging, "table": table, "table_setup": table_setup()}


def close(a, b, rtol=1e-9, atol=1e-9):
    """Tolerant comparison of nested fixture data (lists, dicts, numbers, None, bools)."""
    if isinstance(a, dict):
        return isinstance(b, dict) and a.keys() == b.keys() and all(close(a[k], b[k], rtol, atol) for k in a)
    if isinstance(a, (list, tuple)):
        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y, rtol, atol) for x, y in zip(a, b))
    if isinstance(a, bool) or a is None or isinstance(a, str):
        return a == b
    return bool(np.isclose(a, b, rtol=rtol, atol=atol))
