/**
 * Image Upload Operations - Phase 4
 * 
 * Core functions for managing mammogram image uploads in clinical cases.
 * Implements Algorithm #2 (UploadMultipleImages) from ALGORITHM_DESIGN.md.
 * 
 * Features:
 * - Multi-image upload support (standard 4-view mammography)
 * - File and metadata validation
 * - Upload status tracking
 * - Workflow integration
 * - Audit trail
 * - Immutable state updates
 * 
 * @module imageUploadOperations
 */

import {
  ClinicalCase,
  MammogramImage,
  ViewType,
  Laterality,
  UploadStatus,
  ClinicalWorkflowStep,
  STEP_INDEX,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_CASE,
  ALLOWED_MIME_TYPES,
  Result,
  success,
  failure,
  ValidationResult,
  FieldError,
  createValidationResult,
  ErrorCode,
} from '../types/case.types';

import { isFailure } from '../types/resultHelpers';

import {
  validateImageFile,
  validateImageMetadata,
  validateImageBatch,
  sanitizeFilename,
  ImageMetadataInput,
} from './validators';

import { generateUUID } from './caseOperations';

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Image upload error with field details
 */
export interface ImageUploadError extends Error {
  name: 'ImageUploadError';
  code: ErrorCode;
  errors: FieldError[];
}

/**
 * Create an image upload error
 */
function createImageUploadError(
  code: ErrorCode,
  errors: FieldError[]
): ImageUploadError {
  const error = new Error('Image upload failed') as ImageUploadError;
  error.name = 'ImageUploadError';
  error.code = code;
  error.errors = errors;
  return error;
}

// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/**
 * Steps where image upload is allowed
 */
const IMAGE_UPLOAD_ALLOWED_STEPS = new Set([
  ClinicalWorkflowStep.IMAGE_UPLOAD,
  ClinicalWorkflowStep.IMAGE_VERIFICATION,
]);

/**
 * Check if current workflow step allows image upload
 */
function canUploadImagesAtStep(step: ClinicalWorkflowStep): boolean {
  return IMAGE_UPLOAD_ALLOWED_STEPS.has(step);
}

/**
 * Check if case is locked (finalized)
 */
function isCaseLocked(case_: ClinicalCase): boolean {
  return case_.workflow.isLocked || case_.workflow.status === 'finalized';
}

/**
 * Validate workflow state for image operations
 */
function validateWorkflowForImageOp(
  case_: ClinicalCase,
  operation: 'add' | 'remove'
): ValidationResult {
  const result = createValidationResult();

  if (isCaseLocked(case_)) {
    result.isValid = false;
    result.errors.push({
      field: 'workflow',
      message: 'Cannot modify images on a finalized case',
      code: 'CASE_LOCKED',
    });
    return result;
  }

  if (!canUploadImagesAtStep(case_.workflow.currentStep)) {
    result.isValid = false;
    result.errors.push({
      field: 'workflow',
      message: `Image ${operation} is not allowed at step: ${case_.workflow.currentStep}`,
      code: 'WORKFLOW_STEP_INVALID',
    });
  }

  return result;
}

// ============================================================================
// IMAGE CREATION
// ============================================================================

/**
 * Create a MammogramImage object from a file and metadata
 * 
 * @param file - The image file
 * @param metadata - View type and laterality
 * @returns Result with MammogramImage or validation error
 */
export function createMammogramImage(
  file: File,
  metadata: ImageMetadataInput
): Result<MammogramImage, ImageUploadError> {
  const errors: FieldError[] = [];

  // Validate file
  const fileValidation = validateImageFile(file);
  if (!fileValidation.isValid) {
    errors.push(...fileValidation.errors);
  }

  // Validate metadata
  const metaValidation = validateImageMetadata(metadata);
  if (!metaValidation.isValid) {
    errors.push(...metaValidation.errors);
  }

  // Return errors if any
  if (errors.length > 0) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, errors));
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  // Create local blob URL for preview
  const localUrl = URL.createObjectURL(file);

  // Create image object
  // In local-first architecture, the image is immediately available once added to the case.
  // Set status to 'uploaded' so workflow guards (guardAllImagesUploaded) pass correctly.
  const image: MammogramImage = {
    id: generateUUID(),
    filename: sanitizedFilename,
    fileSize: file.size,
    mimeType: file.type,
    localUrl,
    viewType: metadata.viewType as ViewType,
    laterality: metadata.laterality as Laterality,
    uploadStatus: 'uploaded',
  };

  return success(image);
}

// ============================================================================
// BATCH PREPARATION
// ============================================================================

/**
 * Prepare multiple images for upload (validate and create MammogramImage objects)
 * 
 * @param files - Array of files
 * @param metadata - Array of metadata (must match files length)
 * @returns Result with MammogramImage array or indexed errors
 */
export function prepareImagesForUpload(
  files: File[],
  metadata: ImageMetadataInput[]
): Result<MammogramImage[], ImageUploadError> {
  // Use batch validation
  const batchValidation = validateImageBatch(files, metadata);
  
  if (!batchValidation.isValid) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, batchValidation.errors));
  }

  // Create image objects
  const images: MammogramImage[] = [];
  const errors: FieldError[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = createMammogramImage(files[i], metadata[i]);
    
    if (result.success) {
      images.push(result.data);
    } else if (isFailure(result)) {
      // Add index to errors
      result.error.errors.forEach(err => {
        errors.push({
          ...err,
          field: `[${i}].${err.field}`,
          index: i,
        });
      });
    }
  }

  if (errors.length > 0) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, errors));
  }

  return success(images, batchValidation.warnings);
}

// ============================================================================
// CASE IMAGE OPERATIONS
// ============================================================================

/**
 * Add a single image to a case
 * 
 * @param case_ - The clinical case
 * @param file - The image file
 * @param metadata - View type and laterality
 * @param userId - User performing the action
 * @returns Result with updated case or error
 */
export function addImageToCase(
  case_: ClinicalCase,
  file: File,
  metadata: ImageMetadataInput,
  userId: string
): Result<ClinicalCase, ImageUploadError> {
  const warnings: string[] = [];

  // Validate workflow state
  const workflowValidation = validateWorkflowForImageOp(case_, 'add');
  if (!workflowValidation.isValid) {
    return failure(createImageUploadError(ErrorCode.WORKFLOW_ERROR, workflowValidation.errors));
  }

  // Check max images limit
  if (case_.images.length >= MAX_IMAGES_PER_CASE) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, [{
      field: 'images',
      message: `Maximum ${MAX_IMAGES_PER_CASE} images allowed per case`,
      code: 'MAX_IMAGES_EXCEEDED',
    }]));
  }

  // Create image object
  const imageResult = createMammogramImage(file, metadata);
  if (isFailure(imageResult)) {
    return failure(imageResult.error);
  }

  const newImage = imageResult.data;

  // Check for duplicate view/laterality
  const duplicate = case_.images.find(
    img => img.viewType === newImage.viewType && img.laterality === newImage.laterality
  );
  if (duplicate) {
    warnings.push(
      `Duplicate ${newImage.laterality} ${newImage.viewType} view detected. Previous: ${duplicate.filename}`
    );
  }

  // Create audit entry
  const now = new Date().toISOString();
  const auditEntry = {
    timestamp: now,
    userId,
    action: 'ADD_IMAGE' as const,
    field: 'images',
    newValue: { id: newImage.id, filename: newImage.filename, viewType: newImage.viewType, laterality: newImage.laterality },
  };

  // Return updated case (immutable)
  const updatedCase: ClinicalCase = {
    ...case_,
    images: [...case_.images, newImage],
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      modifications: [...case_.audit.modifications, auditEntry],
    },
  };

  return success(updatedCase, warnings.length > 0 ? warnings : undefined);
}

/**
 * Add multiple images to a case at once
 * 
 * @param case_ - The clinical case
 * @param files - Array of image files
 * @param metadata - Array of metadata (must match files length)
 * @param userId - User performing the action
 * @returns Result with updated case or indexed errors
 */
export function addImagesToCase(
  case_: ClinicalCase,
  files: File[],
  metadata: ImageMetadataInput[],
  userId: string
): Result<ClinicalCase, ImageUploadError> {
  const warnings: string[] = [];

  // Validate workflow state
  const workflowValidation = validateWorkflowForImageOp(case_, 'add');
  if (!workflowValidation.isValid) {
    return failure(createImageUploadError(ErrorCode.WORKFLOW_ERROR, workflowValidation.errors));
  }

  // Empty check
  if (!files || files.length === 0) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, [{
      field: 'files',
      message: 'At least one image is required',
      code: 'REQUIRED',
    }]));
  }

  // Metadata count mismatch
  if (!metadata || files.length !== metadata.length) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, [{
      field: 'metadata',
      message: 'Each image must have corresponding metadata',
      code: 'METADATA_MISMATCH',
    }]));
  }

  // Check max images limit
  if (case_.images.length + files.length > MAX_IMAGES_PER_CASE) {
    return failure(createImageUploadError(ErrorCode.VALIDATION_ERROR, [{
      field: 'images',
      message: `Adding ${files.length} images would exceed maximum of ${MAX_IMAGES_PER_CASE}. Current: ${case_.images.length}`,
      code: 'MAX_IMAGES_EXCEEDED',
    }]));
  }

  // Prepare images (validates and creates objects)
  const prepareResult = prepareImagesForUpload(files, metadata);
  if (isFailure(prepareResult)) {
    return failure(prepareResult.error);
  }

  const newImages = prepareResult.data;
  if (prepareResult.warnings) {
    warnings.push(...prepareResult.warnings);
  }

  // Check for duplicates among existing images
  const duplicateCheck = new Map<string, string>();
  case_.images.forEach(img => {
    duplicateCheck.set(`${img.laterality}-${img.viewType}`, img.filename);
  });

  newImages.forEach(img => {
    const key = `${img.laterality}-${img.viewType}`;
    if (duplicateCheck.has(key)) {
      warnings.push(
        `Duplicate ${img.laterality} ${img.viewType} view. Previous: ${duplicateCheck.get(key)}`
      );
    }
    duplicateCheck.set(key, img.filename);
  });

  // Check for incomplete 4-view set
  const allImages = [...case_.images, ...newImages];
  const hasRCC = allImages.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.RIGHT);
  const hasLCC = allImages.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.LEFT);
  const hasRMLO = allImages.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.RIGHT);
  const hasLMLO = allImages.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.LEFT);

  if (!(hasRCC && hasLCC && hasRMLO && hasLMLO)) {
    const missing: string[] = [];
    if (!hasRCC) missing.push('RCC');
    if (!hasLCC) missing.push('LCC');
    if (!hasRMLO) missing.push('RMLO');
    if (!hasLMLO) missing.push('LMLO');
    warnings.push(`Incomplete standard 4-view set. Missing: ${missing.join(', ')}`);
  }

  // Create audit entry
  const now = new Date().toISOString();
  const auditEntry = {
    timestamp: now,
    userId,
    action: 'ADD_IMAGES_BATCH' as const,
    field: 'images',
    newValue: newImages.map(img => ({
      id: img.id,
      filename: img.filename,
      viewType: img.viewType,
      laterality: img.laterality,
    })),
  };

  // Return updated case (immutable)
  const updatedCase: ClinicalCase = {
    ...case_,
    images: [...case_.images, ...newImages],
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      modifications: [...case_.audit.modifications, auditEntry],
    },
  };

  return success(updatedCase, warnings.length > 0 ? warnings : undefined);
}

/**
 * Remove an image from a case by ID
 * 
 * @param case_ - The clinical case
 * @param imageId - ID of the image to remove
 * @param userId - User performing the action
 * @returns Result with updated case or error
 */
export function removeImageFromCase(
  case_: ClinicalCase,
  imageId: string,
  userId: string
): Result<ClinicalCase, ImageUploadError> {
  // Validate workflow state
  const workflowValidation = validateWorkflowForImageOp(case_, 'remove');
  if (!workflowValidation.isValid) {
    return failure(createImageUploadError(ErrorCode.WORKFLOW_ERROR, workflowValidation.errors));
  }

  // Find the image
  const imageIndex = case_.images.findIndex(img => img.id === imageId);
  if (imageIndex === -1) {
    return failure(createImageUploadError(ErrorCode.NOT_FOUND, [{
      field: 'imageId',
      message: `Image with ID "${imageId}" not found`,
      code: 'NOT_FOUND',
    }]));
  }

  const removedImage = case_.images[imageIndex];

  // Revoke blob URL to prevent memory leaks
  if (removedImage.localUrl && removedImage.localUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(removedImage.localUrl);
    } catch {
      // Ignore revoke errors
    }
  }

  // Create audit entry
  const now = new Date().toISOString();
  const auditEntry = {
    timestamp: now,
    userId,
    action: 'REMOVE_IMAGE' as const,
    field: 'images',
    previousValue: {
      id: removedImage.id,
      filename: removedImage.filename,
      viewType: removedImage.viewType,
      laterality: removedImage.laterality,
    },
  };

  // Return updated case (immutable)
  const updatedCase: ClinicalCase = {
    ...case_,
    images: case_.images.filter(img => img.id !== imageId),
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      modifications: [...case_.audit.modifications, auditEntry],
    },
  };

  return success(updatedCase);
}

// ============================================================================
// IMAGE RETRIEVAL UTILITIES
// ============================================================================

/**
 * Get an image by ID from a case
 */
export function getImageById(
  case_: ClinicalCase,
  imageId: string
): MammogramImage | undefined {
  return case_.images.find(img => img.id === imageId);
}

/**
 * Get all images for a specific laterality
 */
export function getImagesByLaterality(
  case_: ClinicalCase,
  laterality: Laterality
): MammogramImage[] {
  return case_.images.filter(img => img.laterality === laterality);
}

/**
 * Get all images for a specific view type
 */
export function getImagesByView(
  case_: ClinicalCase,
  viewType: ViewType
): MammogramImage[] {
  return case_.images.filter(img => img.viewType === viewType);
}

// ============================================================================
// UPLOAD STATUS MANAGEMENT
// ============================================================================

/**
 * Check if more images can be added to a case
 */
export function canAddMoreImages(case_: ClinicalCase): {
  allowed: boolean;
  remaining: number;
  reason?: string;
} {
  const remaining = MAX_IMAGES_PER_CASE - case_.images.length;
  
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Maximum ${MAX_IMAGES_PER_CASE} images reached`,
    };
  }

  if (isCaseLocked(case_)) {
    return {
      allowed: false,
      remaining,
      reason: 'Case is finalized',
    };
  }

  if (!canUploadImagesAtStep(case_.workflow.currentStep)) {
    return {
      allowed: false,
      remaining,
      reason: `Image upload not allowed at step: ${case_.workflow.currentStep}`,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}

/**
 * Get upload progress for a case
 */
export function getUploadProgress(case_: ClinicalCase): {
  total: number;
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
  percentage: number;
} {
  const total = case_.images.length;
  
  if (total === 0) {
    return { total: 0, pending: 0, uploading: 0, uploaded: 0, failed: 0, percentage: 0 };
  }

  const pending = case_.images.filter(img => img.uploadStatus === 'pending').length;
  const uploading = case_.images.filter(img => img.uploadStatus === 'uploading').length;
  const uploaded = case_.images.filter(img => img.uploadStatus === 'uploaded').length;
  const failed = case_.images.filter(img => img.uploadStatus === 'failed').length;

  const percentage = Math.round((uploaded / total) * 100);

  return { total, pending, uploading, uploaded, failed, percentage };
}

/**
 * Mark an image as uploaded (update status and server info)
 */
export function markImageUploaded(
  case_: ClinicalCase,
  imageId: string,
  serverPath: string,
  backendImageId: number
): Result<ClinicalCase, ImageUploadError> {
  const imageIndex = case_.images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) {
    return failure(createImageUploadError(ErrorCode.NOT_FOUND, [{
      field: 'imageId',
      message: `Image with ID "${imageId}" not found`,
      code: 'NOT_FOUND',
    }]));
  }

  const now = new Date().toISOString();
  
  const updatedImages = case_.images.map((img, idx) => {
    if (idx === imageIndex) {
      return {
        ...img,
        uploadStatus: 'uploaded' as const,
        serverPath,
        backendImageId,
        uploadedAt: now,
        uploadError: undefined,
      };
    }
    return img;
  });

  return success({
    ...case_,
    images: updatedImages,
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
  });
}

/**
 * Mark an image as failed (update status and error message)
 */
export function markImageFailed(
  case_: ClinicalCase,
  imageId: string,
  errorMessage: string
): Result<ClinicalCase, ImageUploadError> {
  const imageIndex = case_.images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) {
    return failure(createImageUploadError(ErrorCode.NOT_FOUND, [{
      field: 'imageId',
      message: `Image with ID "${imageId}" not found`,
      code: 'NOT_FOUND',
    }]));
  }

  const now = new Date().toISOString();
  
  const updatedImages = case_.images.map((img, idx) => {
    if (idx === imageIndex) {
      return {
        ...img,
        uploadStatus: 'failed' as const,
        uploadError: errorMessage,
      };
    }
    return img;
  });

  return success({
    ...case_,
    images: updatedImages,
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
  });
}

// ============================================================================
// VALIDATION FOR ANALYSIS
// ============================================================================

/**
 * Validate that a case has images ready for AI analysis
 */
export function validateImagesForAnalysis(case_: ClinicalCase): ValidationResult {
  const result = createValidationResult();

  // Check for at least one image
  if (case_.images.length === 0) {
    result.isValid = false;
    result.errors.push({
      field: 'images',
      message: 'At least one image is required for analysis',
      code: 'REQUIRED',
    });
    return result;
  }

  // Check all images are uploaded
  const pendingOrUploading = case_.images.filter(
    img => img.uploadStatus === 'pending' || img.uploadStatus === 'uploading'
  );
  
  if (pendingOrUploading.length > 0) {
    result.isValid = false;
    result.errors.push({
      field: 'images',
      message: `${pendingOrUploading.length} image(s) still pending upload`,
      code: 'PENDING_UPLOADS',
    });
  }

  // Check for failed uploads
  const failed = case_.images.filter(img => img.uploadStatus === 'failed');
  if (failed.length > 0) {
    result.isValid = false;
    result.errors.push({
      field: 'images',
      message: `${failed.length} image(s) failed to upload`,
      code: 'FAILED_UPLOADS',
    });
  }

  // Warn about incomplete 4-view set
  const hasRCC = case_.images.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.RIGHT);
  const hasLCC = case_.images.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.LEFT);
  const hasRMLO = case_.images.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.RIGHT);
  const hasLMLO = case_.images.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.LEFT);

  if (!(hasRCC && hasLCC && hasRMLO && hasLMLO)) {
    const missing: string[] = [];
    if (!hasRCC) missing.push('RCC');
    if (!hasLCC) missing.push('LCC');
    if (!hasRMLO) missing.push('RMLO');
    if (!hasLMLO) missing.push('LMLO');
    result.warnings.push(`Incomplete standard 4-view set. Missing: ${missing.join(', ')}`);
  }

  return result;
}
