# In optical_components/mirror.py

import numpy as np
from .base import OpticalComponent, Ray
from ..utils.vector_math import normalize, reflect

class Mirror(OpticalComponent):
    def __init__(self, position, orientation, size):
        super().__init__(position, orientation)
        self.size = np.array(size)

    def interact_with_light(self, ray):
        # Calculate the normal vector of the mirror
        normal = np.cross(self.orientation, [0, 1, 0])
        if np.allclose(normal, 0):
            normal = np.array([0, 0, 1])  # Default normal if cross product is zero
        else:
            normal = normalize(normal)

        # Calculate the reflection
        reflected_direction = reflect(ray.direction, normal)

        # Create and return the reflected ray
        return [Ray(self.position, reflected_direction, ray.wavelength, ray.intensity)]
