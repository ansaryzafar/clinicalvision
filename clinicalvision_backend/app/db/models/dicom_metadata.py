"""
DICOM Metadata Extension Model
Stores comprehensive DICOM tags for medical imaging compliance
Based on DICOM standard PS3.6 and industry best practices
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from datetime import datetime

from app.db.base import BaseModel


class TransferSyntax(str, enum.Enum):
    """DICOM Transfer Syntax UIDs"""
    IMPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2"
    EXPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2.1"
    EXPLICIT_VR_BIG_ENDIAN = "1.2.840.10008.1.2.2"
    JPEG_BASELINE = "1.2.840.10008.1.2.4.50"
    JPEG_LOSSLESS = "1.2.840.10008.1.2.4.70"
    JPEG_2000_LOSSLESS = "1.2.840.10008.1.2.4.90"
    RLE_LOSSLESS = "1.2.840.10008.1.2.5"


class PhotometricInterpretation(str, enum.Enum):
    """DICOM Photometric Interpretation"""
    MONOCHROME1 = "MONOCHROME1"  # Min is white
    MONOCHROME2 = "MONOCHROME2"  # Min is black
    PALETTE_COLOR = "PALETTE COLOR"
    RGB = "RGB"
    YBR_FULL = "YBR_FULL"


class PatientPosition(str, enum.Enum):
    """Standard patient positioning"""
    HFP = "HFP"  # Head First-Prone
    HFS = "HFS"  # Head First-Supine
    HFDR = "HFDR"  # Head First-Decubitus Right
    HFDL = "HFDL"  # Head First-Decubitus Left
    FFP = "FFP"  # Feet First-Prone
    FFS = "FFS"  # Feet First-Supine
    FFDR = "FFDR"  # Feet First-Decubitus Right
    FFDL = "FFDL"  # Feet First-Decubitus Left
    UNKNOWN = "UNKNOWN"


class DICOMMetadata(BaseModel):
    """
    Extended DICOM metadata for comprehensive medical imaging compliance
    Stores DICOM tags beyond basic image info for FDA/HIPAA compliance
    Modular design allows selective population based on available DICOM data
    """
    
    __tablename__ = "dicom_metadata"
    
    # Image relationship (one-to-one)
    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id"), nullable=False, unique=True, index=True)
    
    # ==================== SOP Common Module ====================
    sop_class_uid = Column(String(255), nullable=True, index=True)  # Type of DICOM object
    
    # ==================== Transfer Syntax ====================
    transfer_syntax_uid = Column(SQLEnum(TransferSyntax), nullable=True)
    
    # ==================== Patient Module ====================
    patient_name = Column(String(255), nullable=True)  # De-identified or hashed
    patient_birth_date = Column(DateTime, nullable=True)  # May be anonymized
    patient_sex = Column(String(10), nullable=True)
    patient_age = Column(String(10), nullable=True)  # Format: "055Y"
    patient_weight = Column(Float, nullable=True)  # In kg
    
    # ==================== Study Module ====================
    study_date = Column(DateTime, nullable=True)
    study_time = Column(String(20), nullable=True)
    referring_physician_name = Column(String(255), nullable=True)
    study_description = Column(Text, nullable=True)
    
    # ==================== Series Module ====================
    series_date = Column(DateTime, nullable=True)
    series_time = Column(String(20), nullable=True)
    series_description = Column(Text, nullable=True)
    series_number = Column(Integer, nullable=True)
    body_part_examined = Column(String(50), nullable=True)  # e.g., "BREAST"
    patient_position = Column(SQLEnum(PatientPosition), nullable=True)
    
    # ==================== Equipment Module ====================
    manufacturer = Column(String(255), nullable=True)  # e.g., "GE Healthcare", "Hologic"
    manufacturer_model_name = Column(String(255), nullable=True)
    device_serial_number = Column(String(255), nullable=True)
    software_versions = Column(String(255), nullable=True)
    station_name = Column(String(100), nullable=True)
    
    # ==================== Image Module ====================
    acquisition_date = Column(DateTime, nullable=True, index=True)
    acquisition_time = Column(String(20), nullable=True)
    acquisition_number = Column(Integer, nullable=True)
    image_type = Column(String(255), nullable=True)  # e.g., "ORIGINAL\PRIMARY\AXIAL"
    
    # ==================== Image Pixel Module ====================
    samples_per_pixel = Column(Integer, nullable=True)  # Usually 1 for grayscale
    photometric_interpretation = Column(SQLEnum(PhotometricInterpretation), nullable=True)
    rows = Column(Integer, nullable=True)  # Image height
    columns = Column(Integer, nullable=True)  # Image width
    bits_allocated = Column(Integer, nullable=True)  # Usually 8 or 16
    bits_stored = Column(Integer, nullable=True)
    high_bit = Column(Integer, nullable=True)
    pixel_representation = Column(Integer, nullable=True)  # 0=unsigned, 1=signed
    
    # ==================== Mammography-Specific ====================
    view_position = Column(String(50), nullable=True)  # CC, MLO, etc.
    image_laterality = Column(String(10), nullable=True)  # L, R
    compressed_thickness = Column(Float, nullable=True)  # In mm
    compression_force = Column(Float, nullable=True)  # In Newtons
    paddle_description = Column(String(255), nullable=True)
    
    # Detector and dose information
    detector_type = Column(String(100), nullable=True)
    detector_id = Column(String(100), nullable=True)
    exposure_in_uas = Column(Float, nullable=True)  # Microampere-seconds
    kvp = Column(Float, nullable=True)  # Peak kilovoltage
    exposure_time = Column(Float, nullable=True)  # In milliseconds
    
    # ==================== Spatial Calibration ====================
    pixel_spacing = Column(JSONB, nullable=True)  # [row_spacing, col_spacing] in mm
    imager_pixel_spacing = Column(JSONB, nullable=True)  # Device-level pixel spacing
    
    # Window/Level for display
    window_center = Column(Float, nullable=True)  # For optimal display contrast
    window_width = Column(Float, nullable=True)
    
    # ==================== Quality Assurance ====================
    quality_control_image = Column(String(10), nullable=True)  # YES/NO
    burn_in_annotation = Column(String(10), nullable=True)  # YES/NO
    
    # ==================== Additional Metadata ====================
    # Store any additional DICOM tags as JSONB for flexibility
    additional_tags = Column(JSONB, nullable=True)
    
    # Raw DICOM header (for audit/debugging)
    raw_dicom_header = Column(JSONB, nullable=True)  # Full DICOM dump if needed
    
    # Compliance flags
    anonymized = Column(String(10), default="YES", nullable=False)
    phi_removed = Column(String(10), default="YES", nullable=False)  # Protected Health Information
    
    # Relationships
    image = relationship("Image", back_populates="dicom_metadata")
    
    def __repr__(self):
        return f"<DICOMMetadata(image_id={self.image_id}, manufacturer={self.manufacturer}, acquisition_date={self.acquisition_date})>"
    
    @property
    def is_mammogram(self):
        """Check if this is a mammography image"""
        return self.body_part_examined == "BREAST" if self.body_part_examined else None
    
    @property
    def pixel_spacing_mm(self):
        """Get pixel spacing in mm as tuple (row, column)"""
        if self.pixel_spacing and isinstance(self.pixel_spacing, list) and len(self.pixel_spacing) == 2:
            return tuple(self.pixel_spacing)
        return None
    
    @property
    def image_dimensions(self):
        """Get image dimensions as (rows, columns)"""
        if self.rows and self.columns:
            return (self.rows, self.columns)
        return None
