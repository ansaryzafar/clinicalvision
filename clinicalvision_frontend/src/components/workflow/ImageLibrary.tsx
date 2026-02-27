/**
 * Image Library Component
 * Manages multiple images for a patient case
 * - Upload multiple images (drag-and-drop)
 * - Display as grid with thumbnails
 * - Edit metadata (view type, laterality)
 * - Delete images
 * - Select image for analysis/viewing
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  Visibility,
  CheckCircle,
  Image as ImageIcon,
  Info,
} from '@mui/icons-material';
import { ImageMetadata, ViewType, Laterality } from '../../types/clinical.types';

interface ImageLibraryProps {
  images: ImageMetadata[];
  activeImageId?: string;
  onImagesAdd: (files: File[]) => Promise<void>;
  onImageDelete: (imageId: string) => void;
  onImageSelect: (imageId: string) => void;
  onImageUpdate: (imageId: string, metadata: Partial<ImageMetadata>) => void;
  maxImages?: number;
  allowMultipleUpload?: boolean;
}

const VIEW_TYPE_OPTIONS: ViewType[] = ['CC', 'MLO', 'LM', 'ML', 'XCCL', 'Mag', 'Spot', 'Other'];
const LATERALITY_OPTIONS: Laterality[] = ['L', 'R', 'B'];

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  CC: 'Craniocaudal',
  MLO: 'Mediolateral Oblique',
  LM: 'Lateromedial',
  ML: 'Mediolateral',
  XCCL: 'Exaggerated CC Lateral',
  Mag: 'Magnification',
  Spot: 'Spot Compression',
  Other: 'Other',
};

export const ImageLibrary: React.FC<ImageLibraryProps> = ({
  images,
  activeImageId,
  onImagesAdd,
  onImageDelete,
  onImageSelect,
  onImageUpdate,
  maxImages = 20,
  allowMultipleUpload = true,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageMetadata | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    viewType: '' as ViewType | '',
    laterality: '' as Laterality | '',
    notes: '',
  });

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      if (images.length + imageFiles.length > maxImages) {
        alert(`Maximum ${maxImages} images allowed per case`);
        return;
      }
      setUploading(true);
      try {
        await onImagesAdd(imageFiles);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (images.length + files.length > maxImages) {
        alert(`Maximum ${maxImages} images allowed per case`);
        return;
      }
      setUploading(true);
      try {
        await onImagesAdd(files);
      } finally {
        setUploading(false);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditOpen = (image: ImageMetadata) => {
    setEditingImage(image);
    setEditForm({
      viewType: image.viewType || '',
      laterality: image.laterality || '',
      notes: image.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (editingImage) {
      onImageUpdate(editingImage.imageId, {
        viewType: editForm.viewType || undefined,
        laterality: editForm.laterality || undefined,
        notes: editForm.notes || undefined,
      });
    }
    setEditDialogOpen(false);
    setEditingImage(null);
  };

  const handleDeleteClick = (imageId: string) => {
    setImageToDelete(imageId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (imageToDelete) {
      onImageDelete(imageToDelete);
    }
    setDeleteConfirmOpen(false);
    setImageToDelete(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        elevation={dragActive ? 4 : 1}
        sx={{
          p: 3,
          mb: 3,
          border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
          bgcolor: dragActive ? '#e3f2fd' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultipleUpload}
          accept="image/*,.dcm"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        <Stack alignItems="center" spacing={2}>
          <CloudUpload sx={{ fontSize: 48, color: dragActive ? '#1976d2' : '#999' }} />
          <Typography variant="h6" color={dragActive ? 'primary' : 'text.secondary'}>
            {uploading ? 'Uploading...' : 'Drag & Drop Images Here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to browse (JPG, PNG, DICOM)
          </Typography>
          <Chip
            icon={<Info />}
            label={`${images.length} / ${maxImages} images uploaded`}
            color={images.length === 0 ? 'default' : 'primary'}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Info Alert */}
      {images.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Clinical Workflow Tip:</strong> Upload all relevant views (CC, MLO for both
          breasts). Multiple images allow comprehensive analysis and comparison.
        </Alert>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Image Library ({images.length} {images.length === 1 ? 'image' : 'images'})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= maxImages}
            >
              Add More Images
            </Button>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {images.map((image) => (
              <Card
                key={image.imageId}
                  elevation={activeImageId === image.imageId ? 6 : 2}
                  sx={{
                    border: activeImageId === image.imageId ? '2px solid #1976d2' : 'none',
                    position: 'relative',
                  }}
                >
                  {/* Thumbnail */}
                  <CardMedia
                    component="div"
                    sx={{
                      height: 180,
                      bgcolor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => onImageSelect(image.imageId)}
                  >
                    {image.thumbnail ? (
                      <img
                        src={image.thumbnail}
                        alt={image.fileName}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <ImageIcon sx={{ fontSize: 64, color: '#ccc' }} />
                    )}
                  </CardMedia>

                  {/* Active Indicator */}
                  {activeImageId === image.imageId && (
                    <Chip
                      icon={<CheckCircle />}
                      label="Active"
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}

                  {/* Analyzed Indicator */}
                  {image.analyzed && (
                    <Chip
                      label="Analyzed"
                      color="success"
                      size="small"
                      sx={{ position: 'absolute', top: 8, left: 8 }}
                    />
                  )}

                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {image.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatFileSize(image.fileSize)} • {formatDate(image.uploadDate)}
                    </Typography>

                    {/* Metadata Chips */}
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      {image.viewType && (
                        <Chip
                          label={image.viewType}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      )}
                      {image.laterality && (
                        <Chip
                          label={image.laterality === 'L' ? 'Left' : image.laterality === 'R' ? 'Right' : 'Bilateral'}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Stack>

                    {image.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {image.notes}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                    <Tooltip title="View in Medical Viewer">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onImageSelect(image.imageId)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Metadata">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleEditOpen(image)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Image">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(image.imageId)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Edit Metadata Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Image Metadata</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="View Type"
              value={editForm.viewType}
              onChange={(e) => setEditForm({ ...editForm, viewType: e.target.value as ViewType })}
            >
              <MenuItem value="">None</MenuItem>
              {VIEW_TYPE_OPTIONS.map((view) => (
                <MenuItem key={view} value={view}>
                  {VIEW_TYPE_LABELS[view]} ({view})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Laterality"
              value={editForm.laterality}
              onChange={(e) => setEditForm({ ...editForm, laterality: e.target.value as Laterality })}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="L">Left (L)</MenuItem>
              <MenuItem value="R">Right (R)</MenuItem>
              <MenuItem value="B">Bilateral (B)</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add notes about this image..."
              helperText="Optional notes visible to clinicians reviewing this case"
            />

            {editingImage && (
              <Alert severity="info">
                <Typography variant="caption">
                  <strong>File:</strong> {editingImage.fileName}<br />
                  <strong>Uploaded:</strong> {formatDate(editingImage.uploadDate)}
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Image?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
          {imageToDelete && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Any findings or measurements associated with this image will also be removed.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
