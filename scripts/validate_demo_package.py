#!/usr/bin/env python3
"""
ClinicalVision Demo Package Validator

Standalone CLI utility to validate a generated demo data package.
Runs the same checks as test_demo_data_package.py without requiring pytest.
Designed for use on Google Colab after running prepare_demo_data.py.

Usage:
 python scripts/validate_demo_package.py./demo-data
 python scripts/validate_demo_package.py./demo-data --strict
 python scripts/validate_demo_package.py./demo-data --json-report report.json
"""

import os
import re
import sys
import json
import hashlib
import argparse
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logging.basicConfig(
 level=logging.INFO,
 format="%(message)s",
)
logger = logging.getLogger("validate_demo_package")


# ============================================================================
# Constants — Must match test_demo_data_package.py exactly
# ============================================================================

FILENAME_PATTERN = re.compile(r"^DEMO-\d{3}_(RIGHT|LEFT)_(CC|MLO|SPOT|MAG)$")
REQUIRED_MANIFEST_KEYS = {"version", "totalCases", "totalImages", "cases"}
REQUIRED_CASE_KEYS = {"id", "label", "difficulty", "views", "path"}
REQUIRED_CASE_INFO_KEYS = {"caseId", "version", "patient", "clinicalHistory",
 "expectedOutcome", "images"}
REQUIRED_PATIENT_KEYS = {"mrn", "firstName", "lastName", "dateOfBirth", "sex"}
REQUIRED_IMAGE_KEYS = {"filename", "viewType", "laterality", "formats"}
VALID_VIEWS = {"CC", "MLO", "SPOT", "MAG"}
VALID_LATERALITIES = {"R", "L"}
VALID_DIFFICULTIES = {"Easy", "Intermediate", "Advanced"}
VALID_PATHOLOGIES = {"BENIGN", "MALIGNANT"}

DEMO_CASES = {
 "DEMO-001": {"dir": "case-1-normal", "views": 4, "difficulty": "Easy"},
 "DEMO-002": {"dir": "case-2-suspicious", "views": 6, "difficulty": "Intermediate"},
 "DEMO-003": {"dir": "case-3-calcification", "views": 2, "difficulty": "Advanced"},
}
TOTAL_IMAGES = 12
TOTAL_FILES = 24 # 12 PNG + 12 DICOM

MIN_IMAGE_DIM = 100
MAX_IMAGE_DIM = 10000
MAX_PNG_EDGE = 2048

# Optional PIL import for image checks
try:
 from PIL import Image
 HAS_PIL = True
except ImportError:
 HAS_PIL = False


# ============================================================================
# Validation Result Types
# ============================================================================

@dataclass
class Check:
 """Result of a single validation check."""
 name: str
 category: str
 passed: bool
 message: str = ""
 severity: str = "error" # "error" or "warning"


@dataclass
class ValidationReport:
 """Full validation report for a demo package."""
 package_path: str
 checks: List[Check] = field(default_factory=list)

 @property
 def total(self) -> int:
 return len(self.checks)

 @property
 def passed(self) -> int:
 return sum(1 for c in self.checks if c.passed)

 @property
 def failed(self) -> int:
 return sum(1 for c in self.checks if not c.passed and c.severity == "error")

 @property
 def warnings(self) -> int:
 return sum(1 for c in self.checks if not c.passed and c.severity == "warning")

 @property
 def is_valid(self) -> bool:
 return self.failed == 0

 def add(self, name: str, category: str, passed: bool, message: str = "",
 severity: str = "error"):
 self.checks.append(Check(name, category, passed, message, severity))

 def to_dict(self) -> Dict:
 return {
 "package_path": self.package_path,
 "is_valid": self.is_valid,
 "total_checks": self.total,
 "passed": self.passed,
 "failed": self.failed,
 "warnings": self.warnings,
 "checks": [
 {
 "name": c.name,
 "category": c.category,
 "passed": c.passed,
 "message": c.message,
 "severity": c.severity,
 }
 for c in self.checks
 ],
 }


# ============================================================================
# Validators
# ============================================================================

def validate_manifest(pkg_dir: Path, report: ValidationReport) -> Optional[Dict]:
 """Validate manifest.json structure and content."""
 manifest_path = pkg_dir / "manifest.json"

 report.add(
 "manifest_exists", "manifest",
 manifest_path.is_file(),
 "" if manifest_path.is_file() else "manifest.json not found",
 )
 if not manifest_path.is_file():
 return None

 try:
 manifest = json.loads(manifest_path.read_text())
 report.add("manifest_valid_json", "manifest", True)
 except json.JSONDecodeError as e:
 report.add("manifest_valid_json", "manifest", False, f"Invalid JSON: {e}")
 return None

 # Required keys
 missing = REQUIRED_MANIFEST_KEYS - manifest.keys()
 report.add(
 "manifest_required_keys", "manifest",
 len(missing) == 0,
 f"Missing keys: {missing}" if missing else "",
 )

 # Version check
 has_version = "version" in manifest and isinstance(manifest["version"], str)
 report.add("manifest_version", "manifest", has_version,
 "" if has_version else "version must be a string")

 # Total cases
 total_cases = manifest.get("totalCases", 0)
 report.add(
 "manifest_total_cases", "manifest",
 total_cases == len(DEMO_CASES),
 f"Expected {len(DEMO_CASES)}, got {total_cases}",
 )

 # Total images
 total_images = manifest.get("totalImages", 0)
 report.add(
 "manifest_total_images", "manifest",
 total_images == TOTAL_IMAGES,
 f"Expected {TOTAL_IMAGES}, got {total_images}",
 )

 # Cases array
 cases = manifest.get("cases", [])
 report.add(
 "manifest_cases_is_list", "manifest",
 isinstance(cases, list),
 f"cases must be a list, got {type(cases).__name__}",
 )

 # Validate each case entry
 for case_entry in cases:
 case_id = case_entry.get("id", "?")
 case_missing = REQUIRED_CASE_KEYS - case_entry.keys()
 report.add(
 f"manifest_case_{case_id}_keys", "manifest",
 len(case_missing) == 0,
 f"Missing keys: {case_missing}" if case_missing else "",
 )

 difficulty = case_entry.get("difficulty", "")
 report.add(
 f"manifest_case_{case_id}_difficulty", "manifest",
 difficulty in VALID_DIFFICULTIES,
 f"Invalid difficulty: {difficulty}" if difficulty not in VALID_DIFFICULTIES else "",
 )

 return manifest


def validate_case_info(
 case_dir: Path, case_id: str, expected_views: int, report: ValidationReport,
) -> Optional[Dict]:
 """Validate a case-info.json file."""
 ci_path = case_dir / "case-info.json"

 report.add(
 f"case_{case_id}_info_exists", "case_info",
 ci_path.is_file(),
 "" if ci_path.is_file() else f"case-info.json not found in {case_dir.name}",
 )
 if not ci_path.is_file():
 return None

 try:
 info = json.loads(ci_path.read_text())
 report.add(f"case_{case_id}_info_valid_json", "case_info", True)
 except json.JSONDecodeError as e:
 report.add(f"case_{case_id}_info_valid_json", "case_info", False, str(e))
 return None

 # Required keys
 missing = REQUIRED_CASE_INFO_KEYS - info.keys()
 report.add(
 f"case_{case_id}_info_keys", "case_info",
 len(missing) == 0,
 f"Missing keys: {missing}" if missing else "",
 )

 # Case ID match
 report.add(
 f"case_{case_id}_id_match", "case_info",
 info.get("caseId") == case_id,
 f"Expected caseId={case_id}, got {info.get('caseId')}",
 )

 # Patient keys
 patient = info.get("patient", {})
 patient_missing = REQUIRED_PATIENT_KEYS - patient.keys()
 report.add(
 f"case_{case_id}_patient_keys", "case_info",
 len(patient_missing) == 0,
 f"Missing patient keys: {patient_missing}" if patient_missing else "",
 )

 # Expected outcome
 outcome = info.get("expectedOutcome", {})
 pathology = outcome.get("pathology", "")
 report.add(
 f"case_{case_id}_pathology", "case_info",
 pathology in VALID_PATHOLOGIES,
 f"Invalid pathology: {pathology}" if pathology not in VALID_PATHOLOGIES else "",
 )

 # Images array
 images = info.get("images", [])
 report.add(
 f"case_{case_id}_image_count", "case_info",
 len(images) == expected_views,
 f"Expected {expected_views} images, got {len(images)}",
 )

 # Validate each image entry
 for img in images:
 fname = img.get("filename", "?")

 # Required keys
 img_missing = REQUIRED_IMAGE_KEYS - img.keys()
 report.add(
 f"case_{case_id}_img_{fname}_keys", "case_info",
 len(img_missing) == 0,
 f"Missing: {img_missing}" if img_missing else "",
 )

 # Filename pattern
 report.add(
 f"case_{case_id}_img_{fname}_pattern", "naming",
 bool(FILENAME_PATTERN.match(fname)),
 f"Filename '{fname}' doesn't match pattern DEMO-NNN_SIDE_VIEW",
 )

 # View type
 vt = img.get("viewType", "")
 report.add(
 f"case_{case_id}_img_{fname}_view", "case_info",
 vt in VALID_VIEWS,
 f"Invalid viewType: {vt}" if vt not in VALID_VIEWS else "",
 )

 # Laterality
 lat = img.get("laterality", "")
 report.add(
 f"case_{case_id}_img_{fname}_lat", "case_info",
 lat in VALID_LATERALITIES,
 f"Invalid laterality: {lat}" if lat not in VALID_LATERALITIES else "",
 )

 return info


def validate_files(
 case_dir: Path, case_id: str, case_info: Dict,
 report: ValidationReport, strict: bool = False,
):
 """Validate PNG and DICOM files exist and meet quality requirements."""
 images = case_info.get("images", [])

 for img in images:
 fname = img.get("filename", "?")

 # PNG exists
 png_path = case_dir / "png" / f"{fname}.png"
 report.add(
 f"file_{fname}_png_exists", "files",
 png_path.is_file(),
 "" if png_path.is_file() else f"Missing: {png_path}",
 )

 # DICOM exists
 dcm_path = case_dir / "dicom" / f"{fname}.dcm"
 report.add(
 f"file_{fname}_dcm_exists", "files",
 dcm_path.is_file(),
 "" if dcm_path.is_file() else f"Missing: {dcm_path}",
 )

 # PNG image quality checks
 if png_path.is_file() and HAS_PIL:
 try:
 pil_img = Image.open(str(png_path))
 w, h = pil_img.size

 # Dimension checks
 report.add(
 f"file_{fname}_png_min_dims", "image_quality",
 w >= MIN_IMAGE_DIM and h >= MIN_IMAGE_DIM,
 f"Too small: {w}×{h} (min {MIN_IMAGE_DIM})"
 if (w < MIN_IMAGE_DIM or h < MIN_IMAGE_DIM) else "",
 )
 report.add(
 f"file_{fname}_png_max_dims", "image_quality",
 max(w, h) <= MAX_PNG_EDGE,
 f"Too large: {w}×{h} (max edge {MAX_PNG_EDGE})"
 if max(w, h) > MAX_PNG_EDGE else "",
 )

 # Mode check
 report.add(
 f"file_{fname}_png_mode", "image_quality",
 pil_img.mode in ("L", "RGB", "RGBA"),
 f"Invalid mode: {pil_img.mode}",
 )

 # File size check
 size_bytes = png_path.stat().st_size
 max_size = 50 * 1024 * 1024 # 50 MB (frontend limit)
 report.add(
 f"file_{fname}_png_size", "image_quality",
 size_bytes <= max_size,
 f"File too large: {size_bytes / 1024 / 1024:.1f} MB (max 50 MB)"
 if size_bytes > max_size else "",
 )

 except Exception as e:
 report.add(
 f"file_{fname}_png_readable", "image_quality",
 False, f"Cannot open PNG: {e}",
 )

 # Strict mode: check DICOM is loadable
 if dcm_path.is_file() and strict:
 try:
 import pydicom
 ds = pydicom.dcmread(str(dcm_path))
 _ = ds.pixel_array
 report.add(
 f"file_{fname}_dcm_loadable", "image_quality",
 True,
 )
 except Exception as e:
 report.add(
 f"file_{fname}_dcm_loadable", "image_quality",
 False, f"DICOM not loadable: {e}",
 )


def validate_cross_cutting(pkg_dir: Path, report: ValidationReport):
 """Cross-cutting validations across the entire package."""
 # Count all PNGs
 pngs = list(pkg_dir.rglob("*.png"))
 report.add(
 "total_png_count", "package",
 len(pngs) == TOTAL_IMAGES,
 f"Expected {TOTAL_IMAGES} PNGs, found {len(pngs)}",
 )

 # Count all DICOMs
 dcms = list(pkg_dir.rglob("*.dcm"))
 report.add(
 "total_dcm_count", "package",
 len(dcms) == TOTAL_IMAGES,
 f"Expected {TOTAL_IMAGES} DICOMs, found {len(dcms)}",
 )

 # Total files
 total_files = len(pngs) + len(dcms)
 report.add(
 "total_file_count", "package",
 total_files == TOTAL_FILES,
 f"Expected {TOTAL_FILES} files (PNG+DICOM), found {total_files}",
 )

 # Check ZIP exists
 zip_path = pkg_dir / "ClinicalVision_Demo_Package.zip"
 report.add(
 "zip_exists", "package",
 zip_path.is_file(),
 "ClinicalVision_Demo_Package.zip not found",
 severity="warning", # ZIP is nice-to-have, not critical
 )

 # Check for duplicate filenames
 all_filenames = [p.stem for p in pngs]
 unique = set(all_filenames)
 report.add(
 "no_duplicate_filenames", "package",
 len(all_filenames) == len(unique),
 f"Duplicate filenames found: {set(f for f in all_filenames if all_filenames.count(f) > 1)}"
 if len(all_filenames)!= len(unique) else "",
 )


# ============================================================================
# Main Validator
# ============================================================================

def validate_package(pkg_dir: Path, strict: bool = False) -> ValidationReport:
 """Run full validation suite on a demo data package."""
 report = ValidationReport(package_path=str(pkg_dir))

 # Check directory exists
 report.add(
 "package_dir_exists", "package",
 pkg_dir.is_dir(),
 f"Directory not found: {pkg_dir}",
 )
 if not pkg_dir.is_dir():
 return report

 # 1. Manifest validation
 manifest = validate_manifest(pkg_dir, report)

 # 2. Per-case validation
 if manifest:
 for case_id, case_meta in DEMO_CASES.items():
 case_dir = pkg_dir / case_meta["dir"]

 report.add(
 f"case_{case_id}_dir_exists", "structure",
 case_dir.is_dir(),
 f"Missing: {case_meta['dir']}/" if not case_dir.is_dir() else "",
 )
 if not case_dir.is_dir():
 continue

 # Subdirectories
 for subdir in ["png", "dicom"]:
 sd = case_dir / subdir
 report.add(
 f"case_{case_id}_{subdir}_dir", "structure",
 sd.is_dir(),
 f"Missing: {case_meta['dir']}/{subdir}/" if not sd.is_dir() else "",
 )

 # case-info.json
 case_info = validate_case_info(
 case_dir, case_id, case_meta["views"], report
 )

 # Files
 if case_info:
 validate_files(case_dir, case_id, case_info, report, strict)

 # 3. Cross-cutting checks
 validate_cross_cutting(pkg_dir, report)

 return report


# ============================================================================
# CLI & Output
# ============================================================================

def print_report(report: ValidationReport, verbose: bool = False):
 """Print validation report to console with colored output."""
 GREEN = "\033[92m"
 RED = "\033[91m"
 YELLOW = "\033[93m"
 BOLD = "\033[1m"
 RESET = "\033[0m"

 print(f"\n{BOLD}{'='*60}")
 print("ClinicalVision Demo Package Validation Report")
 print(f"{'='*60}{RESET}")
 print(f"Package: {report.package_path}")
 print()

 # Group checks by category
 categories: Dict[str, List[Check]] = {}
 for check in report.checks:
 categories.setdefault(check.category, []).append(check)

 for cat, checks in categories.items():
 passed = sum(1 for c in checks if c.passed)
 total = len(checks)
 status = f"{GREEN}{RESET}" if passed == total else f"{RED}{RESET}"
 print(f"{status} {BOLD}{cat}{RESET}: {passed}/{total} checks passed")

 if verbose or passed < total:
 for c in checks:
 if c.passed and not verbose:
 continue
 icon = f"{GREEN}{RESET}" if c.passed else (
 f"{YELLOW}{RESET}" if c.severity == "warning" else f"{RED}{RESET}"
 )
 msg = f" — {c.message}" if c.message else ""
 print(f" {icon} {c.name}{msg}")

 # Summary
 print(f"\n{BOLD}{'─'*60}{RESET}")
 if report.is_valid:
 print(f"{GREEN}{BOLD} PASSED{RESET} — "
 f"{report.passed}/{report.total} checks passed"
 f" ({report.warnings} warning(s))")
 else:
 print(f"{RED}{BOLD} FAILED{RESET} — "
 f"{report.failed} error(s), {report.warnings} warning(s)")
 print()


def main():
 parser = argparse.ArgumentParser(
 description="Validate ClinicalVision demo data package",
 )
 parser.add_argument(
 "package_dir", type=Path,
 help="Path to the demo data package directory",
 )
 parser.add_argument(
 "--strict", action="store_true",
 help="Enable strict mode (also load/verify DICOM pixel data)",
 )
 parser.add_argument(
 "--json-report", type=Path, default=None,
 help="Save validation report as JSON",
 )
 parser.add_argument(
 "--verbose", "-v", action="store_true",
 help="Show all checks, not just failures",
 )
 parser.add_argument(
 "--quiet", "-q", action="store_true",
 help="Only output pass/fail exit code",
 )

 args = parser.parse_args()
 report = validate_package(args.package_dir, strict=args.strict)

 if not args.quiet:
 print_report(report, verbose=args.verbose)

 if args.json_report:
 args.json_report.parent.mkdir(parents=True, exist_ok=True)
 args.json_report.write_text(
 json.dumps(report.to_dict(), indent=2, ensure_ascii=False)
 )
 if not args.quiet:
 logger.info(f"Report saved to: {args.json_report}")

 sys.exit(0 if report.is_valid else 1)


if __name__ == "__main__":
 main()
