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


# 2. Laser power scales the light delivered to the camera (power in % of full scale: peak 255 at 100).
@pytest.mark.parametrize("power", [0, 25, 50, 100])
def test_power_scales_the_camera_spot(power):
    r = light_table(10, -5, power)
    full = light_table(10, -5, 100)
    assert math.isclose(r["image_max"], 255 * power / 100, abs_tol=1e-9)
    assert math.isclose(r["image_sum"], full["image_sum"] * power / 100, rel_tol=1e-12, abs_tol=1e-9)


def test_ray_intensity_carried_through_components():
    from tirf_sim.optical_components import Ray, Mirror, Lens, Filter, Objective, BeamSplitter
    ray = Ray((0, 0, 0), (1, 0, 0), 500, intensity=0.4)
    assert Laser((0, 0, 0), (1, 0, 0), 488, 30).emit_light().intensity == pytest.approx(0.3)
    for comp in (Mirror((1, 0, 0), (0, 1, 0), (1, 1)), Lens((1, 0, 0), (1, 0, 0), 50, 10),
                 Filter((1, 0, 0), (1, 0, 0), (400, 600)), Objective((1, 0, 0), (1, 0, 0), 100, 1.49)):
        assert comp.interact_with_light(ray)[0].intensity == pytest.approx(0.4), type(comp).__name__
    refl, trans = BeamSplitter((1, 0, 0), (1, 0, 1), 0.25).interact_with_light(ray)
    assert refl.intensity == pytest.approx(0.1) and trans.intensity == pytest.approx(0.3)


def test_gui_laser_starts_at_the_power_slider_value():
    pytest.importorskip("PyQt5")
    pytest.importorskip("pyqtgraph")
    import os
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    from PyQt5.QtWidgets import QApplication
    app = QApplication.instance() or QApplication([])  # noqa: F841
    from tirf_sim.gui.main_window import MainWindow
    w = MainWindow()
    w.timer.stop()
    laser = next(c for c in w.microscope.components if isinstance(c, Laser))
    assert laser.power == w.laser_power_slider.value()
    w.laser_power_slider.setValue(80)
    assert laser.power == 80
