import numpy as np
from ..utils.vector_math import normalize

class OpticalComponent:
    def __init__(self, position, orientation):
        self.position = np.array(position)
        self.orientation = normalize(np.array(orientation))
        self.is_on = True
        self.size = (20, 20)  # Default size for schematic view

    def interact_with_light(self, ray):
        raise NotImplementedError("Subclass must implement abstract method")

    def get_schematic_representation(self):
        return ('rectangle', self.position[:2], self.orientation[:2], self.size)

    def turn_on(self):
        self.is_on = True

    def turn_off(self):
        self.is_on = False

class Ray:
    def __init__(self, origin, direction, wavelength, length=1000):
        self.origin = np.array(origin)
        self.direction = normalize(np.array(direction))
        self.wavelength = wavelength
        self.length = length
