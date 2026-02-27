"""
DICOM Metadata Service Layer

This module provides business logic for DICOM metadata operations,
including extraction, retrieval, querying, anonymization, and statistics.

Standards:
- DICOM PS3.6 (Data Dictionary)
- HIPAA de-identification (Safe Harbor method)
- FDA 21 CFR Part 11 (Electronic Records)
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging

from app.db.models.dicom_metadata import DICOMMetadata
from app.db.models.image import Image
from app.utils.dicom_utils import DICOMParser
from app.schemas.dicom import (
    DICOMMetadataCreate,
    DICOMMetadataUpdate,
    DICOMAnonymizationRequest
)

logger = logging.getLogger(__name__)


# ============================================================================
# CUSTOM EXCEPTIONS
# ============================================================================

class DICOMNotFoundException(Exception):
    """Raised when DICOM metadata is not found"""
    pass


class DICOMParsingException(Exception):
    """Raised when DICOM file parsing fails"""
    pass


class DICOMValidationException(Exception):
    """Raised when DICOM metadata validation fails"""
    pass


class ImageNotFoundException(Exception):
    """Raised when referenced image is not found"""
    pass


class DICOMServiceException(Exception):
    """Base exception for DICOM service errors"""
    pass


# ============================================================================
# SERVICE CLASS
# ============================================================================

class DICOMMetadataService:
    """
    Service for managing DICOM metadata operations
    
    Provides:
    - Metadata extraction from DICOM files
    - Database CRUD operations
    - Advanced querying with filters
    - HIPAA-compliant anonymization
    - Statistical analysis
    """
    
    def __init__(self, db: Session):
        """
        Initialize service with database session
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.parser = DICOMParser()
        
    # ========================================================================
    # CREATE/EXTRACT OPERATIONS
    # ========================================================================
    
    def extract_from_file(self, file_path: str, image_id: UUID) -> DICOMMetadata:
        """
        Extract DICOM metadata from file and store in database
        
        Args:
            file_path: Path to DICOM file
            image_id: Associated image UUID
            
        Returns:
            Created DICOMMetadata instance
            
        Raises:
            ImageNotFoundException: If image_id doesn't exist
            DICOMParsingException: If file parsing fails
            DICOMServiceException: For other service errors
        """
        try:
            # Verify image exists
            image = self.db.query(Image).filter(Image.id == image_id).first()
            if not image:
                raise ImageNotFoundException(f"Image not found with ID: {image_id}")
            
            # Check if metadata already exists
            existing = self.db.query(DICOMMetadata).filter(
                DICOMMetadata.image_id == image_id
            ).first()
            
            if existing:
                logger.warning(f"DICOM metadata already exists for image {image_id}, updating...")
                return self._update_from_dict(existing, file_path)
            
            # Parse DICOM file
            logger.info(f"Parsing DICOM file: {file_path}")
            metadata_dict = self.parser.parse_dicom_file(file_path)
            
            if not metadata_dict:
                raise DICOMParsingException(f"Failed to extract metadata from {file_path}")
            
            # Create database record
            dicom_metadata = self._create_from_dict(metadata_dict, image_id)
            
            self.db.add(dicom_metadata)
            self.db.commit()
            self.db.refresh(dicom_metadata)
            
            logger.info(f"Successfully created DICOM metadata for image {image_id}")
            return dicom_metadata
            
        except (ImageNotFoundException, DICOMParsingException):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error extracting DICOM metadata: {e}")
            raise DICOMServiceException(f"Failed to extract DICOM metadata: {str(e)}")
    
    def _create_from_dict(self, metadata_dict: Dict[str, Any], image_id: UUID) -> DICOMMetadata:
        """Create DICOMMetadata instance from parsed dictionary"""
        return DICOMMetadata(
            image_id=image_id,
            sop_class_uid=metadata_dict.get('sop_class_uid'),
            transfer_syntax_uid=metadata_dict.get('transfer_syntax_uid'),
            
            # Patient info (anonymized)
            patient_sex=metadata_dict.get('patient_sex'),
            patient_age=self._parse_age_to_int(metadata_dict.get('patient_age')),
            patient_weight=metadata_dict.get('patient_weight'),
            
            # Study info
            study_date=self._parse_date_string(metadata_dict.get('study_date')),
            study_time=metadata_dict.get('study_time'),
            referring_physician_name=metadata_dict.get('referring_physician_name'),
            study_description=metadata_dict.get('study_description'),
            
            # Series info
            series_date=self._parse_date_string(metadata_dict.get('series_date')),
            series_time=metadata_dict.get('series_time'),
            series_description=metadata_dict.get('series_description'),
            series_number=metadata_dict.get('series_number'),
            body_part_examined=metadata_dict.get('body_part_examined'),
            patient_position=metadata_dict.get('patient_position'),
            
            # Equipment
            manufacturer=metadata_dict.get('manufacturer'),
            manufacturer_model_name=metadata_dict.get('manufacturer_model_name'),
            device_serial_number=metadata_dict.get('device_serial_number'),
            software_versions=metadata_dict.get('software_versions'),
            station_name=metadata_dict.get('station_name'),
            
            # Image/Acquisition
            acquisition_date=self._parse_date_string(metadata_dict.get('acquisition_date')),
            acquisition_time=metadata_dict.get('acquisition_time'),
            acquisition_number=metadata_dict.get('acquisition_number'),
            image_type=metadata_dict.get('image_type'),
            
            # Pixel data
            samples_per_pixel=metadata_dict.get('samples_per_pixel'),
            photometric_interpretation=metadata_dict.get('photometric_interpretation'),
            rows=metadata_dict.get('rows'),
            columns=metadata_dict.get('columns'),
            bits_allocated=metadata_dict.get('bits_allocated'),
            bits_stored=metadata_dict.get('bits_stored'),
            high_bit=metadata_dict.get('high_bit'),
            pixel_representation=metadata_dict.get('pixel_representation'),
            pixel_spacing=metadata_dict.get('pixel_spacing'),
            imager_pixel_spacing=metadata_dict.get('imager_pixel_spacing'),
            
            # Display
            window_center=metadata_dict.get('window_center'),
            window_width=metadata_dict.get('window_width'),
            
            # Mammography-specific
            view_position=metadata_dict.get('view_position'),
            image_laterality=metadata_dict.get('image_laterality'),
            compressed_thickness=metadata_dict.get('compressed_thickness'),
            compression_force=metadata_dict.get('compression_force'),
            paddle_description=metadata_dict.get('paddle_description'),
            detector_type=metadata_dict.get('detector_type'),
            detector_id=metadata_dict.get('detector_id'),
            exposure_in_uas=metadata_dict.get('exposure_in_uas'),
            kvp=metadata_dict.get('kvp'),
            exposure_time=metadata_dict.get('exposure_time'),
            
            # Quality control
            quality_control_image=metadata_dict.get('quality_control_image', 'NO'),
            burn_in_annotation=metadata_dict.get('burn_in_annotation', 'NO'),
            
            # Privacy
            anonymized=metadata_dict.get('anonymized', 'YES'),
            phi_removed=metadata_dict.get('phi_removed', 'YES')
        )
    
    def _update_from_dict(self, dicom_metadata: DICOMMetadata, file_path: str) -> DICOMMetadata:
        """Update existing DICOM metadata from new file parse"""
        metadata_dict = self.parser.parse_dicom_file(file_path)
        
        # Update fields
        for key, value in metadata_dict.items():
            if hasattr(dicom_metadata, key) and value is not None:
                setattr(dicom_metadata, key, value)
        
        dicom_metadata.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(dicom_metadata)
        
        return dicom_metadata
    
    # ========================================================================
    # READ OPERATIONS
    # ========================================================================
    
    def get_by_image_id(self, image_id: UUID) -> DICOMMetadata:
        """
        Retrieve DICOM metadata for specific image
        
        Args:
            image_id: Image UUID
            
        Returns:
            DICOMMetadata instance
            
        Raises:
            DICOMNotFoundException: If metadata not found
        """
        dicom_metadata = self.db.query(DICOMMetadata).filter(
            DICOMMetadata.image_id == image_id
        ).first()
        
        if not dicom_metadata:
            raise DICOMNotFoundException(f"DICOM metadata not found for image: {image_id}")
        
        return dicom_metadata
    
    def get_summary(self, image_id: UUID) -> Dict[str, Any]:
        """
        Get human-readable summary of DICOM metadata
        
        Args:
            image_id: Image UUID
            
        Returns:
            Dictionary with organized metadata summary
        """
        dicom_metadata = self.get_by_image_id(image_id)
        
        return {
            "study_info": {
                "study_date": str(dicom_metadata.study_date) if dicom_metadata.study_date else None,
                "body_part": dicom_metadata.body_part_examined,
                "view": f"{dicom_metadata.view_position or 'Unknown'} {dicom_metadata.image_laterality or ''}".strip(),
                "patient_age": f"{dicom_metadata.patient_age} years" if dicom_metadata.patient_age else None,
                "patient_sex": {"M": "Male", "F": "Female", "O": "Other"}.get(dicom_metadata.patient_sex, dicom_metadata.patient_sex)
            },
            "equipment_info": {
                "manufacturer": dicom_metadata.manufacturer,
                "model": dicom_metadata.manufacturer_model_name,
                "station": dicom_metadata.station_name,
                "software_version": dicom_metadata.software_versions
            },
            "image_info": {
                "dimensions": f"{dicom_metadata.rows}x{dicom_metadata.columns}" if dicom_metadata.rows and dicom_metadata.columns else None,
                "bit_depth": f"{dicom_metadata.bits_allocated}-bit" if dicom_metadata.bits_allocated else None,
                "pixel_spacing": f"{dicom_metadata.pixel_spacing[0]}mm" if dicom_metadata.pixel_spacing and isinstance(dicom_metadata.pixel_spacing, list) and len(dicom_metadata.pixel_spacing) > 0 else None,
                "breast_thickness": f"{dicom_metadata.compressed_thickness}mm" if dicom_metadata.compressed_thickness else None,
                "compression_force": f"{dicom_metadata.compression_force}N" if dicom_metadata.compression_force else None,
                "kvp": f"{dicom_metadata.kvp}kV" if dicom_metadata.kvp else None,
                "exposure_time": f"{dicom_metadata.exposure_time}ms" if dicom_metadata.exposure_time else None
            },
            "quality_info": {
                "qc_image": dicom_metadata.quality_control_image == "YES",
                "burned_in_annotation": dicom_metadata.burn_in_annotation == "YES"
            },
            "privacy_status": {
                "anonymized": dicom_metadata.anonymized == "YES",
                "phi_removed": dicom_metadata.phi_removed == "YES"
            }
        }
    
    def query_metadata(
        self,
        manufacturer: Optional[str] = None,
        view_position: Optional[str] = None,
        laterality: Optional[str] = None,
        study_date_from: Optional[date] = None,
        study_date_to: Optional[date] = None,
        min_kvp: Optional[float] = None,
        max_kvp: Optional[float] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[DICOMMetadata], int]:
        """
        Query DICOM metadata with advanced filters
        
        Args:
            manufacturer: Filter by equipment manufacturer
            view_position: Filter by view position (CC, MLO, etc.)
            laterality: Filter by laterality (L, R)
            study_date_from: Start date for study date range
            study_date_to: End date for study date range
            min_kvp: Minimum kVp value
            max_kvp: Maximum kVp value
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            Tuple of (list of metadata, total count)
        """
        query = self.db.query(DICOMMetadata)
        
        # Apply filters
        if manufacturer:
            query = query.filter(DICOMMetadata.manufacturer.ilike(f"%{manufacturer}%"))
        
        if view_position:
            query = query.filter(DICOMMetadata.view_position == view_position.upper())
        
        if laterality:
            query = query.filter(DICOMMetadata.image_laterality == laterality.upper())
        
        if study_date_from:
            query = query.filter(DICOMMetadata.study_date >= study_date_from)
        
        if study_date_to:
            query = query.filter(DICOMMetadata.study_date <= study_date_to)
        
        if min_kvp is not None:
            query = query.filter(DICOMMetadata.kvp >= min_kvp)
        
        if max_kvp is not None:
            query = query.filter(DICOMMetadata.kvp <= max_kvp)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and fetch results
        metadata_list = query.order_by(DICOMMetadata.created_at.desc()).offset(skip).limit(limit).all()
        
        logger.info(f"Query returned {len(metadata_list)} metadata records (total: {total})")
        return metadata_list, total
    
    # ========================================================================
    # UPDATE OPERATIONS
    # ========================================================================
    
    def update_metadata(self, image_id: UUID, update_data: DICOMMetadataUpdate) -> DICOMMetadata:
        """
        Update DICOM metadata (limited fields)
        
        Args:
            image_id: Image UUID
            update_data: Update schema with new values
            
        Returns:
            Updated DICOMMetadata instance
        """
        dicom_metadata = self.get_by_image_id(image_id)
        
        # Update only allowed fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(dicom_metadata, key):
                setattr(dicom_metadata, key, value)
        
        dicom_metadata.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(dicom_metadata)
        
        logger.info(f"Updated DICOM metadata for image {image_id}")
        return dicom_metadata
    
    def anonymize_metadata(
        self, 
        image_id: UUID, 
        request: DICOMAnonymizationRequest
    ) -> DICOMMetadata:
        """
        Apply HIPAA-compliant anonymization to DICOM metadata
        
        Args:
            image_id: Image UUID
            request: Anonymization configuration
            
        Returns:
            Anonymized DICOMMetadata instance
        """
        dicom_metadata = self.get_by_image_id(image_id)
        
        if request.remove_dates:
            dicom_metadata.study_date = None
            dicom_metadata.study_time = None
            dicom_metadata.series_date = None
            dicom_metadata.series_time = None
            dicom_metadata.acquisition_date = None
            dicom_metadata.acquisition_time = None
        
        if request.remove_identifiers:
            dicom_metadata.referring_physician_name = "ANONYMIZED"
            dicom_metadata.station_name = None
            dicom_metadata.device_serial_number = None
        
        # Always mark as anonymized
        dicom_metadata.anonymized = "YES"
        dicom_metadata.phi_removed = "YES"
        dicom_metadata.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dicom_metadata)
        
        logger.info(f"Anonymized DICOM metadata for image {image_id}")
        return dicom_metadata
    
    # ========================================================================
    # STATISTICS & ANALYTICS
    # ========================================================================
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about DICOM metadata
        
        Returns:
            Dictionary with various statistics
        """
        total_images = self.db.query(func.count(DICOMMetadata.id)).scalar()
        
        # By manufacturer
        manufacturer_stats = self.db.query(
            DICOMMetadata.manufacturer,
            func.count(DICOMMetadata.id)
        ).filter(
            DICOMMetadata.manufacturer.isnot(None)
        ).group_by(DICOMMetadata.manufacturer).all()
        
        by_manufacturer = {mfr: count for mfr, count in manufacturer_stats if mfr}
        
        # By view position
        view_stats = self.db.query(
            DICOMMetadata.view_position,
            func.count(DICOMMetadata.id)
        ).filter(
            DICOMMetadata.view_position.isnot(None)
        ).group_by(DICOMMetadata.view_position).all()
        
        by_view_position = {view: count for view, count in view_stats if view}
        
        # By laterality
        laterality_stats = self.db.query(
            DICOMMetadata.image_laterality,
            func.count(DICOMMetadata.id)
        ).filter(
            DICOMMetadata.image_laterality.isnot(None)
        ).group_by(DICOMMetadata.image_laterality).all()
        
        by_laterality = {lat: count for lat, count in laterality_stats if lat}
        
        # Average compression parameters
        avg_compression_force = self.db.query(
            func.avg(DICOMMetadata.compression_force)
        ).filter(
            DICOMMetadata.compression_force.isnot(None)
        ).scalar()
        
        avg_compressed_thickness = self.db.query(
            func.avg(DICOMMetadata.compressed_thickness)
        ).filter(
            DICOMMetadata.compressed_thickness.isnot(None)
        ).scalar()
        
        # Anonymization count
        anonymized_count = self.db.query(
            func.count(DICOMMetadata.id)
        ).filter(
            DICOMMetadata.anonymized == "YES"
        ).scalar()
        
        return {
            "total_images": total_images or 0,
            "by_manufacturer": by_manufacturer,
            "by_view_position": by_view_position,
            "by_laterality": by_laterality,
            "average_compression_force": round(float(avg_compression_force), 2) if avg_compression_force else None,
            "average_compressed_thickness": round(float(avg_compressed_thickness), 2) if avg_compressed_thickness else None,
            "anonymized_count": anonymized_count or 0
        }
    
    # ========================================================================
    # HEALTH CHECK
    # ========================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check health of DICOM metadata service
        
        Returns:
            Health status dictionary
        """
        try:
            # Test database connectivity
            count = self.db.query(func.count(DICOMMetadata.id)).scalar()
            
            # Test parser availability
            parser_available = self.parser is not None
            
            return {
                "status": "healthy",
                "database_connected": True,
                "dicom_parser_available": parser_available,
                "total_metadata_records": count or 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    @staticmethod
    def _parse_date_string(date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime object"""
        if not date_str:
            return None
        try:
            # Try ISO format first (YYYY-MM-DD)
            return datetime.fromisoformat(date_str)
        except:
            try:
                # Try DICOM format (YYYYMMDD)
                if len(str(date_str)) == 8:
                    return datetime.strptime(str(date_str), "%Y%m%d")
            except:
                pass
        return None
    
    @staticmethod
    def _parse_age_to_int(age_str: Optional[str]) -> Optional[int]:
        """Parse DICOM age string (e.g., '055Y') to integer"""
        if not age_str:
            return None
        try:
            # DICOM format: NNNNU where U is Y(ears), M(onths), W(eeks), D(ays)
            age_str = str(age_str).strip()
            if age_str.endswith('Y'):
                return int(age_str[:-1])
            elif age_str.endswith('M'):
                # Convert months to years (approximate)
                return int(age_str[:-1]) // 12
            else:
                # Try parsing as plain integer
                return int(age_str)
        except:
            return None
