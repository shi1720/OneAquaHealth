"""Crop actual app captures for readable artifact layouts without altering UI."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "output" / "assets"
CAPTURES = [
    ("workflow.png", "workflow-slide.png", (1440, 1050), (274, 220, 1402, 720)),
    ("planner.png", "planner-slide.png", (1440, 1441), (583, 286, 1402, 914)),
]
for source, target, expected, crop in CAPTURES:
    with Image.open(ASSETS / source) as image:
        if image.size != expected:
            raise ValueError(f"{source}: expected {expected}, got {image.size}; review crop manually")
        image.crop(crop).save(ASSETS / target)
    print(ASSETS / target)
