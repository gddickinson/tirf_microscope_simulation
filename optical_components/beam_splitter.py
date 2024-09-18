from .base import OpticalComponent, Ray
from typing import List, Tuple
import numpy as np
from ..utils.vector_math import reflect, normalize

class BeamSplitter(OpticalComponent):
    def __init__(self, position: Tuple[float, float, float], orientation: Tuple[float, float, float],
                 split_ratio: float):
        super().__init__(position, orientation)
        self.split_ratio = split_ratio

    def interact_with_light(self, ray: Ray) -> List[Ray]:
        normal = np.cross(self.orientation, [0, 1, 0])
        normal = normalize(normal)

        reflected_direction = reflect(ray.direction, normal)
        transmitted_direction = ray.direction

        return [
            Ray(self.position, reflected_direction, ray.wavelength),
            Ray(self.position, transmitted_direction, ray.wavelength)
        ]
