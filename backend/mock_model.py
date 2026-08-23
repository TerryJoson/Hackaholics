"""
Stand-in for the trained segmentation model. Returns approximate
region boxes and plausible measurements so the rest of the pipeline
(overlay, measurement, matching, copilot) has real numbers to work
with while the real model is being trained.

SWAP-IN POINT: once nnU-Net inference is working, replace the body
of detect_anatomy() with a call to nnUNetv2_predict on the uploaded
image, and replace estimate_measurements() with real geometry
computed from the returned mask (distance between femur/tibia
contours at anterior/middle/posterior points). Everything else in
main.py, heatmap_generator.py, and the frontend stays unchanged,
since they only depend on this function's return shape.
"""
import random


def detect_anatomy(image) -> dict:
    """Returns bounding regions as fractions of image width/height,
    so they scale correctly regardless of the uploaded image's
    resolution."""
    width, height = image.size
    return {
        "femur": {"x": 0.12, "y": 0.06, "w": 0.76, "h": 0.42},
        "tibia": {"x": 0.14, "y": 0.52, "w": 0.72, "h": 0.42},
        "meniscus": {"x": 0.20, "y": 0.46, "w": 0.60, "h": 0.09},
        "image_width": width,
        "image_height": height,
    }


def estimate_measurements(image) -> dict:
    """Demo values with light jitter so numbers feel alive rather
    than static. Replace with real mask-based geometry once
    segmentation is trained."""
    base = {"ant": 4.2, "mid": 3.7, "post": 4.0}
    return {k: round(v + random.uniform(-0.15, 0.15), 1) for k, v in base.items()}
