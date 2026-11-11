"""FastAPI web app for the TIRF Microscope Simulation: serves the front end in static/ and the JSON API under /api.

Run with `python run_web.py` (http://127.0.0.1:8203, local only). `scripts/build_static.py` exports every path in
STATIC_ENDPOINTS to JSON for the GitHub Pages site, so keep that list in step with the GET routes below. /optics and
/table take query parameters; on the static site static_api.js answers them with the JS engines instead.
"""
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from web.reference import fixture, light_table, table_setup  # registers the package as tirf_sim
from tirf_sim import __version__
from tirf_sim.optical_components import __all__ as COMPONENTS
from tirf_sim.physics import DEFAULTS, optics_summary, evanescent_intensity, penetration_depth_nm
from tirf_sim.physics.defaults import MEDIA, LASER_LINES_NM
from tirf_sim.microscope.default_setup import ANGLE_RANGE_DEG, POWER_RANGE, POWER_SLIDER_DEFAULT

STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="TIRF Microscope Simulation")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/info")
def info():
    """Project summary and counts for the home page."""
    d = DEFAULTS
    s = optics_summary(d["wavelength_nm"], d["angle_deg"], d["n1"], d["n2"], d["na"])
    return {"title": "TIRF Microscope Simulation", "version": __version__,
            "component_classes": [c for c in COMPONENTS if c not in ("OpticalComponent", "Ray")],
            "default_penetration_depth_nm": s["penetration_depth_nm"],
            "default_critical_angle_deg": s["critical_angle_deg"],
            "fluorophores": d["n_surface"] + d["n_bulk"],
            "pixel_nm": d["camera_pixel_um"] * 1000 / d["magnification"]}


@app.get("/api/presets")
def presets():
    """Defaults and choices for the controls (physics/defaults.py, microscope/default_setup.py)."""
    return {"defaults": DEFAULTS, "media": MEDIA, "laser_lines_nm": LASER_LINES_NM,
            "table": dict(table_setup(), angle_range_deg=list(ANGLE_RANGE_DEG), power_range=list(POWER_RANGE),
                          power_default=POWER_SLIDER_DEFAULT)}


@app.get("/api/optics")
def optics(wavelength_nm: float = Query(DEFAULTS["wavelength_nm"], gt=0), angle_deg: float = Query(DEFAULTS["angle_deg"], ge=0, lt=90),
           n1: float = Query(DEFAULTS["n1"], gt=0), n2: float = Query(DEFAULTS["n2"], gt=0), na: float = Query(DEFAULTS["na"], gt=0)):
    """Interface quantities and the intensity profile I(z)/I0 for z = 0..500 nm in 10 nm steps (Python physics)."""
    out = optics_summary(wavelength_nm, angle_deg, n1, n2, na)
    d = penetration_depth_nm(wavelength_nm, angle_deg, n1, n2)
    out["profile"] = [[z, evanescent_intensity(z, d)] for z in range(0, 501, 10)]
    return out


@app.get("/api/table")
def table(ax_deg: float = Query(0.0, ge=-90, le=90), ay_deg: float = Query(0.0, ge=-90, le=90),
          power: float = Query(100.0, ge=0, le=100)):
    """One frame of the desktop light table (angles in degrees, power in %), computed by the real Laser/Camera classes."""
    return light_table(ax_deg, ay_deg, power)


@app.get("/api/check")
def check():
    """Python reference values that the Cross-check page compares the browser engines against."""
    return fixture()


# GET paths (without the /api prefix) written to the static site as api/<path>.json.
STATIC_ENDPOINTS = ["/info", "/presets", "/check"]
