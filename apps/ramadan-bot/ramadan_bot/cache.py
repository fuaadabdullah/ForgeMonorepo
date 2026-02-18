"""Caching layer for generated images."""

import os
from . import config
from .logger import logger
from .models import JUZ_VERSES
from .generation.siliconflow import siliconflow_generate_bytes
from .generation.overlay import overlay_quran_text_bytes

__all__ = ["cache_path_for_juz", "generate_and_cache"]


def cache_path_for_juz(juz: int, date_tag: str = None) -> str:
    """Get cache file path for a Juz.

    Args:
        juz: Juz number (1-30)
        date_tag: Optional date tag for cache busting

    Returns:
        str: File path for cached image
    """
    if date_tag:
        return os.path.join(config.CACHE_DIR, f"juz_{juz}_{date_tag}.png")
    return os.path.join(config.CACHE_DIR, f"juz_{juz}.png")


def generate_and_cache(
    juz: int,
    force: bool = False,
    date_tag: str = None,
    model: str = "black-forest-labs/FLUX.1-schnell",
    api_key: str = None,
) -> tuple:
    """Generate image for a Juz and cache it.

    Args:
        juz: Juz number (1-30)
        force: Force regeneration even if cached
        date_tag: Optional date tag for caching
        model: SiliconFlow model ID
        api_key: SiliconFlow API key (required if not in env)

    Returns:
        tuple: (image_bytes, file_path)
    """
    from . import config as cfg

    api_key = api_key or cfg.SILICONFLOW_API_KEY

    path = cache_path_for_juz(juz, date_tag)

    # Return cached image if available
    if os.path.exists(path) and not force:
        logger.info(f"Using cached image for juz {juz} -> {path}")
        with open(path, "rb") as f:
            return f.read(), path

    # Generate new image
    logger.info(f"Generating image for juz {juz}")
    prompt = (
        f"peaceful islamic illustration representing Juz {juz} of the Quran, "
        "mosque at dawn, geometric patterns, morning light, high detail, no faces"
    )

    image_bytes = siliconflow_generate_bytes(api_key, model, prompt)

    # Add text overlay
    arabic, english = JUZ_VERSES.get(juz, ("", ""))
    final_bytes = overlay_quran_text_bytes(image_bytes, arabic, english)

    # Save to cache
    with open(path, "wb") as f:
        f.write(final_bytes)

    logger.info(f"Cached image to {path}")

    return final_bytes, path
