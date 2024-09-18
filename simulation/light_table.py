# tirf_sim/simulation/light_table.py

import numpy as np
from ..optical_components import Laser, Mirror, Lens, BeamSplitter, Filter, Objective, Camera, Ray
from ..logger import logger

class LightTable:
    def __init__(self, size=(1000, 1000)):
        self.size = size
        self.components = []
        self.rays = []

    def add_component(self, component):
        self.components.append(component)
        logger.info(f"Added component: {type(component).__name__}")

    def simulate_light_path(self):
        try:
            self.rays = []
            laser = next((comp for comp in self.components if isinstance(comp, Laser)), None)
            camera = next((comp for comp in self.components if isinstance(comp, Camera)), None)

            if laser and laser.is_on and camera:
                # Create a ray that extends far beyond the camera
                initial_ray = laser.emit_light()
                extended_ray = self.extend_ray(initial_ray, camera.position)
                self.rays = [extended_ray]

                for component in self.components:
                    if not isinstance(component, Laser):
                        component.interact_with_light(extended_ray)

            logger.debug(f"Simulated light path with {len(self.rays)} rays")
        except Exception as e:
            logger.error(f"Error simulating light path: {str(e)}")

    def extend_ray(self, ray, target_position):
        distance = np.linalg.norm(target_position - ray.origin)
        extended_ray = Ray(ray.origin, ray.direction, ray.wavelength, distance * 3)  # Increased from 2 to 3
        logger.debug(f"Extended ray: origin={extended_ray.origin}, direction={extended_ray.direction}, length={extended_ray.length}")
        return extended_ray

    def get_schematic_representation(self):
        return [component.get_schematic_representation() for component in self.components]

    def get_rays(self):
        return self.rays

    def get_image(self, size=(100, 100)):
        try:
            image = np.zeros(size)
            objective = next((comp for comp in self.components if isinstance(comp, Objective)), None)
            if objective and self.rays:
                # Project the last ray onto the image plane
                last_ray = self.rays[-1]
                x = int(size[0] / 2 + last_ray.direction[0] * 20)
                y = int(size[1] / 2 + last_ray.direction[1] * 20)

                # Create a Gaussian spot
                for i in range(size[0]):
                    for j in range(size[1]):
                        distance = np.sqrt((i - x)**2 + (j - y)**2)
                        image[j, i] = 255 * np.exp(-distance**2 / (2 * 5**2))  # 5 is the standard deviation

            logger.debug(f"Generated image with shape {image.shape}")
            return np.clip(image, 0, 255).astype(np.uint8)
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            return np.zeros(size, dtype=np.uint8)
