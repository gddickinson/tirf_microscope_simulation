import sys
import os

# Add the parent directory of 'tirf_sim' to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# tirf_sim/gui/main_window.py

from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                             QHBoxLayout, QPushButton, QComboBox, QLabel,
                             QDockWidget, QFrame, QListWidget, QSlider, QListWidgetItem)
from PyQt5.QtGui import QImage, QPixmap
from PyQt5.QtCore import Qt, QTimer
import numpy as np

from tirf_sim.simulation.engine import SimulationEngine
from tirf_sim.microscope.microscope import Microscope
from tirf_sim.optical_components import Laser, Mirror, Lens, Objective, Camera
from .light_table_view import LightTableView

from ..logger import logger


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("TIRF Microscope Simulation")
        self.resize(1200, 800)

        self.microscope = Microscope()
        self.setup_microscope()
        self.simulation_engine = SimulationEngine(self.microscope)

        self.setup_central_widget()
        self.setup_docks()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_simulation)
        self.timer.start(50)  # Update every 50 ms

    def setup_microscope(self):
        laser = Laser(position=(100, 500, 0), orientation=(1, 0, 0), wavelength=488, power=100)
        camera = Camera(position=(600, 500, 0), orientation=(-1, 0, 0))  # Moved closer to the laser

        logger.info(f"Laser set up at position {laser.position} with orientation {laser.orientation}")
        logger.info(f"Camera set up at position {camera.position} with orientation {camera.orientation}")

        self.microscope.add_component(laser)
        self.microscope.add_component(camera)

    def setup_central_widget(self):
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.central_layout = QVBoxLayout(self.central_widget)

        label = QLabel("TIRF Microscope Simulation")
        label.setAlignment(Qt.AlignCenter)
        self.central_layout.addWidget(label)

    def setup_docks(self):
        self.setup_component_control_dock()
        self.setup_camera_view_dock()
        self.setup_light_table_view_dock()

    def setup_component_control_dock(self):
        dock = QDockWidget("Component Controls", self)
        widget = QWidget()
        layout = QVBoxLayout(widget)

        self.component_list = QListWidget()
        for component in self.microscope.components:
            item = QListWidgetItem(type(component).__name__)
            item.setCheckState(Qt.Checked)
            self.component_list.addItem(item)
        self.component_list.itemChanged.connect(self.toggle_component)
        layout.addWidget(self.component_list)

        self.laser_angle_x_slider = QSlider(Qt.Horizontal)
        self.laser_angle_x_slider.setRange(-30, 30)  # Increased range
        self.laser_angle_x_slider.setValue(0)
        self.laser_angle_x_slider.valueChanged.connect(self.update_laser_angle)
        layout.addWidget(QLabel("Laser Angle X"))
        layout.addWidget(self.laser_angle_x_slider)

        self.laser_angle_y_slider = QSlider(Qt.Horizontal)
        self.laser_angle_y_slider.setRange(-30, 30)  # Increased range
        self.laser_angle_y_slider.setValue(0)
        self.laser_angle_y_slider.valueChanged.connect(self.update_laser_angle)
        layout.addWidget(QLabel("Laser Angle Y"))
        layout.addWidget(self.laser_angle_y_slider)


        self.laser_power_slider = QSlider(Qt.Horizontal)
        self.laser_power_slider.setRange(0, 100)
        self.laser_power_slider.setValue(50)
        self.laser_power_slider.valueChanged.connect(self.update_laser_power)
        layout.addWidget(QLabel("Laser Power"))
        layout.addWidget(self.laser_power_slider)

        self.simulation_toggle = QPushButton("Start Simulation")
        self.simulation_toggle.setCheckable(True)
        self.simulation_toggle.toggled.connect(self.toggle_simulation)
        layout.addWidget(self.simulation_toggle)

        dock.setWidget(widget)
        self.addDockWidget(Qt.LeftDockWidgetArea, dock)

    def setup_camera_view_dock(self):
        dock = QDockWidget("Camera View", self)
        widget = QWidget()
        layout = QVBoxLayout(widget)
        self.image_label = QLabel()
        self.image_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.image_label)
        dock.setWidget(widget)
        self.addDockWidget(Qt.RightDockWidgetArea, dock)

    def setup_light_table_view_dock(self):
        dock = QDockWidget("Light Table View", self)
        self.light_table_view = LightTableView()
        dock.setWidget(self.light_table_view)
        self.addDockWidget(Qt.BottomDockWidgetArea, dock)

    def update_laser_power(self, value):
        laser = next((c for c in self.microscope.components if isinstance(c, Laser)), None)
        if laser:
            laser.power = value
            logger.info(f"Updated laser power to {value}")

    def update_laser_angle(self):
        laser = next((c for c in self.microscope.components if isinstance(c, Laser)), None)
        if laser:
            angle_x = np.radians(self.laser_angle_x_slider.value())
            angle_y = np.radians(self.laser_angle_y_slider.value())
            laser.set_angles(angle_x, angle_y)
            logger.info(f"Updated laser angles to ({angle_x:.2f}, {angle_y:.2f})")


    def update_lens_oscillation(self, value):
        self.simulation_engine.light_table.oscillation_amplitude = value / 2
        logger.info(f"Updated lens oscillation amplitude to {value/2}")

    def toggle_simulation(self, checked):
        if checked:
            self.simulation_engine.start()
            self.simulation_toggle.setText("Stop Simulation")
        else:
            self.simulation_engine.stop()
            self.simulation_toggle.setText("Start Simulation")

    def toggle_component(self, item):
        index = self.component_list.row(item)
        component = self.microscope.components[index]
        if item.checkState() == Qt.Checked:
            component.turn_on()
        else:
            component.turn_off()
        logger.info(f"Toggled {type(component).__name__} {'on' if component.is_on else 'off'}")


    def update_simulation(self):
        try:
            if self.simulation_engine.is_running:
                self.simulation_engine.light_table.simulate_light_path()
                camera = next((c for c in self.microscope.components if isinstance(c, Camera)), None)
                if camera:
                    image = camera.get_image()
                    self.display_image(image)
                    logger.debug(f"Camera image updated, max value: {np.max(image)}")
                    camera.clear_image()  # Clear the image after displaying

                components = self.simulation_engine.get_schematic_representation()
                rays = self.simulation_engine.get_rays()
                self.light_table_view.update_light_table(components, rays)
                logger.debug("Simulation updated successfully")
        except Exception as e:
            logger.error(f"Error updating simulation: {str(e)}")

    def display_image(self, image):
        if np.max(image) > 0:
            logger.debug(f"Displaying image with max value: {np.max(image)}")
        h, w = image.shape
        qimage = QImage(image.data, w, h, w, QImage.Format_Grayscale8)
        pixmap = QPixmap.fromImage(qimage)
        scaled_pixmap = pixmap.scaled(400, 400, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.image_label.setPixmap(scaled_pixmap)
        self.image_label.setAlignment(Qt.AlignCenter)


def run_gui():
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec_()

if __name__ == "__main__":
    run_gui()
