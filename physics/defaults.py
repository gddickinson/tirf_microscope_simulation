"""Default settings for the TIRF physics and imaging model (the web app reads these through /api/presets).

Units are in the names: nm, um (micrometres), deg, s, photons, e- (photo-electrons).
The 488 nm laser matches the desktop app's Laser (gui/main_window.py); the glass/water pair is the README's example.
"""

DEFAULTS = {
    # excitation and the glass/sample interface
    "wavelength_nm": 488.0,        # desktop Laser(wavelength=488)
    "angle_deg": 66.0,             # angle of incidence at the interface, measured from the normal
    "n1": 1.518,                   # coverslip glass / immersion oil
    "n2": 1.333,                   # water (aqueous sample)
    # objective and camera
    "na": 1.49,                    # numerical aperture of a TIRF objective
    "magnification": 100.0,
    "camera_pixel_um": 16.0,       # physical camera pixel; sample pixel = camera_pixel_um / magnification
    "em_wavelength_nm": 520.0,     # emission (green fluorophore excited at 488 nm)
    "image_px": 96,                # image is image_px x image_px pixels
    # sample: fluorophores near the coverslip and throughout the cell volume
    "n_surface": 120,              # fluorophores in the near-surface band (e.g. docked vesicles, membrane)
    "surface_band_nm": 50.0,       # their heights are uniform in 0..surface_band_nm above the glass
    "n_bulk": 2500,                # fluorophores spread through the volume above
    "depth_um": 4.0,               # sample (cell) height; bulk heights are uniform in 0..depth_um
    "brightness_photons": 400.0,   # detected photons per fluorophore per frame at full excitation (I/I0 = 1)
    "background_photons": 2.0,     # uniform background per pixel per frame
    "read_noise_e": 1.6,           # camera read noise, e- rms
    "d_bulk_um2_s": 0.5,           # diffusion coefficient in the volume (3D)
    "d_surface_um2_s": 0.05,       # lateral diffusion in the near-surface band (2D)
    "dt_s": 0.05,                  # frame time (the desktop app's 50 ms timer)
    "seed": 1,
}

# Refractive-index presets offered by the web controls (textbook values).
MEDIA = {
    "n1": [["Glass / oil", 1.518], ["Fused silica", 1.458], ["Sapphire", 1.77]],
    "n2": [["Water", 1.333], ["Cytosol, approx.", 1.38], ["Air", 1.0]],
}

# Common laser lines (nm) for the wavelength buttons.
LASER_LINES_NM = [405, 488, 561, 640]
