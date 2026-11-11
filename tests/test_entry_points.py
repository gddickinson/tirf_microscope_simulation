"""Regression tests for the desktop entry point and the camera view.

main.py imports the code as the package `tirf_sim`, which used to work only when the repository folder itself was
named tirf_sim (a clone is named tirf_microscope_simulation), so `python main.py` failed with ModuleNotFoundError.

Run: python -m pytest -q tests/test_entry_points.py
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.mark.parametrize("module", ["PyQt5", "pyqtgraph"])
def test_gui_dependencies_present(module):
    pytest.importorskip(module)


def test_main_imports_whatever_the_folder_name():
    pytest.importorskip("PyQt5")
    pytest.importorskip("pyqtgraph")
    env = dict(os.environ, QT_QPA_PLATFORM="offscreen", PYTHONDONTWRITEBYTECODE="1")
    r = subprocess.run([sys.executable, "-c", "import main; print(main.run_gui.__module__)"],
                       cwd=ROOT, env=env, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr[-2000:]
    assert "tirf_sim.gui.main_window" in r.stdout


def test_package_loader_registers_tirf_sim():
    sys.path.insert(0, str(ROOT))
    from package_loader import load_package
    pkg = load_package()
    assert pkg.__name__ == "tirf_sim"
    from tirf_sim.optical_components import Laser
    assert Laser.__module__ == "tirf_sim.optical_components.laser"
