import io

from PIL import Image


def test_overlay_quran_text_bytes(load_module):
    mod = load_module()
    base = Image.new("RGB", (256, 256), (10, 10, 10))
    buf = io.BytesIO()
    base.save(buf, format="PNG")
    buf.seek(0)

    out = mod.overlay_quran_text_bytes(buf.read(), "السَّلَامُ", "Peace")
    assert out.startswith(b"\x89PNG")
