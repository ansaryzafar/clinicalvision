import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  styled,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Collapse,
  alpha,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  InsertDriveFile,
  Speed,
  AutoAwesome,
  GridView,
  Info,
  Close,
} from '@mui/icons-material';
import { api, AnalysisMode, TileAnalysisResponse } from '../../services/api';
import { professionalColors } from '../../theme/professionalColors';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '@mui/material/styles';

/**
 * ImageUploadComponent
 * 
 * Production-grade medical image upload with:
 * - Drag-and-drop functionality
 * - File validation (size, type)
 * - Upload progress tracking
 * - Clinical metadata display
 * - Error handling with medical context
 */

// Note: UploadArea styling now done inline with theme-aware colors

interface ImageUploadProps {
  onUploadComplete: (result: any, file: File) => void;
  onUploadError?: (error: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  onUploadError,
}) => {
  // Get settings for auto-analyze preference
  const { settings } = useSettings();
  const theme = useTheme();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [autoAnalyzeTriggered, setAutoAnalyzeTriggered] = useState(false);
  
  // Analysis mode selection (Phase 2 feature)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('attention_guided');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Determine recommended analysis mode based on image dimensions
  const isHighRes = imageDimensions && (imageDimensions.width > 1000 || imageDimensions.height > 1000);
  const recommendedMode: AnalysisMode = !imageDimensions ? 'attention_guided' 
    : imageDimensions.width < 500 ? 'global_only'
    : 'attention_guided';

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setImageDimensions(null);

    // Validate file
    const validation = api.validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      if (onUploadError) onUploadError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);

    // Generate preview for image files and get dimensions
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          // Auto-select recommended mode for high-res images
          if (img.width > 1000 || img.height > 1000) {
            setAnalysisMode('attention_guided');
            setShowAdvancedOptions(true);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null); // DICOM files won't have preview
    }
  }, [onUploadError]);

  // Auto-analyze when file is selected (if setting is enabled)
  useEffect(() => {
    if (selectedFile && settings.autoAnalyzeOnUpload && !uploading && !autoAnalyzeTriggered) {
      // Small delay to let the UI update with preview first
      const timer = setTimeout(() => {
        setAutoAnalyzeTriggered(true);
        handleUpload();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedFile, settings.autoAnalyzeOnUpload]);

  // Reset auto-analyze flag when file changes
  useEffect(() => {
    setAutoAnalyzeTriggered(false);
  }, [selectedFile]);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * Upload and analyze image
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      let result;
      
      // Use tile-based analysis for high-res images or if explicitly selected
      const useTileAnalysis = isHighRes && analysisMode !== 'global_only';
      
      if (useTileAnalysis) {
        // Use tile-based analysis
        result = await api.predictWithTiles(selectedFile, {
          mode: analysisMode,
          save_result: true
        });
      } else {
        // Use standard analysis
        result = await api.predict(selectedFile, {
          return_visualization: true,
          return_attention_maps: true,
          save_result: true
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Notify parent component
      setTimeout(() => {
        onUploadComplete(result, selectedFile);
        setUploading(false);
      }, 500);

    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
      if (onUploadError) onUploadError(err.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Reset upload
   */
  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      {/* Upload Area */}
      {!selectedFile && (
        <Paper
          elevation={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            bgcolor: 'background.paper',
            ...(dragOver && {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              borderWidth: 3,
            }),
            '&:hover': {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CloudUpload
            sx={{
              fontSize: 80,
              color: dragOver ? 'primary.main' : 'text.secondary',
              mb: 2,
              transition: 'color 0.3s ease',
            }}
          />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            {dragOver ? 'Drop Image Here' : 'Upload Mammogram'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drag and drop your mammogram image, or click to browse
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
            <Chip label="PNG" size="small" variant="outlined" />
            <Chip label="JPG" size="small" variant="outlined" />
            <Chip label="DICOM" size="small" variant="outlined" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Maximum file size: 50MB
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.dcm,.dicom"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </Paper>
      )}

      {/* Selected File Preview */}
      {selectedFile && !uploading && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            {preview ? (
              <Box
                component="img"
                src={preview}
                sx={{
                  width: 120,
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <InsertDriveFile sx={{ fontSize: 48, color: 'text.secondary' }} />
              </Box>
            )}

            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  File Ready
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {selectedFile.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'DICOM'}
                </Typography>
                {imageDimensions && (
                  <Chip
                    size="small"
                    label={`${imageDimensions.width}×${imageDimensions.height}px`}
                    sx={{
                      bgcolor: isHighRes ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.text.secondary, 0.1),
                      color: isHighRes ? theme.palette.success.main : theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Analysis Mode Selector - shows for high-res images */}
          {isHighRes && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <AutoAwesome fontSize="small" color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  High-Resolution Analysis Mode
                </Typography>
                <Tooltip title="Your image is large enough to benefit from multi-scale tile analysis for better accuracy">
                  <Info fontSize="small" color="action" sx={{ cursor: 'help' }} />
                </Tooltip>
              </Stack>
              
              <FormControl fullWidth size="small">
                <Select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
                >
                  <MenuItem value="global_only">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Speed fontSize="small" />
                      <Box>
                        <Typography variant="body2">Quick Analysis</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Fast screening, best for small images
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="attention_guided">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AutoAwesome fontSize="small" />
                      <Box>
                        <Typography variant="body2">Attention-Guided (Recommended)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Analyzes high-attention regions in detail
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="full_coverage">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GridView fontSize="small" />
                      <Box>
                        <Typography variant="body2">Comprehensive</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Full tile coverage, most thorough
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>
              
              {analysisMode !== 'global_only' && (
                <Alert severity="info" sx={{ mt: 1.5 }} icon={<Info fontSize="small" />}>
                  <Typography variant="caption">
                    Tile analysis will extract and analyze multiple regions at full resolution. 
                    This may take 1-3 minutes but provides more accurate localization.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUpload />}
              onClick={handleUpload}
              fullWidth
              sx={{ 
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9rem',
                textTransform: 'none',
              }}
            >
              Analyze Mammogram
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Close />}
              onClick={handleReset}
              sx={{ 
                minWidth: 120,
                borderRadius: 2,
                borderWidth: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Analyzing Mammogram...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            AI model is processing your image. This may take up to 2 minutes.
          </Typography>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ 
              height: 8, 
              borderRadius: 4, 
              mb: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.2),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {uploadProgress}% complete
          </Typography>
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          onClose={() => setError(null)}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Upload Failed
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ImageUpload;
