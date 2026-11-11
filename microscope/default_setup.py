"""The desktop app's default optical table (Qt-free, shared by gui/main_window.py and the web app).

Positions are in light-table units (the model has no physical length unit); the camera has 1000 x 1000 pixels of
1 unit. Laser angles are the GUI slider values in degrees.
"""
from ..optical_components import Laser, Camera

LASER = {"position": (100, 500, 0), "orientation": (1, 0, 0), "wavelength": 488, "power": 100}
CAMERA = {"position": (600, 500, 0), "orientation": (-1, 0, 0)}
ANGLE_RANGE_DEG = (-30, 30)   # Laser Angle X / Y sliders
POWER_RANGE = (0, 100)        # Laser Power slider
POWER_SLIDER_DEFAULT = 50


def build_default_components():
    """A new Laser and Camera at the desktop app's default positions."""
    return [Laser(**LASER), Camera(**CAMERA)]
