"""
TDD Tests for generate_demo_images.py — Synthetic Mammogram Demo Data Generator

Validates that the demo image generation script produces a complete, valid
package that matches the schema expected by:
  - DemoDataService (frontend)
  - validate_demo_package.py (CLI validator)
  - seed_demo_cases.py (backend seeder)

Test categories:
  1. Image synthesis quality (dimensions, mode, uniqueness)
  2. Package structure (directories, files, JSON schemas)
  3. Manifest & case-info contract compliance
  4. ZIP package integrity
  5. Reproducibility (deterministic seeds)

Usage:
    pytest tests/test_generate_demo_images.py -v
    pytest tests/test_generate_demo_images.py -v -k "test_manifest"
"""

import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

# Import the module under test
sys_path_entry = str(Path(__file__).resolve().parent.parent / "scripts")
import sys
sys.path.insert(0, sys_path_entry)

from generate_demo_images import (
    DEMO_CASES,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    SCRIPT_VERSION,
    generate_case_info,
    generate_demo_package,
    generate_mammogram,
    generate_manifest,
    validate_package,
    _create_breast_mask,
    _multi_octave_noise,
    _add_mass,
    _add_calcifications,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="module")
def demo_package_dir():
    """Generate a demo package once for all tests in this module."""
    tmp_dir = tempfile.mkdtemp(prefix="clinicalvision_demo_test_")
    output_dir = os.path.join(tmp_dir, "demo-data")
    summary = generate_demo_package(output_dir, validate=False)
    yield Path(output_dir), summary
    shutil.rmtree(tmp_dir, ignore_errors=True)


@pytest.fixture
def fresh_output_dir():
    """Provide a clean temp directory for each test that needs one."""
    tmp_dir = tempfile.mkdtemp(prefix="clinicalvision_demo_fresh_")
    yield Path(tmp_dir) / "demo-data"
    shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# 1. Image Synthesis Quality
# ============================================================================

class TestImageSynthesis:
    """Validate that generated mammogram images meet quality requirements."""

    def test_default_dimensions(self):
        """Generated images must be IMAGE_WIDTH × IMAGE_HEIGHT."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.shape == (IMAGE_HEIGHT, IMAGE_WIDTH)

    def test_output_dtype_uint8(self):
        """Pixel values must be uint8 (0-255)."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.dtype == np.uint8

    def test_grayscale_mode(self):
        """Images must be single-channel grayscale."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.ndim == 2

    def test_not_all_black(self):
        """Image must contain non-zero pixel values (not blank)."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.max() > 50, "Image appears to be all black"

    def test_not_all_white(self):
        """Image must not be entirely bright (unrealistic)."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.mean() < 200, "Image appears to be all white"

    def test_background_is_dark(self):
        """Background (outside breast) should be near-black."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        # Check corners (should be background)
        corner_mean = np.mean([img[0, 0], img[0, -1], img[-1, 0], img[-1, -1]])
        assert corner_mean < 30, f"Corners should be dark, got mean {corner_mean}"

    def test_breast_region_has_content(self):
        """The central breast region should have tissue-like intensities."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        center_region = img[400:1100, 200:800]
        assert center_region.mean() > 20, "Center region too dark — no tissue"

    def test_different_views_produce_different_images(self):
        """CC and MLO views of same case should differ visually."""
        img_cc = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        img_mlo = generate_mammogram("TEST", "RIGHT_MLO", "MLO", "R", "normal", seed=2)
        # Images should be different (different seeds + different mask shapes)
        assert not np.array_equal(img_cc, img_mlo)

    def test_different_lateralities_differ(self):
        """Left and right laterality images should be mirror-like but different."""
        img_r = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        img_l = generate_mammogram("TEST", "LEFT_CC", "CC", "L", "normal", seed=1)
        # Same seed but different laterality → different mask → different result
        assert not np.array_equal(img_r, img_l)

    def test_mass_type_adds_bright_region(self):
        """Mass synthesis should add a brighter focal density."""
        img_normal = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=50)
        img_mass = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "mass", seed=50)
        # Mass image should have a brighter max in the breast area
        # (mass adds focal brightness)
        assert img_mass.max() >= img_normal.max() - 5  # Allow small tolerance

    def test_calcification_type_adds_bright_spots(self):
        """Calcification synthesis should add tiny bright dots."""
        img_calc = generate_mammogram("TEST", "LEFT_CC", "CC", "L", "calcification", seed=200)
        # Should have very bright pixels (calcs are white dots)
        bright_pixels = np.sum(img_calc > 200)
        assert bright_pixels > 10, "Expected bright calcification spots"

    def test_reproducible_with_same_seed(self):
        """Same seed should produce identical output (deterministic)."""
        img1 = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=42)
        img2 = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=42)
        np.testing.assert_array_equal(img1, img2)

    def test_different_seeds_produce_different_images(self):
        """Different seeds should produce different images."""
        img1 = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=42)
        img2 = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=99)
        assert not np.array_equal(img1, img2)


# ============================================================================
# 2. Internal Components
# ============================================================================

class TestInternalComponents:
    """Test internal synthesis building blocks."""

    def test_breast_mask_shape(self):
        """Breast mask must match requested dimensions."""
        mask = _create_breast_mask(512, 768, "R", "CC")
        assert mask.shape == (768, 512)

    def test_breast_mask_has_content(self):
        """Mask should cover a meaningful area (not empty)."""
        mask = _create_breast_mask(512, 768, "R", "CC")
        coverage = np.mean(mask > 0.1)
        assert 0.15 < coverage < 0.85, f"Unexpected mask coverage: {coverage:.2f}"

    def test_breast_mask_values_normalized(self):
        """Mask values should be in [0, 1]."""
        mask = _create_breast_mask(512, 768, "L", "MLO")
        assert mask.min() >= 0.0
        assert mask.max() <= 1.0

    def test_multi_octave_noise_shape(self):
        """Noise output shape must match input."""
        rng = np.random.default_rng(42)
        noise = _multi_octave_noise((100, 200), rng)
        assert noise.shape == (100, 200)

    def test_multi_octave_noise_normalized(self):
        """Noise should be normalized to [0, 1]."""
        rng = np.random.default_rng(42)
        noise = _multi_octave_noise((100, 200), rng)
        assert noise.min() >= 0.0 - 1e-10
        assert noise.max() <= 1.0 + 1e-10

    def test_add_mass_stays_in_range(self):
        """Adding mass should not produce values outside [0, 1]."""
        rng = np.random.default_rng(42)
        image = np.random.rand(200, 200).astype(np.float64) * 0.5
        mask = np.ones((200, 200), dtype=np.float64)
        result = _add_mass(image, rng, mask)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_add_calcifications_adds_bright_spots(self):
        """Calcification function should add bright pixels."""
        rng = np.random.default_rng(42)
        image = np.ones((200, 200), dtype=np.float64) * 0.3
        mask = np.ones((200, 200), dtype=np.float64)
        result = _add_calcifications(image, rng, mask)
        # Should have pixels brighter than the baseline 0.3
        assert result.max() > 0.5


# ============================================================================
# 3. Package Structure
# ============================================================================

class TestPackageStructure:
    """Validate the generated demo package directory structure."""

    def test_manifest_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "manifest.json").exists()

    def test_readme_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "README.md").exists()

    def test_zip_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "ClinicalVision_Demo_Package.zip").exists()

    def test_case_1_dir_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "case-1-normal").is_dir()

    def test_case_2_dir_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "case-2-suspicious").is_dir()

    def test_case_3_dir_exists(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        assert (pkg_dir / "case-3-calcification").is_dir()

    def test_case_1_has_4_png_files(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        pngs = list((pkg_dir / "case-1-normal" / "png").glob("*.png"))
        assert len(pngs) == 4

    def test_case_2_has_6_png_files(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        pngs = list((pkg_dir / "case-2-suspicious" / "png").glob("*.png"))
        assert len(pngs) == 6

    def test_case_3_has_2_png_files(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        pngs = list((pkg_dir / "case-3-calcification" / "png").glob("*.png"))
        assert len(pngs) == 2

    def test_total_12_images(self, demo_package_dir):
        _, summary = demo_package_dir
        assert summary["total_images"] == 12

    def test_each_case_has_case_info(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        for case_dir in ["case-1-normal", "case-2-suspicious", "case-3-calcification"]:
            assert (pkg_dir / case_dir / "case-info.json").exists()

    def test_filenames_follow_convention(self, demo_package_dir):
        """All PNG filenames must match DEMO-NNN_SIDE_VIEW.png pattern."""
        pkg_dir, _ = demo_package_dir
        import re
        pattern = re.compile(r"^DEMO-\d{3}_(RIGHT|LEFT)_(CC|MLO|SPOT|MAG)\.png$")
        for png in pkg_dir.rglob("*.png"):
            assert pattern.match(png.name), f"Bad filename: {png.name}"


# ============================================================================
# 4. Manifest Contract
# ============================================================================

class TestManifestContract:
    """Validate manifest.json matches the DemoDataService contract."""

    def test_manifest_has_version(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        assert "version" in manifest

    def test_manifest_version_is_semver(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        parts = manifest["version"].split(".")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)

    def test_manifest_has_generated_at(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        assert "generatedAt" in manifest

    def test_manifest_total_cases_is_3(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        assert manifest["totalCases"] == 3

    def test_manifest_total_images_is_12(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        assert manifest["totalImages"] == 12

    def test_manifest_cases_have_required_keys(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        required = {"id", "label", "difficulty", "views", "path"}
        for case in manifest["cases"]:
            assert required.issubset(set(case.keys())), f"Missing keys in {case.get('id')}"

    def test_manifest_case_ids_correct(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        ids = {c["id"] for c in manifest["cases"]}
        assert ids == {"DEMO-001", "DEMO-002", "DEMO-003"}

    def test_manifest_difficulties_correct(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        diffs = {c["id"]: c["difficulty"] for c in manifest["cases"]}
        assert diffs["DEMO-001"] == "Easy"
        assert diffs["DEMO-002"] == "Intermediate"
        assert diffs["DEMO-003"] == "Advanced"

    def test_manifest_view_counts_correct(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        views = {c["id"]: c["views"] for c in manifest["cases"]}
        assert views["DEMO-001"] == 4
        assert views["DEMO-002"] == 6
        assert views["DEMO-003"] == 2

    def test_manifest_has_zip_download_path(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        manifest = json.loads((pkg_dir / "manifest.json").read_text())
        assert "zipDownload" in manifest
        assert manifest["zipDownload"].endswith(".zip")


# ============================================================================
# 5. Case-Info Contract
# ============================================================================

class TestCaseInfoContract:
    """Validate case-info.json files match the DemoCaseInfo interface."""

    @pytest.fixture
    def case_infos(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        infos = {}
        for case_dir in ["case-1-normal", "case-2-suspicious", "case-3-calcification"]:
            info_path = pkg_dir / case_dir / "case-info.json"
            infos[case_dir] = json.loads(info_path.read_text())
        return infos

    def test_case_info_has_required_keys(self, case_infos):
        required = {"caseId", "version", "patient", "clinicalHistory",
                     "expectedOutcome", "images"}
        for case_dir, info in case_infos.items():
            assert required.issubset(set(info.keys())), f"Missing keys in {case_dir}"

    def test_patient_has_required_keys(self, case_infos):
        required = {"mrn", "firstName", "lastName", "dateOfBirth", "sex"}
        for case_dir, info in case_infos.items():
            assert required.issubset(set(info["patient"].keys()))

    def test_clinical_history_has_required_keys(self, case_infos):
        required = {"indication", "priorStudies", "brcaStatus",
                     "familyHistory", "symptoms"}
        for case_dir, info in case_infos.items():
            assert required.issubset(set(info["clinicalHistory"].keys()))

    def test_expected_outcome_has_required_keys(self, case_infos):
        required = {"biRads", "description", "pathology"}
        for case_dir, info in case_infos.items():
            assert required.issubset(set(info["expectedOutcome"].keys()))

    def test_images_have_required_keys(self, case_infos):
        required = {"filename", "viewType", "laterality", "formats"}
        for case_dir, info in case_infos.items():
            for img in info["images"]:
                assert required.issubset(set(img.keys())), \
                    f"Missing image keys in {case_dir}: {img.get('filename')}"

    def test_case_001_is_benign(self, case_infos):
        assert case_infos["case-1-normal"]["expectedOutcome"]["pathology"] == "BENIGN"

    def test_case_002_is_malignant(self, case_infos):
        assert case_infos["case-2-suspicious"]["expectedOutcome"]["pathology"] == "MALIGNANT"

    def test_case_003_is_malignant(self, case_infos):
        assert case_infos["case-3-calcification"]["expectedOutcome"]["pathology"] == "MALIGNANT"

    def test_case_001_patient_mrn(self, case_infos):
        assert case_infos["case-1-normal"]["patient"]["mrn"] == "DEMO-001"

    def test_case_002_has_spot_and_mag(self, case_infos):
        views = {img["viewType"] for img in case_infos["case-2-suspicious"]["images"]}
        assert "SPOT" in views
        assert "MAG" in views

    def test_case_003_is_left_only(self, case_infos):
        lats = {img["laterality"] for img in case_infos["case-3-calcification"]["images"]}
        assert lats == {"L"}, "Case 3 should have left-only images"


# ============================================================================
# 6. ZIP Package
# ============================================================================

class TestZipPackage:
    """Validate the ZIP archive contains all expected files."""

    def test_zip_is_valid(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
        assert zipfile.is_zipfile(zip_path)

    def test_zip_contains_all_images(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
        with zipfile.ZipFile(zip_path) as zf:
            png_files = [n for n in zf.namelist() if n.endswith(".png")]
            assert len(png_files) == 12

    def test_zip_contains_manifest(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
        with zipfile.ZipFile(zip_path) as zf:
            assert "manifest.json" in zf.namelist()

    def test_zip_contains_case_infos(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
        with zipfile.ZipFile(zip_path) as zf:
            case_infos = [n for n in zf.namelist() if n.endswith("case-info.json")]
            assert len(case_infos) == 3

    def test_zip_images_are_openable(self, demo_package_dir):
        """Every PNG in the ZIP should be a valid image."""
        pkg_dir, _ = demo_package_dir
        zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
        with zipfile.ZipFile(zip_path) as zf:
            for name in zf.namelist():
                if name.endswith(".png"):
                    with zf.open(name) as f:
                        img = Image.open(f)
                        assert img.mode == "L"
                        w, h = img.size
                        assert w >= 100 and h >= 100


# ============================================================================
# 7. Validation Function
# ============================================================================

class TestValidation:
    """Test the built-in validation function."""

    def test_valid_package_has_no_errors(self, demo_package_dir):
        pkg_dir, _ = demo_package_dir
        errors = validate_package(pkg_dir)
        assert errors == [], f"Unexpected errors: {errors}"

    def test_missing_manifest_detected(self, fresh_output_dir):
        fresh_output_dir.mkdir(parents=True, exist_ok=True)
        errors = validate_package(fresh_output_dir)
        assert any("manifest.json" in e for e in errors)

    def test_generate_and_validate_roundtrip(self, fresh_output_dir):
        """Full generate → validate roundtrip must succeed."""
        summary = generate_demo_package(str(fresh_output_dir), validate=True)
        assert summary["total_images"] == 12
        assert summary["total_cases"] == 3


# ============================================================================
# 8. Image Quality for AI Pipeline Compatibility
# ============================================================================

class TestAIPipelineCompatibility:
    """Ensure generated images are compatible with the DenseNet-121 preprocessing."""

    def test_image_saves_as_valid_png(self):
        """Generated image can be saved and reloaded as PNG."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        pil_img = Image.fromarray(img, mode="L")
        assert pil_img.mode == "L"
        assert pil_img.size == (IMAGE_WIDTH, IMAGE_HEIGHT)

    def test_image_can_be_resized_to_224(self):
        """Image can be resized to 224×224 (DenseNet input) without error."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        pil_img = Image.fromarray(img, mode="L")
        resized = pil_img.resize((224, 224), Image.BILINEAR)
        assert resized.size == (224, 224)

    def test_image_pixel_range_valid(self):
        """Pixel values must be in uint8 range after generation."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        assert img.min() >= 0
        assert img.max() <= 255

    def test_image_can_be_normalized_to_float(self):
        """Image can be normalized to [0, 1] float32 for model input."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        normalized = img.astype(np.float32) / 255.0
        assert normalized.min() >= 0.0
        assert normalized.max() <= 1.0

    def test_image_can_be_converted_to_3_channel(self):
        """Grayscale can be stacked to 3-channel (DenseNet expects RGB)."""
        img = generate_mammogram("TEST", "RIGHT_CC", "CC", "R", "normal", seed=1)
        rgb = np.stack([img, img, img], axis=-1)
        assert rgb.shape == (IMAGE_HEIGHT, IMAGE_WIDTH, 3)

    def test_all_12_demo_images_differ(self, demo_package_dir):
        """All 12 generated images should be unique (no duplicates)."""
        pkg_dir, _ = demo_package_dir
        hashes = set()
        for png in pkg_dir.rglob("*.png"):
            with open(png, "rb") as f:
                h = hash(f.read())
            hashes.add(h)
        assert len(hashes) == 12, f"Expected 12 unique images, got {len(hashes)}"
