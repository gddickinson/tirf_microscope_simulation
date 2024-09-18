import numpy as np

def normalize(v):
    return v / np.linalg.norm(v)

def reflect(v, normal):
    return v - 2 * np.dot(v, normal) * normal
