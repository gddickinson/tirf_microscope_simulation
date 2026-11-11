"""Write tests/fixtures/engine_fixture.json: numbers from the repository's Python code (physics/ and the desktop
Laser/Camera/LightTable classes) that the JavaScript engines (web/static/*.test.mjs) are tested against.

Run after changing physics/, optical_components/, simulation/ or web/reference.py:
    python scripts/make_engine_fixture.py
tests/test_web.py fails if the committed fixture is out of date.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web.reference import fixture  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "engine_fixture.json"


def main():
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(json.dumps(fixture(), separators=(",", ":"), sort_keys=True))
    print(f"wrote {FIXTURE} ({FIXTURE.stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()
