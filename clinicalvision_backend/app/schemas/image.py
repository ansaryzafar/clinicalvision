"""
Image Schemas for API Request/Response
Pydantic models for image upload, metadata, and management
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field, validator, ConfigDict


class ImageBase(BaseModel):
    """Base schema for image data"""
    patient_id: str = Field(..., min_length=1, max_length=100, description="Patient identifier")
    study_instance_uid: str = Field(..., min_length=1, max_length=200, description="DICOM Study Instance UID")
    series_instance_uid: Optional[str] = Field(None, max_length=200, description="DICOM Series Instance UID")
    sop_instance_uid: Optional[str] = Field(None, max_length=200, description="DICOM SOP Instance UID")
    
    modality: Optional[str] = Field(None, max_length=50, description="Image modality (CT, MRI, MG)")
    view_position: Optional[str] = Field(None, max_length=50, description="View position (CC, MLO)")
    laterality: Optional[str] = Field(None, max_length=10, description="Laterality (L, R, B)")
    
    image_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class ImageCreate(ImageBase):
    """Schema for creating image record"""
    file_name: str = Field(..., min_length=1, max_length=500)
    file_path: str = Field(..., min_length=1, max_length=1000)
    file_size: int = Field(..., gt=0, description="File size in bytes")
    file_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hash")
    mime_type: str = Field(..., max_length=100)
    storage_backend: str = Field(default="local", max_length=50)
    storage_region: Optional[str] = Field(None, max_length=50)
    image_type: Optional[str] = Field(None, max_length=100)
    
    uploaded_by: Optional[UUID] = Field(None, description="User ID who uploaded")
    upload_source: str = Field(default="web", max_length=100)


class ImageUpdate(BaseModel):
    """Schema for updating image metadata"""
    patient_id: Optional[str] = Field(None, max_length=100)
    study_instance_uid: Optional[str] = Field(None, max_length=200)
    series_instance_uid: Optional[str] = Field(None, max_length=200)
    sop_instance_uid: Optional[str] = Field(None, max_length=200)
    
    modality: Optional[str] = Field(None, max_length=50)
    view_position: Optional[str] = Field(None, max_length=50)
    laterality: Optional[str] = Field(None, max_length=10)
    image_type: Optional[str] = Field(None, max_length=100)
    
    image_metadata: Optional[Dict[str, Any]] = None
    processing_status: Optional[str] = Field(None, max_length=50)
    processing_error: Optional[str] = None
    
    is_processed: Optional[bool] = None


class ImageResponse(ImageBase):
    """Schema for image response"""
    id: UUID
    file_name: str
    file_size_bytes: int  # Match DB field name
    mime_type: str
    checksum: str  # Match DB field name (file_hash)
    
    storage_backend: str
    storage_region: Optional[str] = None
    
    image_type: Optional[str] = None
    
    is_processed: bool
    processing_status: str
    processing_error: Optional[str] = None
    
    is_archived: bool
    archived_at: Optional[datetime] = None
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    
    uploaded_by: Optional[UUID] = None
    upload_source: str
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class ImageUploadRequest(BaseModel):
    """Schema for image upload request metadata"""
    patient_id: str = Field(..., min_length=1, max_length=100)
    study_instance_uid: str = Field(..., min_length=1, max_length=200)
    series_instance_uid: Optional[str] = Field(None, max_length=200)
    sop_instance_uid: Optional[str] = Field(None, max_length=200)
    
    modality: Optional[str] = Field(None, max_length=50)
    view_position: Optional[str] = Field(None, max_length=50)
    laterality: Optional[str] = Field(None, max_length=10)
    
    image_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ImageUploadResponse(BaseModel):
    """Schema for image upload response"""
    success: bool
    message: str
    image: ImageResponse
    
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class ImageListResponse(BaseModel):
    """Schema for paginated image list"""
    total: int
    page: int
    page_size: int
    images: List[ImageResponse]
    
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class ImageDownloadResponse(BaseModel):
    """Schema for download URL response"""
    image_id: str
    filename: str
    download_token: str
    expires_at: str
    file_size_bytes: int  # Match DB field name
    mime_type: str


class StorageStatsResponse(BaseModel):
    """Schema for storage statistics"""
    total_images: int
    total_size_bytes: int
    total_size_mb: float
    archived_count: int
    deleted_count: int
    active_count: int
    storage_backend: str
    base_path: str


class ImageDeleteRequest(BaseModel):
    """Schema for image deletion request"""
    soft_delete: bool = Field(default=True, description="Soft delete keeps file, hard delete removes it")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")


class ImageDeleteResponse(BaseModel):
    """Schema for image deletion response"""
    success: bool
    message: str
    image_id: UUID
    deleted_at: datetime


class ChunkUploadInitRequest(BaseModel):
    """Schema for initializing chunked upload"""
    patient_id: str = Field(..., min_length=1, max_length=100)
    study_instance_uid: str = Field(..., min_length=1, max_length=200)
    filename: str = Field(..., min_length=1, max_length=500)
    total_size: int = Field(..., gt=0, description="Total file size in bytes")
    chunk_size: int = Field(default=5*1024*1024, description="Chunk size in bytes (5MB default)")
    total_chunks: int = Field(..., gt=0, description="Total number of chunks")
    
    image_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChunkUploadInitResponse(BaseModel):
    """Schema for chunk upload initialization response"""
    upload_id: UUID
    chunk_size: int
    total_chunks: int
    expires_at: datetime


class ChunkUploadCompleteRequest(BaseModel):
    """Schema for completing chunked upload"""
    upload_id: UUID
    file_hash: str = Field(..., min_length=64, max_length=64, description="Final file SHA-256 hash")


class ChunkUploadCompleteResponse(BaseModel):
    """Schema for chunk upload completion response"""
    success: bool
    message: str
    image: ImageResponse
