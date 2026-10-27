"""
Image analysis for fake content detection.
Analyzes image metadata, manipulation indicators, and generates perceptual hashes.
"""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from PIL import Image, ImageStat, ImageFilter
    import imagehash
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL/imagehash not installed. Image analysis disabled.")


def analyze_image(image_bytes: bytes) -> dict:
    """Analyze an image for manipulation and authenticity indicators."""
    if not PIL_AVAILABLE:
        return {
            "analyzed": False,
            "reason": "Image analysis libraries not available",
            "score": -1,
        }

    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return {"analyzed": False, "reason": f"Cannot open image: {e}", "score": 20}

    score = 75
    flags = []
    metadata = {}

    metadata["format"] = img.format or "unknown"
    metadata["size"] = list(img.size)
    metadata["mode"] = img.mode

    phash = str(imagehash.phash(img))
    dhash = str(imagehash.dhash(img))
    metadata["phash"] = phash
    metadata["dhash"] = dhash

    exif = {}
    try:
        exif_data = img.getexif()
        if exif_data:
            for tag_id, value in exif_data.items():
                try:
                    exif[str(tag_id)] = str(value)[:100]
                except Exception:
                    pass
    except Exception:
        pass

    if exif:
        flags.append("has_exif_data")
        score += 5
        if any(k for k in exif if "Software" in str(k)):
            flags.append("editing_software_detected")
            score -= 10
    else:
        flags.append("no_exif_data")
        score -= 5

    w, h = img.size
    if w < 100 or h < 100:
        flags.append("very_small_image")
        score -= 15
    elif w > 8000 or h > 8000:
        flags.append("unusually_large")

    aspect = max(w, h) / max(min(w, h), 1)
    if aspect > 5:
        flags.append("extreme_aspect_ratio")
        score -= 10

    try:
        if img.mode in ("RGB", "L"):
            stat = ImageStat.Stat(img)
            means = stat.mean
            stddevs = stat.stddev

            if all(s < 5 for s in stddevs):
                flags.append("near_uniform_color")
                score -= 20

            if img.mode == "RGB" and len(means) == 3:
                r, g, b = means
                if abs(r - g) < 2 and abs(g - b) < 2 and abs(r - b) < 2:
                    if all(s < 10 for s in stddevs):
                        flags.append("possibly_synthetic")
                        score -= 15
    except Exception:
        pass

    try:
        edges = img.convert("L").filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        edge_mean = edge_stat.mean[0]

        if edge_mean < 3:
            flags.append("very_smooth_no_edges")
            score -= 10
        elif edge_mean > 80:
            flags.append("heavy_edge_artifacts")
            score -= 5
    except Exception:
        pass

    score = max(0, min(100, score))

    label = "authentic"
    if score < 40:
        label = "likely_manipulated"
    elif score < 60:
        label = "suspicious"
    elif score < 75:
        label = "uncertain"

    return {
        "analyzed": True,
        "score": score,
        "label": label,
        "flags": flags,
        "metadata": metadata,
        "has_exif": bool(exif),
    }
