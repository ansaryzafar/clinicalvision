"""
Storage Service for Medical Image Management
Handles file storage, retrieval, validation, and lifecycle management
Supports local filesystem with future S3 compatibility
"""

import os
import shutil
import hashlib
import mimetypes
from pathlib import Path
from typing import Optional, BinaryIO, Dict, Any, List
from datetime import datetime, timedelta
import uuid
import logging

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.image import Image
from app.schemas.image import ImageCreate, ImageUpdate


logger = logging.getLogger(__name__)


class StorageService:
    """
    Production-grade storage service for medical images
    Handles DICOM and standard image formats with security and validation
    """
    
    def __init__(self, base_path: str = None):
        """
        Initialize storage service
        
        Args:
            base_path: Base directory for file storage (defaults to settings.UPLOAD_DIR)
        """
        self.base_path = Path(base_path or settings.UPLOAD_DIR)
        self._ensure_storage_structure()
        
    def _ensure_storage_structure(self) -> None:
        """Create necessary storage directories with proper structure"""
        directories = [
            self.base_path,
            self.base_path / "images",
            self.base_path / "dicom",
            self.base_path / "temp",
            self.base_path / "archive",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Ensured directory exists: {directory}")
    
    def _generate_storage_path(
        self, 
        patient_id: str, 
        study_instance_uid: str,
        filename: str
    ) -> Path:
        """
        Generate organized storage path using patient and study identifiers
        Structure: images/{patient_id}/{study_uid}/{filename}
        
        Args:
            patient_id: Patient identifier
            study_instance_uid: DICOM study instance UID
            filename: Original or sanitized filename
            
        Returns:
            Path object for file storage location
        """
        # Sanitize identifiers for filesystem
        safe_patient_id = self._sanitize_path_component(patient_id)
        safe_study_uid = self._sanitize_path_component(study_instance_uid)
        
        # Determine subdirectory based on file type
        if filename.lower().endswith('.dcm'):
            base_dir = self.base_path / "dicom"
        else:
            base_dir = self.base_path / "images"
        
        storage_path = base_dir / safe_patient_id / safe_study_uid
        storage_path.mkdir(parents=True, exist_ok=True)
        
        return storage_path / filename
    
    def _sanitize_path_component(self, component: str) -> str:
        """
        Sanitize path component to prevent directory traversal attacks
        
        Args:
            component: Path component to sanitize
            
        Returns:
            Safe path component
        """
        # Remove any path separators and special characters
        safe_component = component.replace('/', '_').replace('\\', '_')
        safe_component = safe_component.replace('..', '_')
        
        # Limit length to prevent filesystem issues
        return safe_component[:255]
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename while preserving extension
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Split name and extension
        name, ext = os.path.splitext(filename)
        
        # Sanitize name component
        safe_name = "".join(c for c in name if c.isalnum() or c in ('_', '-'))
        
        # Ensure extension is safe
        safe_ext = "".join(c for c in ext if c.isalnum() or c == '.')
        
        # Generate unique suffix if name is empty
        if not safe_name:
            safe_name = f"file_{uuid.uuid4().hex[:8]}"
        
        return f"{safe_name}{safe_ext}"
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """
        Calculate SHA-256 hash of file for integrity verification
        
        Args:
            file_path: Path to file
            
        Returns:
            Hexadecimal hash string
        """
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files efficiently
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    async def store_file(
        self,
        file: UploadFile,
        patient_id: str,
        study_instance_uid: str,
        db: Session,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Image:
        """
        Store uploaded file with metadata and validation
        
        Args:
            file: Uploaded file object
            patient_id: Patient identifier
            study_instance_uid: Study instance UID
            db: Database session
            metadata: Additional metadata dictionary
            
        Returns:
            Image database record
            
        Raises:
            HTTPException: If validation fails or storage error occurs
        """
        try:
            # Sanitize filename
            safe_filename = self._sanitize_filename(file.filename)
            
            # Generate storage path
            storage_path = self._generate_storage_path(
                patient_id, 
                study_instance_uid, 
                safe_filename
            )
            
            # Write file to temporary location first (atomic operation)
            temp_path = self.base_path / "temp" / f"{uuid.uuid4().hex}_{safe_filename}"
            
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Calculate file hash for integrity
            file_hash = self._calculate_file_hash(temp_path)
            
            # Get file size
            file_size = temp_path.stat().st_size
            
            # Validate file size
            if file_size > settings.MAX_UPLOAD_SIZE:
                temp_path.unlink()  # Clean up temp file
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
                )
            
            # Move from temp to final location (atomic on same filesystem)
            shutil.move(str(temp_path), str(storage_path))
            
            # Determine MIME type
            mime_type, _ = mimetypes.guess_type(safe_filename)
            if not mime_type:
                mime_type = "application/octet-stream"
            
            # Create database record
            image_data = ImageCreate(
                patient_id=patient_id,
                study_instance_uid=study_instance_uid,
                file_path=str(storage_path.relative_to(self.base_path)),
                file_name=safe_filename,
                file_size=file_size,
                file_hash=file_hash,
                mime_type=mime_type,
                storage_backend="local",
                image_metadata=metadata or {}
            )
            
            # Create Image instance with mapped field names
            db_image = Image(
                patient_id=image_data.patient_id,
                study_instance_uid=image_data.study_instance_uid,
                file_path=image_data.file_path,
                file_name=image_data.file_name,
                file_size_bytes=image_data.file_size,  # Map file_size to file_size_bytes
                checksum=image_data.file_hash,  # Map file_hash to checksum
                mime_type=image_data.mime_type,
                storage_backend=image_data.storage_backend,
                image_metadata=image_data.image_metadata,
            )
            db.add(db_image)
            db.commit()
            db.refresh(db_image)
            
            logger.info(f"Successfully stored file: {safe_filename} (ID: {db_image.id})")
            
            return db_image
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error storing file: {str(e)}")
            # Clean up temp file if it exists
            if temp_path.exists():
                temp_path.unlink()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store file: {str(e)}"
            )
    
    def get_file_path(self, image: Image) -> Path:
        """
        Get absolute file path for an image record
        
        Args:
            image: Image database record
            
        Returns:
            Absolute Path to file
            
        Raises:
            HTTPException: If file doesn't exist
        """
        file_path = self.base_path / image.file_path
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {image.file_name}"
            )
        
        return file_path
    
    def verify_file_integrity(self, image: Image) -> bool:
        """
        Verify file integrity using stored hash
        
        Args:
            image: Image database record
            
        Returns:
            True if file integrity is valid, False otherwise
        """
        try:
            file_path = self.get_file_path(image)
            current_hash = self._calculate_file_hash(file_path)
            return current_hash == image.file_hash
        except Exception as e:
            logger.error(f"Error verifying file integrity: {str(e)}")
            return False
    
    async def delete_file(self, image: Image, db: Session, soft_delete: bool = True) -> bool:
        """
        Delete file from storage
        
        Args:
            image: Image database record
            db: Database session
            soft_delete: If True, mark as deleted in DB but keep file
            
        Returns:
            True if deletion successful
            
        Raises:
            HTTPException: If deletion fails
        """
        try:
            if soft_delete:
                # Mark as deleted in database
                image.is_deleted = True
                image.deleted_at = datetime.utcnow()
                db.commit()
                logger.info(f"Soft deleted image: {image.id}")
            else:
                # Delete physical file
                file_path = self.get_file_path(image)
                file_path.unlink(missing_ok=True)
                
                # Remove from database
                db.delete(image)
                db.commit()
                logger.info(f"Hard deleted image: {image.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file: {str(e)}"
            )
    
    async def archive_file(self, image: Image, db: Session) -> bool:
        """
        Archive file by moving to archive directory
        
        Args:
            image: Image database record
            db: Database session
            
        Returns:
            True if archival successful
        """
        try:
            # Get current file path
            current_path = self.get_file_path(image)
            
            # Generate archive path
            archive_path = self.base_path / "archive" / image.file_path
            archive_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Move file to archive
            shutil.move(str(current_path), str(archive_path))
            
            # Update database record
            image.file_path = str(archive_path.relative_to(self.base_path))
            image.is_archived = True
            image.archived_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Archived image: {image.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error archiving file: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to archive file: {str(e)}"
            )
    
    def generate_download_url(self, image: Image, expiry_hours: int = 24) -> Dict[str, Any]:
        """
        Generate presigned download URL (for local storage, returns path info)
        For S3 backend, this would generate actual presigned URL
        
        Args:
            image: Image database record
            expiry_hours: URL expiry time in hours
            
        Returns:
            Dictionary with download information
        """
        expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
        
        return {
            "image_id": str(image.id),
            "filename": image.file_name,
            "download_token": self._generate_download_token(image.id),
            "expires_at": expiry_time.isoformat(),
            "file_size_bytes": image.file_size_bytes,  # Match DB field name
            "mime_type": image.mime_type
        }
    
    def _generate_download_token(self, image_id: uuid.UUID) -> str:
        """
        Generate secure download token for temporary file access
        
        Args:
            image_id: Image UUID
            
        Returns:
            Secure token string
        """
        # In production, use JWT or secure token with expiry
        data = f"{image_id}{datetime.utcnow().isoformat()}{settings.SECRET_KEY}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]
    
    def get_storage_stats(self, db: Session) -> Dict[str, Any]:
        """
        Get storage statistics
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with storage metrics
        """
        from sqlalchemy import func
        
        total_images = db.query(Image).count()
        total_size = db.query(func.sum(Image.file_size_bytes)).scalar() or 0
        
        archived_count = db.query(Image).filter(Image.is_archived == True).count()
        deleted_count = db.query(Image).filter(Image.is_deleted == True).count()
        
        return {
            "total_images": total_images,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "archived_count": archived_count,
            "deleted_count": deleted_count,
            "active_count": total_images - deleted_count,
            "storage_backend": "local",
            "base_path": str(self.base_path)
        }


# Global storage service instance
storage_service = StorageService()
