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
        return Ray(self.position, direction, self.wavelength)


    def calculate_direction(self):
        # Calculate direction based on angles
        direction = np.array([
            np.cos(self.angle_y) * np.sin(self.angle_x),
            np.sin(self.angle_y),
            np.cos(self.angle_y) * np.cos(self.angle_x)
        ])
        return direction / np.linalg.norm(direction)

    def set_angles(self, angle_x, angle_y):
        self.angle_x = angle_x
        self.angle_y = angle_y
