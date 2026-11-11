"""Regression test: the desktop Camera View showed a blank/garbled picture.

Camera images are float64 arrays (0..255), but MainWindow.display_image handed their raw bytes to a QImage as
8-bit greyscale, so each pixel was read as one byte of a float and the spot never appeared where it was.

Run: python -m pytest -q tests/test_camera_view.py
"""
import os
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from package_loader import load_package  # noqa: E402

load_package()


def test_to_gray8_converts_float_images():
    from tirf_sim.utils.image import to_gray8
    img = np.zeros((4, 6))
    img[1, 2] = 255.0
    img[3, 5] = 300.0  # clipped
    g = to_gray8(img)
    assert g.dtype == np.uint8 and g.flags["C_CONTIGUOUS"] and g.shape == (4, 6)
    assert g[1, 2] == 255 and g[3, 5] == 255 and g.sum() == 510


def test_camera_view_shows_spot_where_it_is():
    pytest.importorskip("PyQt5")
    pytest.importorskip("pyqtgraph")
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    from PyQt5.QtWidgets import QApplication
    app = QApplication.instance() or QApplication([])  # noqa: F841
    from tirf_sim.gui.main_window import MainWindow
    w = MainWindow()
    w.timer.stop()
    img = np.zeros((1000, 1000))
    img[800:900, 100:200] = 255.0  # bright square, lower left
    w.display_image(img)
    q = w.image_label.pixmap().toImage()  # scaled to 400 x 400
    assert q.pixelColor(60, 340).red() > 200
    assert q.pixelColor(300, 60).red() == 0
