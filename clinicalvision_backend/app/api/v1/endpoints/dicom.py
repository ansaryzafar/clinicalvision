"""
DICOM Metadata API Endpoints

This module provides REST API endpoints for DICOM metadata operations,
including extraction, retrieval, querying, anonymization, and statistics.

Standards:
- RESTful API design patterns
- OpenAPI 3.0 documentation
- DICOM PS3.6 compliance
- HIPAA de-identification
"""

from typing import Optional, List
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import (
    get_current_active_user,
    require_radiologist_or_admin,
    RoleChecker
)
from app.services.dicom_service import (
    DICOMMetadataService,
    DICOMNotFoundException,
    DICOMParsingException,
    DICOMValidationException,
    ImageNotFoundException,
    DICOMServiceException
)
from app.schemas.dicom import (
    DICOMMetadataResponse,
    DICOMMetadataListResponse,
    DICOMMetadataSummary,
    DICOMAnonymizationRequest,
    DICOMStatistics,
    ErrorResponse
)

logger = logging.getLogger(__name__)

# Router configuration
router = APIRouter(
    prefix="/api/v1/dicom",
    tags=["DICOM Metadata"]
)


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_dicom_service(db: Session = Depends(get_db)) -> DICOMMetadataService:
    """Dependency injection for DICOM service"""
    return DICOMMetadataService(db)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/upload",
    response_model=DICOMMetadataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload DICOM file and extract metadata",
    description="""
    Upload a DICOM file and automatically extract metadata to database.
    
    **Process:**
    1. Validates DICOM file format
    2. Extracts comprehensive metadata using pydicom
    3. Applies HIPAA-compliant anonymization
    4. Stores metadata in database linked to image
    
    **Standards:**
    - DICOM PS3.6 (Data Dictionary)
    - HIPAA Safe Harbor de-identification
    - IHE Radiology profiles
    """,
    responses={
        201: {"description": "Metadata successfully extracted and stored"},
        400: {"model": ErrorResponse, "description": "Invalid DICOM file or parsing error"},
        404: {"model": ErrorResponse, "description": "Referenced image not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def upload_dicom_file(
    image_id: UUID = Query(..., description="UUID of the associated image record"),
    file: UploadFile = File(..., description="DICOM file (.dcm)"),
    current_user: User = Depends(RoleChecker(["admin", "radiologist", "technician"])),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMMetadataResponse:
    """
    Upload DICOM file and extract metadata
    
    **Authentication Required:** Admin, Radiologist, or Technician role
    **Permissions:** UPLOAD_DICOM
    
    **Required:**
    - image_id: Must reference existing image in database
    - file: Valid DICOM file
    
    **Returns:**
    - Complete DICOM metadata with all extracted tags
    """
    try:
        # Save uploaded file temporarily
        import tempfile
        import shutil
        from pathlib import Path
        
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".dcm") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
        
        try:
            # Extract metadata
            logger.info(f"Extracting DICOM metadata from uploaded file for image {image_id}")
            metadata = service.extract_from_file(temp_path, image_id)
            
            return DICOMMetadataResponse.model_validate(metadata)
            
        finally:
            # Clean up temp file
            Path(temp_path).unlink(missing_ok=True)
            
    except ImageNotFoundException as e:
        logger.error(f"Image not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {str(e)}"
        )
    except DICOMParsingException as e:
        logger.error(f"DICOM parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse DICOM file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error uploading DICOM file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/images/{image_id}",
    response_model=DICOMMetadataResponse,
    summary="Get DICOM metadata for image",
    description="""
    Retrieve complete DICOM metadata for a specific image.
    
    **Returns:**
    - All DICOM tags extracted from the original file
    - Patient demographics (anonymized)
    - Study/Series information
    - Equipment details
    - Acquisition parameters
    - Mammography-specific tags (compression, dose, etc.)
    - Privacy compliance flags
    """,
    responses={
        200: {"description": "Metadata retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Metadata not found for image"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_dicom_metadata(
    image_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMMetadataResponse:
    """
    Get full DICOM metadata for specific image
    
    **Authentication Required:** Any active user
    **Permissions:** READ_DICOM
    
    **Path Parameters:**
    - image_id: UUID of the image
    
    **Returns:**
    - Complete DICOM metadata record
    """
    try:
        logger.info(f"Retrieving DICOM metadata for image {image_id}")
        metadata = service.get_by_image_id(image_id)
        
        return DICOMMetadataResponse.model_validate(metadata)
        
    except DICOMNotFoundException as e:
        logger.error(f"DICOM metadata not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error retrieving DICOM metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/images/{image_id}/summary",
    response_model=DICOMMetadataSummary,
    summary="Get human-readable DICOM summary",
    description="""
    Get organized, human-readable summary of DICOM metadata.
    
    **Organized into sections:**
    - **Study Info**: Date, body part, view, patient demographics
    - **Equipment Info**: Manufacturer, model, station, software
    - **Image Info**: Dimensions, bit depth, pixel spacing, acquisition parameters
    - **Quality Info**: QC flags, annotations
    - **Privacy Status**: Anonymization and PHI removal status
    
    **Use Cases:**
    - Display in user interfaces
    - Quality assurance reports
    - Clinical documentation
    """,
    responses={
        200: {"description": "Summary generated successfully"},
        404: {"model": ErrorResponse, "description": "Metadata not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_dicom_summary(
    image_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMMetadataSummary:
    """
    Get human-readable DICOM metadata summary
    
    **Authentication Required:** Any active user
    **Permissions:** READ_DICOM
    
    **Path Parameters:**
    - image_id: UUID of the image
    
    **Returns:**
    - Organized metadata summary with formatted values
    """
    try:
        logger.info(f"Generating DICOM summary for image {image_id}")
        summary = service.get_summary(image_id)
        
        return DICOMMetadataSummary(image_id=image_id, **summary)
        
    except DICOMNotFoundException as e:
        logger.error(f"DICOM metadata not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error generating DICOM summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/query",
    response_model=DICOMMetadataListResponse,
    summary="Query DICOM metadata with filters",
    description="""
    Advanced query endpoint with multiple filter options.
    
    **Filters Available:**
    - **Manufacturer**: Equipment manufacturer (partial match)
    - **View Position**: CC, MLO, ML, etc.
    - **Laterality**: L (left), R (right)
    - **Date Range**: Study date from/to
    - **kVp Range**: Min/max peak kilovoltage
    
    **Use Cases:**
    - QA analysis by equipment
    - Protocol compliance checking
    - Dose monitoring
    - Research cohort selection
    """,
    responses={
        200: {"description": "Query executed successfully"},
        400: {"model": ErrorResponse, "description": "Invalid query parameters"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def query_dicom_metadata(
    manufacturer: Optional[str] = Query(None, description="Filter by manufacturer (partial match)"),
    view_position: Optional[str] = Query(None, description="Filter by view position (CC, MLO, etc.)"),
    laterality: Optional[str] = Query(None, description="Filter by laterality (L, R)"),
    study_date_from: Optional[date] = Query(None, description="Start date for study date range"),
    study_date_to: Optional[date] = Query(None, description="End date for study date range"),
    min_kvp: Optional[float] = Query(None, description="Minimum kVp value", ge=0, le=50),
    max_kvp: Optional[float] = Query(None, description="Maximum kVp value", ge=0, le=50),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_active_user),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMMetadataListResponse:
    """
    Query DICOM metadata with advanced filters
    
    **Authentication Required:** Any active user
    **Permissions:** QUERY_DICOM
    
    **Query Parameters:**
    - All filters are optional
    - Multiple filters are combined with AND logic
    - Results are paginated
    
    **Returns:**
    - List of matching metadata records
    - Total count for pagination
    """
    try:
        logger.info(f"Querying DICOM metadata with filters: manufacturer={manufacturer}, view={view_position}, laterality={laterality}")
        
        metadata_list, total = service.query_metadata(
            manufacturer=manufacturer,
            view_position=view_position,
            laterality=laterality,
            study_date_from=study_date_from,
            study_date_to=study_date_to,
            min_kvp=min_kvp,
            max_kvp=max_kvp,
            skip=skip,
            limit=limit
        )
        
        return DICOMMetadataListResponse(
            metadata=[DICOMMetadataResponse.model_validate(m) for m in metadata_list],
            total=total,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error querying DICOM metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.put(
    "/images/{image_id}/anonymize",
    response_model=DICOMMetadataResponse,
    summary="Anonymize DICOM metadata",
    description="""
    Apply HIPAA-compliant anonymization to DICOM metadata.
    
    **Anonymization Options:**
    - **Remove Dates**: Clear all date/time information
    - **Remove Identifiers**: Remove physician names, station names, serial numbers
    - **Preserve Clinical**: Keep clinically relevant data (view, laterality, equipment type)
    
    **Compliance:**
    - HIPAA Safe Harbor method (45 CFR §164.514(b))
    - De-identifies 18 HIPAA identifiers
    - Maintains clinical utility for AI training
    
    **Warning:** This operation is irreversible in the database.
    """,
    responses={
        200: {"description": "Metadata anonymized successfully"},
        404: {"model": ErrorResponse, "description": "Metadata not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def anonymize_dicom_metadata(
    image_id: UUID,
    request: DICOMAnonymizationRequest,
    current_user: User = Depends(RoleChecker(["admin"])),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMMetadataResponse:
    """
    Apply HIPAA-compliant anonymization
    
    **Authentication Required:** Admin role only (HIPAA compliance)
    **Permissions:** ANONYMIZE_DICOM
    
    **Path Parameters:**
    - image_id: UUID of the image
    
    **Request Body:**
    - Anonymization configuration options
    
    **Returns:**
    - Anonymized metadata record
    """
    try:
        logger.info(f"Anonymizing DICOM metadata for image {image_id}")
        metadata = service.anonymize_metadata(image_id, request)
        
        return DICOMMetadataResponse.model_validate(metadata)
        
    except DICOMNotFoundException as e:
        logger.error(f"DICOM metadata not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error anonymizing DICOM metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=DICOMStatistics,
    summary="Get DICOM metadata statistics",
    description="""
    Get comprehensive statistics about DICOM metadata in the system.
    
    **Statistics Include:**
    - Total image count
    - Distribution by manufacturer
    - Distribution by view position (CC, MLO, etc.)
    - Distribution by laterality (L, R)
    - Average compression force (Newtons)
    - Average compressed thickness (mm)
    - Anonymization count
    
    **Use Cases:**
    - System monitoring dashboard
    - Quality assurance reports
    - Equipment utilization analysis
    - Protocol compliance checking
    """,
    responses={
        200: {"description": "Statistics generated successfully"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_dicom_statistics(
    current_user: User = Depends(get_current_active_user),
    service: DICOMMetadataService = Depends(get_dicom_service)
) -> DICOMStatistics:
    """
    Get DICOM metadata statistics
    
    **Authentication Required:** Any active user
    **Permissions:** READ_STATISTICS
    
    **Returns:**
    - Various aggregated statistics
    - Distributions by equipment, view, laterality
    - Average acquisition parameters
    """
    try:
        logger.info("Generating DICOM metadata statistics")
        stats = service.get_statistics()
        
        return DICOMStatistics(**stats)
        
    except Exception as e:
        logger.error(f"Error generating statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/health",
    summary="DICOM service health check",
    description="""
    Check health and status of DICOM metadata service.
    
    **Checks:**
    - Database connectivity
    - DICOM parser availability (pydicom)
    - Total metadata records count
    
    **Returns:**
    - Status: healthy/unhealthy
    - Component availability
    - Diagnostic information
    """,
    responses={
        200: {"description": "Service is healthy"},
        500: {"description": "Service is unhealthy"}
    }
)
def health_check(
    service: DICOMMetadataService = Depends(get_dicom_service)
):
    """
    Health check for DICOM metadata service
    
    **Returns:**
    - Health status and diagnostic info
    """
    try:
        health_status = service.health_check()
        
        if health_status["status"] == "healthy":
            return health_status
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=health_status
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "unhealthy", "error": str(e)}
        )
