"""
File Validation Utilities
Validates medical images including DICOM format, file types, and security checks
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import logging

from fastapi import UploadFile, HTTPException
from app.core.config import settings

# Try to import python-magic (optional dependency)
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    magic = None

logger = logging.getLogger(__name__)


class FileValidator:
    """
    Production-grade file validation for medical images
    Validates file type, size, format, and security constraints
    """
    
    # Allowed MIME types
    ALLOWED_MIME_TYPES = {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "application/dicom": [".dcm"],
        "application/octet-stream": [".dcm"],  # DICOM sometimes detected as binary
    }
    
    # Maximum file sizes by type (bytes)
    MAX_FILE_SIZES = {
        "image/jpeg": 50 * 1024 * 1024,  # 50MB for JPEG
        "image/png": 50 * 1024 * 1024,   # 50MB for PNG
        "application/dicom": 500 * 1024 * 1024,  # 500MB for DICOM
        "application/octet-stream": 500 * 1024 * 1024,  # 500MB for DICOM
    }
    
    def __init__(self):
        """Initialize file validator"""
        self.magic_available = False
        self.mime = None
        
        if MAGIC_AVAILABLE:
            try:
                # Try to initialize python-magic
                self.mime = magic.Magic(mime=True)
                self.magic_available = True
                logger.info("python-magic initialized successfully")
            except Exception as e:
                logger.warning(f"python-magic not available, using fallback validation: {e}")
        else:
            logger.info("python-magic not installed, using fallback validation")
    
    def validate_file_extension(self, filename: str) -> Tuple[bool, str]:
        """
        Validate file extension against allowed list
        
        Args:
            filename: Name of file to validate
            
        Returns:
            Tuple of (is_valid, message)
        """
        file_ext = os.path.splitext(filename)[1].lower()
        
        if not file_ext:
            return False, "File has no extension"
        
        # Check against all allowed extensions
        all_allowed_extensions = [ext for exts in self.ALLOWED_MIME_TYPES.values() for ext in exts]
        
        if file_ext not in all_allowed_extensions:
            return False, f"File extension '{file_ext}' not allowed. Allowed: {', '.join(all_allowed_extensions)}"
        
        return True, "Extension valid"
    
    def detect_mime_type(self, file_path: Path) -> str:
        """
        Detect MIME type of file using magic numbers
        
        Args:
            file_path: Path to file
            
        Returns:
            MIME type string
        """
        if self.magic_available:
            try:
                mime_type = self.mime.from_file(str(file_path))
                return mime_type
            except Exception as e:
                logger.warning(f"Magic detection failed: {e}, using fallback")
        
        # Fallback to extension-based detection
        ext = file_path.suffix.lower()
        mime_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.dcm': 'application/dicom',
        }
        
        return mime_map.get(ext, 'application/octet-stream')
    
    def validate_mime_type(self, file_path: Path, filename: str) -> Tuple[bool, str, str]:
        """
        Validate MIME type matches expected type for file extension
        
        Args:
            file_path: Path to file
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, message, detected_mime_type)
        """
        detected_mime = self.detect_mime_type(file_path)
        file_ext = os.path.splitext(filename)[1].lower()
        
        # Check if detected MIME type is allowed
        if detected_mime not in self.ALLOWED_MIME_TYPES:
            return False, f"MIME type '{detected_mime}' not allowed", detected_mime
        
        # Check if extension matches expected MIME type
        expected_extensions = self.ALLOWED_MIME_TYPES.get(detected_mime, [])
        if file_ext not in expected_extensions:
            # Special case: DICOM can be detected as octet-stream
            if detected_mime == "application/octet-stream" and file_ext == ".dcm":
                return True, "MIME type valid (DICOM)", detected_mime
            
            return False, f"Extension '{file_ext}' doesn't match MIME type '{detected_mime}'", detected_mime
        
        return True, "MIME type valid", detected_mime
    
    def validate_file_size(self, file_size: int, mime_type: str) -> Tuple[bool, str]:
        """
        Validate file size against limits for file type
        
        Args:
            file_size: Size of file in bytes
            mime_type: MIME type of file
            
        Returns:
            Tuple of (is_valid, message)
        """
        max_size = self.MAX_FILE_SIZES.get(mime_type, settings.MAX_UPLOAD_SIZE)
        
        if file_size > max_size:
            max_mb = max_size / (1024 * 1024)
            actual_mb = file_size / (1024 * 1024)
            return False, f"File size {actual_mb:.2f}MB exceeds maximum {max_mb:.2f}MB for {mime_type}"
        
        if file_size == 0:
            return False, "File is empty (0 bytes)"
        
        return True, "File size valid"
    
    def validate_dicom_header(self, file_path: Path) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Validate DICOM file header and extract basic metadata
        
        Args:
            file_path: Path to DICOM file
            
        Returns:
            Tuple of (is_valid, message, metadata_dict)
        """
        try:
            import pydicom
            
            # Read DICOM file
            ds = pydicom.dcmread(str(file_path), stop_before_pixels=True)
            
            # Extract key metadata
            metadata = {
                "PatientID": str(getattr(ds, "PatientID", "")),
                "StudyInstanceUID": str(getattr(ds, "StudyInstanceUID", "")),
                "SeriesInstanceUID": str(getattr(ds, "SeriesInstanceUID", "")),
                "SOPInstanceUID": str(getattr(ds, "SOPInstanceUID", "")),
                "Modality": str(getattr(ds, "Modality", "")),
                "StudyDate": str(getattr(ds, "StudyDate", "")),
                "SeriesDescription": str(getattr(ds, "SeriesDescription", "")),
            }
            
            # Additional mammography-specific fields if available
            if hasattr(ds, "ViewPosition"):
                metadata["ViewPosition"] = str(ds.ViewPosition)
            if hasattr(ds, "ImageLaterality"):
                metadata["ImageLaterality"] = str(ds.ImageLaterality)
            if hasattr(ds, "Laterality"):
                metadata["Laterality"] = str(ds.Laterality)
            
            return True, "Valid DICOM file", metadata
            
        except ImportError:
            logger.warning("pydicom not installed, skipping DICOM validation")
            return True, "DICOM validation skipped (pydicom not available)", None
        except Exception as e:
            return False, f"Invalid DICOM file: {str(e)}", None
    
    def check_security_threats(self, file_path: Path) -> Tuple[bool, str]:
        """
        Check for common security threats in uploaded files
        
        Args:
            file_path: Path to file
            
        Returns:
            Tuple of (is_safe, message)
        """
        # Check file size is reasonable (not a zip bomb attempt)
        file_size = file_path.stat().st_size
        if file_size > 1024 * 1024 * 1024:  # 1GB
            return False, "File too large, potential security threat"
        
        # Check for suspicious file signatures
        with open(file_path, 'rb') as f:
            header = f.read(512)
            
            # Check for executable signatures
            executable_signatures = [
                b'MZ',  # Windows EXE
                b'\x7fELF',  # Linux ELF
                b'#!',  # Script with shebang
            ]
            
            for sig in executable_signatures:
                if header.startswith(sig):
                    return False, "Executable file detected, not allowed"
        
        return True, "No security threats detected"
    
    async def validate_upload_file(
        self, 
        file: UploadFile,
        temp_path: Path
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Comprehensive validation of uploaded file
        
        Args:
            file: Uploaded file object
            temp_path: Path where file was temporarily saved
            
        Returns:
            Tuple of (is_valid, message, validation_result)
        """
        validation_result = {
            "filename": file.filename,
            "original_size": 0,
            "mime_type": None,
            "extension_valid": False,
            "mime_valid": False,
            "size_valid": False,
            "security_valid": False,
            "dicom_valid": None,
            "dicom_metadata": None,
        }
        
        try:
            # 1. Validate file extension
            ext_valid, ext_msg = self.validate_file_extension(file.filename)
            validation_result["extension_valid"] = ext_valid
            if not ext_valid:
                return False, ext_msg, validation_result
            
            # 2. Get file size
            file_size = temp_path.stat().st_size
            validation_result["original_size"] = file_size
            
            # 3. Validate MIME type
            mime_valid, mime_msg, detected_mime = self.validate_mime_type(temp_path, file.filename)
            validation_result["mime_type"] = detected_mime
            validation_result["mime_valid"] = mime_valid
            if not mime_valid:
                return False, mime_msg, validation_result
            
            # 4. Validate file size
            size_valid, size_msg = self.validate_file_size(file_size, detected_mime)
            validation_result["size_valid"] = size_valid
            if not size_valid:
                return False, size_msg, validation_result
            
            # 5. Security checks
            security_valid, security_msg = self.check_security_threats(temp_path)
            validation_result["security_valid"] = security_valid
            if not security_valid:
                return False, security_msg, validation_result
            
            # 6. DICOM-specific validation
            if file.filename.lower().endswith('.dcm'):
                dicom_valid, dicom_msg, dicom_metadata = self.validate_dicom_header(temp_path)
                validation_result["dicom_valid"] = dicom_valid
                validation_result["dicom_metadata"] = dicom_metadata
                
                if not dicom_valid:
                    return False, dicom_msg, validation_result
            
            return True, "File validation passed", validation_result
            
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False, f"Validation failed: {str(e)}", validation_result


# Global validator instance
file_validator = FileValidator()
