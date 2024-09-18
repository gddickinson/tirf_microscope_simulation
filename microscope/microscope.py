from typing import List
from ..optical_components.base import OpticalComponent, Ray

class Microscope:
    def __init__(self):
        self.components: List[OpticalComponent] = []
        self.mode = "TIRF"

    def add_component(self, component: OpticalComponent):
        self.components.append(component)

    def set_mode(self, mode: str):
        if mode in ["TIRF", "Epifluorescence"]:
            self.mode = mode
        else:
            raise ValueError("Invalid microscope mode")

    def simulate_light_path(self, initial_ray: Ray) -> List[Ray]:
        rays = [initial_ray]
        for component in self.components:
            new_rays = component.interact_with_light(rays[-1])
            if new_rays:
                rays.extend(new_rays)
            else:
                break  # Light was absorbed or reflected away
        return rays
