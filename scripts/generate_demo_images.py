#!/usr/bin/env python3
"""
ClinicalVision Demo Image Generator

Generates realistic synthetic mammogram images for the demo data package.
These are procedurally generated grayscale images that mimic the visual
characteristics of real mammograms, suitable for testing the full AI pipeline
(preprocessing → DenseNet-121 → MC Dropout → GradCAM++ → XAI).

The generated images are NOT diagnostically meaningful — they are designed
so that:
 1. The real model processes them without errors
 2. MC Dropout produces meaningful uncertainty distributions
 3. GradCAM++ generates plausible attention heatmaps
 4. The 10-step clinical workflow can be exercised end-to-end

ALGORITHM for mammogram-like image synthesis:
 1. Create a breast-shaped mask using parametric curves
 2. Fill with Perlin-like noise (multi-octave) for tissue texture
 3. Add density gradients (denser near chest wall)
 4. For "suspicious" cases: add focal density regions (mass-like)
 5. For "calcification" cases: add clustered bright spots
 6. Apply Gaussian blur for realism
 7. Map to realistic mammogram intensity range

Usage:
 python scripts/generate_demo_images.py
 python scripts/generate_demo_images.py --output./custom-output
 python scripts/generate_demo_images.py --validate

Requires: numpy, Pillow (both already in project dependencies)
"""

import os
import sys
import json
import shutil
import hashlib
import zipfile
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import numpy as np

try:
 from PIL import Image, ImageFilter
except ImportError:
 print("ERROR: Pillow is required. Install with: pip install Pillow")
 sys.exit(1)

logging.basicConfig(
 level=logging.INFO,
 format="%(asctime)s [%(levelname)s] %(message)s",
 datefmt="%H:%M:%S",
)
logger = logging.getLogger("generate_demo_images")


# ============================================================================
# Constants
# ============================================================================

SCRIPT_VERSION = "1.0.0"
IMAGE_WIDTH = 1024
IMAGE_HEIGHT = 1536 # Mammogram aspect ratio ~2:3
SEED_BASE = 42 # Reproducible generation

# Demo case specifications (single source of truth)
DEMO_CASES = {
 "DEMO-001": {
 "label": "Normal / Benign Screening",
 "difficulty": "Easy",
 "dir_name": "case-1-normal",
 "pathology": "BENIGN",
 "bi_rads": "1 or 2",
 "description": "Normal/Benign — no suspicious findings expected",
 "patient": {
 "mrn": "DEMO-001",
 "firstName": "Jane",
 "lastName": "Thompson",
 "middleInitial": "A",
 "dateOfBirth": "1968-03-15",
 "sex": "F",
 },
 "clinical_history": {
 "indication": "Routine annual screening mammography",
 "priorStudies": "Annual screening — no prior findings",
 "brcaStatus": "Negative",
 "familyHistory": "No significant family history",
 "symptoms": "None — asymptomatic screening",
 "hormoneTherapy": "None",
 "priorBiopsies": "None",
 },
 "images": [
 {"suffix": "RIGHT_CC", "view": "CC", "lat": "R"},
 {"suffix": "RIGHT_MLO", "view": "MLO", "lat": "R"},
 {"suffix": "LEFT_CC", "view": "CC", "lat": "L"},
 {"suffix": "LEFT_MLO", "view": "MLO", "lat": "L"},
 ],
 "synthesis": {"type": "normal", "seed_offset": 0},
 },
 "DEMO-002": {
 "label": "Suspicious Mass Finding",
 "difficulty": "Intermediate",
 "dir_name": "case-2-suspicious",
 "pathology": "MALIGNANT",
 "bi_rads": "4 or 5",
 "description": "Suspicious mass — elevated AI confidence expected",
 "patient": {
 "mrn": "DEMO-002",
 "firstName": "Maria",
 "lastName": "Chen",
 "middleInitial": "R",
 "dateOfBirth": "1975-09-22",
 "sex": "F",
 },
 "clinical_history": {
 "indication": "Palpable mass, right breast, 2 o'clock position",
 "priorStudies": "Previous benign biopsy (2023)",
 "brcaStatus": "Unknown",
 "familyHistory": "Mother — breast cancer at age 52",
 "symptoms": "Palpable mass right breast, upper outer quadrant",
 "hormoneTherapy": "None",
 "priorBiopsies": "Right breast, benign fibroadenoma (2023)",
 },
 "images": [
 {"suffix": "RIGHT_CC", "view": "CC", "lat": "R"},
 {"suffix": "RIGHT_MLO", "view": "MLO", "lat": "R"},
 {"suffix": "LEFT_CC", "view": "CC", "lat": "L"},
 {"suffix": "LEFT_MLO", "view": "MLO", "lat": "L"},
 {"suffix": "RIGHT_SPOT", "view": "SPOT", "lat": "R"},
 {"suffix": "RIGHT_MAG", "view": "MAG", "lat": "R"},
 ],
 "synthesis": {"type": "mass", "seed_offset": 100},
 },
 "DEMO-003": {
 "label": "Calcification Follow-up",
 "difficulty": "Advanced",
 "dir_name": "case-3-calcification",
 "pathology": "MALIGNANT",
 "bi_rads": "4B or 4C",
 "description": "Calcification cluster — high suspicion, BRCA positive",
 "patient": {
 "mrn": "DEMO-003",
 "firstName": "Sarah",
 "lastName": "Williams",
 "middleInitial": "L",
 "dateOfBirth": "1982-11-08",
 "sex": "F",
 },
 "clinical_history": {
 "indication": "Calcifications noted on prior screening",
 "priorStudies": "Screening 6 months ago — BI-RADS 3",
 "brcaStatus": "Positive (BRCA1)",
 "familyHistory": "Sister — breast cancer at age 45, maternal aunt — ovarian cancer",
 "symptoms": "No palpable mass — calcifications on imaging only",
 "hormoneTherapy": "None",
 "priorBiopsies": "None",
 },
 "images": [
 {"suffix": "LEFT_CC", "view": "CC", "lat": "L"},
 {"suffix": "LEFT_MLO", "view": "MLO", "lat": "L"},
 ],
 "synthesis": {"type": "calcification", "seed_offset": 200},
 },
}


# ============================================================================
# Image Synthesis Engine
# ============================================================================


def _multi_octave_noise(
 shape: Tuple[int, int],
 rng: np.random.Generator,
 octaves: int = 4,
 persistence: float = 0.5,
) -> np.ndarray:
 """
 Generate multi-octave smooth noise resembling tissue texture.

 Uses upscaled random noise at multiple frequencies, blended with
 decreasing amplitude — a simplified Perlin-like approach that's
 fast and reproducible.
 """
 h, w = shape
 result = np.zeros((h, w), dtype=np.float64)
 amplitude = 1.0

 for octave in range(octaves):
 freq = 2 ** octave
 # Generate low-res noise and upscale
 small_h = max(h // (32 // freq), 4)
 small_w = max(w // (32 // freq), 4)
 noise = rng.random((small_h, small_w))

 # Upscale with bilinear interpolation (using PIL for simplicity)
 noise_img = Image.fromarray((noise * 255).astype(np.uint8), mode="L")
 noise_img = noise_img.resize((w, h), Image.BILINEAR)
 noise_arr = np.array(noise_img).astype(np.float64) / 255.0

 result += noise_arr * amplitude
 amplitude *= persistence

 # Normalize to [0, 1]
 result -= result.min()
 if result.max() > 0:
 result /= result.max()
 return result


def _create_breast_mask(
 width: int,
 height: int,
 laterality: str,
 view: str,
) -> np.ndarray:
 """
 Create a breast-shaped binary mask.

 The breast shape is modeled as a half-ellipse with:
 - Chest wall along one vertical edge
 - Curved outer boundary (parabolic + noise)
 - CC views: more circular/compact
 - MLO views: more elongated (oblique angle)
 """
 mask = np.zeros((height, width), dtype=np.float64)
 y_coords, x_coords = np.mgrid[0:height, 0:width]

 # Normalize to [0, 1]
 yn = y_coords / height
 xn = x_coords / width

 # Chest wall side: LEFT breast → chest wall on RIGHT edge, and vice versa
 if laterality == "L":
 # Chest wall on right, breast extends left
 xn_from_chest = 1.0 - xn
 else:
 # Chest wall on left, breast extends right
 xn_from_chest = xn

 # Vertical center adjustment for view type
 if view in ("CC",):
 # CC: more centered, wider
 y_center = 0.5
 y_spread = 0.45
 x_extent = 0.85
 elif view in ("MLO",):
 # MLO: shifted up, more elongated
 y_center = 0.45
 y_spread = 0.5
 x_extent = 0.75
 elif view in ("SPOT", "MAG"):
 # Spot/Mag: focused, smaller area
 y_center = 0.5
 y_spread = 0.35
 x_extent = 0.65
 else:
 y_center = 0.5
 y_spread = 0.45
 x_extent = 0.8

 # Distance from vertical center, normalized
 y_dist = np.abs(yn - y_center) / y_spread

 # Breast boundary: parabolic curve
 boundary = x_extent * (1.0 - y_dist ** 2)
 boundary = np.clip(boundary, 0, 1)

 # Create smooth mask with soft edges
 inside = (xn_from_chest < boundary) & (y_dist < 1.0)
 edge_dist = boundary - xn_from_chest
 soft_edge = np.clip(edge_dist * 15, 0, 1) # Smooth transition over ~7% of width

 mask = soft_edge * (y_dist < 1.0).astype(np.float64)
 # Soften vertical edges too
 y_edge = np.clip((1.0 - y_dist) * 5, 0, 1)
 mask *= y_edge

 return mask


def _add_density_gradient(
 image: np.ndarray,
 mask: np.ndarray,
 laterality: str,
) -> np.ndarray:
 """
 Add density gradient — denser (brighter) near chest wall,
 less dense toward the nipple region.
 """
 h, w = image.shape
 x_coords = np.arange(w) / w

 if laterality == "L":
 gradient = x_coords # Denser on right (chest wall)
 else:
 gradient = 1.0 - x_coords # Denser on left (chest wall)

 gradient = gradient[np.newaxis,:] ** 0.6 # Gentle curve
 return image * (0.5 + 0.5 * gradient)


def _add_mass(
 image: np.ndarray,
 rng: np.random.Generator,
 mask: np.ndarray,
) -> np.ndarray:
 """
 Add a suspicious mass-like density to the image.

 Creates an irregular bright region with:
 - Spiculated-looking edges (star-like noise pattern)
 - Higher central density
 - Subtle surrounding architectural distortion
 """
 h, w = image.shape

 # Find valid region (inside breast mask)
 valid_y, valid_x = np.where(mask > 0.5)
 if len(valid_y) == 0:
 return image

 # Place mass in upper-outer quadrant area (common location)
 center_idx = rng.integers(len(valid_y) // 4, 3 * len(valid_y) // 4)
 cy, cx = valid_y[center_idx], valid_x[center_idx]

 # Mass size: 40-80 pixels radius
 radius = rng.integers(40, 80)

 y_coords, x_coords = np.mgrid[0:h, 0:w]
 dist = np.sqrt((y_coords - cy) ** 2 + (x_coords - cx) ** 2)

 # Create spiculated mass shape
 angles = np.arctan2(y_coords - cy, x_coords - cx)
 # Irregular boundary using angular noise
 spicules = np.zeros_like(angles)
 for k in range(5, 15):
 amp = rng.uniform(0.1, 0.3) / k
 phase = rng.uniform(0, 2 * np.pi)
 spicules += amp * np.cos(k * angles + phase)
 effective_radius = radius * (1.0 + spicules)

 # Mass density profile: bright center, fading edges
 mass = np.clip(1.0 - dist / effective_radius, 0, 1) ** 1.5
 mass *= mask # Stay within breast

 # Blend: mass adds brightness
 intensity = rng.uniform(0.15, 0.30)
 image = image + mass * intensity

 return np.clip(image, 0, 1)


def _add_calcifications(
 image: np.ndarray,
 rng: np.random.Generator,
 mask: np.ndarray,
) -> np.ndarray:
 """
 Add a cluster of microcalcification-like spots.

 Creates 15-30 tiny bright dots clustered in a region,
 mimicking suspicious grouped microcalcifications.
 """
 h, w = image.shape

 valid_y, valid_x = np.where(mask > 0.5)
 if len(valid_y) == 0:
 return image

 # Cluster center
 center_idx = rng.integers(len(valid_y) // 3, 2 * len(valid_y) // 3)
 cy, cx = valid_y[center_idx], valid_x[center_idx]

 # Number of calcification spots
 n_calcs = rng.integers(15, 35)
 cluster_radius = rng.integers(30, 70)

 for _ in range(n_calcs):
 # Random position within cluster
 dy = rng.normal(0, cluster_radius / 2.5)
 dx = rng.normal(0, cluster_radius / 2.5)
 py = int(cy + dy)
 px = int(cx + dx)

 if 0 <= py < h and 0 <= px < w and mask[py, px] > 0.3:
 # Each calc is 1-4 pixels, very bright
 calc_size = rng.integers(1, 4)
 brightness = rng.uniform(0.7, 1.0)
 for dy2 in range(-calc_size, calc_size + 1):
 for dx2 in range(-calc_size, calc_size + 1):
 if (dy2 ** 2 + dx2 ** 2) <= calc_size ** 2:
 yy, xx = py + dy2, px + dx2
 if 0 <= yy < h and 0 <= xx < w:
 image[yy, xx] = max(image[yy, xx], brightness)

 return image


def generate_mammogram(
 case_id: str,
 suffix: str,
 view: str,
 laterality: str,
 synthesis_type: str,
 seed: int,
 width: int = IMAGE_WIDTH,
 height: int = IMAGE_HEIGHT,
) -> np.ndarray:
 """
 Generate a single synthetic mammogram image.

 Returns a 2D numpy array with values in [0, 255] (uint8).

 Algorithm:
 1. Create breast-shaped mask for the given view/laterality
 2. Generate multi-octave tissue noise
 3. Apply density gradient (chest wall → nipple)
 4. Apply breast mask to create anatomical shape
 5. Optionally add pathological features (mass, calcifications)
 6. Apply smoothing and intensity mapping
 """
 rng = np.random.default_rng(seed)

 # Step 1: Breast mask
 mask = _create_breast_mask(width, height, laterality, view)

 # Step 2: Tissue texture (multi-octave noise)
 texture = _multi_octave_noise((height, width), rng, octaves=5, persistence=0.55)

 # Step 3: Base image = texture weighted by mask
 image = texture * mask

 # Step 4: Density gradient
 image = _add_density_gradient(image, mask, laterality)

 # Step 5: Pathological features
 if synthesis_type == "mass":
 # Add mass to RIGHT-side images (clinical narrative: right breast mass)
 if laterality == "R":
 image = _add_mass(image, rng, mask)
 elif synthesis_type == "calcification":
 # Add calcifications to LEFT-side images (clinical narrative: left breast calcs)
 if laterality == "L":
 image = _add_calcifications(image, rng, mask)

 # Step 6: Background (outside breast) — near black with tiny noise
 bg_noise = rng.random((height, width)) * 0.02
 image = np.where(mask > 0.05, image, bg_noise)

 # Step 7: Map to mammogram intensity range
 # Real mammograms are often dark with bright areas (inverted)
 # Range: [5, 240] to avoid pure black/white
 image = np.clip(image, 0, 1)
 image = (image * 235 + 5).astype(np.uint8)

 # Step 8: Apply slight Gaussian blur for realism
 pil_img = Image.fromarray(image, mode="L")
 pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=1.5))

 return np.array(pil_img)


# ============================================================================
# Package Generator
# ============================================================================


def generate_case_info(case_id: str, spec: Dict[str, Any]) -> Dict[str, Any]:
 """Generate case-info.json content for a demo case."""
 return {
 "caseId": case_id,
 "version": SCRIPT_VERSION,
 "patient": spec["patient"],
 "clinicalHistory": spec["clinical_history"],
 "expectedOutcome": {
 "biRads": spec["bi_rads"],
 "description": spec["description"],
 "pathology": spec["pathology"],
 },
 "images": [
 {
 "filename": f"{case_id}_{img['suffix']}",
 "viewType": img["view"],
 "laterality": img["lat"],
 "formats": ["png"],
 "source": "ClinicalVision Synthetic Demo",
 }
 for img in spec["images"]
 ],
 }


def generate_manifest(
 cases: Dict[str, Dict[str, Any]],
 total_images: int,
) -> Dict[str, Any]:
 """Generate manifest.json content for the demo package."""
 return {
 "version": SCRIPT_VERSION,
 "generatedAt": datetime.now(timezone.utc).isoformat(),
 "description": "ClinicalVision AI Demo Data Package — Synthetic mammogram images for workflow testing",
 "totalCases": len(cases),
 "totalImages": total_images,
 "formats": ["PNG (.png)"],
 "zipDownload": "/demo-data/ClinicalVision_Demo_Package.zip",
 "cases": [
 {
 "id": case_id,
 "label": spec["label"],
 "difficulty": spec["difficulty"],
 "views": len(spec["images"]),
 "path": f"/demo-data/{spec['dir_name']}/",
 }
 for case_id, spec in cases.items()
 ],
 }


def generate_readme() -> str:
 """Generate the demo data README.md."""
 return """# ClinicalVision AI — Demo Data Package

## What's Included

3 curated mammogram cases (12 images total) for testing the complete
ClinicalVision clinical workflow, including AI analysis with:

- **MC Dropout** uncertainty quantification
- **GradCAM++** attention heatmaps
- **BI-RADS** assessment suggestions
- **Suspicious region** detection

## Cases

| Case | ID | Difficulty | Views | Expected Outcome |
|------|-----|-----------|-------|-----------------|
| Normal Screening | DEMO-001 | Easy | 4 | BI-RADS 1-2 (Benign) |
| Suspicious Mass | DEMO-002 | Intermediate | 6 | BI-RADS 4-5 (Suspicious) |
| Calcification Follow-up | DEMO-003 | Advanced | 2 | BI-RADS 4B-4C (Calcification) |

## Quick Start

### Step 1: Create an Account
Navigate to your ClinicalVision instance and register.

### Step 2: Start New Analysis
Click **"New Analysis"** from the dashboard, or use the
**"Load Demo Case"** button for one-click setup.

### Step 3: Enter Patient Information
Each case folder contains a `case-info.json` with patient demographics:

**Case 1 — Jane A. Thompson**
- MRN: DEMO-001
- DOB: 1968-03-15
- Indication: Routine annual screening

**Case 2 — Maria R. Chen**
- MRN: DEMO-002
- DOB: 1975-09-22
- Indication: Palpable mass, right breast

**Case 3 — Sarah L. Williams**
- MRN: DEMO-003
- DOB: 1982-11-08
- Indication: Calcifications on prior screening

### Step 4: Upload Images
Drag and drop the PNG files from the case folder.
View types and laterality are auto-detected from filenames.

### Step 5: Run AI Analysis
Click **"Analyze"** — the AI model processes each image with:
- 3-model DenseNet-121 ensemble
- 10 MC Dropout forward passes per model (30 total)
- GradCAM++ attention mapping
- Suspicious region detection

### Step 6: Review Results
- View prediction confidence and uncertainty
- Examine GradCAM++ heatmap overlays
- Review detected suspicious regions
- Open the full Analysis Suite for detailed XAI visualization

### Step 7: Complete Workflow
Assign BI-RADS, generate report, finalize, and sign.

## Test Scenarios

| Scenario | Case | What to Test |
|----------|------|-------------|
| Happy path (4-view standard) | Case 1 | Full workflow with normal result |
| Diagnostic workup with additional views | Case 2 | SPOT + MAG views, higher BI-RADS |
| Partial views (incomplete set) | Case 3 | Missing-view warning, targeted study |
| Batch analysis performance | All | Process multiple images, check timing |
| GradCAM++ heatmap quality | Case 2 | Attention should highlight mass region |
| MC Dropout uncertainty | Case 3 | High uncertainty expected for calcifications |

## Attribution

These are synthetic demo images generated for ClinicalVision workflow testing.
Image synthesis inspired by mammographic appearance characteristics.
For research with real clinical data, refer to the CBIS-DDSM dataset:

> Lee RS, Gimenez F, Hoogi A, et al. "A curated mammography data set for use
> in computer-aided detection and diagnosis research." Scientific Data, 2017.
> DOI: 10.1038/sdata.2017.177
"""


def generate_demo_package(output_dir: str, validate: bool = True) -> Dict[str, Any]:
 """
 Generate the complete demo data package.

 Returns a summary dict with counts and paths.
 """
 output_path = Path(output_dir)

 # Clean and create output directory
 if output_path.exists():
 logger.info(f"Removing existing demo data at {output_path}")
 shutil.rmtree(output_path)
 output_path.mkdir(parents=True, exist_ok=True)

 total_images = 0
 generated_files: List[str] = []

 # Generate each case
 for case_id, spec in DEMO_CASES.items():
 case_dir = output_path / spec["dir_name"]
 png_dir = case_dir / "png"
 png_dir.mkdir(parents=True, exist_ok=True)

 logger.info(f"Generating {case_id} ({spec['label']})...")

 # Generate images
 for i, img_spec in enumerate(spec["images"]):
 seed = SEED_BASE + spec["synthesis"]["seed_offset"] + i
 filename = f"{case_id}_{img_spec['suffix']}.png"
 filepath = png_dir / filename

 # Generate the image
 img_array = generate_mammogram(
 case_id=case_id,
 suffix=img_spec["suffix"],
 view=img_spec["view"],
 laterality=img_spec["lat"],
 synthesis_type=spec["synthesis"]["type"],
 seed=seed,
 )

 # Save as PNG
 pil_img = Image.fromarray(img_array, mode="L")
 pil_img.save(str(filepath), format="PNG", optimize=True)

 file_size = filepath.stat().st_size
 logger.info(f" {filename} ({img_array.shape[1]}×{img_array.shape[0]}, {file_size // 1024}KB)")
 generated_files.append(str(filepath))
 total_images += 1

 # Generate case-info.json
 case_info = generate_case_info(case_id, spec)
 case_info_path = case_dir / "case-info.json"
 with open(case_info_path, "w") as f:
 json.dump(case_info, f, indent=2)
 logger.info(f" case-info.json")
 generated_files.append(str(case_info_path))

 # Generate manifest.json
 manifest = generate_manifest(DEMO_CASES, total_images)
 manifest_path = output_path / "manifest.json"
 with open(manifest_path, "w") as f:
 json.dump(manifest, f, indent=2)
 logger.info(f" manifest.json (total: {total_images} images)")
 generated_files.append(str(manifest_path))

 # Generate README.md
 readme_path = output_path / "README.md"
 with open(readme_path, "w") as f:
 f.write(generate_readme())
 logger.info(" README.md")
 generated_files.append(str(readme_path))

 # Generate ZIP package
 zip_path = output_path / "ClinicalVision_Demo_Package.zip"
 with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
 for file_path in generated_files:
 arcname = os.path.relpath(file_path, output_path)
 zf.write(file_path, arcname)
 zip_size = zip_path.stat().st_size
 logger.info(f" ClinicalVision_Demo_Package.zip ({zip_size // 1024}KB)")

 # Validation
 if validate:
 logger.info("\nValidating generated package...")
 errors = validate_package(output_path)
 if errors:
 for e in errors:
 logger.error(f" {e}")
 raise RuntimeError(f"Validation failed with {len(errors)} errors")
 else:
 logger.info(" All validation checks passed")

 summary = {
 "output_dir": str(output_path),
 "total_cases": len(DEMO_CASES),
 "total_images": total_images,
 "total_files": len(generated_files),
 "zip_size_bytes": zip_path.stat().st_size,
 "files": generated_files,
 }

 logger.info(f"\n Demo package generated: {total_images} images across {len(DEMO_CASES)} cases")
 return summary


# ============================================================================
# Validation
# ============================================================================


def validate_package(package_path: Path) -> List[str]:
 """
 Validate the generated demo package against expected schema.

 Returns a list of error messages. Empty list = all good.
 """
 errors: List[str] = []

 # Check manifest.json
 manifest_path = package_path / "manifest.json"
 if not manifest_path.exists():
 errors.append("manifest.json not found")
 return errors

 with open(manifest_path) as f:
 manifest = json.load(f)

 required_keys = {"version", "totalCases", "totalImages", "cases"}
 missing = required_keys - set(manifest.keys())
 if missing:
 errors.append(f"manifest.json missing keys: {missing}")

 if manifest.get("totalCases")!= 3:
 errors.append(f"Expected 3 cases, got {manifest.get('totalCases')}")

 if manifest.get("totalImages")!= 12:
 errors.append(f"Expected 12 images, got {manifest.get('totalImages')}")

 # Check each case
 expected_cases = {
 "DEMO-001": {"dir": "case-1-normal", "views": 4},
 "DEMO-002": {"dir": "case-2-suspicious", "views": 6},
 "DEMO-003": {"dir": "case-3-calcification", "views": 2},
 }

 for case_entry in manifest.get("cases", []):
 case_id = case_entry.get("id")
 if case_id not in expected_cases:
 errors.append(f"Unexpected case ID: {case_id}")
 continue

 expected = expected_cases[case_id]
 case_dir = package_path / expected["dir"]

 # Check case-info.json
 case_info_path = case_dir / "case-info.json"
 if not case_info_path.exists():
 errors.append(f"{case_id}: case-info.json not found")
 continue

 with open(case_info_path) as f:
 case_info = json.load(f)

 # Check required keys
 req_keys = {"caseId", "version", "patient", "clinicalHistory",
 "expectedOutcome", "images"}
 missing_ci = req_keys - set(case_info.keys())
 if missing_ci:
 errors.append(f"{case_id}: case-info.json missing keys: {missing_ci}")

 # Check image count
 images = case_info.get("images", [])
 if len(images)!= expected["views"]:
 errors.append(f"{case_id}: expected {expected['views']} images, got {len(images)}")

 # Check PNG files exist and are valid
 png_dir = case_dir / "png"
 if not png_dir.exists():
 errors.append(f"{case_id}: png/ directory not found")
 continue

 for img_info in images:
 filename = img_info["filename"] + ".png"
 img_path = png_dir / filename
 if not img_path.exists():
 errors.append(f"{case_id}: image not found: {filename}")
 continue

 # Validate image dimensions
 try:
 with Image.open(img_path) as img:
 w, h = img.size
 if w < 100 or h < 100:
 errors.append(f"{case_id}: {filename} too small: {w}×{h}")
 if img.mode!= "L":
 errors.append(f"{case_id}: {filename} expected grayscale, got {img.mode}")
 except Exception as e:
 errors.append(f"{case_id}: {filename} failed to open: {e}")

 # Check ZIP
 zip_path = package_path / "ClinicalVision_Demo_Package.zip"
 if not zip_path.exists():
 errors.append("ClinicalVision_Demo_Package.zip not found")
 else:
 try:
 with zipfile.ZipFile(zip_path, "r") as zf:
 names = zf.namelist()
 if len(names) < 12:
 errors.append(f"ZIP contains only {len(names)} files, expected ≥12")
 except zipfile.BadZipFile:
 errors.append("ClinicalVision_Demo_Package.zip is corrupted")

 return errors


# ============================================================================
# CLI
# ============================================================================


def main():
 parser = argparse.ArgumentParser(
 description="Generate ClinicalVision demo data package",
 )
 parser.add_argument(
 "--output",
 default=None,
 help="Output directory (default: clinicalvision_frontend/public/demo-data)",
 )
 parser.add_argument(
 "--validate",
 action="store_true",
 help="Validate an existing package instead of generating",
 )
 parser.add_argument(
 "--no-validate",
 action="store_true",
 help="Skip validation after generation",
 )
 args = parser.parse_args()

 # Determine output path
 if args.output:
 output_dir = args.output
 else:
 # Default: relative to this script's location
 script_dir = Path(__file__).resolve().parent.parent
 output_dir = str(script_dir / "clinicalvision_frontend" / "public" / "demo-data")

 if args.validate:
 logger.info(f"Validating package at {output_dir}...")
 errors = validate_package(Path(output_dir))
 if errors:
 for e in errors:
 logger.error(f" {e}")
 sys.exit(1)
 else:
 logger.info(" All validation checks passed")
 sys.exit(0)

 generate_demo_package(output_dir, validate=not args.no_validate)


if __name__ == "__main__":
 main()
