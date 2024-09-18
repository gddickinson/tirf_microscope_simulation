# tirf_sim/gui/light_table_view.py

import pyqtgraph as pg
import numpy as np
from PyQt5.QtWidgets import QWidget, QVBoxLayout
from PyQt5.QtCore import pyqtSignal
from ..logger import logger

class LightTableView(QWidget):
    component_moved = pyqtSignal(int, object)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.layout = QVBoxLayout(self)
        self.plot_widget = pg.PlotWidget()
        self.layout.addWidget(self.plot_widget)

        self.plot_widget.setAspectLocked(True)
        self.plot_widget.setXRange(0, 1000)
        self.plot_widget.setYRange(0, 1000)

        self.components = []
        self.rays = []

    def update_light_table(self, components, rays):
        self.components = components
        self.rays = rays
        self.update_display()

    def update_display(self):
        try:
            self.plot_widget.clear()

            # Draw components
            for shape, pos, orientation, size in self.components:
                if shape == 'rectangle':
                    x, y = pos[0], pos[1]
                    w, h = size[0], size[1]
                    rect_points = [
                        (x - w/2, y - h/2), (x + w/2, y - h/2),
                        (x + w/2, y + h/2), (x - w/2, y + h/2),
                        (x - w/2, y - h/2)
                    ]
                    rect = pg.PlotDataItem(x=[p[0] for p in rect_points],
                                           y=[p[1] for p in rect_points],
                                           pen=pg.mkPen('w'))
                    self.plot_widget.addItem(rect)
                elif shape == 'circle':
                    circle = pg.ScatterPlotItem([pos[0]], [pos[1]], size=size[0], pen=pg.mkPen('w'), brush=pg.mkBrush(None))
                    self.plot_widget.addItem(circle)

            # Draw rays
            for ray in self.rays:
                start = ray.origin[:2]  # Use only x and y coordinates
                end = start + ray.direction[:2] * ray.length
                line = pg.PlotDataItem([start[0], end[0]], [start[1], end[1]], pen=pg.mkPen('r', width=2))
                self.plot_widget.addItem(line)

            self.plot_widget.autoRange()
            logger.debug("Light table display updated successfully")
        except Exception as e:
            logger.error(f"Error updating light table display: {str(e)}")
