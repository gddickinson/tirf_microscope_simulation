"""Start the TIRF Microscope Simulation web app on http://127.0.0.1:8203 (local only).

Run: python run_web.py [--port 8203]
Needs: pip install -r requirements-web.txt
"""
import argparse
import sys
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8203)
    port = ap.parse_args().port
    print(f"TIRF Microscope Simulation web app: http://127.0.0.1:{port}")
    uvicorn.run("web.app:app", host="127.0.0.1", port=port)
