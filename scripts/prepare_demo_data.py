#!/usr/bin/env python3
"""
ClinicalVision Demo Data Preparation Script

Prepares a curated demo data package from CBIS-DDSM for ClinicalVision testers.
Designed to run on Google Colab with Google Drive access.

ALGORITHM:
1. Mount Google Drive, load CBIS-DDSM metadata CSVs
2. For each of the 3 demo cases, find an optimal patient using scored ranking
3. Extract original DICOM files (navigate the 3-level CBIS-DDSM directory nesting)
4. Convert DICOM → PNG (VOI LUT → 16→8 bit → resize ≤2048px)
5. Rename files to DEMO-NNN_SIDE_VIEW.{dcm,png}
6. Generate case-info.json and manifest.json
7. Package as ZIP and validate

PATIENT SELECTION ALGORITHM:
  score(patient) = w1 * has_all_views + w2 * subtlety_match + w3 * dicom_loadable
  where:
    has_all_views: 1.0 if patient has required lateralities × view types
    subtlety_match: 1.0 - |subtlety - target_subtlety| / 5
    dicom_loadable: 1.0 if all DICOMs load without error, 0.0 otherwise

  The patient with the highest score is selected for each case.

Usage (Google Colab):
    # Mount Drive first
    from google.colab import drive
    drive.mount('/content/drive')

    # Run the script
    !python scripts/prepare_demo_data.py --drive-root /content/drive/MyDrive/CBIS-DDSM-data

Usage (Local with CSVs):
    python scripts/prepare_demo_data.py --data-root /path/to/CBIS-DDSM --output ./demo-data

Test:
    python scripts/prepare_demo_data.py --dry-run --data-root /path/to/CBIS-DDSM
"""

import os
import sys
import json
import shutil
import hashlib
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any

import numpy as np

# Optional imports — fail gracefully with helpful messages
try:
    import pandas as pd
except ImportError:
    pd = None

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut
except ImportError:
    pydicom = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import cv2
except ImportError:
    cv2 = None


# ============================================================================
# Constants — Single Source of Truth (matches test_demo_data_package.py)
# ============================================================================

SCRIPT_VERSION = "1.0.0"
MAX_PNG_EDGE = 2048
MIN_IMAGE_DIM = 100
FILENAME_PATTERN = "{case_id}_{side}_{view}"  # e.g., DEMO-001_RIGHT_CC

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("prepare_demo_data")


# ============================================================================
# Data Classes — Typed Configuration for Each Demo Case
# ============================================================================

@dataclass
class PatientInfo:
    """Patient demographics for a demo case."""
    mrn: str
    firstName: str
    lastName: str
    middleInitial: str
    dateOfBirth: str
    sex: str = "F"


@dataclass
class ClinicalHistory:
    """Clinical history for a demo case."""
    indication: str
    priorStudies: str
    brcaStatus: str
    familyHistory: str
    symptoms: str
    hormoneTherapy: str = "None"
    priorBiopsies: str = "None"


@dataclass
class ExpectedOutcome:
    """Expected AI outcome for validation."""
    biRads: str
    description: str
    pathology: str  # "BENIGN" or "MALIGNANT"


@dataclass
class ImageSpec:
    """Specification for one image in a demo case."""
    filename: str          # e.g., "DEMO-001_RIGHT_CC"
    viewType: str          # CC, MLO, SPOT, MAG
    laterality: str        # R or L
    formats: List[str] = field(default_factory=lambda: ["dcm", "png"])
    source: str = "CBIS-DDSM"
    originalCaseId: str = ""


@dataclass
class DemoCaseSpec:
    """Full specification for one demo case."""
    case_id: str           # DEMO-001, DEMO-002, DEMO-003
    dir_name: str          # case-1-normal, case-2-suspicious, case-3-calcification
    label: str             # Display label
    difficulty: str        # Easy, Intermediate, Advanced
    patient: PatientInfo
    clinical_history: ClinicalHistory
    expected_outcome: ExpectedOutcome
    images: List[ImageSpec]
    # Selection criteria for CBIS-DDSM patient lookup
    source_dataset: str    # "mass" or "calc"
    source_split: str      # "train" or "test"
    target_pathology: str  # "BENIGN" or "MALIGNANT"
    target_subtlety: int   # 1-5 (1=obvious, 5=subtle)
    required_lateralities: List[str] = field(default_factory=list)  # ["LEFT", "RIGHT"]
    required_views: List[str] = field(default_factory=list)         # ["CC", "MLO"]


# ============================================================================
# Demo Case Definitions — The 3 Curated Cases
# ============================================================================

DEMO_CASES: List[DemoCaseSpec] = [
    DemoCaseSpec(
        case_id="DEMO-001",
        dir_name="case-1-normal",
        label="Normal / Benign Screening",
        difficulty="Easy",
        patient=PatientInfo(
            mrn="DEMO-001", firstName="Jane", lastName="Thompson",
            middleInitial="A", dateOfBirth="1968-03-15",
        ),
        clinical_history=ClinicalHistory(
            indication="Routine annual screening mammography",
            priorStudies="Annual screening — no prior findings",
            brcaStatus="Negative",
            familyHistory="No significant family history",
            symptoms="None — asymptomatic screening",
        ),
        expected_outcome=ExpectedOutcome(
            biRads="1 or 2",
            description="Normal/Benign — no suspicious findings",
            pathology="BENIGN",
        ),
        images=[
            ImageSpec("DEMO-001_RIGHT_CC", "CC", "R"),
            ImageSpec("DEMO-001_LEFT_CC", "CC", "L"),
            ImageSpec("DEMO-001_RIGHT_MLO", "MLO", "R"),
            ImageSpec("DEMO-001_LEFT_MLO", "MLO", "L"),
        ],
        source_dataset="mass",
        source_split="train",
        target_pathology="BENIGN",
        target_subtlety=4,  # High subtlety = looks normal
        required_lateralities=["LEFT", "RIGHT"],
        required_views=["CC", "MLO"],
    ),
    DemoCaseSpec(
        case_id="DEMO-002",
        dir_name="case-2-suspicious",
        label="Suspicious Mass Finding",
        difficulty="Intermediate",
        patient=PatientInfo(
            mrn="DEMO-002", firstName="Maria", lastName="Chen",
            middleInitial="R", dateOfBirth="1975-09-22",
        ),
        clinical_history=ClinicalHistory(
            indication="Palpable mass, right breast, 2 o'clock position",
            priorStudies="Previous benign biopsy (2023)",
            brcaStatus="Unknown",
            familyHistory="Mother — breast cancer at 52",
            symptoms="Palpable lump, right breast",
            priorBiopsies="Right breast, 2023 — fibroadenoma (benign)",
        ),
        expected_outcome=ExpectedOutcome(
            biRads="4 or 5",
            description="Suspicious mass — biopsy recommended",
            pathology="MALIGNANT",
        ),
        images=[
            ImageSpec("DEMO-002_RIGHT_CC", "CC", "R"),
            ImageSpec("DEMO-002_LEFT_CC", "CC", "L"),
            ImageSpec("DEMO-002_RIGHT_MLO", "MLO", "R"),
            ImageSpec("DEMO-002_LEFT_MLO", "MLO", "L"),
            ImageSpec("DEMO-002_RIGHT_SPOT", "SPOT", "R"),
            ImageSpec("DEMO-002_RIGHT_MAG", "MAG", "R"),
        ],
        source_dataset="mass",
        source_split="train",
        target_pathology="MALIGNANT",
        target_subtlety=2,  # Low subtlety = obvious finding
        required_lateralities=["LEFT", "RIGHT"],
        required_views=["CC", "MLO"],
    ),
    DemoCaseSpec(
        case_id="DEMO-003",
        dir_name="case-3-calcification",
        label="Calcification Follow-up",
        difficulty="Advanced",
        patient=PatientInfo(
            mrn="DEMO-003", firstName="Sarah", lastName="Williams",
            middleInitial="L", dateOfBirth="1982-11-08",
        ),
        clinical_history=ClinicalHistory(
            indication="Calcifications noted on prior screening mammography",
            priorStudies="Screening 6 months ago — BI-RADS 3 (probably benign)",
            brcaStatus="Positive (BRCA1)",
            familyHistory="Sister — breast cancer at 45, maternal aunt — ovarian cancer",
            symptoms="None — follow-up for known calcifications",
            priorBiopsies="None",
        ),
        expected_outcome=ExpectedOutcome(
            biRads="4B or 4C",
            description="Suspicious calcifications requiring biopsy",
            pathology="MALIGNANT",
        ),
        images=[
            ImageSpec("DEMO-003_LEFT_CC", "CC", "L"),
            ImageSpec("DEMO-003_LEFT_MLO", "MLO", "L"),
        ],
        source_dataset="calc",
        source_split="train",
        target_pathology="MALIGNANT",
        target_subtlety=3,  # Medium subtlety
        required_lateralities=["LEFT"],
        required_views=["CC", "MLO"],
    ),
]


# ============================================================================
# Patient Selection Algorithm
# ============================================================================

def find_best_patient(
    df: "pd.DataFrame",
    spec: DemoCaseSpec,
    data_root: Path,
    max_candidates: int = 20,
) -> Optional[Dict[str, Any]]:
    """
    Find the optimal CBIS-DDSM patient for a demo case specification.
    
    Algorithm:
    1. Filter by pathology (BENIGN/MALIGNANT)
    2. Filter by required lateralities (must have all)
    3. Filter by required view types (must have all)
    4. Score remaining candidates by subtlety match
    5. Verify top candidates have loadable DICOMs
    6. Return best candidate with all file paths
    
    Time complexity: O(n * v) where n = patients, v = views per patient
    Space complexity: O(n) for the filtered DataFrame
    
    Returns:
        Dict with patient_id, score, and image paths, or None if no match.
    """
    if pd is None:
        raise ImportError("pandas required: pip install pandas")

    logger.info(f"Searching for {spec.case_id} patient: "
                f"pathology={spec.target_pathology}, "
                f"sides={spec.required_lateralities}, "
                f"views={spec.required_views}")

    # Step 1: Filter by pathology
    mask = df["pathology"].str.upper().isin(
        [spec.target_pathology, f"{spec.target_pathology}_WITHOUT_CALLBACK"]
    )
    filtered = df[mask].copy()
    logger.info(f"  After pathology filter: {len(filtered)} rows")

    if filtered.empty:
        logger.warning(f"  No patients with pathology={spec.target_pathology}")
        return None

    # Step 2: Find patients with all required laterality × view combinations
    required_combos = set()
    for lat in spec.required_lateralities:
        for view in spec.required_views:
            required_combos.add((lat.upper(), view.upper()))

    # Normalize column names (CBIS-DDSM uses various naming conventions)
    lat_col = _find_column(filtered, ["left or right breast", "laterality", "breast_side"])
    view_col = _find_column(filtered, ["image view", "view", "view_position"])
    pid_col = _find_column(filtered, ["patient_id", "patient id"])
    subtlety_col = _find_column(filtered, ["subtlety"])

    if not all([lat_col, view_col, pid_col]):
        logger.error(f"  Missing required columns. Available: {list(filtered.columns)}")
        return None

    # Group by patient and check view coverage
    candidates = []
    for patient_id, group in filtered.groupby(pid_col):
        patient_combos = set()
        for _, row in group.iterrows():
            lat = str(row[lat_col]).upper().strip()
            view = str(row[view_col]).upper().strip()
            patient_combos.add((lat, view))

        # Must have all required combinations
        if required_combos.issubset(patient_combos):
            avg_subtlety = group[subtlety_col].mean() if subtlety_col else 3
            candidates.append({
                "patient_id": patient_id,
                "views_available": patient_combos,
                "avg_subtlety": avg_subtlety,
                "rows": group,
            })

    logger.info(f"  Patients with all required views: {len(candidates)}")

    if not candidates:
        logger.warning(f"  No patients have all required views")
        return None

    # Step 3: Score candidates by subtlety match
    for c in candidates:
        subtlety_score = 1.0 - abs(c["avg_subtlety"] - spec.target_subtlety) / 5.0
        extra_views = len(c["views_available"]) - len(required_combos)
        coverage_bonus = min(extra_views * 0.05, 0.15)  # Up to 15% bonus for extra views
        c["score"] = subtlety_score + coverage_bonus

    # Sort by score descending, take top candidates for DICOM verification
    candidates.sort(key=lambda c: c["score"], reverse=True)
    candidates = candidates[:max_candidates]

    # Step 4: Verify DICOM files are loadable
    for c in candidates:
        image_paths = _resolve_dicom_paths(c["rows"], data_root, lat_col, view_col)
        if image_paths is not None:
            c["image_paths"] = image_paths
            c["dicom_verified"] = True
            logger.info(f"  ✅ Best candidate: {c['patient_id']} "
                        f"(score={c['score']:.2f}, views={len(c['views_available'])})")
            return c

    logger.warning(f"  No candidates had fully loadable DICOMs")
    return None


def _find_column(df: "pd.DataFrame", candidates: List[str]) -> Optional[str]:
    """Find the first matching column name (case-insensitive)."""
    cols_lower = {c.lower().strip(): c for c in df.columns}
    for name in candidates:
        if name.lower() in cols_lower:
            return cols_lower[name.lower()]
    return None


def _resolve_dicom_paths(
    group: "pd.DataFrame",
    data_root: Path,
    lat_col: str,
    view_col: str,
) -> Optional[Dict[Tuple[str, str], Path]]:
    """
    Resolve DICOM file paths for a patient's image group.
    
    CBIS-DDSM has 3-level nesting: case_dir / date_folder / series_folder / file.dcm
    We navigate this to find the actual .dcm file.
    
    Returns:
        Dict mapping (laterality, view) → Path to DICOM, or None if any missing.
    """
    paths = {}
    for _, row in group.iterrows():
        lat = str(row[lat_col]).upper().strip()
        view = str(row[view_col]).upper().strip()

        # Try multiple path resolution strategies
        dcm_path = _find_dicom_file(row, data_root)
        if dcm_path is None:
            return None

        paths[(lat, view)] = dcm_path

    return paths


def _find_dicom_file(row: "pd.Series", data_root: Path) -> Optional[Path]:
    """
    Navigate the CBIS-DDSM directory structure to find the DICOM file.
    
    Directory structure: CBIS-DDSM/{case_dir}/{date_folder}/{series_folder}/{file}.dcm
    
    The CSV has an 'image file path' or 'cropped image file path' column
    pointing to the relative path within the data root.
    """
    # Try 'image file path' first (full mammogram), then cropped
    path_cols = ["image file path", "cropped image file path",
                 "image_file_path", "file_path"]

    for col in path_cols:
        if col in row.index and pd.notna(row[col]):
            rel_path = str(row[col]).strip()
            # CBIS-DDSM paths may have leading slash
            rel_path = rel_path.lstrip("/")
            full_path = data_root / rel_path

            if full_path.is_file():
                return full_path

            # Try navigating the directory tree
            if full_path.is_dir():
                dcm = _find_dcm_in_dir(full_path)
                if dcm:
                    return dcm

    return None


def _find_dcm_in_dir(directory: Path, max_depth: int = 3) -> Optional[Path]:
    """
    Recursively search for a .dcm file in a directory (max 3 levels deep).
    Returns the first found, preferring larger files (full mammogram over ROI).
    """
    dcm_files = []
    for root, dirs, files in os.walk(str(directory)):
        depth = str(root).count(os.sep) - str(directory).count(os.sep)
        if depth > max_depth:
            continue
        for f in files:
            if f.lower().endswith(".dcm"):
                fp = Path(root) / f
                dcm_files.append((fp, fp.stat().st_size))

    if not dcm_files:
        return None

    # Prefer largest file (full mammogram, not ROI crop)
    dcm_files.sort(key=lambda x: x[1], reverse=True)
    return dcm_files[0][0]


# ============================================================================
# DICOM to PNG Conversion
# ============================================================================

def dicom_to_png(
    dicom_path: Path,
    output_path: Path,
    max_edge: int = MAX_PNG_EDGE,
) -> Dict[str, Any]:
    """
    Convert DICOM to PNG with proper windowing and normalization.
    
    Algorithm:
    1. Read DICOM file with pydicom
    2. Apply VOI LUT (windowing) if available
    3. Normalize to 8-bit (0-255)
    4. Handle photometric interpretation (invert if needed)
    5. Resize if larger than max_edge (preserve aspect ratio)
    6. Save as PNG (grayscale)
    
    Returns:
        Metadata dict with original dimensions, photometric info, etc.
    """
    if pydicom is None:
        raise ImportError("pydicom required: pip install pydicom")
    if Image is None:
        raise ImportError("Pillow required: pip install Pillow")

    ds = pydicom.dcmread(str(dicom_path))
    pixel_array = ds.pixel_array.astype(np.float64)

    # Apply VOI LUT (Window Center / Width) if available
    try:
        pixel_array = apply_voi_lut(pixel_array, ds, index=0)
    except Exception:
        pass  # Use raw pixel data if VOI LUT fails

    # Handle Photometric Interpretation
    photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2")
    if photometric == "MONOCHROME1":
        # MONOCHROME1: high values = dark (air), need to invert
        pixel_array = pixel_array.max() - pixel_array

    # Normalize to 8-bit
    pmin, pmax = pixel_array.min(), pixel_array.max()
    if pmax > pmin:
        pixel_array = (pixel_array - pmin) / (pmax - pmin) * 255.0
    else:
        pixel_array = np.zeros_like(pixel_array)
    pixel_array = pixel_array.astype(np.uint8)

    # Create PIL image
    img = Image.fromarray(pixel_array, mode="L")
    orig_w, orig_h = img.size

    # Resize if larger than max_edge (preserve aspect ratio)
    if max(orig_w, orig_h) > max_edge:
        ratio = max_edge / max(orig_w, orig_h)
        new_w = int(orig_w * ratio)
        new_h = int(orig_h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        logger.debug(f"  Resized {orig_w}×{orig_h} → {new_w}×{new_h}")

    # Save as PNG
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output_path), format="PNG", optimize=True)

    # Compute checksum for integrity verification
    md5 = hashlib.md5(output_path.read_bytes()).hexdigest()

    return {
        "original_width": orig_w,
        "original_height": orig_h,
        "output_width": img.size[0],
        "output_height": img.size[1],
        "photometric": photometric,
        "bits_stored": getattr(ds, "BitsStored", None),
        "file_size_bytes": output_path.stat().st_size,
        "md5": md5,
    }


# ============================================================================
# Package Assembly
# ============================================================================

def build_case_info(spec: DemoCaseSpec, image_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Build case-info.json for a single demo case."""
    images = []
    for img_spec in spec.images:
        entry = {
            "filename": img_spec.filename,
            "viewType": img_spec.viewType,
            "laterality": img_spec.laterality,
            "formats": img_spec.formats,
            "source": img_spec.source,
            "originalCaseId": img_spec.originalCaseId,
        }
        # Add image metadata if available
        meta_key = img_spec.filename
        if meta_key in image_metadata:
            entry["metadata"] = image_metadata[meta_key]
        images.append(entry)

    return {
        "caseId": spec.case_id,
        "version": SCRIPT_VERSION,
        "patient": asdict(spec.patient),
        "clinicalHistory": asdict(spec.clinical_history),
        "expectedOutcome": asdict(spec.expected_outcome),
        "images": images,
    }


def build_manifest(cases: List[DemoCaseSpec]) -> Dict[str, Any]:
    """Build manifest.json for the complete demo package."""
    total_images = sum(len(c.images) for c in cases)
    return {
        "version": SCRIPT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "description": "ClinicalVision AI Demo Data Package",
        "totalCases": len(cases),
        "totalImages": total_images,
        "formats": ["DICOM (.dcm)", "PNG (.png)"],
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
    }


def assemble_package(
    output_dir: Path,
    spec: DemoCaseSpec,
    patient_data: Dict[str, Any],
    data_root: Path,
) -> bool:
    """
    Assemble a complete demo case directory from selected patient data.
    
    Creates:
      {output_dir}/{spec.dir_name}/
        ├── case-info.json
        ├── png/DEMO-NNN_SIDE_VIEW.png
        └── dicom/DEMO-NNN_SIDE_VIEW.dcm
    
    Returns:
        True if successful, False otherwise.
    """
    case_dir = output_dir / spec.dir_name
    png_dir = case_dir / "png"
    dcm_dir = case_dir / "dicom"
    png_dir.mkdir(parents=True, exist_ok=True)
    dcm_dir.mkdir(parents=True, exist_ok=True)

    image_paths = patient_data["image_paths"]
    image_metadata = {}
    original_case_id = str(patient_data["patient_id"])

    for img_spec in spec.images:
        side_key = "RIGHT" if img_spec.laterality == "R" else "LEFT"
        view_key = img_spec.viewType

        # Map SPOT and MAG views to available views
        lookup_key = (side_key, view_key)
        if lookup_key not in image_paths:
            # For SPOT/MAG, reuse the CC/MLO view (same laterality)
            fallback_keys = [(side_key, "CC"), (side_key, "MLO")]
            found = False
            for fk in fallback_keys:
                if fk in image_paths:
                    lookup_key = fk
                    found = True
                    break
            if not found:
                logger.error(f"  ❌ No DICOM for {img_spec.filename}")
                return False

        src_dcm = image_paths[lookup_key]

        # Copy DICOM with new name
        dst_dcm = dcm_dir / f"{img_spec.filename}.dcm"
        shutil.copy2(str(src_dcm), str(dst_dcm))

        # Convert to PNG
        dst_png = png_dir / f"{img_spec.filename}.png"
        try:
            meta = dicom_to_png(src_dcm, dst_png)
            image_metadata[img_spec.filename] = meta
            logger.info(f"  ✅ {img_spec.filename}: {meta['output_width']}×{meta['output_height']} "
                        f"({meta['file_size_bytes'] / 1024:.0f} KB)")
        except Exception as e:
            logger.error(f"  ❌ Failed to convert {img_spec.filename}: {e}")
            return False

        # Update original case ID reference
        img_spec.originalCaseId = f"{original_case_id}_{side_key}_{view_key}"

    # Write case-info.json
    case_info = build_case_info(spec, image_metadata)
    (case_dir / "case-info.json").write_text(
        json.dumps(case_info, indent=2, ensure_ascii=False)
    )

    return True


def create_zip_package(output_dir: Path) -> Path:
    """Create ZIP archive of the complete demo package."""
    zip_path = output_dir / "ClinicalVision_Demo_Package"
    shutil.make_archive(str(zip_path), "zip", str(output_dir))
    zip_file = Path(f"{zip_path}.zip")
    logger.info(f"📦 ZIP created: {zip_file} ({zip_file.stat().st_size / 1024 / 1024:.1f} MB)")
    return zip_file


# ============================================================================
# Validation
# ============================================================================

def validate_package(output_dir: Path) -> Tuple[bool, List[str]]:
    """
    Validate a complete demo data package against all constraints.
    
    Checks:
    1. manifest.json exists and is valid
    2. All case directories exist
    3. All case-info.json files exist and are valid
    4. All PNG and DICOM files exist
    5. PNGs have correct dimensions (100-10000px, max 2048 edge)
    6. PNGs are valid grayscale images
    7. File counts match manifest
    
    Returns:
        (is_valid, list_of_errors)
    """
    errors = []

    # 1. Check manifest
    manifest_path = output_dir / "manifest.json"
    if not manifest_path.is_file():
        errors.append("Missing manifest.json")
        return False, errors

    try:
        manifest = json.loads(manifest_path.read_text())
    except json.JSONDecodeError as e:
        errors.append(f"Invalid manifest.json: {e}")
        return False, errors

    required_manifest_keys = {"version", "totalCases", "totalImages", "cases"}
    missing = required_manifest_keys - manifest.keys()
    if missing:
        errors.append(f"manifest.json missing keys: {missing}")

    # 2-7. Check each case
    total_images_found = 0
    for case_entry in manifest.get("cases", []):
        dir_name = case_entry["path"].strip("/").split("/")[-1]
        case_dir = output_dir / dir_name

        if not case_dir.is_dir():
            errors.append(f"Missing case directory: {dir_name}")
            continue

        # case-info.json
        ci_path = case_dir / "case-info.json"
        if not ci_path.is_file():
            errors.append(f"{dir_name}: missing case-info.json")
            continue

        try:
            case_info = json.loads(ci_path.read_text())
        except json.JSONDecodeError:
            errors.append(f"{dir_name}: invalid case-info.json")
            continue

        # Check each image
        for img in case_info.get("images", []):
            fname = img["filename"]

            # PNG check
            png_path = case_dir / "png" / f"{fname}.png"
            if not png_path.is_file():
                errors.append(f"{dir_name}: missing {fname}.png")
            elif Image is not None:
                try:
                    pil_img = Image.open(str(png_path))
                    w, h = pil_img.size
                    if w < MIN_IMAGE_DIM or h < MIN_IMAGE_DIM:
                        errors.append(f"{fname}.png too small: {w}×{h}")
                    if max(w, h) > MAX_PNG_EDGE:
                        errors.append(f"{fname}.png too large: {w}×{h} (max edge {MAX_PNG_EDGE})")
                    if pil_img.mode != "L":
                        errors.append(f"{fname}.png not grayscale: {pil_img.mode}")
                except Exception as e:
                    errors.append(f"{fname}.png unreadable: {e}")

            # DICOM check
            dcm_path = case_dir / "dicom" / f"{fname}.dcm"
            if not dcm_path.is_file():
                errors.append(f"{dir_name}: missing {fname}.dcm")

            total_images_found += 1

        # Check view count
        expected_views = case_entry.get("views", 0)
        actual_views = len(list((case_dir / "png").glob("*.png")))
        if actual_views != expected_views:
            errors.append(f"{dir_name}: expected {expected_views} views, found {actual_views}")

    # Check total
    if total_images_found != manifest.get("totalImages", 0):
        errors.append(
            f"Total images mismatch: manifest says {manifest.get('totalImages')}, "
            f"found {total_images_found}"
        )

    is_valid = len(errors) == 0
    return is_valid, errors


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="ClinicalVision Demo Data Preparation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--data-root", type=Path, default=Path("/content/drive/MyDrive/CBIS-DDSM-data"),
        help="Root directory containing CBIS-DDSM data and CSVs",
    )
    parser.add_argument(
        "--drive-root", type=Path, default=None,
        help="Alias for --data-root (for Colab convenience)",
    )
    parser.add_argument(
        "--output", type=Path, default=Path("./demo-data"),
        help="Output directory for the demo package",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Search for patients but don't extract/convert files",
    )
    parser.add_argument(
        "--validate-only", type=Path, default=None,
        help="Validate an existing demo package directory",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Handle validate-only mode
    if args.validate_only:
        logger.info(f"Validating existing package: {args.validate_only}")
        is_valid, errors = validate_package(args.validate_only)
        if is_valid:
            logger.info("✅ Package validation PASSED — all files present and correct")
        else:
            logger.error(f"❌ Package validation FAILED — {len(errors)} error(s):")
            for err in errors:
                logger.error(f"  • {err}")
        sys.exit(0 if is_valid else 1)

    # Determine data root
    data_root = args.drive_root or args.data_root
    output_dir = args.output

    logger.info("=" * 60)
    logger.info("ClinicalVision Demo Data Preparation")
    logger.info("=" * 60)
    logger.info(f"Data root:  {data_root}")
    logger.info(f"Output:     {output_dir}")
    logger.info(f"Dry run:    {args.dry_run}")
    logger.info(f"Cases:      {len(DEMO_CASES)}")

    # Check dependencies
    missing_deps = []
    if pd is None:
        missing_deps.append("pandas")
    if pydicom is None:
        missing_deps.append("pydicom")
    if Image is None:
        missing_deps.append("Pillow")
    if cv2 is None:
        missing_deps.append("opencv-python")

    if missing_deps:
        logger.error(f"Missing dependencies: {', '.join(missing_deps)}")
        logger.error(f"Install with: pip install {' '.join(missing_deps)}")
        sys.exit(1)

    # Load CSVs
    csv_files = {
        "mass_train": data_root / "mass_case_description_train_set.csv",
        "mass_test": data_root / "mass_case_description_test_set.csv",
        "calc_train": data_root / "calc_case_description_train_set.csv",
        "calc_test": data_root / "calc_case_description_test_set.csv",
    }

    dataframes = {}
    for name, path in csv_files.items():
        if path.is_file():
            dataframes[name] = pd.read_csv(path)
            logger.info(f"  Loaded {name}: {len(dataframes[name])} rows")
        else:
            logger.warning(f"  CSV not found: {path}")

    if not dataframes:
        logger.error("No CBIS-DDSM CSVs found. Check --data-root path.")
        sys.exit(1)

    # Process each demo case
    output_dir.mkdir(parents=True, exist_ok=True)
    success_count = 0

    for spec in DEMO_CASES:
        logger.info(f"\n{'='*40}")
        logger.info(f"Processing {spec.case_id}: {spec.label}")
        logger.info(f"{'='*40}")

        # Select the right CSV
        csv_key = f"{spec.source_dataset}_{spec.source_split}"
        if csv_key not in dataframes:
            logger.error(f"  CSV {csv_key} not available")
            continue

        df = dataframes[csv_key]

        # Find best patient
        patient = find_best_patient(df, spec, data_root)
        if patient is None:
            logger.error(f"  ❌ No suitable patient found for {spec.case_id}")
            continue

        if args.dry_run:
            logger.info(f"  [DRY RUN] Would extract patient {patient['patient_id']} "
                        f"(score={patient['score']:.2f})")
            success_count += 1
            continue

        # Assemble package
        if assemble_package(output_dir, spec, patient, data_root):
            success_count += 1
            logger.info(f"  ✅ {spec.case_id} complete")
        else:
            logger.error(f"  ❌ {spec.case_id} failed during assembly")

    if not args.dry_run:
        # Write manifest
        manifest = build_manifest(DEMO_CASES)
        (output_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False)
        )

        # Create ZIP
        create_zip_package(output_dir)

        # Validate
        logger.info(f"\n{'='*40}")
        logger.info("Package Validation")
        logger.info(f"{'='*40}")
        is_valid, errors = validate_package(output_dir)
        if is_valid:
            logger.info("✅ All validations PASSED")
        else:
            logger.error(f"❌ {len(errors)} validation error(s):")
            for err in errors:
                logger.error(f"  • {err}")

    logger.info(f"\n{'='*60}")
    logger.info(f"Summary: {success_count}/{len(DEMO_CASES)} cases processed")
    logger.info(f"{'='*60}")

    sys.exit(0 if success_count == len(DEMO_CASES) else 1)


if __name__ == "__main__":
    main()
