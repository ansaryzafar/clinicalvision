"""
File Content Validation
Prevents file type spoofing by verifying magic bytes
"""

import magic
from typing import Optional, Dict
from fastapi import UploadFile
import logging

logger = logging.getLogger(__name__)

# Mapping of file extensions to expected MIME types
ALLOWED_MIME_TYPES: Dict[str, list] = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.dcm': [
        'application/dicom',
        'application/octet-stream',  # Some DICOM files report as binary
    ],
}

# Magic bytes signatures for additional validation
MAGIC_SIGNATURES = {
    '.jpg': [b'\xff\xd8\xff'],  # JPEG signature
    '.jpeg': [b'\xff\xd8\xff'],
    '.png': [b'\x89PNG\r\n\x1a\n'],  # PNG signature
    '.dcm': [b'DICM'],  # DICOM signature (at offset 128)
}


class FileValidationError(Exception):
    """Raised when file validation fails"""
    pass


async def validate_file_content(
    file: UploadFile,
    expected_extension: str,
    max_size: int = 50 * 1024 * 1024  # 50MB default
) -> bool:
    """
    Validate file content matches declared extension
    
    Args:
        file: Uploaded file object
        expected_extension: Expected file extension (e.g., '.jpg')
        max_size: Maximum allowed file size in bytes
        
    Returns:
        True if validation passes
        
    Raises:
        FileValidationError: If validation fails
    """
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Reset file pointer for subsequent reads
        await file.seek(0)
        
        # 1. Size validation
        if file_size > max_size:
            raise FileValidationError(
                f"File size ({file_size} bytes) exceeds maximum allowed ({max_size} bytes)"
            )
        
        if file_size == 0:
            raise FileValidationError("File is empty")
        
        # 2. MIME type validation using python-magic
        mime_type = magic.from_buffer(content, mime=True)
        
        expected_mimes = ALLOWED_MIME_TYPES.get(expected_extension.lower(), [])
        if not expected_mimes:
            raise FileValidationError(f"Extension {expected_extension} is not allowed")
        
        if mime_type not in expected_mimes:
            logger.warning(
                f"MIME type mismatch: expected {expected_mimes}, got {mime_type} "
                f"for extension {expected_extension}"
            )
            raise FileValidationError(
                f"File content ({mime_type}) does not match extension {expected_extension}"
            )
        
        # 3. Magic bytes validation
        if expected_extension.lower() in MAGIC_SIGNATURES:
            signatures = MAGIC_SIGNATURES[expected_extension.lower()]
            valid_signature = False
            
            for signature in signatures:
                if expected_extension.lower() == '.dcm':
                    # DICOM signature is at offset 128
                    if len(content) > 132 and content[128:132] == signature:
                        valid_signature = True
                        break
                else:
                    # Most formats have signature at start
                    if content.startswith(signature):
                        valid_signature = True
                        break
            
            if not valid_signature:
                logger.warning(
                    f"Magic bytes validation failed for {expected_extension}"
                )
                raise FileValidationError(
                    f"File does not have valid {expected_extension} signature"
                )
        
        logger.info(
            f"File validation passed: {file.filename}, "
            f"size={file_size}, mime={mime_type}, ext={expected_extension}"
        )
        return True
        
    except FileValidationError:
        raise
    except Exception as e:
        logger.error(f"File validation error: {str(e)}")
        raise FileValidationError(f"File validation failed: {str(e)}")


def get_safe_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal attacks
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    import os
    import re
    
    # Remove directory paths
    filename = os.path.basename(filename)
    
    # Remove potentially dangerous characters
    filename = re.sub(r'[^\w\s\-\.]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    
    return filename


async def validate_image_dimensions(
    file: UploadFile,
    min_width: int = 50,
    min_height: int = 50,
    max_width: int = 10000,
    max_height: int = 10000
) -> tuple:
    """
    Validate image dimensions to prevent image bombs and invalid images
    
    Args:
        file: Uploaded image file
        min_width: Minimum allowed width
        min_height: Minimum allowed height
        max_width: Maximum allowed width
        max_height: Maximum allowed height
        
    Returns:
        Tuple of (width, height)
        
    Raises:
        FileValidationError: If dimensions are invalid
    """
    try:
        from PIL import Image
        import io
        
        content = await file.read()
        await file.seek(0)
        
        image = Image.open(io.BytesIO(content))
        width, height = image.size
        
        if width < min_width or height < min_height:
            raise FileValidationError(
                f"Image too small: {width}x{height}. "
                f"Minimum: {min_width}x{min_height}"
            )
        
        if width > max_width or height > max_height:
            raise FileValidationError(
                f"Image too large: {width}x{height}. "
                f"Maximum: {max_width}x{max_height}"
            )
        
        logger.info(f"Image dimensions validated: {width}x{height}")
        return (width, height)
        
    except FileValidationError:
        raise
    except Exception as e:
        logger.error(f"Image dimension validation error: {str(e)}")
        raise FileValidationError(f"Invalid image file: {str(e)}")
