#!/usr/bin/env python3
"""
Debug script to test image processing on bat_septum_piercing.jpg
"""
import cv2
import numpy as np
import base64
import os
from pathlib import Path

# Setup paths
script_dir = Path(__file__).parent
img_path = script_dir / "img" / "bat_septum_piercing.jpg"
output_dir = script_dir / "debug_output"
output_dir.mkdir(exist_ok=True)

print(f"[DEBUG] Loading image from: {img_path}")
print(f"[DEBUG] Image exists: {img_path.exists()}")

if not img_path.exists():
    print(f"ERROR: Image not found at {img_path}")
    exit(1)

# Load image
img = cv2.imread(str(img_path))
if img is None:
    print(f"ERROR: Could not decode image at {img_path}")
    exit(1)

h, w = img.shape[:2]
print(f"\n[ORIGINAL] Shape: {h}x{w}, dtype: {img.dtype}")

keep_ratio_v1 = None
keep_ratio_v2 = None
keep_ratio_v3 = None

# ============================================================================
# TEST 1: Current production algorithm
# ============================================================================
print("\n" + "="*70)
print("TEST 1: Current Production Algorithm")
print("="*70)

def test_remove_background_v1(img_orig):
    """Current production version"""
    img = img_orig.copy()
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
    
    print(f"  Scaled to: {h}x{w}")

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    margin_x = max(1, int(w * 0.15))
    margin_y = max(1, int(h * 0.15))
    rect_w = max(1, w - 2 * margin_x)
    rect_h = max(1, h - 2 * margin_y)
    rect = (margin_x, margin_y, rect_w, rect_h)

    print(f"  GrabCut rect: ({margin_x}, {margin_y}, {rect_w}, {rect_h})")

    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        print(f"  GrabCut succeeded")
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
    except Exception as e:
        print(f"  ERROR in GrabCut: {e}")
        fg_mask = np.full((h, w), 255, dtype=np.uint8)

    # Remove near-white
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, light = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    print(f"  Light pixels (threshold 245): {np.count_nonzero(light)} / {light.size}")
    fg_mask = cv2.bitwise_and(fg_mask, cv2.bitwise_not(light))

    # Check mask collapse
    keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
    print(f"  Mask kept ratio: {keep_ratio:.4f} ({np.count_nonzero(fg_mask)} pixels)")

    if keep_ratio < 0.015:
        print(f"  MASK COLLAPSED! Adding dark regions (threshold 235)...")
        _, dark_regions = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY_INV)
        dark_count = np.count_nonzero(dark_regions)
        print(f"    Dark pixels found: {dark_count}")
        fg_mask = cv2.max(fg_mask, dark_regions)
        keep_ratio_after = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
        print(f"    Mask kept ratio after recovery: {keep_ratio_after:.4f}")

    fg_mask = cv2.GaussianBlur(fg_mask, (3, 3), 0)
    _, fg_mask = cv2.threshold(fg_mask, 128, 255, cv2.THRESH_BINARY)

    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = fg_mask

    # Save debug outputs
    cv2.imwrite(str(output_dir / "01_grabcut_mask.png"), mask * 50)  # scale for visibility
    cv2.imwrite(str(output_dir / "02_foreground_mask.png"), fg_mask)
    cv2.imwrite(str(output_dir / "03_result_with_alpha.png"), img_rgba)

    return img_rgba, keep_ratio

try:
    result_v1, keep_ratio_v1 = test_remove_background_v1(img)
    print(f"  ✓ V1 succeeded with keep_ratio={keep_ratio_v1:.4f}")
except Exception as e:
    print(f"  ✗ V1 FAILED: {e}")
    result_v1 = None

# ============================================================================
# TEST 2: More aggressive GrabCut (10 iterations, smaller margin)
# ============================================================================
print("\n" + "="*70)
print("TEST 2: More Aggressive GrabCut (10 iterations, 10% margin)")
print("="*70)

def test_remove_background_v2(img_orig):
    """More aggressive GrabCut"""
    img = img_orig.copy()
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
    
    print(f"  Scaled to: {h}x{w}")

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    # Smaller margin
    margin_x = max(1, int(w * 0.10))
    margin_y = max(1, int(h * 0.10))
    rect_w = max(1, w - 2 * margin_x)
    rect_h = max(1, h - 2 * margin_y)
    rect = (margin_x, margin_y, rect_w, rect_h)

    print(f"  GrabCut rect: ({margin_x}, {margin_y}, {rect_w}, {rect_h})")

    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 10, cv2.GC_INIT_WITH_RECT)
        print(f"  GrabCut succeeded (10 iterations)")
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
    except Exception as e:
        print(f"  ERROR in GrabCut: {e}")
        fg_mask = np.full((h, w), 255, dtype=np.uint8)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, light = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    print(f"  Light pixels (threshold 245): {np.count_nonzero(light)}")
    fg_mask = cv2.bitwise_and(fg_mask, cv2.bitwise_not(light))

    keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
    print(f"  Mask kept ratio: {keep_ratio:.4f}")

    if keep_ratio < 0.015:
        print(f"  MASK COLLAPSED! Testing alternative recovery...")
        _, dark_regions = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY_INV)
        fg_mask = cv2.max(fg_mask, dark_regions)
        keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
        print(f"  After recovery: {keep_ratio:.4f}")

    fg_mask = cv2.GaussianBlur(fg_mask, (3, 3), 0)
    _, fg_mask = cv2.threshold(fg_mask, 128, 255, cv2.THRESH_BINARY)

    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = fg_mask

    cv2.imwrite(str(output_dir / "v2_foreground_mask.png"), fg_mask)
    cv2.imwrite(str(output_dir / "v2_result_with_alpha.png"), img_rgba)

    return img_rgba, keep_ratio

try:
    result_v2, keep_ratio_v2 = test_remove_background_v2(img)
    print(f"  ✓ V2 succeeded with keep_ratio={keep_ratio_v2:.4f}")
except Exception as e:
    print(f"  ✗ V2 FAILED: {e}")
    result_v2 = None

# ============================================================================
# TEST 3: Morphological cleanup before/after
# ============================================================================
print("\n" + "="*70)
print("TEST 3: With Morphological Cleanup")
print("="*70)

def test_remove_background_v3(img_orig):
    """With morphological operations"""
    img = img_orig.copy()
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
    
    print(f"  Scaled to: {h}x{w}")

    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    margin_x = max(1, int(w * 0.10))
    margin_y = max(1, int(h * 0.10))
    rect_w = max(1, w - 2 * margin_x)
    rect_h = max(1, h - 2 * margin_y)
    rect = (margin_x, margin_y, rect_w, rect_h)

    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 10, cv2.GC_INIT_WITH_RECT)
        fg_mask = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
    except Exception as e:
        print(f"  ERROR in GrabCut: {e}")
        fg_mask = np.full((h, w), 255, dtype=np.uint8)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, light = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY)
    fg_mask = cv2.bitwise_and(fg_mask, cv2.bitwise_not(light))

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
    print(f"  After morphology: {keep_ratio:.4f}")

    if keep_ratio < 0.015:
        print(f"  Still collapsed, adding dark regions...")
        _, dark_regions = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY_INV)
        fg_mask = cv2.max(fg_mask, dark_regions)
        keep_ratio = float(np.count_nonzero(fg_mask)) / float(max(1, fg_mask.size))
        print(f"  After recovery: {keep_ratio:.4f}")

    fg_mask = cv2.GaussianBlur(fg_mask, (3, 3), 0)
    _, fg_mask = cv2.threshold(fg_mask, 128, 255, cv2.THRESH_BINARY)

    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = fg_mask

    cv2.imwrite(str(output_dir / "v3_foreground_mask.png"), fg_mask)
    cv2.imwrite(str(output_dir / "v3_result_with_alpha.png"), img_rgba)

    return img_rgba, keep_ratio

try:
    result_v3, keep_ratio_v3 = test_remove_background_v3(img)
    print(f"  ✓ V3 succeeded with keep_ratio={keep_ratio_v3:.4f}")
except Exception as e:
    print(f"  ✗ V3 FAILED: {e}")
    result_v3 = None

# ============================================================================
# TEST 4: Contrast analysis
# ============================================================================
print("\n" + "="*70)
print("TEST 4: Contrast and Edge Analysis")
print("="*70)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
print(f"  Grayscale range: {gray.min()} to {gray.max()}")
print(f"  Mean: {gray.mean():.1f}, Std: {gray.std():.1f}")

# Histogram
hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
print(f"  Histogram peaks (top 5 brightness levels):")
top_indices = np.argsort(hist.flatten())[-5:][::-1]
for idx in top_indices:
    count = int(hist[idx, 0])
    print(f"    Brightness {idx}: {count} pixels")

# Edge detection
edges = cv2.Canny(gray, 50, 150)
edge_ratio = float(np.count_nonzero(edges)) / edges.size
print(f"  Edge ratio (Canny): {edge_ratio:.4f}")

cv2.imwrite(str(output_dir / "contrast_edges.png"), edges)

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"  Image: {img_path.name}")
print(f"  Original size: {img.shape[1]}x{img.shape[0]}")
print(f"  Contrast: mean={gray.mean():.1f}, std={gray.std():.1f}")
print(f"  Edge ratio: {edge_ratio:.4f}")
print(f"\n  V1 (Current): keep_ratio={keep_ratio_v1:.4f}" if keep_ratio_v1 is not None else "\n  V1 (Current): keep_ratio=n/a")
print(f"  V2 (Aggressive): keep_ratio={keep_ratio_v2:.4f}" if keep_ratio_v2 is not None else "  V2 (Aggressive): keep_ratio=n/a")
print(f"  V3 (Morphology): keep_ratio={keep_ratio_v3:.4f}" if keep_ratio_v3 is not None else "  V3 (Morphology): keep_ratio=n/a")

if keep_ratio_v1 is not None and keep_ratio_v1 >= 0.015:
    print(f"\n  ✓ Current algorithm should work!")
else:
    print(f"\n  ✗ Current algorithm fails - mask collapses")
    if keep_ratio_v3 is not None and keep_ratio_v3 >= 0.015:
        print(f"  ✓ V3 (Morphology) fixes it!")
    elif keep_ratio_v2 is not None and keep_ratio_v2 >= 0.015:
        print(f"  ✓ V2 (Aggressive GrabCut) fixes it!")

print(f"\n  Debug images saved to: {output_dir}/")
print(f"  Check: {output_dir}/v*.png to see results")
