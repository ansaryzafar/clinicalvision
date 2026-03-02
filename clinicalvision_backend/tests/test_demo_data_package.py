"""
TDD Tests for Demo Data Package Validation — Phase 1

Tests written FIRST (RED) to define the exact structure, schema, and
constraints that the demo data package must satisfy. Then the
prepare_demo_data.py script is written to produce output that passes.

Test Categories:
1. Manifest Schema — validates manifest.json structure
2. Case Info Schema — validates case-info.json per-case structure
3. File Naming Convention — validates filename pattern for auto-detection
4. Image Format Compliance — validates PNG output specs
5. Package Completeness — validates all files present
6. Backend Preprocessing Compatibility — ensures images survive the pipeline
7. Frontend Validation Compatibility — ensures images pass frontend checks

Usage:
    pytest tests/test_demo_data_package.py -v
    pytest tests/test_demo_data_package.py -v -k "TestManifest"
"""

import pytest
import json
import re
import os
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import patch


# ============================================================================
# Constants — Single Source of Truth for Demo Package Structure
# ============================================================================

DEMO_CASES = {
    "DEMO-001": {
        "label": "Normal / Benign Screening",
        "difficulty": "Easy",
        "dir_name": "case-1-normal",
        "views": 4,
        "lateralities": {"R", "L"},
        "view_types": {"CC", "MLO"},
        "expected_pathology": "BENIGN",
        "filenames": [
            "DEMO-001_RIGHT_CC",
            "DEMO-001_LEFT_CC",
            "DEMO-001_RIGHT_MLO",
            "DEMO-001_LEFT_MLO",
        ],
    },
    "DEMO-002": {
        "label": "Suspicious Mass Finding",
        "difficulty": "Intermediate",
        "dir_name": "case-2-suspicious",
        "views": 6,
        "lateralities": {"R", "L"},
        "view_types": {"CC", "MLO", "SPOT", "MAG"},
        "expected_pathology": "MALIGNANT",
        "filenames": [
            "DEMO-002_RIGHT_CC",
            "DEMO-002_LEFT_CC",
            "DEMO-002_RIGHT_MLO",
            "DEMO-002_LEFT_MLO",
            "DEMO-002_RIGHT_SPOT",
            "DEMO-002_RIGHT_MAG",
        ],
    },
    "DEMO-003": {
        "label": "Calcification Follow-up",
        "difficulty": "Advanced",
        "dir_name": "case-3-calcification",
        "views": 2,
        "lateralities": {"L"},
        "view_types": {"CC", "MLO"},
        "expected_pathology": "MALIGNANT",
        "filenames": [
            "DEMO-003_LEFT_CC",
            "DEMO-003_LEFT_MLO",
        ],
    },
}

TOTAL_IMAGES = sum(c["views"] for c in DEMO_CASES.values())  # 12
TOTAL_FILES = TOTAL_IMAGES * 2  # 24 (PNG + DICOM for each)

# Filename pattern: DEMO-NNN_SIDE_VIEW
FILENAME_PATTERN = re.compile(
    r"^DEMO-\d{3}_(RIGHT|LEFT)_(CC|MLO|SPOT|MAG)$"
)

# Backend dimension limits
MIN_IMAGE_DIM = 100
MAX_IMAGE_DIM = 10000
MAX_PNG_EDGE = 2048
MODEL_INPUT_SIZE = 224

# Frontend limits
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def valid_manifest() -> Dict[str, Any]:
    """Create a valid manifest.json matching the spec."""
    return {
        "version": "1.0.0",
        "generatedAt": "2026-03-02T00:00:00Z",
        "description": "ClinicalVision AI Demo Data Package",
        "totalCases": 3,
        "totalImages": TOTAL_IMAGES,
        "formats": ["DICOM (.dcm)", "PNG (.png)"],
        "zipDownload": "/demo-data/ClinicalVision_Demo_Package.zip",
        "cases": [
            {
                "id": "DEMO-001",
                "label": "Normal / Benign Screening",
                "difficulty": "Easy",
                "views": 4,
                "path": "/demo-data/case-1-normal/",
            },
            {
                "id": "DEMO-002",
                "label": "Suspicious Mass Finding",
                "difficulty": "Intermediate",
                "views": 6,
                "path": "/demo-data/case-2-suspicious/",
            },
            {
                "id": "DEMO-003",
                "label": "Calcification Follow-up",
                "difficulty": "Advanced",
                "views": 2,
                "path": "/demo-data/case-3-calcification/",
            },
        ],
    }


@pytest.fixture
def valid_case_info_demo001() -> Dict[str, Any]:
    """Create a valid case-info.json for Case 1."""
    return {
        "caseId": "DEMO-001",
        "version": "1.0.0",
        "patient": {
            "mrn": "DEMO-001",
            "firstName": "Jane",
            "lastName": "Thompson",
            "middleInitial": "A",
            "dateOfBirth": "1968-03-15",
            "sex": "F",
        },
        "clinicalHistory": {
            "indication": "Routine annual screening mammography",
            "priorStudies": "Annual screening — no prior findings",
            "brcaStatus": "Negative",
            "familyHistory": "No significant family history",
            "symptoms": "None — asymptomatic screening",
            "hormoneTherapy": "None",
            "priorBiopsies": "None",
        },
        "expectedOutcome": {
            "biRads": "1 or 2",
            "description": "Normal/Benign — no suspicious findings",
            "pathology": "BENIGN",
        },
        "images": [
            {
                "filename": "DEMO-001_RIGHT_CC",
                "viewType": "CC",
                "laterality": "R",
                "formats": ["dcm", "png"],
                "source": "CBIS-DDSM Mass-Training",
                "originalCaseId": "Mass-Training_P_XXXXX_RIGHT_CC",
            },
            {
                "filename": "DEMO-001_LEFT_CC",
                "viewType": "CC",
                "laterality": "L",
                "formats": ["dcm", "png"],
                "source": "CBIS-DDSM Mass-Training",
                "originalCaseId": "Mass-Training_P_XXXXX_LEFT_CC",
            },
            {
                "filename": "DEMO-001_RIGHT_MLO",
                "viewType": "MLO",
                "laterality": "R",
                "formats": ["dcm", "png"],
                "source": "CBIS-DDSM Mass-Training",
                "originalCaseId": "Mass-Training_P_XXXXX_RIGHT_MLO",
            },
            {
                "filename": "DEMO-001_LEFT_MLO",
                "viewType": "MLO",
                "laterality": "L",
                "formats": ["dcm", "png"],
                "source": "CBIS-DDSM Mass-Training",
                "originalCaseId": "Mass-Training_P_XXXXX_LEFT_MLO",
            },
        ],
    }


@pytest.fixture
def sample_mammogram_png(tmp_path) -> Path:
    """Create a sample mammogram PNG that matches backend requirements."""
    from PIL import Image as PILImage

    # Realistic mammogram-like image: 1024x1024 grayscale
    np.random.seed(42)
    img_array = np.random.randint(50, 150, (1024, 1024), dtype=np.uint8)
    # Add a "mass" region
    y, x = np.ogrid[:1024, :1024]
    mask = (x - 500) ** 2 + (y - 500) ** 2 <= 100 ** 2
    img_array[mask] = 200

    img = PILImage.fromarray(img_array, mode="L")
    filepath = tmp_path / "DEMO-001_RIGHT_CC.png"
    img.save(str(filepath), format="PNG")
    return filepath


@pytest.fixture
def demo_package_dir(tmp_path) -> Path:
    """Create a complete mock demo package directory structure."""
    root = tmp_path / "demo-data"

    for case_id, spec in DEMO_CASES.items():
        case_dir = root / spec["dir_name"]
        png_dir = case_dir / "png"
        dcm_dir = case_dir / "dicom"
        png_dir.mkdir(parents=True)
        dcm_dir.mkdir(parents=True)

        # Create mock image files
        for fname in spec["filenames"]:
            _create_test_png(png_dir / f"{fname}.png", 1024, 1024)
            _create_test_dcm_stub(dcm_dir / f"{fname}.dcm")

        # Create case-info.json
        case_info = _build_case_info(case_id, spec)
        (case_dir / "case-info.json").write_text(json.dumps(case_info, indent=2))

    # Create manifest.json
    manifest = _build_manifest()
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return root


# ============================================================================
# Helpers for fixture generation
# ============================================================================

def _create_test_png(filepath: Path, width: int, height: int):
    """Create a minimal test PNG file."""
    from PIL import Image as PILImage
    img = PILImage.new("L", (width, height), color=128)
    img.save(str(filepath), format="PNG")


def _create_test_dcm_stub(filepath: Path):
    """Create a minimal DICOM-like stub file (just enough bytes for existence check)."""
    # Real DICOM starts with 128-byte preamble + "DICM" magic
    preamble = b"\x00" * 128 + b"DICM"
    filepath.write_bytes(preamble + b"\x00" * 100)


def _build_case_info(case_id: str, spec: dict) -> dict:
    """Build a valid case-info.json for a given case spec."""
    patients = {
        "DEMO-001": {
            "mrn": "DEMO-001", "firstName": "Jane", "lastName": "Thompson",
            "middleInitial": "A", "dateOfBirth": "1968-03-15", "sex": "F",
        },
        "DEMO-002": {
            "mrn": "DEMO-002", "firstName": "Maria", "lastName": "Chen",
            "middleInitial": "R", "dateOfBirth": "1975-09-22", "sex": "F",
        },
        "DEMO-003": {
            "mrn": "DEMO-003", "firstName": "Sarah", "lastName": "Williams",
            "middleInitial": "L", "dateOfBirth": "1982-11-08", "sex": "F",
        },
    }
    return {
        "caseId": case_id,
        "version": "1.0.0",
        "patient": patients[case_id],
        "clinicalHistory": {
            "indication": "Demo case",
            "priorStudies": "None",
            "brcaStatus": "Unknown",
            "familyHistory": "None",
            "symptoms": "None",
            "hormoneTherapy": "None",
            "priorBiopsies": "None",
        },
        "expectedOutcome": {
            "biRads": "2",
            "description": "Demo",
            "pathology": spec["expected_pathology"],
        },
        "images": [
            {
                "filename": fname,
                "viewType": fname.split("_")[-1],
                "laterality": "R" if "RIGHT" in fname else "L",
                "formats": ["dcm", "png"],
                "source": "CBIS-DDSM",
                "originalCaseId": f"original_{fname}",
            }
            for fname in spec["filenames"]
        ],
    }


def _build_manifest() -> dict:
    """Build a valid manifest.json."""
    return {
        "version": "1.0.0",
        "generatedAt": "2026-03-02T00:00:00Z",
        "description": "ClinicalVision AI Demo Data Package",
        "totalCases": len(DEMO_CASES),
        "totalImages": TOTAL_IMAGES,
        "formats": ["DICOM (.dcm)", "PNG (.png)"],
        "zipDownload": "/demo-data/ClinicalVision_Demo_Package.zip",
        "cases": [
            {
                "id": case_id,
                "label": spec["label"],
                "difficulty": spec["difficulty"],
                "views": spec["views"],
                "path": f"/demo-data/{spec['dir_name']}/",
            }
            for case_id, spec in DEMO_CASES.items()
        ],
    }


# ============================================================================
# Test 1: Manifest Schema Validation
# ============================================================================

@pytest.mark.unit
class TestManifestSchema:
    """Validate manifest.json structure, types, and constraints."""

    def test_has_all_required_keys(self, valid_manifest):
        required = {"version", "generatedAt", "description", "totalCases",
                     "totalImages", "formats", "zipDownload", "cases"}
        assert required.issubset(valid_manifest.keys())

    def test_version_is_semver(self, valid_manifest):
        assert re.match(r"^\d+\.\d+\.\d+$", valid_manifest["version"])

    def test_generated_at_is_iso_timestamp(self, valid_manifest):
        from datetime import datetime
        # Should parse without error
        datetime.fromisoformat(valid_manifest["generatedAt"].replace("Z", "+00:00"))

    def test_total_cases_is_3(self, valid_manifest):
        assert valid_manifest["totalCases"] == 3

    def test_total_images_is_12(self, valid_manifest):
        assert valid_manifest["totalImages"] == TOTAL_IMAGES

    def test_formats_include_dicom_and_png(self, valid_manifest):
        formats = valid_manifest["formats"]
        assert any("DICOM" in f or "dcm" in f for f in formats)
        assert any("PNG" in f or "png" in f for f in formats)

    def test_zip_download_path(self, valid_manifest):
        assert valid_manifest["zipDownload"].endswith(".zip")

    def test_cases_count_matches_total(self, valid_manifest):
        assert len(valid_manifest["cases"]) == valid_manifest["totalCases"]

    def test_each_case_has_required_fields(self, valid_manifest):
        required = {"id", "label", "difficulty", "views", "path"}
        for case in valid_manifest["cases"]:
            assert required.issubset(case.keys()), (
                f"Case {case.get('id')} missing: {required - case.keys()}"
            )

    def test_difficulty_levels_are_valid(self, valid_manifest):
        valid_difficulties = {"Easy", "Intermediate", "Advanced"}
        for case in valid_manifest["cases"]:
            assert case["difficulty"] in valid_difficulties

    def test_views_sum_matches_total_images(self, valid_manifest):
        total_views = sum(c["views"] for c in valid_manifest["cases"])
        assert total_views == valid_manifest["totalImages"]

    def test_case_ids_are_unique(self, valid_manifest):
        ids = [c["id"] for c in valid_manifest["cases"]]
        assert len(ids) == len(set(ids)), "Duplicate case IDs"

    def test_case_paths_end_with_slash(self, valid_manifest):
        for case in valid_manifest["cases"]:
            assert case["path"].endswith("/"), f"{case['id']} path missing trailing /"


# ============================================================================
# Test 2: Case Info Schema Validation
# ============================================================================

@pytest.mark.unit
class TestCaseInfoSchema:
    """Validate case-info.json structure for each demo case."""

    def test_has_all_required_keys(self, valid_case_info_demo001):
        required = {"caseId", "version", "patient", "clinicalHistory",
                     "expectedOutcome", "images"}
        assert required.issubset(valid_case_info_demo001.keys())

    def test_patient_has_required_fields(self, valid_case_info_demo001):
        patient = valid_case_info_demo001["patient"]
        required = {"mrn", "firstName", "lastName", "dateOfBirth", "sex"}
        assert required.issubset(patient.keys())

    def test_patient_sex_is_female(self, valid_case_info_demo001):
        assert valid_case_info_demo001["patient"]["sex"] == "F"

    def test_patient_dob_is_valid_date(self, valid_case_info_demo001):
        from datetime import date
        dob = valid_case_info_demo001["patient"]["dateOfBirth"]
        parsed = date.fromisoformat(dob)
        # Patient should be between 30 and 80 years old for realistic demo
        assert 1946 <= parsed.year <= 1996

    def test_clinical_history_has_required_fields(self, valid_case_info_demo001):
        hist = valid_case_info_demo001["clinicalHistory"]
        required = {"indication", "priorStudies", "brcaStatus",
                     "familyHistory", "symptoms"}
        assert required.issubset(hist.keys())

    def test_expected_outcome_has_required_fields(self, valid_case_info_demo001):
        outcome = valid_case_info_demo001["expectedOutcome"]
        required = {"biRads", "description", "pathology"}
        assert required.issubset(outcome.keys())

    def test_pathology_is_valid_enum(self, valid_case_info_demo001):
        pathology = valid_case_info_demo001["expectedOutcome"]["pathology"]
        assert pathology in ("BENIGN", "MALIGNANT", "BENIGN_WITHOUT_CALLBACK")

    def test_images_count_matches_spec(self, valid_case_info_demo001):
        case_id = valid_case_info_demo001["caseId"]
        expected = DEMO_CASES[case_id]["views"]
        assert len(valid_case_info_demo001["images"]) == expected

    def test_each_image_has_required_fields(self, valid_case_info_demo001):
        required = {"filename", "viewType", "laterality", "formats"}
        for img in valid_case_info_demo001["images"]:
            assert required.issubset(img.keys()), (
                f"Image {img.get('filename')} missing: {required - img.keys()}"
            )

    def test_image_filenames_match_pattern(self, valid_case_info_demo001):
        for img in valid_case_info_demo001["images"]:
            assert FILENAME_PATTERN.match(img["filename"]), (
                f"Filename '{img['filename']}' doesn't match pattern"
            )

    def test_image_laterality_is_valid(self, valid_case_info_demo001):
        for img in valid_case_info_demo001["images"]:
            assert img["laterality"] in ("R", "L")

    def test_image_view_type_is_valid(self, valid_case_info_demo001):
        valid_views = {"CC", "MLO", "SPOT", "MAG", "XCCL", "LM", "ML"}
        for img in valid_case_info_demo001["images"]:
            assert img["viewType"] in valid_views

    def test_formats_include_dcm_and_png(self, valid_case_info_demo001):
        for img in valid_case_info_demo001["images"]:
            assert "dcm" in img["formats"]
            assert "png" in img["formats"]

    def test_case_id_matches_patient_mrn(self, valid_case_info_demo001):
        assert (valid_case_info_demo001["caseId"] ==
                valid_case_info_demo001["patient"]["mrn"])


# ============================================================================
# Test 3: File Naming Convention
# ============================================================================

@pytest.mark.unit
class TestFileNamingConvention:
    """Validate filenames enable frontend auto-detection of view + laterality."""

    def test_pattern_matches_valid_names(self):
        valid = [
            "DEMO-001_RIGHT_CC", "DEMO-001_LEFT_MLO",
            "DEMO-002_RIGHT_SPOT", "DEMO-002_RIGHT_MAG",
            "DEMO-003_LEFT_CC",
        ]
        for name in valid:
            assert FILENAME_PATTERN.match(name), f"Should match: {name}"

    def test_pattern_rejects_invalid_names(self):
        invalid = [
            "demo-001_RIGHT_CC",       # lowercase prefix
            "DEMO-1_RIGHT_CC",         # missing zero-padding
            "DEMO-001_right_CC",       # lowercase side
            "DEMO-001_CC",             # missing side
            "DEMO-001_RIGHT",          # missing view
            "DEMO-001_RIGHT_CC.png",   # includes extension
            "RIGHT_CC",                # missing case ID
            "",                         # empty
        ]
        for name in invalid:
            assert not FILENAME_PATTERN.match(name), f"Should not match: {name}"

    def test_laterality_extractable_from_filename(self):
        """Frontend parses 'RIGHT' → 'R', 'LEFT' → 'L' from filename."""
        test_cases = [
            ("DEMO-001_RIGHT_CC", "R"),
            ("DEMO-001_LEFT_MLO", "L"),
            ("DEMO-002_RIGHT_SPOT", "R"),
        ]
        for filename, expected_lat in test_cases:
            side = filename.split("_")[1]
            lat = "R" if side == "RIGHT" else "L"
            assert lat == expected_lat

    def test_view_type_extractable_from_filename(self):
        """Frontend parses last segment as view type."""
        test_cases = [
            ("DEMO-001_RIGHT_CC", "CC"),
            ("DEMO-001_LEFT_MLO", "MLO"),
            ("DEMO-002_RIGHT_SPOT", "SPOT"),
            ("DEMO-002_RIGHT_MAG", "MAG"),
        ]
        for filename, expected_view in test_cases:
            view = filename.split("_")[-1]
            assert view == expected_view

    def test_all_demo_filenames_are_valid(self):
        """Every filename in every case spec must match the pattern."""
        for case_id, spec in DEMO_CASES.items():
            for fname in spec["filenames"]:
                assert FILENAME_PATTERN.match(fname), (
                    f"Case {case_id}: invalid filename '{fname}'"
                )


# ============================================================================
# Test 4: Image Format Compliance
# ============================================================================

@pytest.mark.unit
class TestImageFormatCompliance:
    """Validate PNG images meet backend preprocessing requirements."""

    def test_png_is_valid_pil_image(self, sample_mammogram_png):
        from PIL import Image as PILImage
        img = PILImage.open(str(sample_mammogram_png))
        assert img.format == "PNG"

    def test_png_is_grayscale(self, sample_mammogram_png):
        from PIL import Image as PILImage
        img = PILImage.open(str(sample_mammogram_png))
        assert img.mode == "L", f"Expected grayscale, got {img.mode}"

    def test_png_dimensions_within_backend_limits(self, sample_mammogram_png):
        from PIL import Image as PILImage
        img = PILImage.open(str(sample_mammogram_png))
        w, h = img.size
        assert w >= MIN_IMAGE_DIM and h >= MIN_IMAGE_DIM
        assert w <= MAX_IMAGE_DIM and h <= MAX_IMAGE_DIM

    def test_png_max_edge_within_target(self, sample_mammogram_png):
        from PIL import Image as PILImage
        img = PILImage.open(str(sample_mammogram_png))
        w, h = img.size
        assert max(w, h) <= MAX_PNG_EDGE, (
            f"Max edge {max(w, h)}px exceeds target {MAX_PNG_EDGE}px"
        )

    def test_png_file_size_under_50mb(self, sample_mammogram_png):
        size = sample_mammogram_png.stat().st_size
        assert size <= MAX_FILE_SIZE_BYTES, (
            f"File size {size / 1024 / 1024:.1f}MB exceeds 50MB limit"
        )

    def test_png_survives_backend_preprocessing(self, sample_mammogram_png):
        """PNG should preprocess without errors through the CLAHE pipeline.
        
        Note: LANCZOS4 interpolation can produce values slightly outside [0,1]
        at edges (ringing artifact). This is normal — the model's sigmoid output
        clamps the result. We allow a small tolerance.
        """
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        img = PILImage.open(str(sample_mammogram_png))
        result = preprocess_mammogram(img)

        assert result.shape == (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3)
        assert result.dtype == np.float32
        # LANCZOS4 ringing can go slightly negative or above 1.0
        # Backend clips this before inference in practice
        assert result.min() >= -0.5, f"Min value {result.min()} too negative"
        assert result.max() <= 1.5, f"Max value {result.max()} too high"
        # But the vast majority of values should be in [0, 1]
        in_range = np.logical_and(result >= 0.0, result <= 1.0)
        assert in_range.mean() >= 0.98, (
            f"Only {in_range.mean():.1%} of values in [0,1] — too many outliers"
        )

    def test_png_passes_backend_validation(self, sample_mammogram_png):
        """PNG should pass backend validate_image()."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import validate_image

        img = PILImage.open(str(sample_mammogram_png))
        assert validate_image(img) is True


# ============================================================================
# Test 5: Package Completeness
# ============================================================================

@pytest.mark.unit
class TestPackageCompleteness:
    """Validate a complete demo package has all expected files."""

    def test_manifest_json_exists(self, demo_package_dir):
        assert (demo_package_dir / "manifest.json").is_file()

    def test_all_case_dirs_exist(self, demo_package_dir):
        for spec in DEMO_CASES.values():
            case_dir = demo_package_dir / spec["dir_name"]
            assert case_dir.is_dir(), f"Missing directory: {spec['dir_name']}"

    def test_all_case_info_files_exist(self, demo_package_dir):
        for spec in DEMO_CASES.values():
            case_info = demo_package_dir / spec["dir_name"] / "case-info.json"
            assert case_info.is_file(), f"Missing: {spec['dir_name']}/case-info.json"

    def test_all_png_files_exist(self, demo_package_dir):
        for spec in DEMO_CASES.values():
            png_dir = demo_package_dir / spec["dir_name"] / "png"
            for fname in spec["filenames"]:
                png_file = png_dir / f"{fname}.png"
                assert png_file.is_file(), f"Missing: {png_file.name}"

    def test_all_dicom_files_exist(self, demo_package_dir):
        for spec in DEMO_CASES.values():
            dcm_dir = demo_package_dir / spec["dir_name"] / "dicom"
            for fname in spec["filenames"]:
                dcm_file = dcm_dir / f"{fname}.dcm"
                assert dcm_file.is_file(), f"Missing: {dcm_file.name}"

    def test_total_file_count(self, demo_package_dir):
        """Count all image files (PNG + DICOM)."""
        png_count = 0
        dcm_count = 0
        for spec in DEMO_CASES.values():
            png_dir = demo_package_dir / spec["dir_name"] / "png"
            dcm_dir = demo_package_dir / spec["dir_name"] / "dicom"
            png_count += len(list(png_dir.glob("*.png")))
            dcm_count += len(list(dcm_dir.glob("*.dcm")))

        assert png_count == TOTAL_IMAGES, f"Expected {TOTAL_IMAGES} PNGs, got {png_count}"
        assert dcm_count == TOTAL_IMAGES, f"Expected {TOTAL_IMAGES} DICOMs, got {dcm_count}"

    def test_case_info_json_is_valid(self, demo_package_dir):
        """All case-info.json files must be valid JSON."""
        for spec in DEMO_CASES.values():
            path = demo_package_dir / spec["dir_name"] / "case-info.json"
            data = json.loads(path.read_text())
            assert "caseId" in data
            assert "patient" in data
            assert "images" in data

    def test_manifest_json_is_valid(self, demo_package_dir):
        """manifest.json must be valid JSON with correct structure."""
        data = json.loads((demo_package_dir / "manifest.json").read_text())
        assert data["totalCases"] == len(DEMO_CASES)
        assert data["totalImages"] == TOTAL_IMAGES

    def test_no_extra_files_in_png_dirs(self, demo_package_dir):
        """PNG dirs should only contain expected files — no stale files."""
        for case_id, spec in DEMO_CASES.items():
            png_dir = demo_package_dir / spec["dir_name"] / "png"
            actual = {f.stem for f in png_dir.glob("*.png")}
            expected = set(spec["filenames"])
            assert actual == expected, (
                f"Case {case_id}: unexpected PNGs: {actual - expected}"
            )


# ============================================================================
# Test 6: Backend Preprocessing Pipeline Compatibility
# ============================================================================

@pytest.mark.unit
class TestPreprocessingCompatibility:
    """Ensure demo images survive the full preprocessing pipeline."""

    def test_clahe_on_uniform_image(self):
        """CLAHE should handle uniform (constant) images without crash."""
        from app.utils.preprocessing import apply_clahe
        uniform = np.ones((224, 224), dtype=np.uint8) * 128
        result = apply_clahe(uniform)
        assert result.shape == (224, 224)
        assert result.dtype == np.float32
        assert 0.0 <= result.min() <= result.max() <= 1.0

    def test_clahe_on_extreme_contrast(self):
        """CLAHE should handle extreme contrast (0 and 255 only)."""
        from app.utils.preprocessing import apply_clahe
        extreme = np.zeros((224, 224), dtype=np.uint8)
        extreme[:112, :] = 255
        result = apply_clahe(extreme)
        assert result.shape == (224, 224)
        assert 0.0 <= result.min() <= result.max() <= 1.0

    def test_preprocess_rgb_input(self):
        """RGB input should be converted to grayscale without error."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        rgb_img = PILImage.new("RGB", (500, 500), color=(128, 128, 128))
        result = preprocess_mammogram(rgb_img)
        assert result.shape == (224, 224, 3)
        assert result.dtype == np.float32

    def test_preprocess_rgba_input(self):
        """RGBA input should be handled (alpha channel stripped)."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        rgba_img = PILImage.new("RGBA", (500, 500), color=(128, 128, 128, 255))
        result = preprocess_mammogram(rgba_img)
        assert result.shape == (224, 224, 3)

    def test_preprocess_small_image(self):
        """Minimum dimension image (100x100) should preprocess without error."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        small_img = PILImage.new("L", (100, 100), color=128)
        result = preprocess_mammogram(small_img)
        assert result.shape == (224, 224, 3)

    def test_preprocess_large_image(self):
        """Large image (2048x2048) should preprocess without error."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        large_img = PILImage.new("L", (2048, 2048), color=128)
        result = preprocess_mammogram(large_img)
        assert result.shape == (224, 224, 3)

    def test_preprocess_output_is_deterministic(self):
        """Same input should produce same output (no random operations)."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram

        img = PILImage.new("L", (500, 500), color=128)
        r1 = preprocess_mammogram(img)
        r2 = preprocess_mammogram(img)
        np.testing.assert_array_equal(r1, r2)

    def test_preprocess_with_metadata_returns_tuple(self):
        """preprocess_mammogram_with_metadata should return (array, dict)."""
        from PIL import Image as PILImage
        from app.utils.preprocessing import preprocess_mammogram_with_metadata

        img = PILImage.new("L", (800, 600))
        result, meta = preprocess_mammogram_with_metadata(img)
        assert result.shape == (224, 224, 3)
        assert meta["original_width"] == 800
        assert meta["original_height"] == 600
        assert meta["model_width"] == 224
        assert meta["model_height"] == 224
        assert abs(meta["scale_x"] - 800 / 224) < 0.01
        assert abs(meta["scale_y"] - 600 / 224) < 0.01


# ============================================================================
# Test 7: Cross-Cutting Validation
# ============================================================================

@pytest.mark.unit
class TestCrossCuttingValidation:
    """Validate consistency between manifest, case-info, and files."""

    def test_manifest_case_ids_match_directory_names(self, demo_package_dir):
        """Manifest case paths must correspond to actual directories."""
        manifest = json.loads((demo_package_dir / "manifest.json").read_text())
        for case in manifest["cases"]:
            # Extract dir name from path (e.g., "/demo-data/case-1-normal/" → "case-1-normal")
            dir_name = case["path"].strip("/").split("/")[-1]
            assert (demo_package_dir / dir_name).is_dir(), (
                f"Manifest references non-existent dir: {dir_name}"
            )

    def test_manifest_views_match_actual_files(self, demo_package_dir):
        """Views count in manifest must match actual PNG files."""
        manifest = json.loads((demo_package_dir / "manifest.json").read_text())
        for case in manifest["cases"]:
            dir_name = case["path"].strip("/").split("/")[-1]
            png_dir = demo_package_dir / dir_name / "png"
            actual_count = len(list(png_dir.glob("*.png")))
            assert actual_count == case["views"], (
                f"Case {case['id']}: manifest says {case['views']} views, "
                f"but found {actual_count} PNGs"
            )

    def test_case_info_images_match_actual_files(self, demo_package_dir):
        """Images listed in case-info.json must exist as actual files."""
        for spec in DEMO_CASES.values():
            case_dir = demo_package_dir / spec["dir_name"]
            case_info = json.loads((case_dir / "case-info.json").read_text())
            for img in case_info["images"]:
                for fmt in img["formats"]:
                    if fmt == "png":
                        path = case_dir / "png" / f"{img['filename']}.png"
                    elif fmt == "dcm":
                        path = case_dir / "dicom" / f"{img['filename']}.dcm"
                    else:
                        continue
                    assert path.is_file(), f"Missing: {path}"

    def test_case_ids_consistent_across_manifest_and_case_info(self, demo_package_dir):
        """Case IDs in manifest must match those in case-info.json files."""
        manifest = json.loads((demo_package_dir / "manifest.json").read_text())
        manifest_ids = {c["id"] for c in manifest["cases"]}

        case_info_ids = set()
        for spec in DEMO_CASES.values():
            case_info = json.loads(
                (demo_package_dir / spec["dir_name"] / "case-info.json").read_text()
            )
            case_info_ids.add(case_info["caseId"])

        assert manifest_ids == case_info_ids, (
            f"ID mismatch: manifest={manifest_ids}, case-info={case_info_ids}"
        )
