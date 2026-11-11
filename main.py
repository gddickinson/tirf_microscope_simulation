#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Aug 19 09:16:59 2024

@author: george

Start the desktop TIRF simulation (PyQt5): python main.py
"""
import os
import sys

# The code imports itself as the package 'tirf_sim'; register the repository under that name
# so this works whatever the clone's folder is called.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from package_loader import load_package  # noqa: E402

load_package()

from tirf_sim.gui.main_window import run_gui  # noqa: E402

if __name__ == "__main__":
    run_gui()
