"""
DICOM Service Test Suite

Tests DICOM metadata extraction and anonymization:
- Metadata extraction
- Patient info parsing
- Study info parsing
- Anonymization
"""

import pytest
from datetime import datetime
from typing import Optional
from enum import Enum

# ============================================================================
# Types and Mock Data
# ============================================================================

class DicomTag:
    """Common DICOM tags."""
    PATIENT_NAME = (0x0010, 0x0010)
    PATIENT_ID = (0x0010, 0x0020)
    PATIENT_BIRTH_DATE = (0x0010, 0x0030)
    PATIENT_SEX = (0x0010, 0x0040)
    PATIENT_AGE = (0x0010, 0x1010)
    
    STUDY_DATE = (0x0008, 0x0020)
    STUDY_TIME = (0x0008, 0x0030)
    STUDY_DESCRIPTION = (0x0008, 0x1030)
    STUDY_INSTANCE_UID = (0x0020, 0x000D)
    ACCESSION_NUMBER = (0x0008, 0x0050)
    
    MODALITY = (0x0008, 0x0060)
    MANUFACTURER = (0x0008, 0x0070)
    INSTITUTION_NAME = (0x0008, 0x0080)
    
    IMAGE_LATERALITY = (0x0020, 0x0062)
    VIEW_POSITION = (0x0018, 0x5101)
    
    ROWS = (0x0028, 0x0010)
    COLUMNS = (0x0028, 0x0011)
    BITS_ALLOCATED = (0x0028, 0x0100)
    PIXEL_SPACING = (0x0028, 0x0030)


class DicomDataset:
    """Mock DICOM dataset for testing."""
    def __init__(self):
        self._data = {}
    
    def __setitem__(self, key, value):
        self._data[key] = value
    
    def __getitem__(self, key):
        return self._data.get(key)
    
    def get(self, key, default=None):
        return self._data.get(key, default)
    
    def __contains__(self, key):
        return key in self._data


# ============================================================================
# DICOM Parser Utilities
# ============================================================================

def parse_dicom_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse DICOM date format (YYYYMMDD)."""
    if not date_str:
        return None
    
    try:
        return datetime.strptime(date_str, "%Y%m%d")
    except ValueError:
        return None


def parse_dicom_time(time_str: Optional[str]) -> Optional[str]:
    """Parse DICOM time format (HHMMSS.ffffff)."""
    if not time_str:
        return None
    
    try:
        # Handle various time formats
        if len(time_str) >= 6:
            hours = time_str[0:2]
            minutes = time_str[2:4]
            seconds = time_str[4:6]
            return f"{hours}:{minutes}:{seconds}"
        return None
    except (ValueError, IndexError):
        return None


def parse_dicom_age(age_str: Optional[str]) -> Optional[int]:
    """Parse DICOM age string (e.g., '045Y')."""
    if not age_str:
        return None
    
    try:
        # Remove leading zeros and extract numeric part
        numeric = ''.join(filter(str.isdigit, age_str))
        if numeric:
            return int(numeric)
        return None
    except ValueError:
        return None


def parse_pixel_spacing(spacing_str: Optional[str]) -> Optional[tuple[float, float]]:
    """Parse pixel spacing (e.g., '0.1\\0.1')."""
    if not spacing_str:
        return None
    
    try:
        parts = spacing_str.split('\\')
        if len(parts) == 2:
            return (float(parts[0]), float(parts[1]))
        return None
    except ValueError:
        return None


# ============================================================================
# Metadata Extraction
# ============================================================================

class PatientInfo:
    def __init__(
        self,
        patient_id: str,
        patient_name: Optional[str] = None,
        birth_date: Optional[datetime] = None,
        sex: Optional[str] = None,
        age: Optional[int] = None,
    ):
        self.patient_id = patient_id
        self.patient_name = patient_name
        self.birth_date = birth_date
        self.sex = sex
        self.age = age


class StudyInfo:
    def __init__(
        self,
        study_uid: str,
        study_date: Optional[datetime] = None,
        study_time: Optional[str] = None,
        description: Optional[str] = None,
        modality: Optional[str] = None,
        accession_number: Optional[str] = None,
    ):
        self.study_uid = study_uid
        self.study_date = study_date
        self.study_time = study_time
        self.description = description
        self.modality = modality
        self.accession_number = accession_number


class ImageInfo:
    def __init__(
        self,
        rows: int,
        columns: int,
        bits_allocated: int,
        pixel_spacing: Optional[tuple[float, float]] = None,
        laterality: Optional[str] = None,
        view_position: Optional[str] = None,
    ):
        self.rows = rows
        self.columns = columns
        self.bits_allocated = bits_allocated
        self.pixel_spacing = pixel_spacing
        self.laterality = laterality
        self.view_position = view_position


def extract_patient_info(dataset: DicomDataset) -> PatientInfo:
    """Extract patient information from DICOM dataset."""
    return PatientInfo(
        patient_id=dataset.get("PatientID", "UNKNOWN"),
        patient_name=dataset.get("PatientName"),
        birth_date=parse_dicom_date(dataset.get("PatientBirthDate")),
        sex=dataset.get("PatientSex"),
        age=parse_dicom_age(dataset.get("PatientAge")),
    )


def extract_study_info(dataset: DicomDataset) -> StudyInfo:
    """Extract study information from DICOM dataset."""
    return StudyInfo(
        study_uid=dataset.get("StudyInstanceUID", ""),
        study_date=parse_dicom_date(dataset.get("StudyDate")),
        study_time=parse_dicom_time(dataset.get("StudyTime")),
        description=dataset.get("StudyDescription"),
        modality=dataset.get("Modality"),
        accession_number=dataset.get("AccessionNumber"),
    )


def extract_image_info(dataset: DicomDataset) -> ImageInfo:
    """Extract image information from DICOM dataset."""
    return ImageInfo(
        rows=dataset.get("Rows", 0),
        columns=dataset.get("Columns", 0),
        bits_allocated=dataset.get("BitsAllocated", 8),
        pixel_spacing=parse_pixel_spacing(dataset.get("PixelSpacing")),
        laterality=dataset.get("ImageLaterality"),
        view_position=dataset.get("ViewPosition"),
    )


# ============================================================================
# Anonymization
# ============================================================================

# PHI tags that should be removed or replaced
PHI_TAGS = [
    "PatientName",
    "PatientID",
    "PatientBirthDate",
    "PatientAddress",
    "PatientTelephoneNumbers",
    "InstitutionName",
    "ReferringPhysicianName",
    "PerformingPhysicianName",
    "AccessionNumber",
]


def anonymize_dataset(dataset: DicomDataset, new_patient_id: str = "ANONYMOUS") -> DicomDataset:
    """Anonymize DICOM dataset by removing/replacing PHI."""
    # Create a new dataset
    anonymized = DicomDataset()
    
    # Copy all data
    for key, value in dataset._data.items():
        if key not in PHI_TAGS:
            anonymized[key] = value
    
    # Replace specific fields
    anonymized["PatientID"] = new_patient_id
    anonymized["PatientName"] = "Anonymous"
    
    return anonymized


def is_phi_present(dataset: DicomDataset) -> bool:
    """Check if PHI is present in dataset."""
    for tag in PHI_TAGS:
        if tag in dataset and dataset[tag]:
            return True
    return False


def calculate_dicom_hash(dataset: DicomDataset) -> str:
    """Calculate hash for DICOM dataset (for deduplication)."""
    import hashlib
    
    # Use key identifying fields
    identifier = f"{dataset.get('StudyInstanceUID', '')}_{dataset.get('SOPInstanceUID', '')}_{dataset.get('SeriesInstanceUID', '')}"
    
    return hashlib.sha256(identifier.encode()).hexdigest()[:16]


# ============================================================================
# Tests
# ============================================================================

class TestDicomDateParsing:
    """Tests for DICOM date parsing."""
    
    def test_valid_date(self):
        result = parse_dicom_date("20260115")
        assert result is not None
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 15
    
    def test_empty_date(self):
        assert parse_dicom_date(None) is None
        assert parse_dicom_date("") is None
    
    def test_invalid_date(self):
        assert parse_dicom_date("invalid") is None
    
    def test_partial_date(self):
        # Should fail for incomplete dates
        assert parse_dicom_date("202601") is None


class TestDicomTimeParsing:
    """Tests for DICOM time parsing."""
    
    def test_valid_time(self):
        result = parse_dicom_time("143022")
        assert result == "14:30:22"
    
    def test_time_with_microseconds(self):
        result = parse_dicom_time("143022.123456")
        assert result == "14:30:22"
    
    def test_empty_time(self):
        assert parse_dicom_time(None) is None
        assert parse_dicom_time("") is None
    
    def test_short_time(self):
        assert parse_dicom_time("14") is None


class TestDicomAgeParsing:
    """Tests for DICOM age string parsing."""
    
    def test_years_format(self):
        assert parse_dicom_age("045Y") == 45
    
    def test_leading_zeros(self):
        assert parse_dicom_age("007Y") == 7
    
    def test_months_format(self):
        # Should extract numeric value
        assert parse_dicom_age("006M") == 6
    
    def test_empty_age(self):
        assert parse_dicom_age(None) is None
        assert parse_dicom_age("") is None


class TestPixelSpacingParsing:
    """Tests for pixel spacing parsing."""
    
    def test_valid_spacing(self):
        result = parse_pixel_spacing("0.1\\0.1")
        assert result == (0.1, 0.1)
    
    def test_asymmetric_spacing(self):
        result = parse_pixel_spacing("0.15\\0.2")
        assert result == (0.15, 0.2)
    
    def test_empty_spacing(self):
        assert parse_pixel_spacing(None) is None
        assert parse_pixel_spacing("") is None
    
    def test_single_value(self):
        assert parse_pixel_spacing("0.1") is None


class TestPatientInfoExtraction:
    """Tests for patient info extraction."""
    
    def test_extract_complete_patient_info(self):
        dataset = DicomDataset()
        dataset["PatientID"] = "P001"
        dataset["PatientName"] = "DOE^JOHN"
        dataset["PatientBirthDate"] = "19800115"
        dataset["PatientSex"] = "M"
        dataset["PatientAge"] = "045Y"
        
        info = extract_patient_info(dataset)
        
        assert info.patient_id == "P001"
        assert info.patient_name == "DOE^JOHN"
        assert info.sex == "M"
        assert info.age == 45
        assert info.birth_date.year == 1980
    
    def test_extract_minimal_patient_info(self):
        dataset = DicomDataset()
        dataset["PatientID"] = "P002"
        
        info = extract_patient_info(dataset)
        
        assert info.patient_id == "P002"
        assert info.patient_name is None
        assert info.birth_date is None
    
    def test_missing_patient_id_uses_default(self):
        dataset = DicomDataset()
        
        info = extract_patient_info(dataset)
        
        assert info.patient_id == "UNKNOWN"


class TestStudyInfoExtraction:
    """Tests for study info extraction."""
    
    def test_extract_complete_study_info(self):
        dataset = DicomDataset()
        dataset["StudyInstanceUID"] = "1.2.3.4.5"
        dataset["StudyDate"] = "20260115"
        dataset["StudyTime"] = "143022"
        dataset["StudyDescription"] = "Screening Mammogram"
        dataset["Modality"] = "MG"
        dataset["AccessionNumber"] = "ACC001"
        
        info = extract_study_info(dataset)
        
        assert info.study_uid == "1.2.3.4.5"
        assert info.study_date.year == 2026
        assert info.study_time == "14:30:22"
        assert info.modality == "MG"
        assert info.accession_number == "ACC001"
    
    def test_extract_minimal_study_info(self):
        dataset = DicomDataset()
        dataset["StudyInstanceUID"] = "1.2.3"
        
        info = extract_study_info(dataset)
        
        assert info.study_uid == "1.2.3"
        assert info.study_date is None


class TestImageInfoExtraction:
    """Tests for image info extraction."""
    
    def test_extract_complete_image_info(self):
        dataset = DicomDataset()
        dataset["Rows"] = 3000
        dataset["Columns"] = 2500
        dataset["BitsAllocated"] = 16
        dataset["PixelSpacing"] = "0.1\\0.1"
        dataset["ImageLaterality"] = "L"
        dataset["ViewPosition"] = "CC"
        
        info = extract_image_info(dataset)
        
        assert info.rows == 3000
        assert info.columns == 2500
        assert info.bits_allocated == 16
        assert info.pixel_spacing == (0.1, 0.1)
        assert info.laterality == "L"
        assert info.view_position == "CC"
    
    def test_extract_with_defaults(self):
        dataset = DicomDataset()
        
        info = extract_image_info(dataset)
        
        assert info.rows == 0
        assert info.columns == 0
        assert info.bits_allocated == 8


class TestAnonymization:
    """Tests for DICOM anonymization."""
    
    def test_removes_phi_tags(self):
        dataset = DicomDataset()
        dataset["PatientName"] = "DOE^JOHN"
        dataset["PatientID"] = "P001"
        dataset["InstitutionName"] = "General Hospital"
        dataset["Modality"] = "MG"  # Non-PHI
        
        anonymized = anonymize_dataset(dataset)
        
        assert anonymized["PatientName"] == "Anonymous"
        assert anonymized["PatientID"] == "ANONYMOUS"
        assert "InstitutionName" not in anonymized
        assert anonymized["Modality"] == "MG"  # Preserved
    
    def test_custom_patient_id(self):
        dataset = DicomDataset()
        dataset["PatientID"] = "P001"
        
        anonymized = anonymize_dataset(dataset, new_patient_id="STUDY_001")
        
        assert anonymized["PatientID"] == "STUDY_001"
    
    def test_is_phi_present_true(self):
        dataset = DicomDataset()
        dataset["PatientName"] = "DOE^JOHN"
        
        assert is_phi_present(dataset) is True
    
    def test_is_phi_present_false(self):
        dataset = DicomDataset()
        dataset["Modality"] = "MG"
        dataset["Rows"] = 3000
        
        assert is_phi_present(dataset) is False


class TestDicomHash:
    """Tests for DICOM hashing."""
    
    def test_consistent_hash(self):
        dataset = DicomDataset()
        dataset["StudyInstanceUID"] = "1.2.3"
        dataset["SOPInstanceUID"] = "4.5.6"
        dataset["SeriesInstanceUID"] = "7.8.9"
        
        hash1 = calculate_dicom_hash(dataset)
        hash2 = calculate_dicom_hash(dataset)
        
        assert hash1 == hash2
    
    def test_different_datasets_different_hash(self):
        dataset1 = DicomDataset()
        dataset1["StudyInstanceUID"] = "1.2.3"
        
        dataset2 = DicomDataset()
        dataset2["StudyInstanceUID"] = "1.2.4"
        
        assert calculate_dicom_hash(dataset1) != calculate_dicom_hash(dataset2)
    
    def test_hash_length(self):
        dataset = DicomDataset()
        dataset["StudyInstanceUID"] = "1.2.3"
        
        hash_value = calculate_dicom_hash(dataset)
        
        assert len(hash_value) == 16


class TestLateralityAndView:
    """Tests for mammography-specific metadata."""
    
    def test_valid_lateralities(self):
        for laterality in ["L", "R"]:
            dataset = DicomDataset()
            dataset["Rows"] = 1000
            dataset["Columns"] = 1000
            dataset["BitsAllocated"] = 16
            dataset["ImageLaterality"] = laterality
            
            info = extract_image_info(dataset)
            assert info.laterality == laterality
    
    def test_valid_view_positions(self):
        for view in ["CC", "MLO", "XCCL", "XCCM"]:
            dataset = DicomDataset()
            dataset["Rows"] = 1000
            dataset["Columns"] = 1000
            dataset["BitsAllocated"] = 16
            dataset["ViewPosition"] = view
            
            info = extract_image_info(dataset)
            assert info.view_position == view
