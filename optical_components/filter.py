from .base import OpticalComponent, Ray
from typing import List, Tuple

class Filter(OpticalComponent):
    def __init__(self, position: Tuple[float, float, float], orientation: Tuple[float, float, float],
                 pass_band: Tuple[float, float]):
        super().__init__(position, orientation)
        self.pass_band = pass_band

    def interact_with_light(self, ray: Ray) -> List[Ray]:
        if self.pass_band[0] <= ray.wavelength <= self.pass_band[1]:
            return [Ray(self.position, ray.direction, ray.wavelength)]
        else:
            return []
