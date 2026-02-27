"""
Images API Endpoints
Handles medical image upload, download, management, and lifecycle operations
"""

from typing import List, Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.image import Image
from app.schemas.image import (
    ImageResponse,
    ImageUploadResponse,
    ImageListResponse,
    ImageDownloadResponse,
    ImageDeleteRequest,
    ImageDeleteResponse,
    StorageStatsResponse,
    ImageUpdate,
    ChunkUploadInitRequest,
    ChunkUploadInitResponse,
    ChunkUploadCompleteRequest,
    ChunkUploadCompleteResponse,
)
from app.core.dependencies import (
    get_current_active_user,
    require_radiologist_or_admin,
    RoleChecker,
)
from app.services.storage_service import storage_service
from app.utils.file_validator import file_validator


logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    summary="Upload Medical Image",
    description="Upload a medical image (DICOM or JPEG/PNG) with metadata",
)
async def upload_image(
    file: UploadFile = File(..., description="Image file to upload"),
    patient_id: str = Form(..., description="Patient identifier"),
    study_instance_uid: str = Form(..., description="Study Instance UID"),
    series_instance_uid: Optional[str] = Form(None, description="Series Instance UID"),
    sop_instance_uid: Optional[str] = Form(None, description="SOP Instance UID"),
    modality: Optional[str] = Form(None, description="Image modality (MG, CT, MRI)"),
    view_position: Optional[str] = Form(None, description="View position (CC, MLO)"),
    laterality: Optional[str] = Form(None, description="Laterality (L, R, B)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "radiologist", "technician"])),
):
    """
    Upload medical image with comprehensive validation and metadata extraction.
    
    Supports:
    - DICOM files (.dcm) up to 500MB
    - JPEG/PNG images up to 50MB
    - Automatic DICOM metadata extraction
    - File integrity verification
    - Security validation
    
    Returns:
        ImageUploadResponse with stored image details
    """
    try:
        # Create temporary file for validation
        temp_path = storage_service.base_path / "temp" / f"validate_{file.filename}"
        
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Reset file pointer for storage service
        await file.seek(0)
        
        # Validate file
        is_valid, message, validation_result = await file_validator.validate_upload_file(
            file, temp_path
        )
        
        if not is_valid:
            temp_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=message)
        
        # Clean up temp validation file
        temp_path.unlink(missing_ok=True)
        
        # Prepare metadata
        metadata = {
            "uploaded_by": str(current_user.id),
            "uploaded_by_username": current_user.username,
            "uploaded_by_role": current_user.role,
            "validation_result": validation_result,
        }
        
        # Add DICOM metadata if available
        if validation_result.get("dicom_metadata"):
            metadata.update(validation_result["dicom_metadata"])
            
            # Override form data with DICOM metadata if not provided
            if not series_instance_uid and "SeriesInstanceUID" in validation_result["dicom_metadata"]:
                series_instance_uid = validation_result["dicom_metadata"]["SeriesInstanceUID"]
            if not sop_instance_uid and "SOPInstanceUID" in validation_result["dicom_metadata"]:
                sop_instance_uid = validation_result["dicom_metadata"]["SOPInstanceUID"]
            if not modality and "Modality" in validation_result["dicom_metadata"]:
                modality = validation_result["dicom_metadata"]["Modality"]
            if not view_position and "ViewPosition" in validation_result["dicom_metadata"]:
                view_position = validation_result["dicom_metadata"]["ViewPosition"]
            if not laterality:
                laterality = validation_result["dicom_metadata"].get("Laterality") or \
                            validation_result["dicom_metadata"].get("ImageLaterality")
        
        # Store file
        image = await storage_service.store_file(
            file=file,
            patient_id=patient_id,
            study_instance_uid=study_instance_uid,
            db=db,
            metadata=metadata,
        )
        
        # Update additional fields
        if series_instance_uid:
            image.series_instance_uid = series_instance_uid
        if sop_instance_uid:
            image.sop_instance_uid = sop_instance_uid
        if modality:
            image.modality = modality
        if view_position:
            image.view_position = view_position
        if laterality:
            image.laterality = laterality
        
        image.uploaded_by = current_user.id
        
        db.commit()
        db.refresh(image)
        
        logger.info(f"Image uploaded successfully: {image.id} by user {current_user.username}")
        
        return ImageUploadResponse(
            success=True,
            message="Image uploaded successfully",
            image=image,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get(
    "/",
    response_model=ImageListResponse,
    summary="List Images",
    description="Retrieve paginated list of images with filtering",
)
async def list_images(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    study_instance_uid: Optional[str] = Query(None, description="Filter by study UID"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    is_archived: Optional[bool] = Query(None, description="Filter archived images"),
    is_deleted: Optional[bool] = Query(False, description="Include deleted images"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List images with pagination and filtering.
    
    Supports filtering by:
    - Patient ID
    - Study Instance UID
    - Modality
    - Archive status
    - Deletion status
    """
    try:
        query = db.query(Image)
        
        # Filter out images with null critical fields to prevent validation errors
        query = query.filter(
            Image.file_name.isnot(None),
            Image.storage_backend.isnot(None),
            Image.processing_status.isnot(None)
        )
        
        # Apply user filters
        if patient_id:
            query = query.filter(Image.patient_id == patient_id)
        if study_instance_uid:
            query = query.filter(Image.study_instance_uid == study_instance_uid)
        if modality:
            query = query.filter(Image.modality == modality)
        if is_archived is not None:
            query = query.filter(Image.is_archived == is_archived)
        if not is_deleted:
            query = query.filter(Image.is_deleted == False)
        else:
            query = query.filter(Image.is_deleted == is_deleted)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        images = query.offset(offset).limit(page_size).all()
        
        # Convert to response models with proper validation and defaults
        image_responses = []
        for img in images:
            try:
                # Ensure all required fields have values
                img_dict = {
                    "id": img.id,
                    "patient_id": img.patient_id or "UNKNOWN",
                    "study_instance_uid": img.study_instance_uid or "UNKNOWN",
                    "file_name": img.file_name or "unknown.dcm",
                    "file_size_bytes": img.file_size_bytes or 0,
                    "checksum": img.checksum or "",
                    "mime_type": img.mime_type or "application/dicom",
                    "storage_backend": img.storage_backend or "local",
                    "storage_region": img.storage_region,
                    "image_type": img.image_type,
                    "is_processed": img.is_processed if img.is_processed is not None else False,
                    "processing_status": img.processing_status or "pending",
                    "processing_error": img.processing_error,
                    "is_archived": img.is_archived if img.is_archived is not None else False,
                    "archived_at": img.archived_at,
                    "is_deleted": img.is_deleted if img.is_deleted is not None else False,
                    "deleted_at": img.deleted_at,
                    "uploaded_by": img.uploaded_by,
                    "upload_source": img.upload_source or "unknown",
                    "created_at": img.created_at,
                    "updated_at": img.updated_at,
                    # Optional fields from ImageBase
                    "sop_instance_uid": img.sop_instance_uid,
                    "series_instance_uid": img.series_instance_uid,
                    "modality": img.modality,
                    "view_position": img.view_position,
                    "laterality": img.laterality,
                    "image_metadata": img.image_metadata,
                }
                image_response = ImageResponse(**img_dict)
                image_responses.append(image_response)
            except Exception as e:
                logger.error(f"Error converting image {img.id} to response: {str(e)}")
                # Skip invalid images
                continue
        
        return ImageListResponse(
            total=total,
            page=page,
            page_size=page_size,
            images=image_responses,
        )
        
    except Exception as e:
        logger.error(f"Error listing images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve images: {str(e)}"
        )


@router.get(
    "/{image_id}",
    response_model=ImageResponse,
    summary="Get Image Details",
    description="Retrieve detailed information about a specific image",
)
async def get_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed information about a specific image by ID"""
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return image


@router.get(
    "/{image_id}/download-url",
    response_model=ImageDownloadResponse,
    summary="Generate Download URL",
    description="Generate a presigned URL for downloading an image",
)
async def generate_download_url(
    image_id: UUID,
    expiry_hours: int = Query(24, ge=1, le=168, description="URL expiry in hours (max 7 days)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate presigned download URL for an image.
    
    For local storage, returns download token and metadata.
    For S3 storage, would return actual presigned S3 URL.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.is_deleted:
        raise HTTPException(status_code=410, detail="Image has been deleted")
    
    # Generate download URL/token
    download_info = storage_service.generate_download_url(image, expiry_hours)
    
    return ImageDownloadResponse(**download_info)


@router.get(
    "/{image_id}/download",
    summary="Download Image File",
    description="Download the actual image file",
    response_class=FileResponse,
)
async def download_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Download image file directly.
    
    Returns the file as a streaming response with appropriate headers.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.is_deleted:
        raise HTTPException(status_code=410, detail="Image has been deleted")
    
    # Get file path
    file_path = storage_service.get_file_path(image)
    
    # Verify file integrity
    if not storage_service.verify_file_integrity(image):
        logger.error(f"File integrity check failed for image {image_id}")
        raise HTTPException(
            status_code=500,
            detail="File integrity verification failed"
        )
    
    logger.info(f"Image downloaded: {image_id} by user {current_user.username}")
    
    return FileResponse(
        path=str(file_path),
        filename=image.file_name,
        media_type=image.mime_type,
    )


@router.patch(
    "/{image_id}",
    response_model=ImageResponse,
    summary="Update Image Metadata",
    description="Update image metadata and properties",
)
async def update_image(
    image_id: UUID,
    update_data: ImageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist_or_admin),
):
    """
    Update image metadata.
    
    Only radiologists and admins can update image metadata.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for field, value in update_dict.items():
        if value is not None:
            setattr(image, field, value)
    
    db.commit()
    db.refresh(image)
    
    logger.info(f"Image updated: {image_id} by user {current_user.username}")
    
    return image


@router.delete(
    "/{image_id}",
    response_model=ImageDeleteResponse,
    summary="Delete Image",
    description="Delete an image (soft delete by default)",
)
async def delete_image(
    image_id: UUID,
    delete_request: Optional[ImageDeleteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist_or_admin),
):
    """
    Delete an image.
    
    Supports both soft delete (mark as deleted) and hard delete (remove file).
    Only radiologists and admins can delete images.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.is_deleted:
        raise HTTPException(status_code=410, detail="Image already deleted")
    
    # Parse delete request
    soft_delete = delete_request.soft_delete if delete_request else True
    
    # Perform deletion
    await storage_service.delete_file(image, db, soft_delete=soft_delete)
    
    logger.info(
        f"Image {'soft' if soft_delete else 'hard'} deleted: {image_id} "
        f"by user {current_user.username}"
    )
    
    return ImageDeleteResponse(
        success=True,
        message=f"Image {'soft' if soft_delete else 'hard'} deleted successfully",
        image_id=image_id,
        deleted_at=image.deleted_at,
    )


@router.post(
    "/{image_id}/archive",
    response_model=ImageResponse,
    summary="Archive Image",
    description="Move image to archive storage",
)
async def archive_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist_or_admin),
):
    """
    Archive an image by moving it to archive storage.
    
    Archived images can still be accessed but are moved to separate storage.
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if image.is_archived:
        raise HTTPException(status_code=400, detail="Image already archived")
    
    if image.is_deleted:
        raise HTTPException(status_code=410, detail="Cannot archive deleted image")
    
    # Archive file
    await storage_service.archive_file(image, db)
    
    logger.info(f"Image archived: {image_id} by user {current_user.username}")
    
    return image


@router.get(
    "/statistics/storage",
    response_model=StorageStatsResponse,
    summary="Get Storage Statistics",
    description="Retrieve storage usage statistics",
)
async def get_storage_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get comprehensive storage statistics including:
    - Total images count
    - Total storage size
    - Archived/deleted counts
    - Storage backend information
    """
    stats = storage_service.get_storage_stats(db)
    
    return StorageStatsResponse(**stats)


@router.post(
    "/{image_id}/verify-integrity",
    summary="Verify File Integrity",
    description="Verify file integrity using stored hash",
)
async def verify_file_integrity(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify file integrity by comparing current hash with stored hash.
    
    Returns:
        Dictionary with verification result
    """
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    is_valid = storage_service.verify_file_integrity(image)
    
    return {
        "image_id": str(image_id),
        "filename": image.file_name,
        "integrity_valid": is_valid,
        "message": "File integrity verified" if is_valid else "File integrity check failed",
    }


# Chunked upload endpoints for large files

# In-memory tracking of chunked uploads (use Redis in production)
chunk_uploads = {}


@router.post(
    "/chunked-upload/init",
    response_model=ChunkUploadInitResponse,
    summary="Initialize Chunked Upload",
    description="Initialize chunked upload for large files",
)
async def init_chunked_upload(
    request: ChunkUploadInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "radiologist", "technician"])),
):
    """
    Initialize chunked upload for large files (e.g., large DICOM studies).
    
    Returns upload_id to be used for subsequent chunk uploads.
    """
    from datetime import datetime, timedelta
    import uuid
    
    upload_id = uuid.uuid4()
    expiry = datetime.utcnow() + timedelta(hours=24)
    
    # Store upload metadata (use Redis in production)
    chunk_uploads[upload_id] = {
        "patient_id": request.patient_id,
        "study_instance_uid": request.study_instance_uid,
        "filename": request.filename,
        "total_size": request.total_size,
        "chunk_size": request.chunk_size,
        "total_chunks": request.total_chunks,
        "uploaded_chunks": [],
        "image_metadata": request.image_metadata,
        "user_id": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expiry.isoformat(),
    }
    
    logger.info(f"Chunked upload initialized: {upload_id} by user {current_user.username}")
    
    return ChunkUploadInitResponse(
        upload_id=upload_id,
        chunk_size=request.chunk_size,
        total_chunks=request.total_chunks,
        expires_at=expiry,
    )


@router.post(
    "/chunked-upload/{upload_id}/chunk/{chunk_number}",
    summary="Upload File Chunk",
    description="Upload a specific chunk of a file",
)
async def upload_chunk(
    upload_id: UUID,
    chunk_number: int,
    chunk: UploadFile = File(...),
    current_user: User = Depends(RoleChecker(["admin", "radiologist", "technician"])),
):
    """
    Upload a specific chunk of a file.
    
    Chunks are stored temporarily until all chunks are uploaded.
    """
    if upload_id not in chunk_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    upload_info = chunk_uploads[upload_id]
    
    # Verify user matches
    if upload_info["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this upload")
    
    # Create chunk storage directory
    chunk_dir = storage_service.base_path / "temp" / "chunks" / str(upload_id)
    chunk_dir.mkdir(parents=True, exist_ok=True)
    
    # Save chunk
    chunk_path = chunk_dir / f"chunk_{chunk_number}"
    with open(chunk_path, "wb") as buffer:
        content = await chunk.read()
        buffer.write(content)
    
    # Track uploaded chunk
    if chunk_number not in upload_info["uploaded_chunks"]:
        upload_info["uploaded_chunks"].append(chunk_number)
    
    logger.debug(f"Chunk {chunk_number}/{upload_info['total_chunks']} uploaded for {upload_id}")
    
    return {
        "upload_id": str(upload_id),
        "chunk_number": chunk_number,
        "total_chunks": upload_info["total_chunks"],
        "uploaded_chunks": len(upload_info["uploaded_chunks"]),
        "remaining_chunks": upload_info["total_chunks"] - len(upload_info["uploaded_chunks"]),
    }


@router.post(
    "/chunked-upload/{upload_id}/complete",
    response_model=ChunkUploadCompleteResponse,
    summary="Complete Chunked Upload",
    description="Finalize chunked upload by assembling all chunks",
)
async def complete_chunked_upload(
    upload_id: UUID,
    request: ChunkUploadCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "radiologist", "technician"])),
):
    """
    Complete chunked upload by assembling all chunks into final file.
    
    Verifies all chunks are present and file integrity matches provided hash.
    """
    if upload_id not in chunk_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    upload_info = chunk_uploads[upload_id]
    
    # Verify user matches
    if upload_info["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this upload")
    
    # Verify all chunks uploaded
    if len(upload_info["uploaded_chunks"]) != upload_info["total_chunks"]:
        raise HTTPException(
            status_code=400,
            detail=f"Missing chunks: {len(upload_info['uploaded_chunks'])}/{upload_info['total_chunks']}"
        )
    
    try:
        # Assemble chunks
        chunk_dir = storage_service.base_path / "temp" / "chunks" / str(upload_id)
        final_path = storage_service.base_path / "temp" / f"assembled_{upload_info['filename']}"
        
        with open(final_path, "wb") as final_file:
            for chunk_num in sorted(upload_info["uploaded_chunks"]):
                chunk_path = chunk_dir / f"chunk_{chunk_num}"
                with open(chunk_path, "rb") as chunk_file:
                    final_file.write(chunk_file.read())
        
        # Verify file hash
        import hashlib
        with open(final_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        
        if file_hash != request.file_hash:
            final_path.unlink()
            shutil.rmtree(chunk_dir)
            raise HTTPException(
                status_code=400,
                detail="File integrity check failed: hash mismatch"
            )
        
        # Create UploadFile-like object for storage service
        class AssembledFile:
            def __init__(self, path, filename):
                self.filename = filename
                self._path = path
                self._file = None
            
            async def read(self):
                with open(self._path, "rb") as f:
                    return f.read()
            
            async def seek(self, pos):
                pass
        
        assembled_file = AssembledFile(final_path, upload_info["filename"])
        
        # Store using existing storage service
        image = await storage_service.store_file(
            file=assembled_file,
            patient_id=upload_info["patient_id"],
            study_instance_uid=upload_info["study_instance_uid"],
            db=db,
            metadata=upload_info["image_metadata"],
        )
        
        image.uploaded_by = current_user.id
        db.commit()
        db.refresh(image)
        
        # Clean up
        final_path.unlink(missing_ok=True)
        shutil.rmtree(chunk_dir, ignore_errors=True)
        del chunk_uploads[upload_id]
        
        logger.info(f"Chunked upload completed: {upload_id} -> image {image.id}")
        
        return ChunkUploadCompleteResponse(
            success=True,
            message="Chunked upload completed successfully",
            image=image,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chunked upload completion failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete chunked upload: {str(e)}"
        )
