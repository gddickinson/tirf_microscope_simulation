import numpy as np


def to_gray8(image):
    """Clip an image to 0..255 and return it as a C-contiguous uint8 array (what an 8-bit greyscale QImage reads)."""
    return np.ascontiguousarray(np.clip(np.nan_to_num(image), 0, 255).astype(np.uint8))
