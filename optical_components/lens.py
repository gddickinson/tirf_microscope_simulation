from .base import OpticalComponent, Ray
from typing import List, Tuple
import numpy as np
from ..utils.vector_math import normalize

class Lens(OpticalComponent):
    def __init__(self, position: Tuple[float, float, float], orientation: Tuple[float, float, float],
                 focal_length: float, diameter: float):
        super().__init__(position, orientation)
        self.focal_length = focal_length
        self.diameter = diameter

    def interact_with_light(self, ray: Ray) -> List[Ray]:
        focal_point = self.position + self.orientation * self.focal_length
        to_focal = focal_point - ray.origin
        new_direction = normalize(ray.direction + to_focal * 0.1)
        return [Ray(self.position, new_direction, ray.wavelength)]

    def get_schematic_representation(self):
        return ('circle', self.position[:2], self.orientation[:2], (self.diameter, self.diameter))
