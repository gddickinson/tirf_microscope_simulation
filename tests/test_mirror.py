import unittest
import numpy as np
from ..optical_components.mirror import Mirror
from ..optical_components.base import Ray

class TestMirror(unittest.TestCase):
    def setUp(self):
        self.mirror = Mirror(position=(0, 0, 0), orientation=(0, 1, 0), size=(1, 1))

    def test_mirror_reflection(self):
        incoming_ray = Ray(origin=(-1, 0, 0), direction=(1, 0, 0), wavelength=500)
        reflected_rays = self.mirror.interact_with_light(incoming_ray)

        self.assertEqual(len(reflected_rays), 1)
        reflected_ray = reflected_rays[0]

        expected_direction = np.array([1, 0, 0])
        np.testing.assert_array_almost_equal(reflected_ray.direction, expected_direction)

if __name__ == '__main__':
    unittest.main()
