"""SiliconFlow API integration for image generation."""

import time
import requests
from typing import Optional

from ..config import SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL, TEST_MODE
from ..logger import logger

__all__ = ["siliconflow_generate_bytes"]


def _test_placeholder_image_bytes(size: tuple = (1024, 1024)) -> bytes:
    """Generate a placeholder test image."""
    from PIL import Image, ImageDraw
    import io

    img = Image.new("RGB", size, (20, 20, 20))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "TEST MODE", fill="white")
    out = io.BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out.read()


def siliconflow_generate_bytes(
    api_key: str,
    model: str,
    prompt: str,
    image_size: str = "1024x1024",
    steps: int = 20,
    max_retries: int = 3,
) -> bytes:
    """Generate image bytes using SiliconFlow API.

    Args:
        api_key: SiliconFlow API key
        model: Model ID (e.g., "black-forest-labs/FLUX.1-schnell")
        prompt: Image generation prompt
        image_size: Size in format "WxH" (default: "1024x1024")
        steps: Number of inference steps (default: 20)
        max_retries: Maximum retry attempts for transient errors (default: 3)

    Returns:
        bytes: PNG image data

    Raises:
        RuntimeError: If API fails or response is unexpected
    """
    if TEST_MODE:
        logger.info("TEST_MODE enabled: returning placeholder image")
        return _test_placeholder_image_bytes()

    if not api_key:
        raise RuntimeError("SILICONFLOW_API_KEY is not configured")

    url = f"{SILICONFLOW_BASE_URL.rstrip('/')}/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "prompt": prompt,
        "image_size": image_size,
        "batch_size": 1,
        "num_inference_steps": steps,
        "guidance_scale": 7.5,
    }

    logger.info(f"Calling SiliconFlow API: {url}")
    logger.debug(f"Request body: {body}")

    last_resp = None
    data = None

    for attempt in range(1, max_retries + 1):
        resp = requests.post(url, headers=headers, json=body, timeout=120)
        last_resp = resp

        if resp.status_code == 200:
            data = resp.json()
            break

        retryable = resp.status_code in {429, 500, 502, 503, 504}
        logger.warning(
            "SiliconFlow API error (attempt %d/%d): Status %d, Response: %s",
            attempt,
            max_retries,
            resp.status_code,
            resp.text[:1000],
        )

        if not retryable or attempt == max_retries:
            resp.raise_for_status()

        retry_after = resp.headers.get("Retry-After")
        if retry_after:
            try:
                sleep_s = float(retry_after)
            except ValueError:
                sleep_s = 2 ** (attempt - 1)
        else:
            sleep_s = 2 ** (attempt - 1)

        time.sleep(sleep_s)
    else:
        raise RuntimeError(
            f"SiliconFlow API failed after {max_retries} attempts: {last_resp.text if last_resp else 'no response'}"
        )

    # Extract image URL from response
    image_url: Optional[str] = None
    if isinstance(data, dict):
        if "images" in data and len(data["images"]) > 0:
            image_url = data["images"][0].get("url") or data["images"][0].get("image")
        elif "data" in data and len(data["data"]) > 0:
            image_url = data["data"][0].get("url")

    if not image_url:
        raise RuntimeError(f"Unexpected SiliconFlow response: {data}")

    # Download image
    img_resp = requests.get(image_url, timeout=120)
    img_resp.raise_for_status()

    return img_resp.content
