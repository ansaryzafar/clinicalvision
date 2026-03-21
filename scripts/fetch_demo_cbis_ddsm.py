#!/usr/bin/env python3
"""
fetch_demo_cbis_ddsm.py — Download real CBIS-DDSM mammograms from TCIA for demo cases.

Downloads 10 specific full-mammogram DICOMs from The Cancer Imaging Archive
(TCIA) public API, converts them to high-quality PNGs, and packages them
into the demo data directory structure.

Selected Patients (from CBIS-DDSM training set CSVs):
 • Case 1 (DEMO-001): P_00021 — BENIGN mass, subtlety=5, 4 views (L/R × CC/MLO)
 • Case 2 (DEMO-002): P_00092 — MALIGNANT mass, subtlety=5, 4 views (L/R × CC/MLO)
 • Case 3 (DEMO-003): P_00012 — MALIGNANT calc, subtlety=3-4, 2 views (L × CC/MLO)

Total: 10 images (not 12 — Case 2 uses 4 standard views only, no synthetic SPOT/MAG)

Usage:
 python scripts/fetch_demo_cbis_ddsm.py [--output-dir PATH] [--dry-run] [--validate-only]

Requirements:
 pip install requests pydicom Pillow numpy

Attribution:
 Lee RS, Gimenez F, Hoogi A, Miyake KK, Goben M, Rubin DL.
 "A curated mammography data set for use in computer-aided detection
 and diagnosis research." Scientific Data, 4:170177, 2017.
 DOI: 10.1038/sdata.2017.177
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import logging
import os
import shutil
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import requests
from PIL import Image

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TCIA_BASE_URL = "https://services.cancerimagingarchive.net/nbia-api/services/v1"
TCIA_GET_IMAGE = f"{TCIA_BASE_URL}/getImage"
DOWNLOAD_TIMEOUT = 120 # seconds per series download
MAX_EDGE = 2048 # resize longest edge to this

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data definitions — the 3 demo cases with real CBIS-DDSM Series UIDs
# ---------------------------------------------------------------------------

@dataclass
class DemoImageSpec:
 """Specification for one demo image to download."""
 filename: str # e.g. "DEMO-001_RIGHT_CC"
 series_uid: str # DICOM Series Instance UID (from CBIS-DDSM CSV)
 view_type: str # CC, MLO
 laterality: str # R, L
 source_patient: str # Original CBIS-DDSM patient ID
 source_desc: str # e.g. "Mass-Training_P_00021_LEFT_CC"


@dataclass
class DemoCaseSpec:
 """Specification for one demo case."""
 case_id: str
 dir_name: str
 label: str
 difficulty: str
 pathology: str
 patient_info: dict[str, Any]
 clinical_history: dict[str, Any]
 expected_outcome: dict[str, Any]
 images: list[DemoImageSpec] = field(default_factory=list)


# ---------- Case 1: Normal/Benign (P_00021) ----------
CASE_1 = DemoCaseSpec(
 case_id="DEMO-001",
 dir_name="case-1-normal",
 label="Normal / Benign Screening",
 difficulty="Easy",
 pathology="BENIGN",
 patient_info={
 "mrn": "DEMO-001",
 "firstName": "Jane",
 "lastName": "Thompson",
 "middleInitial": "A",
 "dateOfBirth": "1968-03-15",
 "sex": "F",
 },
 clinical_history={
 "indication": "Routine annual screening mammography",
 "priorStudies": "Annual screening — no prior findings",
 "brcaStatus": "Negative",
 "familyHistory": "No significant family history",
 "symptoms": "None — asymptomatic screening",
 "hormoneTherapy": "None",
 "priorBiopsies": "None",
 },
 expected_outcome={
 "biRads": "1 or 2",
 "description": "Normal/Benign — no suspicious findings expected",
 "pathology": "BENIGN",
 },
 images=[
 DemoImageSpec(
 filename="DEMO-001_RIGHT_CC",
 series_uid="1.3.6.1.4.1.9590.100.1.2.238517328812179290330581800221092807231",
 view_type="CC", laterality="R",
 source_patient="P_00021",
 source_desc="Mass-Training_P_00021_RIGHT_CC",
 ),
 DemoImageSpec(
 filename="DEMO-001_RIGHT_MLO",
 series_uid="1.3.6.1.4.1.9590.100.1.2.84350006812506903321489911520378117746",
 view_type="MLO", laterality="R",
 source_patient="P_00021",
 source_desc="Mass-Training_P_00021_RIGHT_MLO",
 ),
 DemoImageSpec(
 filename="DEMO-001_LEFT_CC",
 series_uid="1.3.6.1.4.1.9590.100.1.2.145557498613842583714429986600518227573",
 view_type="CC", laterality="L",
 source_patient="P_00021",
 source_desc="Mass-Training_P_00021_LEFT_CC",
 ),
 DemoImageSpec(
 filename="DEMO-001_LEFT_MLO",
 series_uid="1.3.6.1.4.1.9590.100.1.2.369287458813355648611939058220166307923",
 view_type="MLO", laterality="L",
 source_patient="P_00021",
 source_desc="Mass-Training_P_00021_LEFT_MLO",
 ),
 ],
)

# ---------- Case 2: Suspicious Mass (P_00092) ----------
CASE_2 = DemoCaseSpec(
 case_id="DEMO-002",
 dir_name="case-2-suspicious",
 label="Suspicious Mass Finding",
 difficulty="Intermediate",
 pathology="MALIGNANT",
 patient_info={
 "mrn": "DEMO-002",
 "firstName": "Maria",
 "lastName": "Chen",
 "middleInitial": "R",
 "dateOfBirth": "1975-09-22",
 "sex": "F",
 },
 clinical_history={
 "indication": "Palpable mass, right breast, 2 o'clock position",
 "priorStudies": "Previous benign biopsy (2023)",
 "brcaStatus": "Unknown",
 "familyHistory": "Mother — breast cancer at age 52",
 "symptoms": "Palpable lump in right breast, no nipple discharge",
 "hormoneTherapy": "None",
 "priorBiopsies": "Right breast, benign fibroadenoma (2023)",
 },
 expected_outcome={
 "biRads": "4 or 5",
 "description": "Suspicious — irregular mass with spiculated margins",
 "pathology": "MALIGNANT",
 },
 images=[
 DemoImageSpec(
 filename="DEMO-002_RIGHT_CC",
 series_uid="1.3.6.1.4.1.9590.100.1.2.293629768213098982240090876542239338862",
 view_type="CC", laterality="R",
 source_patient="P_00092",
 source_desc="Mass-Training_P_00092_RIGHT_CC",
 ),
 DemoImageSpec(
 filename="DEMO-002_RIGHT_MLO",
 series_uid="1.3.6.1.4.1.9590.100.1.2.204932936112007111301870388513884327444",
 view_type="MLO", laterality="R",
 source_patient="P_00092",
 source_desc="Mass-Training_P_00092_RIGHT_MLO",
 ),
 DemoImageSpec(
 filename="DEMO-002_LEFT_CC",
 series_uid="1.3.6.1.4.1.9590.100.1.2.395119796911717183208718117572298386861",
 view_type="CC", laterality="L",
 source_patient="P_00092",
 source_desc="Mass-Training_P_00092_LEFT_CC",
 ),
 DemoImageSpec(
 filename="DEMO-002_LEFT_MLO",
 series_uid="1.3.6.1.4.1.9590.100.1.2.330825165611895385300304977110070004321",
 view_type="MLO", laterality="L",
 source_patient="P_00092",
 source_desc="Mass-Training_P_00092_LEFT_MLO",
 ),
 ],
)

# ---------- Case 3: Calcification (P_00012) ----------
CASE_3 = DemoCaseSpec(
 case_id="DEMO-003",
 dir_name="case-3-calcification",
 label="Calcification Follow-up",
 difficulty="Advanced",
 pathology="MALIGNANT",
 patient_info={
 "mrn": "DEMO-003",
 "firstName": "Sarah",
 "lastName": "Williams",
 "middleInitial": "L",
 "dateOfBirth": "1982-11-08",
 "sex": "F",
 },
 clinical_history={
 "indication": "Calcifications noted on prior screening",
 "priorStudies": "Screening 6 months ago — BI-RADS 3",
 "brcaStatus": "Positive (BRCA1)",
 "familyHistory": "Sister — breast cancer at age 45, maternal aunt — ovarian cancer",
 "symptoms": "No palpable mass — calcifications on imaging only",
 "hormoneTherapy": "None",
 "priorBiopsies": "None",
 },
 expected_outcome={
 "biRads": "4B or 4C",
 "description": "Suspicious calcifications — biopsy recommended",
 "pathology": "MALIGNANT",
 },
 images=[
 DemoImageSpec(
 filename="DEMO-003_LEFT_CC",
 series_uid="1.3.6.1.4.1.9590.100.1.2.97980732212593010616197208512945314995",
 view_type="CC", laterality="L",
 source_patient="P_00012",
 source_desc="Calc-Training_P_00012_LEFT_CC",
 ),
 DemoImageSpec(
 filename="DEMO-003_LEFT_MLO",
 series_uid="1.3.6.1.4.1.9590.100.1.2.307271664512650974022213502811472047069",
 view_type="MLO", laterality="L",
 source_patient="P_00012",
 source_desc="Calc-Training_P_00012_LEFT_MLO",
 ),
 ],
)

DEMO_CASES: list[DemoCaseSpec] = [CASE_1, CASE_2, CASE_3]


# ---------------------------------------------------------------------------
# TCIA Download
# ---------------------------------------------------------------------------

def download_series_dicom(series_uid: str) -> bytes:
 """Download a DICOM series ZIP from TCIA by SeriesInstanceUID."""
 url = f"{TCIA_GET_IMAGE}?SeriesInstanceUID={series_uid}"
 logger.info("Downloading series %s...", series_uid[:40])
 resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
 resp.raise_for_status()
 if len(resp.content) < 100:
 raise ValueError(f"Downloaded content too small ({len(resp.content)} bytes) "
 f"for series {series_uid}")
 return resp.content


def extract_dicom_from_zip(zip_bytes: bytes) -> bytes:
 """Extract the first.dcm file from a TCIA ZIP response."""
 buf = io.BytesIO(zip_bytes)
 with zipfile.ZipFile(buf) as zf:
 dcm_files = [n for n in zf.namelist() if n.endswith(".dcm")]
 if not dcm_files:
 raise ValueError("No.dcm files found in TCIA ZIP response")
 # Use the first (usually only) DICOM file
 return zf.read(dcm_files[0])


# ---------------------------------------------------------------------------
# DICOM → PNG conversion
# ---------------------------------------------------------------------------

def dicom_to_png_array(dcm_bytes: bytes) -> np.ndarray:
 """Convert DICOM bytes to a uint8 numpy array suitable for PNG.
 
 Applies VOI LUT if available, handles MONOCHROME1/2 photometric
 interpretation, normalizes to 8-bit range.
 """
 import pydicom
 from pydicom.pixel_data_handlers.util import apply_voi_lut

 ds = pydicom.dcmread(io.BytesIO(dcm_bytes))
 pixel_array = ds.pixel_array.astype(np.float64)

 # Apply VOI LUT (window/level) if available
 try:
 pixel_array = apply_voi_lut(pixel_array, ds).astype(np.float64)
 except Exception:
 pass # No VOI LUT — use raw pixels

 # Handle MONOCHROME1 (inverted) — breast should be bright on dark
 photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2")
 if photometric == "MONOCHROME1":
 pixel_array = pixel_array.max() - pixel_array

 # Normalize to 0–255
 pmin, pmax = pixel_array.min(), pixel_array.max()
 if pmax > pmin:
 pixel_array = (pixel_array - pmin) / (pmax - pmin) * 255.0
 else:
 pixel_array = np.zeros_like(pixel_array)

 return pixel_array.astype(np.uint8)


def resize_to_max_edge(arr: np.ndarray, max_edge: int = MAX_EDGE) -> np.ndarray:
 """Resize keeping aspect ratio so longest edge ≤ max_edge."""
 h, w = arr.shape[:2]
 if max(h, w) <= max_edge:
 return arr
 scale = max_edge / max(h, w)
 new_h, new_w = int(h * scale), int(w * scale)
 img = Image.fromarray(arr, mode="L")
 img = img.resize((new_w, new_h), Image.LANCZOS)
 return np.array(img)


# ---------------------------------------------------------------------------
# Package generation
# ---------------------------------------------------------------------------

def generate_case_info(case: DemoCaseSpec, checksums: dict[str, str]) -> dict:
 """Generate case-info.json content for a demo case."""
 images = []
 for img_spec in case.images:
 img_entry: dict[str, Any] = {
 "filename": img_spec.filename,
 "viewType": img_spec.view_type,
 "laterality": img_spec.laterality,
 "formats": ["png"],
 "source": "CBIS-DDSM (TCIA)",
 "originalCaseId": img_spec.source_patient,
 }
 png_name = f"{img_spec.filename}.png"
 if png_name in checksums:
 img_entry["md5"] = checksums[png_name]
 images.append(img_entry)

 return {
 "caseId": case.case_id,
 "version": "2.0.0",
 "patient": case.patient_info,
 "clinicalHistory": case.clinical_history,
 "expectedOutcome": case.expected_outcome,
 "images": images,
 }


def generate_manifest(cases: list[DemoCaseSpec]) -> dict:
 """Generate the top-level manifest.json."""
 total_images = sum(len(c.images) for c in cases)
 return {
 "version": "2.0.0",
 "generatedAt": datetime.now(timezone.utc).isoformat(),
 "description": (
 "ClinicalVision AI Demo Data Package — Real CBIS-DDSM mammogram "
 "images for workflow testing"
 ),
 "source": "CBIS-DDSM (The Cancer Imaging Archive)",
 "totalCases": len(cases),
 "totalImages": total_images,
 "formats": ["PNG (.png)"],
 "zipDownload": "/demo-data/ClinicalVision_Demo_Package.zip",
 "cases": [
 {
 "id": c.case_id,
 "label": c.label,
 "difficulty": c.difficulty,
 "views": len(c.images),
 "path": f"/demo-data/{c.dir_name}/",
 }
 for c in cases
 ],
 "attribution": {
 "dataset": "CBIS-DDSM",
 "citation": (
 'Lee RS, Gimenez F, Hoogi A, et al. "A curated mammography '
 "data set for use in computer-aided detection and diagnosis "
 'research." Scientific Data, 4:170177, 2017.'
 ),
 "doi": "10.1038/sdata.2017.177",
 "source": "The Cancer Imaging Archive (TCIA)",
 "license": "TCIA Data Usage Policy — free for research and education",
 },
 }


def generate_readme() -> str:
 """Generate the README.md for the demo package."""
 return """# ClinicalVision AI — Demo Data Package

## What's Included

3 curated mammogram cases (10 images total) sourced from the **CBIS-DDSM**
dataset (The Cancer Imaging Archive) for testing the complete ClinicalVision
clinical workflow.

These are **real de-identified mammogram images**, not synthetic data.

## How to Use

### Quick Start (Recommended)
1. Log in to ClinicalVision
2. On the workflow page, click **"Load Demo Case"**
3. Select a case — patient info and images load automatically
4. Proceed through the 10-step clinical workflow

### Manual Upload
1. Download this package
2. Start a new case in the workflow
3. Enter patient info from `case-info.json`
4. Upload PNG images from the case folder

## Cases

| Case | ID | Difficulty | Views | Source Patient | Expected BI-RADS |
|------|-----|-----------|-------|---------------|-----------------|
| Normal Screening | DEMO-001 | Easy | 4 | P_00021 (BENIGN) | 1-2 |
| Suspicious Mass | DEMO-002 | Intermediate | 4 | P_00092 (MALIGNANT) | 4-5 |
| Calcification | DEMO-003 | Advanced | 2 | P_00012 (MALIGNANT) | 4B-4C |

## AI Features to Test

- **MC Dropout** uncertainty quantification (30 forward passes)
- **GradCAM++** attention heatmaps
- **BI-RADS** assessment suggestions
- **Suspicious region** detection with bounding boxes

## Attribution

Images sourced from the CBIS-DDSM dataset:

> Lee RS, Gimenez F, Hoogi A, Miyake KK, Goben M, Rubin DL.
> "A curated mammography data set for use in computer-aided detection
> and diagnosis research." Scientific Data, 4:170177, 2017.
> DOI: 10.1038/sdata.2017.177

Original data from The Cancer Imaging Archive (TCIA).
Licensed under TCIA Data Usage Policy — free for research and education.
"""


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def fetch_and_convert_image(img_spec: DemoImageSpec, output_dir: Path) -> str:
 """Download one CBIS-DDSM image and save as PNG. Returns MD5 checksum."""
 png_dir = output_dir / "png"
 png_dir.mkdir(parents=True, exist_ok=True)
 png_path = png_dir / f"{img_spec.filename}.png"

 if png_path.exists():
 logger.info(" [skip] %s already exists", png_path.name)
 md5 = hashlib.md5(png_path.read_bytes()).hexdigest()
 return md5

 # Download from TCIA
 zip_bytes = download_series_dicom(img_spec.series_uid)
 dcm_bytes = extract_dicom_from_zip(zip_bytes)

 # Convert to PNG
 pixel_array = dicom_to_png_array(dcm_bytes)
 pixel_array = resize_to_max_edge(pixel_array, MAX_EDGE)

 img = Image.fromarray(pixel_array, mode="L")
 img.save(str(png_path), "PNG", optimize=True)

 md5 = hashlib.md5(png_path.read_bytes()).hexdigest()
 logger.info(" %s — %dx%d, %dKB, md5=%s",
 png_path.name, img.width, img.height,
 png_path.stat().st_size // 1024, md5[:8])
 return md5


def build_demo_package(
 output_dir: Path,
 cases: list[DemoCaseSpec] | None = None,
 dry_run: bool = False,
) -> Path:
 """Download all images and build the complete demo package."""
 if cases is None:
 cases = DEMO_CASES

 output_dir.mkdir(parents=True, exist_ok=True)

 if dry_run:
 logger.info("[DRY RUN] Would download %d images across %d cases",
 sum(len(c.images) for c in cases), len(cases))
 for case in cases:
 logger.info(" %s: %d images", case.case_id, len(case.images))
 for img in case.images:
 logger.info(" %s (series: %s...)", img.filename, img.series_uid[:30])
 return output_dir

 # Download images for each case
 for case in cases:
 case_dir = output_dir / case.dir_name
 case_dir.mkdir(parents=True, exist_ok=True)
 logger.info("\n %s — %s", case.case_id, case.label)

 checksums: dict[str, str] = {}
 for img_spec in case.images:
 md5 = fetch_and_convert_image(img_spec, case_dir)
 checksums[f"{img_spec.filename}.png"] = md5

 # Write case-info.json
 case_info = generate_case_info(case, checksums)
 case_info_path = case_dir / "case-info.json"
 case_info_path.write_text(json.dumps(case_info, indent=2, ensure_ascii=False))
 logger.info(" case-info.json written")

 # Write manifest.json
 manifest = generate_manifest(cases)
 manifest_path = output_dir / "manifest.json"
 manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
 logger.info("\n manifest.json written")

 # Write README.md
 readme_path = output_dir / "README.md"
 readme_path.write_text(generate_readme())
 logger.info(" README.md written")

 # Create ZIP package
 zip_path = output_dir / "ClinicalVision_Demo_Package.zip"
 with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
 for case in cases:
 case_dir = output_dir / case.dir_name
 # Add case-info.json
 ci_path = case_dir / "case-info.json"
 zf.write(ci_path, f"{case.dir_name}/case-info.json")
 # Add PNGs
 png_dir = case_dir / "png"
 for png_file in sorted(png_dir.glob("*.png")):
 zf.write(png_file, f"{case.dir_name}/png/{png_file.name}")
 # Add manifest and README
 zf.write(manifest_path, "manifest.json")
 zf.write(readme_path, "README.md")

 logger.info(" ZIP created: %s (%dKB)",
 zip_path.name, zip_path.stat().st_size // 1024)

 return output_dir


def validate_package(package_dir: Path) -> list[str]:
 """Validate a demo data package. Returns list of errors (empty = valid)."""
 errors: list[str] = []

 # Check manifest
 manifest_path = package_dir / "manifest.json"
 if not manifest_path.exists():
 errors.append("Missing manifest.json")
 return errors

 manifest = json.loads(manifest_path.read_text())

 for case_summary in manifest.get("cases", []):
 case_id = case_summary["id"]
 case_path_str = case_summary["path"].strip("/").replace("demo-data/", "")
 case_dir = package_dir / case_path_str

 if not case_dir.exists():
 errors.append(f"{case_id}: directory {case_dir.name} missing")
 continue

 ci_path = case_dir / "case-info.json"
 if not ci_path.exists():
 errors.append(f"{case_id}: case-info.json missing")
 continue

 case_info = json.loads(ci_path.read_text())
 png_dir = case_dir / "png"

 for img_entry in case_info.get("images", []):
 fname = img_entry["filename"]
 png_path = png_dir / f"{fname}.png"
 if not png_path.exists():
 errors.append(f"{case_id}: image {fname}.png missing")
 else:
 # Verify it's a valid image
 try:
 img = Image.open(png_path)
 img.verify()
 except Exception as e:
 errors.append(f"{case_id}: {fname}.png invalid — {e}")

 # Check ZIP
 zip_path = package_dir / "ClinicalVision_Demo_Package.zip"
 if not zip_path.exists():
 errors.append("Missing ClinicalVision_Demo_Package.zip")
 else:
 try:
 with zipfile.ZipFile(zip_path) as zf:
 if zf.testzip() is not None:
 errors.append("ZIP file is corrupt")
 except Exception as e:
 errors.append(f"ZIP file error: {e}")

 return errors


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
 parser = argparse.ArgumentParser(
 description="Download real CBIS-DDSM mammograms for ClinicalVision demo data",
 )
 parser.add_argument(
 "--output-dir", "-o",
 type=Path,
 default=Path("clinicalvision_frontend/public/demo-data"),
 help="Output directory for demo data (default: clinicalvision_frontend/public/demo-data)",
 )
 parser.add_argument("--dry-run", action="store_true",
 help="Show what would be downloaded without downloading")
 parser.add_argument("--validate-only", action="store_true",
 help="Only validate existing package")
 parser.add_argument("--verbose", "-v", action="store_true")

 args = parser.parse_args()

 logging.basicConfig(
 level=logging.DEBUG if args.verbose else logging.INFO,
 format="%(message)s",
 )

 if args.validate_only:
 errors = validate_package(args.output_dir)
 if errors:
 logger.error(" Validation failed:")
 for e in errors:
 logger.error(" • %s", e)
 return 1
 else:
 logger.info(" Package is valid")
 return 0

 try:
 build_demo_package(args.output_dir, dry_run=args.dry_run)
 except Exception as e:
 logger.error(" Build failed: %s", e)
 if args.verbose:
 import traceback
 traceback.print_exc()
 return 1

 # Validate
 errors = validate_package(args.output_dir)
 if errors:
 logger.warning("\n Validation warnings:")
 for e in errors:
 logger.warning(" • %s", e)
 else:
 logger.info("\n Package validated successfully")

 total = sum(len(c.images) for c in DEMO_CASES)
 logger.info("\n Demo package ready: %d cases, %d real CBIS-DDSM images",
 len(DEMO_CASES), total)
 return 0


if __name__ == "__main__":
 sys.exit(main())
