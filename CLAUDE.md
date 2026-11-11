# tirf_microscope_simulation

TIRF microscope simulator: a PyQt5 desktop app (`python main.py`) and a web interface (`python run_web.py`,
static GitHub Pages site built by `scripts/build_static.py`).

@INTERFACE.md

- The code imports itself as the package `tirf_sim`; `package_loader.load_package()` registers the repo under that
  name whatever the folder is called. Use it in scripts and tests.
- `physics/` is the Python reference for the JS engines in `web/static/`; after changing physics/, optical_components/,
  simulation/ or web/reference.py run `python scripts/make_engine_fixture.py` (tests fail if the fixture is stale).
- Keep files under 500 lines; update INTERFACE.md and SESSION_LOG.md when the structure changes.
- Tests: `python -m pytest -q tests/`.
