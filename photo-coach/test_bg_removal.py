#!/usr/bin/env python3
"""
Test the exact image processing that Flask does
"""
import cv2
import numpy as np
import base64
from pathlib import Path

img_path = Path("img/bat_septum_piercing.jpg")
print(f"[TEST] Loading {img_path}")

img = cv2.imread(str(img_path))
if img is None:
    print("ERROR: Could not load image")
    exit(1)

h, w = img.shape[:2]
print(f"  Loaded: {w}x{h}")

# Replicate remove_background_to_data_url exactly
def remove_background_to_data_url(img):
    """Extract foreground with alpha and return a data:image/png;base64 URL."""
    h, w = img.shape[:2]
    max_dim = 600
    if max(h, w) > max_dim:
        scale_factor = max_dim / max(h, w)
        img = cv2.resize(
            img,
            (int(w * scale_factor), int(h * scale_factor)),
            interpolation=cv2.INTER_AREA,
        )
        h, w = img.shape[:2]
    
    print(f"  After scale: {w}x{h}")

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    margin_x = max(1, int(w * 0.15))
    margin_y = max(1, int(h * 0.15))
    rect_w = max(1, w - 2 * margin_x)
    rect_h = max(1, h - 2 * margin_y)
    rect = (margin_x, margin_y, rect_w, rect_h)

    print(f"  GrabCut rect: {rect}")
    
    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        print(f"  ✓ GrabCut succeeded")
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
    except Exception as e:
        print(f"  ✗ GrabCut exception: {e}")
        fg_mask = np.full((h, w), 255, dtype=np.uint8)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, light = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    light_pixels = np.count_nonzero(light)
    print(f"  Light pixels: {light_pixels}")
    fg_mask = cv2.bitwise_and(fg_mask, cv2.bitwise_not(light))

    # Check mask collapse
    keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
    print(f"  Mask kept ratio: {keep_ratio:.4f} ({np.count_nonzero(fg_mask)} pixels)")

    if keep_ratio < 0.015:
        print(f"  ⚠ MASK COLLAPSED! Adding dark regions...")
        _, dark_regions = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY_INV)
        fg_mask = cv2.max(fg_mask, dark_regions)
        keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
        print(f"    After recovery: {keep_ratio:.4f}")

    fg_mask = cv2.GaussianBlur(fg_mask, (3, 3), 0)
    _, fg_mask = cv2.threshold(fg_mask, 128, 255, cv2.THRESH_BINARY)

    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = fg_mask

    ok, buf = cv2.imencode(".png", img_rgba)
    if not ok:
        raise RuntimeError("Failed to encode result image.")

    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    data_url = f"data:image/png;base64,{b64}"
    print(f"  ✓ Encoded PNG: {len(data_url)} bytes")
    return data_url

try:
    result_url = remove_background_to_data_url(img)
    print(f"\n✓ SUCCESS!")
    print(f"  Result: {result_url[:80]}...")
except Exception as e:
    print(f"\n✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
