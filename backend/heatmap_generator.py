"""
Draws the femur / tibia / meniscus overlay onto the uploaded X-ray
using the region boxes from mock_model.detect_anatomy() (or, later,
real segmentation mask polygons), and returns it as a base64 PNG the
frontend can drop straight into an <img> tag.
"""
import base64
from io import BytesIO

from PIL import Image, ImageDraw

FILL = {
    "femur": (74, 222, 128, 90),
    "tibia": (56, 189, 248, 90),
    "meniscus": (251, 146, 60, 130),
}
OUTLINE = {
    "femur": (74, 222, 128, 255),
    "tibia": (56, 189, 248, 255),
    "meniscus": (251, 146, 60, 255),
}


def generate_overlay(image: Image.Image, regions: dict) -> str:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = base.size

    for part in ("femur", "tibia", "meniscus"):
        r = regions[part]
        box = [r["x"] * w, r["y"] * h, (r["x"] + r["w"]) * w, (r["y"] + r["h"]) * h]
        if part == "meniscus":
            draw.rounded_rectangle(box, radius=10, fill=FILL[part], outline=OUTLINE[part], width=3)
        else:
            draw.ellipse(box, fill=FILL[part], outline=OUTLINE[part], width=3)

    combined = Image.alpha_composite(base, overlay).convert("RGB")
    buf = BytesIO()
    combined.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
