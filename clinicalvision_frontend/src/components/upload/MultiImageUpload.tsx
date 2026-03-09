/**
 * MultiImageUpload Component - Phase 4
 * 
 * Production-grade multi-image upload component for mammogram images.
 * Supports standard 4-view mammography workflow (RCC, LCC, RMLO, LMLO).
 * 
 * Features:
 * - Drag-and-drop support
 * - Multiple file selection
 * - View type and laterality assignment
 * - Standard 4-view progress tracking
 * - Integration with ClinicalCaseContext
 * - File validation (size, type)
 * - Preview thumbnails
 * - Accessible design
 * 
 * @module MultiImageUpload
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  AlertTitle,
  Stack,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fade,
  useTheme,
  alpha,
  styled,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Delete,
  Image as ImageIcon,
  Add,
  Close,
  Refresh,
} from '@mui/icons-material';

// Context and types
import { useClinicalCase } from '../../contexts/ClinicalCaseContext';
import {
  MammogramImage,
  ViewType,
  Laterality,
  ClinicalWorkflowStep,
  MAX_IMAGES_PER_CASE,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from '../../types/case.types';

// Import upload operations
import { addImage as persistImageBlob } from '../../services/imageStorageService';
import {
  createMammogramImage,
  canAddMoreImages,
} from '../../utils/imageUploadOperations';

import { validateImageFile, ImageMetadataInput } from '../../utils/validators';
import { isFailure } from '../../types/resultHelpers';

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  lightGray: '#E5E7EB',
  green: '#22C55E',
  white: '#FFFFFF',
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface PendingImage {
  id: string;
  file: File;
  localUrl: string;
  viewType: ViewType | null;
  laterality: Laterality | null;
  error?: string;
}

interface MultiImageUploadProps {
  onUploadComplete?: (images: MammogramImage[]) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragOver' && prop !== 'isDisabled',
})<{ isDragOver?: boolean; isDisabled?: boolean }>(({ theme, isDragOver, isDisabled }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: Number(theme.shape.borderRadius) * 2,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: isDragOver 
    ? alpha(theme.palette.primary.main, 0.08)
    : isDisabled 
      ? alpha(theme.palette.action.disabledBackground, 0.3)
      : theme.palette.background.paper,
  transition: theme.transitions.create(['border-color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  '&:hover': isDisabled ? {} : {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

const ViewStatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'isComplete',
})<{ isComplete?: boolean }>(({ theme, isComplete }) => ({
  backgroundColor: isComplete 
    ? alpha(theme.palette.success.main, 0.15)
    : alpha(theme.palette.grey[500], 0.15),
  color: isComplete 
    ? theme.palette.success.dark
    : theme.palette.text.secondary,
  fontWeight: 500,
  '& .MuiChip-icon': {
    color: isComplete ? theme.palette.success.main : theme.palette.grey[500],
  },
}));

// ============================================================================
// CONSTANTS
// ============================================================================

const STANDARD_4_VIEWS = [
  { viewType: ViewType.CC, laterality: Laterality.RIGHT, label: 'RCC' },
  { viewType: ViewType.CC, laterality: Laterality.LEFT, label: 'LCC' },
  { viewType: ViewType.MLO, laterality: Laterality.RIGHT, label: 'RMLO' },
  { viewType: ViewType.MLO, laterality: Laterality.LEFT, label: 'LMLO' },
] as const;

const VIEW_TYPE_OPTIONS = [
  { value: ViewType.CC, label: 'CC (Craniocaudal)' },
  { value: ViewType.MLO, label: 'MLO (Mediolateral Oblique)' },
  { value: ViewType.ML, label: 'ML (Mediolateral)' },
  { value: ViewType.LM, label: 'LM (Lateromedial)' },
  { value: ViewType.XCCL, label: 'XCCL (Exaggerated CC Lateral)' },
  { value: ViewType.XCCM, label: 'XCCM (Exaggerated CC Medial)' },
  { value: ViewType.SPOT, label: 'SPOT (Spot Compression)' },
  { value: ViewType.MAG, label: 'MAG (Magnification)' },
];

const LATERALITY_OPTIONS = [
  { value: Laterality.RIGHT, label: 'Right (R)' },
  { value: Laterality.LEFT, label: 'Left (L)' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse filename to suggest view type and laterality
 */
function parseFilenameForMetadata(filename: string): {
  viewType: ViewType | null;
  laterality: Laterality | null;
} {
  const upper = filename.toUpperCase();
  
  let viewType: ViewType | null = null;
  let laterality: Laterality | null = null;
  
  // Check for laterality
  if (upper.includes('RIGHT') || upper.startsWith('R') || upper.includes('_R_') || upper.includes('-R-')) {
    laterality = Laterality.RIGHT;
  } else if (upper.includes('LEFT') || upper.startsWith('L') || upper.includes('_L_') || upper.includes('-L-')) {
    laterality = Laterality.LEFT;
  }
  
  // Check for view type (XCCL/XCCM must come before CC since CC is a substring)
  if (upper.includes('MLO')) {
    viewType = ViewType.MLO;
  } else if (upper.includes('XCCL')) {
    viewType = ViewType.XCCL;
  } else if (upper.includes('XCCM')) {
    viewType = ViewType.XCCM;
  } else if (upper.includes('CC')) {
    viewType = ViewType.CC;
  } else if (upper.includes('SPOT')) {
    viewType = ViewType.SPOT;
  } else if (upper.includes('MAG')) {
    viewType = ViewType.MAG;
  }
  
  // Handle combined patterns like "RCC", "LMLO"
  if (upper.match(/^R?CC/)) {
    viewType = ViewType.CC;
    if (upper.startsWith('RCC')) laterality = Laterality.RIGHT;
  }
  if (upper.match(/^L?CC/)) {
    viewType = ViewType.CC;
    if (upper.startsWith('LCC')) laterality = Laterality.LEFT;
  }
  if (upper.match(/^R?MLO/)) {
    viewType = ViewType.MLO;
    if (upper.startsWith('RMLO')) laterality = Laterality.RIGHT;
  }
  if (upper.match(/^L?MLO/)) {
    viewType = ViewType.MLO;
    if (upper.startsWith('LMLO')) laterality = Laterality.LEFT;
  }
  
  return { viewType, laterality };
}

/**
 * Get label for view/laterality combination
 */
function getViewLabel(viewType: ViewType, laterality: Laterality): string {
  const latPrefix = laterality === Laterality.RIGHT ? 'R' : 'L';
  return `${latPrefix}${viewType}`;
}

/**
 * Check if a view/laterality combination is in the standard 4-view set
 */
function isStandard4View(viewType: ViewType, laterality: Laterality): boolean {
  return STANDARD_4_VIEWS.some(
    v => v.viewType === viewType && v.laterality === laterality
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  onUploadComplete,
  onError,
}) => {
  const theme = useTheme();
  const { currentCase, addImage, removeImage, userId } = useClinicalCase();
  
  // State
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isDisabled = useMemo(() => {
    if (!currentCase) return true;
    if (currentCase.workflow.isLocked) return true;
    
    const step = currentCase.workflow.currentStep;
    const allowedSteps = [
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.IMAGE_VERIFICATION,
    ];
    
    return !allowedSteps.includes(step);
  }, [currentCase]);
  
  const remainingSlots = useMemo(() => {
    if (!currentCase) return 0;
    return MAX_IMAGES_PER_CASE - currentCase.images.length - pendingImages.length;
  }, [currentCase, pendingImages]);
  
  const existingImages = currentCase?.images || [];
  
  // Calculate 4-view completion
  const fourViewStatus = useMemo(() => {
    const allImages = [
      ...existingImages,
      ...pendingImages
        .filter(p => p.viewType && p.laterality)
        .map(p => ({ viewType: p.viewType!, laterality: p.laterality! })),
    ];
    
    return STANDARD_4_VIEWS.map(view => ({
      ...view,
      isComplete: allImages.some(
        img => img.viewType === view.viewType && img.laterality === view.laterality
      ),
    }));
  }, [existingImages, pendingImages]);
  
  const completedViews = fourViewStatus.filter(v => v.isComplete).length;
  const isComplete4View = completedViews === 4;
  
  // Check for duplicate view/laterality
  const getDuplicateWarning = useCallback((pending: PendingImage): string | null => {
    if (!pending.viewType || !pending.laterality) return null;
    
    const label = getViewLabel(pending.viewType, pending.laterality);
    
    // Check existing images
    const existsInCase = existingImages.some(
      img => img.viewType === pending.viewType && img.laterality === pending.laterality
    );
    
    // Check other pending images
    const existsInPending = pendingImages.some(
      p => p.id !== pending.id && 
           p.viewType === pending.viewType && 
           p.laterality === pending.laterality
    );
    
    if (existsInCase || existsInPending) {
      return `Duplicate ${label} view`;
    }
    
    return null;
  }, [existingImages, pendingImages]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Check remaining slots
    if (fileArray.length > remainingSlots) {
      setError(`Can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}`);
      if (onError) onError(`Can only add ${remainingSlots} more images`);
      return;
    }
    
    // Validate and create pending images
    const newPending: PendingImage[] = [];
    const errors: string[] = [];
    
    for (const file of fileArray) {
      const validation = validateImageFile(file);
      
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.errors[0]?.message || 'Invalid file'}`);
        continue;
      }
      
      const { viewType, laterality } = parseFilenameForMetadata(file.name);
      
      newPending.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        localUrl: URL.createObjectURL(file),
        viewType,
        laterality,
      });
    }
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
      if (onError) onError(errors.join('\n'));
    }
    
    if (newPending.length > 0) {
      setPendingImages(prev => [...prev, ...newPending]);
    }
  }, [remainingSlots, onError]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled) {
      setIsDragOver(true);
    }
  }, [isDisabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isDisabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [isDisabled, handleFileSelect]);
  
  const handleBrowseClick = useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  }, [isDisabled]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [handleFileSelect]);
  
  const handleUpdatePendingMetadata = useCallback((
    pendingId: string,
    field: 'viewType' | 'laterality',
    value: ViewType | Laterality
  ) => {
    setPendingImages(prev => prev.map(p => 
      p.id === pendingId ? { ...p, [field]: value } : p
    ));
  }, []);
  
  const handleRemovePending = useCallback((pendingId: string) => {
    setPendingImages(prev => {
      const toRemove = prev.find(p => p.id === pendingId);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.localUrl);
      }
      return prev.filter(p => p.id !== pendingId);
    });
  }, []);
  
  const handleRemoveExisting = useCallback((imageId: string) => {
    setConfirmRemove(imageId);
  }, []);
  
  const handleConfirmRemove = useCallback(() => {
    if (confirmRemove) {
      const result = removeImage(confirmRemove);
      if (isFailure(result)) {
        setError(result.error?.message || 'Failed to remove image');
      }
      setConfirmRemove(null);
    }
  }, [confirmRemove, removeImage]);
  
  const handleCancelRemove = useCallback(() => {
    setConfirmRemove(null);
  }, []);
  
  // ============================================================================
  // UPLOAD HANDLER
  // ============================================================================
  
  const handleUpload = useCallback(async () => {
    // Validate all pending images have metadata
    const invalid = pendingImages.filter(p => !p.viewType || !p.laterality);
    if (invalid.length > 0) {
      setError('Please select view type and laterality for all images');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    const uploadedImages: MammogramImage[] = [];
    const uploadErrors: string[] = [];
    // Track successful pending IDs locally to avoid stale state issues
    const successfulPendingIds = new Set<string>();
    
    for (const pending of pendingImages) {
      try {
        // Update progress
        setUploadProgress(prev => ({ ...prev, [pending.id]: 50 }));
        
        // Create MammogramImage from pending
        const createResult = createMammogramImage(pending.file, {
          viewType: pending.viewType!,
          laterality: pending.laterality!,
        });
        
        if (isFailure(createResult)) {
          uploadErrors.push(`${pending.file.name}: ${createResult.error?.message || 'Failed to create image'}`);
          setUploadProgress(prev => ({ ...prev, [pending.id]: -1 }));
          continue;
        }
        
        // Persist image blob to IndexedDB for cross-session resume (fire-and-forget)
        persistImageBlob(createResult.data.id, pending.file, pending.file.type).catch(() => {});

        // Add to case
        const addResult = addImage(createResult.data);
        
        if (isFailure(addResult)) {
          uploadErrors.push(`${pending.file.name}: ${addResult.error?.message || 'Failed to add image'}`);
          setUploadProgress(prev => ({ ...prev, [pending.id]: -1 }));
          continue;
        }
        
        setUploadProgress(prev => ({ ...prev, [pending.id]: 100 }));
        uploadedImages.push(createResult.data);
        successfulPendingIds.add(pending.id);
        
        // Clean up blob URL
        URL.revokeObjectURL(pending.localUrl);
        
      } catch (err) {
        uploadErrors.push(`${pending.file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setUploadProgress(prev => ({ ...prev, [pending.id]: -1 }));
      }
    }
    
    // Clear successful uploads from pending using locally tracked IDs
    setPendingImages(prev => prev.filter(p => !successfulPendingIds.has(p.id)));
    setIsUploading(false);
    setUploadProgress({});
    
    if (uploadErrors.length > 0) {
      setError(uploadErrors.join('\n'));
      if (onError) onError(uploadErrors.join('\n'));
    }
    
    if (uploadedImages.length > 0) {
      setLastUploadCount(uploadedImages.length);
    }
  }, [pendingImages, addImage, onError]);
  
  // Check if upload is ready (all pending have metadata)
  const isUploadReady = pendingImages.length > 0 && 
    pendingImages.every(p => p.viewType && p.laterality);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // No case selected
  if (!currentCase) {
    return (
      <Alert severity="info" aria-live="polite">
        <AlertTitle>No Case Selected</AlertTitle>
        Please create or select a case to upload images.
      </Alert>
    );
  }
  
  // Case is finalized
  if (currentCase.workflow.isLocked) {
    return (
      <Alert severity="warning" aria-live="polite">
        <AlertTitle>Case Finalized</AlertTitle>
        This case has been finalized. Images cannot be uploaded or modified.
      </Alert>
    );
  }
  
  // Wrong workflow step
  if (isDisabled) {
    return (
      <Alert severity="info" aria-live="polite">
        <AlertTitle>Complete Patient Info First</AlertTitle>
        Please complete patient information before uploading images.
      </Alert>
    );
  }
  
  return (
    <Box role="region" aria-label="Image Upload">
      {/* 4-View Status */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Standard 4-View Mammography
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedViews} of 4 views • {remainingSlots} images remaining
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {fourViewStatus.map(view => (
              <ViewStatusChip
                key={view.label}
                data-testid={`view-status-${view.label}`}
                data-complete={view.isComplete}
                label={view.label}
                size="small"
                isComplete={view.isComplete}
                icon={view.isComplete ? <CheckCircle fontSize="small" /> : undefined}
              />
            ))}
          </Stack>
        </Stack>
        
        {isComplete4View && (
          <Fade in>
            <Alert severity="success" sx={{ mt: 2 }}>
              Complete 4-view set! You can proceed or add additional views.
            </Alert>
          </Fade>
        )}
      </Paper>
      
      {/* Post-Upload Success Banner */}
      {lastUploadCount > 0 && pendingImages.length === 0 && existingImages.length > 0 && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              variant="outlined"
              onClick={() => {
                setLastUploadCount(0);
                if (onUploadComplete) onUploadComplete(existingImages as MammogramImage[]);
              }}
            >
              Continue to Next Step →
            </Button>
          }
          onClose={() => setLastUploadCount(0)}
        >
          <AlertTitle>Upload Complete</AlertTitle>
          {lastUploadCount} image{lastUploadCount > 1 ? 's' : ''} added successfully ({existingImages.length} total). 
          You can add more images or continue to the next step.
        </Alert>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
          role="alert"
        >
          <AlertTitle>Upload Error</AlertTitle>
          {error.split('\n').map((line, i) => (
            <Typography key={i} variant="body2">{line}</Typography>
          ))}
        </Alert>
      )}
      
      {/* Drop Zone */}
      <DropZone
        data-testid="drop-zone"
        isDragOver={isDragOver}
        isDisabled={isDisabled || remainingSlots === 0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={isDragOver ? 'drag-over' : ''}
        role="button"
        tabIndex={0}
        aria-label="Drop zone for image files. Click or drop files here to upload."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBrowseClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          multiple
          hidden
          onChange={handleInputChange}
          aria-label="Select images"
        />
        
        <CloudUpload sx={{ fontSize: 48, color: LUNIT.teal, mb: 2 }} />
        
        <Typography variant="h6" gutterBottom sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: LUNIT.darkGray }}>
          Drag & Drop Images Here
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph sx={{ fontFamily: LUNIT.fontBody }}>
          or click to browse (RCC, LCC, RMLO, LMLO)
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
          disabled={isDisabled || remainingSlots === 0}
          aria-label="Browse files"
        >
          Browse Files
        </Button>
        
        <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
          Supports: PNG, JPEG, DICOM • Max: {MAX_FILE_SIZE / (1024 * 1024)}MB per file
        </Typography>

        {/* Demo data hint — only when no images are pending or uploaded */}
        {pendingImages.length === 0 && existingImages.length === 0 && (
          <Typography
            variant="caption"
            component="a"
            href="/demo-data/ClinicalVision_Demo_Package.zip"
            download
            sx={{
              display: 'inline-block',
              mt: 1.5,
              color: LUNIT.teal,
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            No images? Download CBIS-DDSM demo mammograms →
          </Typography>
        )}
      </DropZone>
      
      {/* Pending Images */}
      {pendingImages.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Pending Upload ({pendingImages.length})
          </Typography>
          
          <Grid container spacing={2}>
            {pendingImages.map(pending => {
              const duplicate = getDuplicateWarning(pending);
              const progress = uploadProgress[pending.id];
              
              return (
                // @ts-expect-error MUI Grid v5 item prop type overload
                <Grid item xs={12} sm={6} md={4} key={pending.id}>
                  <Card variant="outlined">
                    <CardMedia
                      component="img"
                      height={140}
                      image={pending.localUrl}
                      alt={`Preview of ${pending.file.name}`}
                      sx={{ objectFit: 'contain', bgcolor: 'grey.100' }}
                    />
                    
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="body2" noWrap title={pending.file.name}>
                        {pending.file.name}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        {(pending.file.size / 1024).toFixed(1)} KB
                      </Typography>
                      
                      {/* View Type Select */}
                      <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <InputLabel id={`view-type-${pending.id}`}>View Type</InputLabel>
                        <Select
                          labelId={`view-type-${pending.id}`}
                          value={pending.viewType || ''}
                          label="View Type"
                          onChange={(e) => handleUpdatePendingMetadata(
                            pending.id, 
                            'viewType', 
                            e.target.value as ViewType
                          )}
                          aria-label="View type"
                        >
                          {VIEW_TYPE_OPTIONS.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {/* Laterality Select */}
                      <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <InputLabel id={`laterality-${pending.id}`}>Laterality</InputLabel>
                        <Select
                          labelId={`laterality-${pending.id}`}
                          value={pending.laterality || ''}
                          label="Laterality"
                          onChange={(e) => handleUpdatePendingMetadata(
                            pending.id, 
                            'laterality', 
                            e.target.value as Laterality
                          )}
                          aria-label="Laterality"
                        >
                          {LATERALITY_OPTIONS.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {/* Duplicate Warning */}
                      {duplicate && (
                        <Alert severity="warning" sx={{ mt: 1 }} icon={<Warning fontSize="small" />}>
                          {duplicate}
                        </Alert>
                      )}
                      
                      {/* Upload Progress */}
                      {progress !== undefined && progress >= 0 && (
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ mt: 1 }}
                          aria-label="Upload progress"
                        />
                      )}
                      
                      {progress === -1 && (
                        <Alert severity="error" sx={{ mt: 1 }} icon={<ErrorIcon fontSize="small" />}>
                          Upload failed
                        </Alert>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemovePending(pending.id)}
                        disabled={isUploading}
                        aria-label={`Remove ${pending.file.name}`}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          
          {/* Upload Button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                pendingImages.forEach(img => {
                  if (img.localUrl) URL.revokeObjectURL(img.localUrl);
                });
                setPendingImages([]);
              }}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!isUploadReady || isUploading}
              startIcon={isUploading ? <Refresh className="rotating" /> : <CloudUpload />}
              aria-label="Upload all images"
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingImages.length} Image${pendingImages.length > 1 ? 's' : ''}`}
            </Button>
          </Box>
        </Box>
      )}
      
      {/* Existing Images */}
      {existingImages.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Uploaded Images ({existingImages.length})
          </Typography>
          
          <Grid container spacing={2}>
            {existingImages.map(image => (
              // @ts-expect-error MUI Grid v5 item prop type overload
              <Grid item xs={12} sm={6} md={4} key={image.id}>
                <Card variant="outlined">
                  <CardMedia
                    component="img"
                    height={140}
                    image={image.localUrl}
                    alt={`${getViewLabel(image.viewType, image.laterality)} mammogram`}
                    sx={{ objectFit: 'contain', bgcolor: 'grey.100' }}
                  />
                  
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={getViewLabel(image.viewType, image.laterality)}
                        size="small"
                        color={isStandard4View(image.viewType, image.laterality) ? 'primary' : 'default'}
                      />
                      <Chip
                        label={image.uploadStatus}
                        size="small"
                        color={
                          image.uploadStatus === 'uploaded' ? 'success' :
                          image.uploadStatus === 'uploading' ? 'info' :
                          image.uploadStatus === 'failed' ? 'error' : 'default'
                        }
                        icon={
                          image.uploadStatus === 'uploaded' ? <CheckCircle fontSize="small" /> :
                          image.uploadStatus === 'failed' ? <ErrorIcon fontSize="small" /> :
                          undefined
                        }
                      />
                    </Stack>
                    
                    <Typography variant="body2" noWrap sx={{ mt: 1 }} title={image.filename}>
                      {image.filename}
                    </Typography>
                    
                    {image.uploadStatus === 'uploading' && (
                      <LinearProgress sx={{ mt: 1 }} aria-label="Upload progress" />
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Tooltip title="Remove image">
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveExisting(image.id)}
                        aria-label={`Remove ${image.filename}`}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {/* Confirm Remove Dialog */}
      <Dialog
        open={!!confirmRemove}
        onClose={handleCancelRemove}
        aria-labelledby="confirm-remove-title"
      >
        <DialogTitle id="confirm-remove-title">Remove Image?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this image? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} aria-label="Cancel">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemove} color="error" autoFocus aria-label="Confirm remove">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      
      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default MultiImageUpload;
