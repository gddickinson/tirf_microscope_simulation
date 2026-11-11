"""Pure TIRF physics (NumPy only, no Qt), the reference the web app's JavaScript engine is tested against.

- defaults.py      DEFAULTS: laser, refractive indices, objective, camera and sample settings (single source)
- rng.py           Mulberry32 random numbers (same sequence as core.js rng), normal and Poisson samplers
- tirf_optics.py   Snell's law, critical angle, penetration depth, evanescent intensity (the README formulas)
- tirf_imaging.py  seeded fluorophore sample, Brownian steps, TIRF/epi camera images with PSF and noise
"""
from .defaults import DEFAULTS
from .tirf_optics import (critical_angle_deg, refraction_angle_deg, penetration_depth_nm, evanescent_intensity,
                          max_objective_angle_deg, optics_summary)
from .tirf_imaging import make_sample, step_sample, render_expected, add_noise, sample_pixel_nm, psf_sigma_nm

__all__ = ['DEFAULTS', 'critical_angle_deg', 'refraction_angle_deg', 'penetration_depth_nm', 'evanescent_intensity',
           'max_objective_angle_deg', 'optics_summary', 'make_sample', 'step_sample', 'render_expected', 'add_noise',
           'sample_pixel_nm', 'psf_sigma_nm']
