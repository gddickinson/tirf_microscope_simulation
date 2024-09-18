from PyQt5.QtWidgets import QWidget
from PyQt5.QtGui import QPainter, QColor, QPen
from PyQt5.QtCore import Qt

class SchematicView(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(400, 400)
        self.components = []
        self.rays = []

    def update_schematic(self, components, rays):
        self.components = components
        self.rays = rays
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        # Draw components
        for shape, pos, orientation, size in self.components:
            if shape == 'rectangle':
                painter.setPen(QPen(Qt.black, 2))
                painter.drawRect(pos[0], pos[1], size[0], size[1])
            # Add more shapes as needed

        # Draw rays
        painter.setPen(QPen(Qt.red, 1))
        for ray in self.rays:
            painter.drawLine(ray.origin[0], ray.origin[1],
                             ray.origin[0] + ray.direction[0] * 50,
                             ray.origin[1] + ray.direction[1] * 50)
