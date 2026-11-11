# INTERFACE.md: navigation map

The repository root is the Python package `tirf_sim` (modules import `tirf_sim.*` and use relative imports).
`package_loader.load_package()` registers it under that name from any clone folder.

## Entry points
| File | Purpose |
|---|---|
| `main.py` | Desktop app: `load_package()` then `tirf_sim.gui.main_window.run_gui()` |
| `run_web.py` | Web app on http://127.0.0.1:8203 (uvicorn `web.app:app`) |
| `package_loader.py` | `load_package()`: import the repo as `tirf_sim` |
| `logger.py` | `logger` (logging, DEBUG to console) |

## Desktop model
| Module | Contents |
|---|---|
| `optical_components/base.py` | `OpticalComponent` (position, orientation, on/off, schematic), `Ray` (origin, direction, wavelength, length, intensity) |
| `optical_components/laser.py` | `Laser`: `emit_light()` (ray intensity = power/100), `calculate_direction()` (orientation deflected by angle_x/angle_y), `set_angles()` |
| `optical_components/camera.py` | `Camera`: `ray_intersection()`, `add_diffraction_spot()` (Gaussian, sigma 5 px), `get_image()`, `clear_image()` |
| `optical_components/{mirror,lens,beam_splitter,filter,objective}.py` | Other components (not in the default table) |
| `microscope/microscope.py` | `Microscope`: component list, mode TIRF/Epifluorescence, `simulate_light_path()` |
| `microscope/default_setup.py` | `build_default_components()`, `LASER`, `CAMERA`, slider ranges (shared by GUI and web) |
| `simulation/light_table.py` | `LightTable`: `simulate_light_path()` (laser ray, extended 3x to the camera), schematic |
| `simulation/engine.py` | `SimulationEngine`: start/stop, wraps `LightTable` |
| `gui/main_window.py` | `MainWindow` (docks: controls, Camera View, Light Table View), `run_gui()` |
| `gui/light_table_view.py` | `LightTableView` (pyqtgraph top view) |
| `gui/schematic_view.py` | `SchematicView` (QPainter, unused) |
| `utils/vector_math.py` | `normalize`, `reflect` |
| `utils/image.py` | `to_gray8` (float image to uint8 for QImage) |

## Physics (pure Python, no Qt; reference for the JS engines)
| Module | Contents |
|---|---|
| `physics/defaults.py` | `DEFAULTS` (laser, indices, objective, camera, sample; units in names), `MEDIA`, `LASER_LINES_NM` |
| `physics/tirf_optics.py` | `critical_angle_deg`, `refraction_angle_deg`, `penetration_depth_nm`, `evanescent_intensity`, `max_objective_angle_deg`, `optics_summary` |
| `physics/tirf_imaging.py` | `erf` (A&S 7.1.26), `make_sample`, `step_sample`, `excitation`, `render_expected`, `add_noise`, `signal_split`, `sample_pixel_nm`, `psf_sigma_nm` |
| `physics/rng.py` | `mulberry32` (= core.js `rng`), `normal`, `poisson` |

## Web interface
| File | Contents |
|---|---|
| `web/app.py` | FastAPI: `/api/info`, `/api/presets`, `/api/optics`, `/api/table`, `/api/check`; `STATIC_ENDPOINTS` |
| `web/reference.py` | `light_table(ax, ay)` via the real classes, `fixture()` for JS tests, `close()` |
| `web/static/index.html`, `main.js`, `core.js`, `style.css` | Shell, router, shared kit (core.js/style.css unchanged from the kit) |
| `web/static/static_api.js` | Static-site `api()`: exported JSON, /optics and /table computed in JS |
| `web/static/tirf_optics.js` | JS port of tirf_optics.py + normal/Poisson, `DEFAULTS` |
| `web/static/tirf_imaging.js` | JS port of tirf_imaging.py |
| `web/static/light_table.js` | JS port of Laser/Camera/LightTable: `simulateTable`, `diffractionSpot` |
| `web/static/tirf_engine.test.mjs` | Node test of the three engines against `tests/fixtures/engine_fixture.json` |
| `web/static/ui.js` | Controls, readouts, `linePlot`, colour LUT, `drawImage` |
| `web/static/field.js` + `field_draw.js` | Evanescent field page |
| `web/static/imaging.js` + `imaging_draw.js` | TIRF vs widefield page (camera images, side view) |
| `web/static/home.js`, `table.js`, `check.js`, `about.js` | Other pages |
| `web/static/style_app.css`, `icon.svg` | Accent colours and page styles, icon |

## Scripts, tests, CI
| File | Purpose |
|---|---|
| `scripts/build_static.py` | Export the static site to `site/` |
| `scripts/screenshots.py` | Playwright smoke test and README images (`docs/img/`) |
| `scripts/make_engine_fixture.py` | Regenerate `tests/fixtures/engine_fixture.json` |
| `tests/test_mirror.py` | Mirror reflection |
| `tests/test_entry_points.py` | `main.py` imports from any folder name; `load_package` |
| `tests/test_camera_view.py` | Camera View shows the spot (`to_gray8`, offscreen Qt) |
| `tests/test_light_table_model.py` | Laser orientation and angles, camera hit over the slider range, power scaling, spot sigma |
| `tests/test_web.py` | API, static build, node engine test, fixture current, physics values |
| `.github/workflows/pages.yml` | Build and publish the static site on push to main |
