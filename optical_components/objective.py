from .base import OpticalComponent, Ray
from typing import List, Tuple
import numpy as np
from ..utils.vector_math import normalize

class Objective(OpticalComponent):
    def __init__(self, position: Tuple[float, float, float], orientation: Tuple[float, float, float],
                 magnification: float, numerical_aperture: float):
        super().__init__(position, orientation)
        self.magnification = magnification
        self.numerical_aperture = numerical_aperture

    def interact_with_light(self, ray: Ray) -> List[Ray]:
        # Simplified interaction: bending light towards optical axis
        optical_axis = self.orientation
        bend_factor = 0.1 * self.numerical_aperture
        new_direction = normalize(ray.direction + optical_axis * bend_factor)
        return [Ray(self.position, new_direction, ray.wavelength)]

    def get_schematic_representation(self):
        return ('circle', self.position[:2], self.orientation[:2], (30, 30))  # Fixed size for visibility
