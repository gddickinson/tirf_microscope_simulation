# tirf_sim/optical_components/camera.py

from .base import OpticalComponent
import numpy as np
from scipy.stats import multivariate_normal
from ..logger import logger

class Camera(OpticalComponent):
    def __init__(self, position, orientation, sensor_size=(1000, 1000)):  # Increased from (100, 100)
        super().__init__(position, orientation)
        self.sensor_size = sensor_size
        self.size = (100, 100)  # Size for schematic representation
        self.image = np.zeros(sensor_size)
        self.pixel_size = 1  # Increased from 0.1

    def interact_with_light(self, ray):
        if not self.is_on:
            return []

        intersection = self.ray_intersection(ray)
        if intersection is not None:
            x, y = intersection
            logger.debug(f"Ray intersected camera at pixel coordinates: ({x:.2f}, {y:.2f})")
            self.add_diffraction_spot(x, y)
        else:
            logger.debug("Ray did not intersect with camera sensor")
        return []

    def ray_intersection(self, ray):
        plane_normal = self.orientation
        plane_point = self.position

        logger.debug(f"Camera position: {self.position}, orientation: {self.orientation}")
        logger.debug(f"Ray origin: {ray.origin}, direction: {ray.direction}, length: {ray.length}")

        denominator = np.dot(plane_normal, ray.direction)
        if abs(denominator) > 1e-6:
            t = np.dot(plane_normal, plane_point - ray.origin) / denominator
            logger.debug(f"Intersection parameter t: {t}")
            if 0 <= t <= ray.length:
                intersection_point = ray.origin + t * ray.direction
                logger.debug(f"Intersection point: {intersection_point}")
                local_x = np.dot(intersection_point - self.position, self.get_local_x())
                local_y = np.dot(intersection_point - self.position, self.get_local_y())
                logger.debug(f"Local coordinates: x={local_x}, y={local_y}")
                logger.debug(f"Sensor size: {self.sensor_size}, Pixel size: {self.pixel_size}")

                if (0 <= local_x < self.sensor_size[0] * self.pixel_size and
                    0 <= local_y < self.sensor_size[1] * self.pixel_size):
                    pixel_x = local_x / self.pixel_size
                    pixel_y = local_y / self.pixel_size
                    logger.debug(f"Intersection at pixel: ({pixel_x}, {pixel_y})")
                    return pixel_x, pixel_y
                else:
                    logger.debug("Intersection outside sensor area")
            else:
                logger.debug("Intersection beyond ray length")
        else:
            logger.debug("Ray is parallel to camera plane")
        return None

    def get_local_x(self):
        return np.cross(self.orientation, [0, 0, 1])

    def get_local_y(self):
        return np.cross(self.get_local_x(), self.orientation)

    def add_diffraction_spot(self, x, y):
        # Create a 2D Gaussian to represent the diffraction-limited spot
        sigma = 5  # Increased from 1
        x_range = np.arange(max(0, int(x)-20), min(self.sensor_size[0], int(x)+21))
        y_range = np.arange(max(0, int(y)-20), min(self.sensor_size[1], int(y)+21))
        xx, yy = np.meshgrid(x_range, y_range)
        gaussian = multivariate_normal.pdf(np.dstack((xx, yy)), mean=[x, y], cov=[[sigma, 0], [0, sigma]])

        # Normalize and add to the image
        gaussian_normalized = gaussian / gaussian.max() * 255
        self.image[y_range[0]:y_range[-1]+1, x_range[0]:x_range[-1]+1] = np.maximum(
            self.image[y_range[0]:y_range[-1]+1, x_range[0]:x_range[-1]+1],
            gaussian_normalized
        )
        logger.debug(f"Added diffraction spot at ({x:.2f}, {y:.2f})")

    def get_image(self):
        return self.image if self.is_on else np.zeros_like(self.image)

    def clear_image(self):
        self.image.fill(0)
