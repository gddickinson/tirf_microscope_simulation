# tirf_sim/simulation/engine.py

import numpy as np
from .light_table import LightTable
from ..logger import logger

class SimulationEngine:
    def __init__(self, microscope):
        self.microscope = microscope
        self.light_table = LightTable()
        self.is_running = False
        self.setup_light_table()

    def setup_light_table(self):
        for component in self.microscope.components:
            self.light_table.add_component(component)
        logger.info(f"Light table set up with {len(self.microscope.components)} components")

    def get_image(self):
        if self.is_running:
            try:
                self.light_table.simulate_light_path()
                image = self.light_table.get_image()
                logger.debug(f"Generated image with shape {image.shape}")
                return image
            except Exception as e:
                logger.error(f"Error generating image: {str(e)}")
                return np.zeros((100, 100), dtype=np.uint8)
        return np.zeros((100, 100), dtype=np.uint8)

    def get_schematic_representation(self):
        return self.light_table.get_schematic_representation()

    def get_rays(self):
        return self.light_table.rays

    def start(self):
        self.is_running = True
        logger.info("Simulation started")

    def stop(self):
        self.is_running = False
        logger.info("Simulation stopped")
