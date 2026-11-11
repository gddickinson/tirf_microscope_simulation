"""TIRF optics at a planar interface between glass (index n1) and the sample (n2 < n1), the formulas in README.md.

Angles are in degrees from the interface normal, wavelengths and distances in nm.
- Snell's law: n1 sin(theta1) = n2 sin(theta2)
- Critical angle: theta_c = arcsin(n2 / n1)
- Penetration depth (intensity falls to 1/e): d = lambda / (4 pi sqrt(n1^2 sin^2(theta) - n2^2))
- Evanescent intensity: I(z) = I0 exp(-z / d)
"""
import math


def critical_angle_deg(n1, n2):
    """Critical angle in degrees, or None when n2 >= n1 (no total internal reflection possible)."""
    if n2 >= n1:
        return None
    return math.degrees(math.asin(n2 / n1))


def refraction_angle_deg(theta_deg, n1, n2):
    """Angle of the transmitted beam in degrees (Snell's law), or None beyond the critical angle."""
    s = n1 * math.sin(math.radians(theta_deg)) / n2
    if s >= 1.0:
        return None
    return math.degrees(math.asin(s))


def penetration_depth_nm(wavelength_nm, theta_deg, n1, n2):
    """Intensity penetration depth d in nm; math.inf when the angle is at or below the critical angle."""
    k = (n1 * math.sin(math.radians(theta_deg))) ** 2 - n2 ** 2
    if k <= 0:
        return math.inf
    return wavelength_nm / (4.0 * math.pi * math.sqrt(k))


def evanescent_intensity(z_nm, d_nm, i0=1.0):
    """Relative intensity I(z) = I0 exp(-z/d) at height z above the interface (I0 everywhere if d is infinite)."""
    if math.isinf(d_nm):
        return i0
    return i0 * math.exp(-z_nm / d_nm)


def max_objective_angle_deg(na, n1):
    """Largest angle of incidence an objective of numerical aperture na can deliver into glass of index n1."""
    s = na / n1
    return 90.0 if s >= 1.0 else math.degrees(math.asin(s))


def optics_summary(wavelength_nm, theta_deg, n1, n2, na=None):
    """All interface quantities for one setting (what the web app's readouts show)."""
    d = penetration_depth_nm(wavelength_nm, theta_deg, n1, n2)
    out = {
        "critical_angle_deg": critical_angle_deg(n1, n2),
        "refraction_angle_deg": refraction_angle_deg(theta_deg, n1, n2),
        "tir": not math.isinf(d),
        "penetration_depth_nm": None if math.isinf(d) else d,
        "effective_na": n1 * math.sin(math.radians(theta_deg)),
    }
    if na is not None:
        out["max_objective_angle_deg"] = max_objective_angle_deg(na, n1)
    return out
