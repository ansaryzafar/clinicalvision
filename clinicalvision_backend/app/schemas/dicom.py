"""
Pydantic schemas for DICOM Metadata API

This module defines request/response schemas for DICOM metadata operations,
following DICOM PS3.6 standard specifications.

Standards:
- DICOM PS3.6 (Data Dictionary)
- HIPAA compliance for de-identification
- IHE Radiology profiles
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class TransferSyntaxEnum(str, Enum):
    """Common DICOM Transfer Syntax UIDs"""
    IMPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2"
    EXPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2.1"
    EXPLICIT_VR_BIG_ENDIAN = "1.2.840.10008.1.2.2"
    JPEG_BASELINE = "1.2.840.10008.1.2.4.50"
    JPEG_LOSSLESS = "1.2.840.10008.1.2.4.70"
    JPEG_2000_LOSSLESS = "1.2.840.10008.1.2.4.90"
    JPEG_2000_LOSSY = "1.2.840.10008.1.2.4.91"


class PhotometricInterpretationEnum(str, Enum):
    """Photometric Interpretation values"""
    MONOCHROME1 = "MONOCHROME1"
    MONOCHROME2 = "MONOCHROME2"
    RGB = "RGB"
    YBR_FULL = "YBR_FULL"
    YBR_FULL_422 = "YBR_FULL_422"


class PatientPositionEnum(str, Enum):
    """Patient Position for mammography"""
    HFP = "HFP"  # Head First-Prone
    HFS = "HFS"  # Head First-Supine
    HFDR = "HFDR"  # Head First-Decubitus Right
    HFDL = "HFDL"  # Head First-Decubitus Left
    FFDR = "FFDR"  # Feet First-Decubitus Right
    FFDL = "FFDL"  # Feet First-Decubitus Left
    FFP = "FFP"  # Feet First-Prone
    FFS = "FFS"  # Feet First-Supine
    UNKNOWN = "UNKNOWN"


class ViewPositionEnum(str, Enum):
    """Mammography View Position"""
    CC = "CC"  # Cranio-Caudal
    MLO = "MLO"  # Medio-Lateral Oblique
    ML = "ML"  # Medio-Lateral
    LM = "LM"  # Latero-Medial
    LMO = "LMO"  # Latero-Medial Oblique
    XCCL = "XCCL"  # Exaggerated CC Lateral
    XCCM = "XCCM"  # Exaggerated CC Medial


class ImageLateralityEnum(str, Enum):
    """Image Laterality"""
    L = "L"  # Left
    R = "R"  # Right
    B = "B"  # Bilateral


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class DICOMMetadataBase(BaseModel):
    """Base schema for DICOM metadata"""
    sop_class_uid: Optional[str] = Field(None, description="SOP Class UID")
    transfer_syntax_uid: Optional[str] = Field(None, description="Transfer Syntax UID")
    
    # Patient Information (anonymized)
    patient_sex: Optional[str] = Field(None, description="Patient sex (M/F/O)")
    patient_age: Optional[int] = Field(None, description="Patient age in years", ge=0, le=150)
    patient_weight: Optional[float] = Field(None, description="Patient weight in kg", ge=0, le=300)
    
    # Study Information
    study_date: Optional[date] = Field(None, description="Study date")
    study_time: Optional[str] = Field(None, description="Study time (HHMMSS)")
    referring_physician_name: Optional[str] = Field(None, description="Referring physician")
    study_description: Optional[str] = Field(None, description="Study description")
    
    # Series Information
    series_date: Optional[date] = Field(None, description="Series date")
    series_time: Optional[str] = Field(None, description="Series time (HHMMSS)")
    series_description: Optional[str] = Field(None, description="Series description")
    series_number: Optional[int] = Field(None, description="Series number", ge=0)
    body_part_examined: Optional[str] = Field(None, description="Body part examined")
    patient_position: Optional[str] = Field(None, description="Patient position")
    
    # Equipment Information
    manufacturer: Optional[str] = Field(None, description="Equipment manufacturer")
    manufacturer_model_name: Optional[str] = Field(None, description="Manufacturer model name")
    device_serial_number: Optional[str] = Field(None, description="Device serial number")
    software_versions: Optional[str] = Field(None, description="Software version(s)")
    station_name: Optional[str] = Field(None, description="Station name")
    
    # Image Information
    acquisition_date: Optional[date] = Field(None, description="Acquisition date")
    acquisition_time: Optional[str] = Field(None, description="Acquisition time")
    acquisition_number: Optional[int] = Field(None, description="Acquisition number")
    image_type: Optional[List[str]] = Field(None, description="Image type")
    
    # Pixel Data Information
    samples_per_pixel: Optional[int] = Field(None, description="Samples per pixel (1 or 3)", ge=1, le=3)
    photometric_interpretation: Optional[str] = Field(None, description="Photometric interpretation")
    rows: Optional[int] = Field(None, description="Number of rows", gt=0)
    columns: Optional[int] = Field(None, description="Number of columns", gt=0)
    bits_allocated: Optional[int] = Field(None, description="Bits allocated", ge=8, le=16)
    bits_stored: Optional[int] = Field(None, description="Bits stored", ge=8, le=16)
    high_bit: Optional[int] = Field(None, description="High bit", ge=7, le=15)
    pixel_representation: Optional[int] = Field(None, description="Pixel representation (0=unsigned, 1=signed)", ge=0, le=1)
    
    # Mammography-specific
    view_position: Optional[str] = Field(None, description="View position (CC, MLO, etc.)")
    image_laterality: Optional[str] = Field(None, description="Image laterality (L/R)")
    compressed_thickness: Optional[float] = Field(None, description="Breast thickness in mm", ge=0)
    compression_force: Optional[float] = Field(None, description="Compression force in Newtons", ge=0)
    paddle_description: Optional[str] = Field(None, description="Compression paddle description")
    detector_type: Optional[str] = Field(None, description="Detector type")
    detector_id: Optional[str] = Field(None, description="Detector ID")
    
    # Acquisition Parameters
    exposure_in_uas: Optional[float] = Field(None, description="Exposure in microampere-seconds", ge=0)
    kvp: Optional[float] = Field(None, description="kVp (Peak kilovoltage)", ge=0, le=50)
    exposure_time: Optional[float] = Field(None, description="Exposure time in ms", ge=0)
    pixel_spacing: Optional[List[float]] = Field(None, description="Pixel spacing [row, column] in mm")
    imager_pixel_spacing: Optional[List[float]] = Field(None, description="Imager pixel spacing in mm")
    
    # Display Parameters
    window_center: Optional[float] = Field(None, description="Window center for display")
    window_width: Optional[float] = Field(None, description="Window width for display", ge=0)
    
    # Quality Control
    quality_control_image: Optional[bool] = Field(None, description="Is QC image")
    burn_in_annotation: Optional[bool] = Field(None, description="Has burned-in annotation")
    
    # Privacy
    anonymized: bool = Field(False, description="Has been anonymized")
    phi_removed: bool = Field(False, description="PHI has been removed")
    
    @field_validator('quality_control_image', 'burn_in_annotation', 'anonymized', 'phi_removed', mode='before')
    @classmethod
    def convert_yes_no_to_bool(cls, v):
        """Convert YES/NO strings to boolean"""
        if isinstance(v, str):
            return v.upper() == "YES"
        return v    
    model_config = ConfigDict(protected_namespaces=())

class DICOMMetadataCreate(DICOMMetadataBase):
    """Schema for creating DICOM metadata"""
    image_id: UUID = Field(..., description="Associated image ID")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "image_id": "550e8400-e29b-41d4-a716-446655440000",
                "manufacturer": "Hologic",
                "manufacturer_model_name": "Selenia Dimensions",
                "view_position": "CC",
                "image_laterality": "R",
                "patient_age": 52,
                "compressed_thickness": 55.0,
                "compression_force": 120.0,
                "kvp": 29.0,
                "exposure_time": 1500.0
            }
        }
    )


class DICOMMetadataUpdate(BaseModel):
    """Schema for updating DICOM metadata (partial updates allowed)"""
    anonymized: Optional[bool] = None
    phi_removed: Optional[bool] = None
    window_center: Optional[float] = None
    window_width: Optional[float] = None
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "anonymized": True,
                "phi_removed": True
            }
        }
    )


class DICOMMetadataResponse(DICOMMetadataBase):
    """Schema for DICOM metadata response"""
    id: UUID
    image_id: UUID
    created_at: datetime
    updated_at: datetime
    
    @field_validator('study_date', 'series_date', 'acquisition_date', mode='before')
    @classmethod
    def convert_datetime_to_date(cls, v):
        """Convert datetime objects to date"""
        if isinstance(v, datetime):
            return v.date()
        return v
    
    @field_validator('pixel_spacing', 'imager_pixel_spacing', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        """Parse JSON string to list"""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except:
                return None
        return v
    
    model_config = ConfigDict(
        protected_namespaces=(),
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "image_id": "550e8400-e29b-41d4-a716-446655440000",
                "manufacturer": "Hologic",
                "manufacturer_model_name": "Selenia Dimensions",
                "view_position": "CC",
                "image_laterality": "R",
                "patient_age": 52,
                "patient_sex": "F",
                "study_date": "2024-01-15",
                "series_number": 1,
                "rows": 3328,
                "columns": 2560,
                "bits_allocated": 16,
                "photometric_interpretation": "MONOCHROME2",
                "compressed_thickness": 55.0,
                "compression_force": 120.0,
                "kvp": 29.0,
                "exposure_time": 1500.0,
                "pixel_spacing": [0.07, 0.07],
                "anonymized": True,
                "phi_removed": True,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }
    )


class DICOMMetadataListResponse(BaseModel):
    """Schema for paginated list of DICOM metadata"""
    metadata: List[DICOMMetadataResponse]
    total: int
    skip: int
    limit: int
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "metadata": [],
                "total": 100,
                "skip": 0,
                "limit": 20
            }
        }
    )


class DICOMMetadataSummary(BaseModel):
    """Human-readable summary of DICOM metadata"""
    image_id: UUID
    study_info: Dict[str, Any] = Field(..., description="Study-level information")
    equipment_info: Dict[str, Any] = Field(..., description="Equipment information")
    image_info: Dict[str, Any] = Field(..., description="Image acquisition info")
    quality_info: Dict[str, Any] = Field(..., description="Image quality parameters")
    privacy_status: Dict[str, Any] = Field(..., description="Privacy/anonymization status")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "image_id": "550e8400-e29b-41d4-a716-446655440000",
                "study_info": {
                    "study_date": "2024-01-15",
                    "body_part": "BREAST",
                    "view": "CC Right",
                    "patient_age": "52 years",
                    "patient_sex": "Female"
                },
                "equipment_info": {
                    "manufacturer": "Hologic",
                    "model": "Selenia Dimensions",
                    "station": "MAMMO-1"
                },
                "image_info": {
                    "dimensions": "3328x2560",
                    "bit_depth": "16-bit",
                    "pixel_spacing": "0.07mm",
                    "breast_thickness": "55mm",
                    "compression_force": "120N",
                    "kvp": "29kV",
                    "exposure_time": "1500ms"
                },
                "quality_info": {
                    "qc_image": False,
                    "burned_in_annotation": False
                },
                "privacy_status": {
                    "anonymized": True,
                    "phi_removed": True
                }
            }
        }
    )


class DICOMAnonymizationRequest(BaseModel):
    """Request to anonymize DICOM metadata"""
    remove_dates: bool = Field(True, description="Remove all date/time information")
    remove_identifiers: bool = Field(True, description="Remove patient/study identifiers")
    preserve_clinical: bool = Field(True, description="Preserve clinically relevant data")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "remove_dates": True,
                "remove_identifiers": True,
                "preserve_clinical": True
            }
        }
    )


class DICOMStatistics(BaseModel):
    """Statistics about DICOM metadata in the system"""
    total_images: int
    by_manufacturer: Dict[str, int]
    by_view_position: Dict[str, int]
    by_laterality: Dict[str, int]
    average_compression_force: Optional[float]
    average_compressed_thickness: Optional[float]
    anonymized_count: int
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "total_images": 2508,
                "by_manufacturer": {
                    "Hologic": 650,
                    "GE Healthcare": 620,
                    "Siemens": 618,
                    "Philips": 620
                },
                "by_view_position": {
                    "CC": 1254,
                    "MLO": 1254
                },
                "by_laterality": {
                    "L": 1254,
                    "R": 1254
                },
                "average_compression_force": 115.5,
                "average_compressed_thickness": 52.3,
                "anonymized_count": 2508
            }
        }
    )


# ============================================================================
# ERROR RESPONSES
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "error": "DICOM metadata not found",
                "detail": "No metadata found for image ID: 550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }
    )
