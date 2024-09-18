#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Aug 19 09:16:59 2024

@author: george
"""
import sys
import os

# Add the parent directory of 'tirf_sim' to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tirf_sim.gui.main_window import run_gui

if __name__ == "__main__":
    run_gui()
