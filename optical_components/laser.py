# tirf_sim/optical_components/laser.py

from .base import OpticalComponent, Ray
import numpy as np
from ..logger import logger

class Laser(OpticalComponent):
    def __init__(self, position, orientation, wavelength, power):
        super().__init__(position, orientation)
        self.wavelength = wavelength
        self.power = power
        self.angle_x = 0
        self.angle_y = 0

    def emit_light(self):
        direction = self.calculate_direction()
        logger.debug(f"Laser emitting light from {self.position} in direction {direction}")
        # power is in % of full scale; the ray carries it as a relative intensity
        return Ray(self.position, direction, self.wavelength, intensity=self.power / 100.0)


    def calculate_direction(self):
        """Beam direction: the laser's orientation deflected by angle_x within the table plane (about the table
        normal, +z) and by angle_y out of it (radians). With both angles 0 the beam leaves along the orientation."""
        forward = self.orientation / np.linalg.norm(self.orientation)
        up_ref = np.array([0.0, 0.0, 1.0]) if abs(forward[2]) < 0.999 else np.array([0.0, 1.0, 0.0])
        side = np.cross(up_ref, forward)
        side = side / np.linalg.norm(side)
        up = np.cross(forward, side)
        direction = (np.cos(self.angle_y) * np.cos(self.angle_x) * forward
                     + np.cos(self.angle_y) * np.sin(self.angle_x) * side
                     + np.sin(self.angle_y) * up)
        return direction / np.linalg.norm(direction)

    def set_angles(self, angle_x, angle_y):
        self.angle_x = angle_x
        self.angle_y = angle_y
