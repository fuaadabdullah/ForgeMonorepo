"""Text overlay rendering for images."""

import io
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

from ..config import FONT_AR, FONT_EN
from ..logger import logger

__all__ = ["overlay_quran_text_bytes"]


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple:
    """Get text bounding box size (compatible with Pillow 10+).

    Args:
        draw: ImageDraw object
        text: Text to measure
        font: PIL font object

    Returns:
        tuple: (width, height) of text
    """
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def overlay_quran_text_bytes(
    image_bytes: bytes,
    arabic_text: str,
    english_text: str,
    out_size: tuple = (1024, 1024),
) -> bytes:
    """Overlay Arabic and English text on image.

    Args:
        image_bytes: PNG image data
        arabic_text: Arabic text to overlay
        english_text: English text translation
        out_size: Output image size (default: 1024x1024)

    Returns:
        bytes: PNG image with overlaid text
    """
    # Open and resize image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    img = img.resize(out_size, Image.LANCZOS)

    # Create overlay
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Translucent box at bottom
    box_h = int(img.height * 0.22)
    box_y = img.height - box_h
    draw.rectangle([(0, box_y), (img.width, img.height)], fill=(0, 0, 0, 180))

    # Arabic reshaping (RTL)
    try:
        reshaped = arabic_reshaper.reshape(arabic_text)
        bidi_ar = get_display(reshaped)
    except Exception:
        logger.warning("Failed to reshape Arabic text, using original")
        bidi_ar = arabic_text

    # Load fonts (with graceful fallback)
    ar_font_size = 48
    try:
        ar_font = ImageFont.truetype(FONT_AR, ar_font_size)
    except Exception:
        logger.warning(f"Failed to load Arabic font {FONT_AR}, using default")
        ar_font = ImageFont.load_default()
        ar_font_size = 20

    en_font_size = 28
    try:
        en_font = ImageFont.truetype(FONT_EN, en_font_size)
    except Exception:
        logger.warning(f"Failed to load English font {FONT_EN}, using default")
        en_font = ImageFont.load_default()
        en_font_size = 14

    max_width = int(img.width * 0.9)

    # Shrink Arabic font until it fits width
    while True:
        w, _ = _text_size(draw, bidi_ar, font=ar_font)
        if w <= max_width or ar_font_size <= 14:
            break
        ar_font_size -= 2
        try:
            ar_font = ImageFont.truetype(FONT_AR, ar_font_size)
        except Exception:
            break

    # Shrink English font until it fits width
    while True:
        w2, _ = _text_size(draw, english_text, font=en_font)
        if w2 <= max_width or en_font_size <= 12:
            break
        en_font_size -= 2
        try:
            en_font = ImageFont.truetype(FONT_EN, en_font_size)
        except Exception:
            break

    # Center text positions
    ar_x = img.width // 2
    ar_y = box_y + 20
    en_x = img.width // 2
    en_y = box_y + int(box_h * 0.55)

    # Draw text
    draw.text((ar_x, ar_y), bidi_ar, font=ar_font, fill="white", anchor="ma")
    draw.text((en_x, en_y), english_text, font=en_font, fill="white", anchor="ma")

    # Composite and save
    final = Image.alpha_composite(img, overlay)
    out = io.BytesIO()
    final.convert("RGB").save(out, format="PNG", optimize=True)
    out.seek(0)

    return out.read()
