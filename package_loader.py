"""Import this repository as the package `tirf_sim`, whatever its folder is called.

The modules import each other as `tirf_sim.*` (and with relative imports), which used to work only when the
repository folder was named tirf_sim. load_package() registers the repository root under that name, so
`python main.py`, the web app and the tests work from a normal clone (folder tirf_microscope_simulation).
"""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = "tirf_sim"


def load_package():
    """Return the `tirf_sim` package, registering the repository root under that name on first use."""
    if NAME in sys.modules:
        return sys.modules[NAME]
    spec = importlib.util.spec_from_file_location(NAME, ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[NAME] = module
    spec.loader.exec_module(module)
    return module
