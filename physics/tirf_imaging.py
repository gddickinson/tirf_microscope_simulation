"""Simulated TIRF and widefield (epi) images of a seeded fluorophore sample.

Model (each step mirrored line by line in web/static/tirf_imaging.js):
- Sample: `n_surface` fluorophores at heights uniform in 0..surface_band_nm and `n_bulk` uniform in 0..depth_um,
  x and y uniform over the field of image_px x image_px pixels. Coordinates are in nm, z = height above the glass.
- Excitation: TIRF (angle above critical) I(z)/I0 = exp(-z/d); epi, or TIRF below the critical angle, I/I0 = 1.
- Detection: brightness_photons * I/I0 photons per frame, spread by a Gaussian PSF with
  sigma0 = 0.21 * lambda_em / NA, widened out of focus (focal plane at the glass) as sigma0 * sqrt(1 + (z/z_dof)^2)
  with z_dof = lambda_em * n2 / NA^2, integrated over each pixel; plus background_photons per pixel.
- Camera noise: Poisson shot noise plus Gaussian read noise (e-).
- Motion: Brownian steps, 3D in the volume (z reflected at 0 and depth), 2D in the near-surface band; x, y wrap.
Sample pixel size = camera_pixel_um / magnification. Images are flat row-major lists (index = row * N + col).
"""
import math

from .rng import normal, poisson
from .tirf_optics import penetration_depth_nm

_P = 0.3275911
_A = (0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429)


def erf(x):
    """Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7); the JS engine uses the same formula so results agree."""
    s = -1.0 if x < 0 else 1.0
    x = abs(x)
    t = 1.0 / (1.0 + _P * x)
    y = 1.0 - ((((_A[4] * t + _A[3]) * t + _A[2]) * t + _A[1]) * t + _A[0]) * t * math.exp(-x * x)
    return s * y


def sample_pixel_nm(p):
    """Pixel size in the sample plane, nm (camera pixel / magnification)."""
    return p["camera_pixel_um"] * 1000.0 / p["magnification"]


def psf_sigma_nm(p):
    """In-focus Gaussian PSF standard deviation, nm (0.21 lambda_em / NA)."""
    return 0.21 * p["em_wavelength_nm"] / p["na"]


def depth_of_field_nm(p):
    """Axial scale of the defocus widening, nm (lambda_em n2 / NA^2)."""
    return p["em_wavelength_nm"] * p["n2"] / (p["na"] ** 2)


def make_sample(p, rand):
    """Seeded fluorophore positions (nm): the near-surface population first, then the bulk."""
    w = p["image_px"] * sample_pixel_nm(p)
    s = {"x": [], "y": [], "z": [], "surface": []}
    for i in range(p["n_surface"] + p["n_bulk"]):
        surf = i < p["n_surface"]
        s["x"].append(rand() * w)
        s["y"].append(rand() * w)
        s["z"].append(rand() * (p["surface_band_nm"] if surf else p["depth_um"] * 1000.0))
        s["surface"].append(surf)
    return s


def _wrap(v, w):
    return v - w * math.floor(v / w)


def _reflect(z, top):
    if z < 0:
        z = -z
    if z > top:
        z = 2 * top - z
    return min(max(z, 0.0), top)


def step_sample(s, p, rand):
    """Advance every fluorophore by one Brownian step of dt_s (in place)."""
    w = p["image_px"] * sample_pixel_nm(p)
    sb = math.sqrt(2 * p["d_bulk_um2_s"] * p["dt_s"]) * 1000.0
    ss = math.sqrt(2 * p["d_surface_um2_s"] * p["dt_s"]) * 1000.0
    top = p["depth_um"] * 1000.0
    for i in range(len(s["x"])):
        if s["surface"][i]:
            s["x"][i] = _wrap(s["x"][i] + ss * normal(rand), w)
            s["y"][i] = _wrap(s["y"][i] + ss * normal(rand), w)
        else:
            s["x"][i] = _wrap(s["x"][i] + sb * normal(rand), w)
            s["y"][i] = _wrap(s["y"][i] + sb * normal(rand), w)
            s["z"][i] = _reflect(s["z"][i] + sb * normal(rand), top)
    return s


def excitation(z_nm, p, mode):
    """Relative excitation I/I0 at height z for mode 'tirf' or 'epi'."""
    if mode != "tirf":
        return 1.0
    d = penetration_depth_nm(p["wavelength_nm"], p["angle_deg"], p["n1"], p["n2"])
    return 1.0 if math.isinf(d) else math.exp(-z_nm / d)


def render_expected(s, p, mode):
    """Expected photons per pixel (flat row-major list, image_px^2), including the uniform background."""
    n = p["image_px"]
    px = sample_pixel_nm(p)
    sig0, zdof = psf_sigma_nm(p), depth_of_field_nm(p)
    img = [float(p["background_photons"])] * (n * n)
    for i in range(len(s["x"])):
        photons = p["brightness_photons"] * excitation(s["z"][i], p, mode)
        if photons < 1e-3:
            continue
        sp = sig0 * math.sqrt(1 + (s["z"][i] / zdof) ** 2) / px
        cx, cy = s["x"][i] / px, s["y"][i] / px
        r = math.ceil(4 * sp) + 1
        i0, i1 = max(0, math.floor(cx) - r), min(n - 1, math.floor(cx) + r)
        j0, j1 = max(0, math.floor(cy) - r), min(n - 1, math.floor(cy) + r)
        if i0 > i1 or j0 > j1:
            continue
        k = 1.0 / (math.sqrt(2.0) * sp)
        gx = [0.5 * (erf((c + 1 - cx) * k) - erf((c - cx) * k)) for c in range(i0, i1 + 1)]
        gy = [0.5 * (erf((c + 1 - cy) * k) - erf((c - cy) * k)) for c in range(j0, j1 + 1)]
        for jj, vy in enumerate(gy):
            row = (j0 + jj) * n + i0
            a = photons * vy
            for ii, vx in enumerate(gx):
                img[row + ii] += a * vx
    return img


def add_noise(expected, p, rand):
    """Camera image in e-: Poisson(expected) plus Gaussian read noise, pixel by pixel in row-major order."""
    rn = p["read_noise_e"]
    out = []
    for lam in expected:
        v = float(poisson(lam, rand))
        if rn > 0:
            v += rn * normal(rand)
        out.append(v)
    return out


def signal_split(s, p, mode):
    """Detected photons per frame from the near-surface and bulk populations (before PSF and noise)."""
    surf = bulk = 0.0
    for i in range(len(s["z"])):
        v = p["brightness_photons"] * excitation(s["z"][i], p, mode)
        if s["surface"][i]:
            surf += v
        else:
            bulk += v
    return {"surface": surf, "bulk": bulk}
