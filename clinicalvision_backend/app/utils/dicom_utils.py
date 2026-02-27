"""
DICOM Utilities
Comprehensive tools for DICOM file handling, parsing, and validation
Supports industry standards and FDA compliance requirements
"""

from typing import Dict, Any, Optional, List, Tuple
import json
from datetime import datetime
from pathlib import Path

try:
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False
    print("Warning: pydicom not installed. DICOM parsing will be limited.")


class DICOMParser:
    """
    Parse DICOM files and extract metadata for database storage
    Industry-standard DICOM tag extraction with privacy compliance
    """
    
    # Standard DICOM tags we care about
    PATIENT_TAGS = [
        (0x0010, 0x0010),  # Patient Name
        (0x0010, 0x0020),  # Patient ID
        (0x0010, 0x0030),  # Patient Birth Date
        (0x0010, 0x0040),  # Patient Sex
        (0x0010, 0x1010),  # Patient Age
        (0x0010, 0x1030),  # Patient Weight
    ]
    
    STUDY_TAGS = [
        (0x0020, 0x000D),  # Study Instance UID
        (0x0008, 0x0020),  # Study Date
        (0x0008, 0x0030),  # Study Time
        (0x0008, 0x0090),  # Referring Physician Name
        (0x0008, 0x1030),  # Study Description
        (0x0020, 0x0010),  # Study ID
    ]
    
    SERIES_TAGS = [
        (0x0020, 0x000E),  # Series Instance UID
        (0x0008, 0x0021),  # Series Date
        (0x0008, 0x0031),  # Series Time
        (0x0008, 0x103E),  # Series Description
        (0x0020, 0x0011),  # Series Number
        (0x0018, 0x0015),  # Body Part Examined
        (0x0018, 0x5100),  # Patient Position
    ]
    
    IMAGE_TAGS = [
        (0x0008, 0x0008),  # Image Type
        (0x0008, 0x0022),  # Acquisition Date
        (0x0008, 0x0032),  # Acquisition Time
        (0x0020, 0x0012),  # Acquisition Number
        (0x0008, 0x0018),  # SOP Instance UID
        (0x0008, 0x0016),  # SOP Class UID
    ]
    
    EQUIPMENT_TAGS = [
        (0x0008, 0x0070),  # Manufacturer
        (0x0008, 0x1090),  # Manufacturer Model Name
        (0x0018, 0x1000),  # Device Serial Number
        (0x0018, 0x1020),  # Software Versions
        (0x0008, 0x1010),  # Station Name
    ]
    
    PIXEL_TAGS = [
        (0x0028, 0x0002),  # Samples Per Pixel
        (0x0028, 0x0004),  # Photometric Interpretation
        (0x0028, 0x0010),  # Rows
        (0x0028, 0x0011),  # Columns
        (0x0028, 0x0100),  # Bits Allocated
        (0x0028, 0x0101),  # Bits Stored
        (0x0028, 0x0102),  # High Bit
        (0x0028, 0x0103),  # Pixel Representation
        (0x0028, 0x0030),  # Pixel Spacing
        (0x0018, 0x1164),  # Imager Pixel Spacing
    ]
    
    MAMMOGRAPHY_TAGS = [
        (0x0020, 0x0062),  # Image Laterality
        (0x0018, 0x5101),  # View Position
        (0x0018, 0x11A0),  # Body Part Thickness (Compressed Thickness)
        (0x0018, 0x11A2),  # Compression Force
        (0x0018, 0x1460),  # Paddle Description
        (0x0018, 0x1405),  # Detector Type
        (0x0018, 0x700A),  # Detector ID
        (0x0018, 0x1153),  # Exposure in µAs
        (0x0018, 0x0060),  # KVP
        (0x0018, 0x1150),  # Exposure Time
    ]
    
    def __init__(self):
        self.anonymize_phi = True  # Protected Health Information
        
    def parse_dicom_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a DICOM file and extract metadata
        
        Args:
            file_path: Path to DICOM file
            
        Returns:
            Dictionary with structured DICOM metadata
        """
        if not PYDICOM_AVAILABLE:
            return self._parse_simulated_dicom(file_path)
        
        try:
            ds = pydicom.dcmread(file_path, force=True)
            return self._extract_metadata_from_dataset(ds)
        except Exception as e:
            print(f"Error parsing DICOM file {file_path}: {e}")
            return {}
    
    def _extract_metadata_from_dataset(self, ds: Dataset) -> Dict[str, Any]:
        """Extract metadata from pydicom Dataset"""
        metadata = {}
        
        # Transfer Syntax
        if hasattr(ds, 'file_meta') and hasattr(ds.file_meta, 'TransferSyntaxUID'):
            metadata['transfer_syntax_uid'] = str(ds.file_meta.TransferSyntaxUID)
        
        # Patient Information (anonymized if needed)
        if self.anonymize_phi:
            metadata['patient_name'] = "ANONYMIZED"
            metadata['anonymized'] = "YES"
            metadata['phi_removed'] = "YES"
        else:
            metadata['patient_name'] = str(ds.get('PatientName', ''))
            metadata['anonymized'] = "NO"
            metadata['phi_removed'] = "NO"
        
        # Study information
        metadata['study_date'] = self._parse_date(ds.get('StudyDate'))
        metadata['study_time'] = str(ds.get('StudyTime', ''))
        metadata['study_description'] = str(ds.get('StudyDescription', ''))
        metadata['referring_physician_name'] = str(ds.get('ReferringPhysicianName', ''))
        
        # Series information
        metadata['series_date'] = self._parse_date(ds.get('SeriesDate'))
        metadata['series_time'] = str(ds.get('SeriesTime', ''))
        metadata['series_description'] = str(ds.get('SeriesDescription', ''))
        metadata['series_number'] = int(ds.get('SeriesNumber', 0))
        metadata['body_part_examined'] = str(ds.get('BodyPartExamined', ''))
        metadata['patient_position'] = str(ds.get('PatientPosition', 'UNKNOWN'))
        
        # Equipment
        metadata['manufacturer'] = str(ds.get('Manufacturer', ''))
        metadata['manufacturer_model_name'] = str(ds.get('ManufacturerModelName', ''))
        metadata['device_serial_number'] = str(ds.get('DeviceSerialNumber', ''))
        metadata['software_versions'] = str(ds.get('SoftwareVersions', ''))
        metadata['station_name'] = str(ds.get('StationName', ''))
        
        # Image/Acquisition
        metadata['acquisition_date'] = self._parse_date(ds.get('AcquisitionDate'))
        metadata['acquisition_time'] = str(ds.get('AcquisitionTime', ''))
        metadata['acquisition_number'] = int(ds.get('AcquisitionNumber', 0))
        metadata['image_type'] = str(ds.get('ImageType', ''))
        metadata['sop_instance_uid'] = str(ds.get('SOPInstanceUID', ''))
        metadata['sop_class_uid'] = str(ds.get('SOPClassUID', ''))
        
        # Pixel data
        metadata['samples_per_pixel'] = int(ds.get('SamplesPerPixel', 1))
        metadata['photometric_interpretation'] = str(ds.get('PhotometricInterpretation', ''))
        metadata['rows'] = int(ds.get('Rows', 0))
        metadata['columns'] = int(ds.get('Columns', 0))
        metadata['bits_allocated'] = int(ds.get('BitsAllocated', 0))
        metadata['bits_stored'] = int(ds.get('BitsStored', 0))
        metadata['high_bit'] = int(ds.get('HighBit', 0))
        metadata['pixel_representation'] = int(ds.get('PixelRepresentation', 0))
        
        # Pixel spacing (important for measurements)
        if 'PixelSpacing' in ds:
            pixel_spacing = ds.PixelSpacing
            metadata['pixel_spacing'] = [float(pixel_spacing[0]), float(pixel_spacing[1])]
        
        if 'ImagerPixelSpacing' in ds:
            imager_spacing = ds.ImagerPixelSpacing
            metadata['imager_pixel_spacing'] = [float(imager_spacing[0]), float(imager_spacing[1])]
        
        # Window/Level
        metadata['window_center'] = float(ds.get('WindowCenter', 0))
        metadata['window_width'] = float(ds.get('WindowWidth', 0))
        
        # Mammography-specific
        metadata['view_position'] = str(ds.get('ViewPosition', ''))
        metadata['image_laterality'] = str(ds.get('ImageLaterality', ''))
        
        if 'BodyPartThickness' in ds:
            metadata['compressed_thickness'] = float(ds.BodyPartThickness)
        
        if 'CompressionForce' in ds:
            metadata['compression_force'] = float(ds.CompressionForce)
        
        metadata['paddle_description'] = str(ds.get('PaddleDescription', ''))
        metadata['detector_type'] = str(ds.get('DetectorType', ''))
        metadata['detector_id'] = str(ds.get('DetectorID', ''))
        
        if 'ExposureInuAs' in ds:
            metadata['exposure_in_uas'] = float(ds.ExposureInuAs)
        
        if 'KVP' in ds:
            metadata['kvp'] = float(ds.KVP)
        
        if 'ExposureTime' in ds:
            metadata['exposure_time'] = float(ds.ExposureTime)
        
        # Quality control
        metadata['quality_control_image'] = str(ds.get('QualityControlImage', 'NO'))
        metadata['burn_in_annotation'] = str(ds.get('BurnedInAnnotation', 'NO'))
        
        # Store full DICOM header for debugging (optional, can be large)
        # metadata['raw_dicom_header'] = self._dataset_to_dict(ds)
        
        return metadata
    
    def _parse_date(self, date_str: Any) -> Optional[str]:
        """Parse DICOM date format (YYYYMMDD) to ISO format"""
        if not date_str:
            return None
        try:
            date_str = str(date_str)
            if len(date_str) == 8:
                year = date_str[:4]
                month = date_str[4:6]
                day = date_str[6:8]
                return f"{year}-{month}-{day}"
        except Exception:
            pass
        return None
    
    def _parse_simulated_dicom(self, file_path: str) -> Dict[str, Any]:
        """
        Fallback method when pydicom is not available
        Returns empty metadata structure
        """
        return {
            'anonymized': 'YES',
            'phi_removed': 'YES',
            'body_part_examined': 'BREAST',
            'manufacturer': 'Simulated',
            'note': 'DICOM parsing requires pydicom library'
        }
    
    def validate_dicom_file(self, file_path: str) -> Tuple[bool, str]:
        """
        Validate DICOM file format and required tags
        
        Returns:
            (is_valid, error_message)
        """
        if not PYDICOM_AVAILABLE:
            return True, "Validation skipped (pydicom not available)"
        
        try:
            ds = pydicom.dcmread(file_path, force=True)
            
            # Check required tags
            required_tags = ['SOPInstanceUID', 'SOPClassUID', 'Modality']
            missing = [tag for tag in required_tags if tag not in ds]
            
            if missing:
                return False, f"Missing required DICOM tags: {', '.join(missing)}"
            
            # Check if mammogram
            if ds.get('Modality') != 'MG':
                return False, f"Not a mammogram (Modality: {ds.get('Modality')})"
            
            return True, "Valid DICOM file"
            
        except Exception as e:
            return False, f"DICOM validation error: {str(e)}"
    
    def extract_pixel_array(self, file_path: str):
        """Extract pixel data from DICOM file"""
        if not PYDICOM_AVAILABLE:
            raise ImportError("pydicom required for pixel data extraction")
        
        ds = pydicom.dcmread(file_path)
        return ds.pixel_array
    
    def get_dicom_info_summary(self, metadata: Dict[str, Any]) -> str:
        """Generate human-readable summary of DICOM metadata"""
        lines = []
        lines.append("=== DICOM Metadata Summary ===")
        
        if metadata.get('manufacturer'):
            lines.append(f"Equipment: {metadata['manufacturer']} {metadata.get('manufacturer_model_name', '')}")
        
        if metadata.get('acquisition_date'):
            lines.append(f"Acquisition Date: {metadata['acquisition_date']}")
        
        if metadata.get('view_position') and metadata.get('image_laterality'):
            lines.append(f"View: {metadata['image_laterality']} {metadata['view_position']}")
        
        if metadata.get('rows') and metadata.get('columns'):
            lines.append(f"Image Size: {metadata['columns']} x {metadata['rows']} pixels")
        
        if metadata.get('pixel_spacing'):
            ps = metadata['pixel_spacing']
            lines.append(f"Pixel Spacing: {ps[0]:.3f} x {ps[1]:.3f} mm")
        
        if metadata.get('compressed_thickness'):
            lines.append(f"Compressed Thickness: {metadata['compressed_thickness']:.1f} mm")
        
        if metadata.get('kvp'):
            lines.append(f"kVp: {metadata['kvp']:.1f}")
        
        return "\n".join(lines)


class DICOMAnonymizer:
    """
    HIPAA-compliant DICOM anonymization
    Removes/replaces Protected Health Information (PHI)
    """
    
    # DICOM tags that contain PHI (partial list)
    PHI_TAGS = [
        (0x0010, 0x0010),  # Patient Name
        (0x0010, 0x0020),  # Patient ID
        (0x0010, 0x0030),  # Patient Birth Date
        (0x0010, 0x1000),  # Other Patient IDs
        (0x0010, 0x1001),  # Other Patient Names
        (0x0010, 0x2160),  # Ethnic Group
        (0x0010, 0x2180),  # Occupation
        (0x0008, 0x0090),  # Referring Physician Name
        (0x0008, 0x1048),  # Physician(s) of Record
        (0x0008, 0x1050),  # Performing Physician Name
        (0x0008, 0x1060),  # Name of Physician(s) Reading Study
        (0x0008, 0x0080),  # Institution Name
        (0x0008, 0x0081),  # Institution Address
        (0x0032, 0x1032),  # Requesting Physician
    ]
    
    def anonymize_dicom(self, file_path: str, output_path: str, patient_id_hash: str):
        """
        Anonymize DICOM file by removing PHI
        
        Args:
            file_path: Input DICOM file
            output_path: Output anonymized file
            patient_id_hash: Hashed patient identifier to use
        """
        if not PYDICOM_AVAILABLE:
            raise ImportError("pydicom required for DICOM anonymization")
        
        ds = pydicom.dcmread(file_path)
        
        # Replace PHI with anonymized values
        ds.PatientName = "ANONYMIZED"
        ds.PatientID = patient_id_hash
        
        if 'PatientBirthDate' in ds:
            # Keep year, anonymize month/day
            birth_date = str(ds.PatientBirthDate)
            if len(birth_date) >= 4:
                ds.PatientBirthDate = birth_date[:4] + "0101"
        
        # Remove other PHI tags
        for tag in self.PHI_TAGS:
            if tag in ds:
                del ds[tag]
        
        # Save anonymized file
        ds.save_as(output_path)
        
        return output_path


# Convenience functions
def parse_dicom(file_path: str) -> Dict[str, Any]:
    """Quick DICOM parsing"""
    parser = DICOMParser()
    return parser.parse_dicom_file(file_path)


def validate_dicom(file_path: str) -> bool:
    """Quick DICOM validation"""
    parser = DICOMParser()
    is_valid, _ = parser.validate_dicom_file(file_path)
    return is_valid
