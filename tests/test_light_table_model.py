"""Regression tests for the desktop light-table model (laser -> camera).

Run: python -m pytest -q tests/test_light_table_model.py
"""
import math
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from package_loader import load_package  # noqa: E402

load_package()

from tirf_sim.optical_components import Laser  # noqa: E402
from tirf_sim.microscope.default_setup import ANGLE_RANGE_DEG  # noqa: E402
from web.reference import light_table  # noqa: E402


# 1. The laser honours its orientation: angles are deflections about it, not about +z.
@pytest.mark.parametrize("orientation", [(1, 0, 0), (0, 1, 0), (0, 0, 1), (-1, 0, 0), (1, 1, 0)])
def test_laser_points_along_its_orientation(orientation):
    laser = Laser((0, 0, 0), orientation, 488, 100)
    o = np.array(orientation, float)
    np.testing.assert_allclose(laser.calculate_direction(), o / np.linalg.norm(o), atol=1e-12)


def test_laser_angles_deflect_in_the_table_plane_and_out_of_it():
    laser = Laser((0, 0, 0), (1, 0, 0), 488, 100)
    laser.set_angles(math.radians(20), 0)
    np.testing.assert_allclose(laser.calculate_direction(), [math.cos(math.radians(20)), math.sin(math.radians(20)), 0], atol=1e-12)
    laser.set_angles(0, math.radians(15))
    np.testing.assert_allclose(laser.calculate_direction(), [math.cos(math.radians(15)), 0, math.sin(math.radians(15))], atol=1e-12)


def test_camera_hit_across_the_slider_range():
    centre = light_table(0, 0)["hit"]
    np.testing.assert_allclose(centre, [500, 500], atol=1e-9)  # beam along the axis lands at the sensor centre
    lo, hi = ANGLE_RANGE_DEG
    for ax in range(lo, hi + 1, 5):
        for ay in range(lo, hi + 1, 5):
            r = light_table(ax, ay)
            assert r["hit"] is not None, (ax, ay)
            assert np.sign(r["hit"][0] - 500) == np.sign(ax) and np.sign(r["hit"][1] - 500) == np.sign(ay)
            # camera 500 units from the laser: offsets 500 tan(ax) and 500 tan(ay) / cos(ax)
            np.testing.assert_allclose(r["hit"], [500 + 500 * math.tan(math.radians(ax)),
                                                  500 + 500 * math.tan(math.radians(ay)) / math.cos(math.radians(ax))], atol=1e-6)
