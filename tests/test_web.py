"""Web interface tests: every exported endpoint answers, the static build is complete, and the JS engine tests pass.

Run: python -m pytest -q tests/test_web.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402

client = TestClient(app)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200 and "static/main.js" in r.text


@pytest.mark.parametrize("path", STATIC_ENDPOINTS)
def test_endpoint(path):
    r = client.get("/api" + path)
    assert r.status_code == 200, r.text
    assert r.json() is not None


def test_static_build(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    assert (tmp_path / "site" / "index.html").read_text().count("APP_STATIC") == 1
    for path in STATIC_ENDPOINTS:
        assert (tmp_path / "site" / "api" / (path.strip("/") + ".json")).exists()


def test_static_assets_referenced_exist():
    html = (STATIC / "index.html").read_text()
    for name in ("style.css", "main.js"):
        assert f"static/{name}" in html and (STATIC / name).exists()


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_js_engine():
    tests = sorted(STATIC.glob("*.test.mjs"))
    for t in tests:
        r = subprocess.run(["node", str(t)], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr


# --- project-specific -------------------------------------------------------------------------------------------
import json  # noqa: E402
import math  # noqa: E402

from web.reference import fixture, close  # noqa: E402
from tirf_sim.physics import penetration_depth_nm, critical_angle_deg, refraction_angle_deg  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "engine_fixture.json"


def test_fixture_is_current():
    """The committed JS fixture still matches the Python code (regenerate: python scripts/make_engine_fixture.py)."""
    old, new = json.loads(FIXTURE.read_text()), fixture()
    noisy_old, noisy_new = old["imaging"].pop("noisy_tirf"), new["imaging"].pop("noisy_tirf")
    assert close(new, old), "fixture out of date: run python scripts/make_engine_fixture.py"
    # Poisson draws compare uniforms with exp(); allow a last-digit libm difference to flip a rare pixel
    differ = sum(abs(a - b) > 1e-6 * max(1, abs(b)) for a, b in zip(noisy_new, noisy_old))
    assert len(noisy_new) == len(noisy_old) and differ <= len(noisy_old) * 1e-3


def test_physics_known_values():
    # glass 1.518 / water 1.333, 488 nm at 66 deg (hand check: 488 / (4 pi sqrt(1.3868^2 - 1.333^2)))
    assert math.isclose(critical_angle_deg(1.518, 1.333), 61.4175, abs_tol=1e-4)
    assert math.isclose(penetration_depth_nm(488, 66, 1.518, 1.333), 101.556, abs_tol=1e-3)
    assert math.isinf(penetration_depth_nm(488, 60, 1.518, 1.333))
    assert refraction_angle_deg(66, 1.518, 1.333) is None
    assert math.isclose(refraction_angle_deg(30, 1.518, 1.333), math.degrees(math.asin(1.518 * 0.5 / 1.333)))
    # d scales with wavelength
    assert math.isclose(penetration_depth_nm(640, 66, 1.518, 1.333) / penetration_depth_nm(320, 66, 1.518, 1.333), 2)


def test_optics_endpoint():
    r = client.get("/api/optics?wavelength_nm=488&angle_deg=66&n1=1.518&n2=1.333").json()
    assert r["tir"] and math.isclose(r["penetration_depth_nm"], 101.556, abs_tol=1e-3)
    assert r["profile"][0] == [0, 1.0] and len(r["profile"]) == 51
    below = client.get("/api/optics?angle_deg=45").json()
    assert below["tir"] is False and below["penetration_depth_nm"] is None
    assert client.get("/api/optics?angle_deg=95").status_code == 422


def test_table_endpoint_uses_desktop_classes():
    hit = client.get("/api/table?ax_deg=30&ay_deg=0").json()
    assert hit["hit"] is not None and math.isclose(hit["hit"][0], 500 + 500 * math.tan(math.radians(30)), rel_tol=1e-9)
    assert hit["image_max"] == 255
    miss = client.get("/api/table?ax_deg=60&ay_deg=0").json()
    assert miss["hit"] is None and miss["image_sum"] == 0
