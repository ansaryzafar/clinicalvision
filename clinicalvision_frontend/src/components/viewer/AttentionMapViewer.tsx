import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Visibility,
  VisibilityOff,
  CenterFocusStrong,
  Layers,
} from '@mui/icons-material';
import { useSettings } from '../../hooks/useSettings';

/**
 * AttentionMapViewer Component
 * 
 * Clinical image viewer with:
 * - Original mammogram display
 * - AI attention map overlay
 * - Zoom and pan controls
 * - Toggle overlay visibility
 * - Opacity adjustment
 * - Bounding box highlights for suspicious regions
 */

interface AttentionMapViewerProps {
  originalImage?: string;
  attentionMapUrl?: string | null;
  suspiciousRegions?: Array<{
    bbox: [number, number, number, number];
    confidence: number;
    location: string;
  }>;
}

export const AttentionMapViewer: React.FC<AttentionMapViewerProps> = ({
  originalImage,
  attentionMapUrl,
  suspiciousRegions = [],
}) => {
  // Get settings for heatmap visibility preference
  const { settings } = useSettings();
  
  const [zoom, setZoom] = useState(100);
  const [overlayVisible, setOverlayVisible] = useState(settings.showAttentionHeatmap);
  const [overlayOpacity, setOverlayOpacity] = useState(settings.defaultHeatmapOpacity / 100);
  const [viewMode, setViewMode] = useState<'original' | 'attention' | 'overlay'>(
    settings.showAttentionHeatmap ? 'overlay' : 'original'
  );
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);

  // Sync overlay visibility with settings changes
  useEffect(() => {
    setOverlayVisible(settings.showAttentionHeatmap);
    setOverlayOpacity(settings.defaultHeatmapOpacity / 100);
    if (!settings.showAttentionHeatmap && viewMode === 'overlay') {
      setViewMode('original');
    }
  }, [settings.showAttentionHeatmap, settings.defaultHeatmapOpacity]);

  const handleZoomChange = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 50), 300));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handleToggleOverlay = () => {
    setOverlayVisible((prev) => !prev);
  };

  const handleOpacityChange = (_event: Event, value: number | number[]) => {
    setOverlayOpacity((value as number) / 100);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode !== null) {
      setViewMode(newMode as 'original' | 'attention' | 'overlay');
    }
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Image Viewer
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI Attention Analysis
            </Typography>
          </Box>
          
          {attentionMapUrl && (
            <Chip
              icon={<Layers />}
              label="Attention Map Available"
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>

        {/* Control Panel */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Stack spacing={2}>
            {/* View Mode Toggle */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                View Mode
              </Typography>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="original">Original</ToggleButton>
                <ToggleButton value="attention" disabled={!attentionMapUrl}>
                  Attention
                </ToggleButton>
                <ToggleButton value="overlay" disabled={!attentionMapUrl}>
                  Overlay
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Zoom Controls */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Zoom: {zoom}%
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Zoom Out">
                  <IconButton size="small" onClick={() => handleZoomChange(-25)} disabled={zoom <= 50}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Slider
                  value={zoom}
                  min={50}
                  max={300}
                  step={25}
                  onChange={(_e, value) => setZoom(value as number)}
                  sx={{ flex: 1 }}
                />
                <Tooltip title="Zoom In">
                  <IconButton size="small" onClick={() => handleZoomChange(25)} disabled={zoom >= 300}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset Zoom">
                  <IconButton size="small" onClick={handleResetZoom}>
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {/* Overlay Opacity */}
            {attentionMapUrl && viewMode === 'overlay' && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Overlay Opacity: {Math.round(overlayOpacity * 100)}%
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title={overlayVisible ? 'Hide Overlay' : 'Show Overlay'}>
                    <IconButton size="small" onClick={handleToggleOverlay}>
                      {overlayVisible ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </Tooltip>
                  <Slider
                    value={overlayOpacity * 100}
                    min={0}
                    max={100}
                    step={10}
                    onChange={handleOpacityChange}
                    disabled={!overlayVisible}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Image Display */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 600,
            bgcolor: 'clinical.background',
            borderRadius: 2,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {originalImage ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Original Image */}
              <Box
                component="img"
                src={originalImage}
                alt="Mammogram"
                sx={{
                  maxWidth: `${zoom}%`,
                  maxHeight: `${zoom}%`,
                  objectFit: 'contain',
                  display: viewMode === 'attention' ? 'none' : 'block',
                }}
              />

              {/* Attention Map Overlay */}
              {attentionMapUrl && viewMode !== 'original' && (
                <Box
                  component="img"
                  src={attentionMapUrl}
                  alt="Attention Map"
                  sx={{
                    position: viewMode === 'overlay' ? 'absolute' : 'relative',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    maxWidth: `${zoom}%`,
                    maxHeight: `${zoom}%`,
                    objectFit: 'contain',
                    opacity: viewMode === 'overlay' && overlayVisible ? overlayOpacity : 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Suspicious Region Bounding Boxes */}
              {suspiciousRegions.map((region, index) => (
                <Box
                  key={index}
                  onClick={() => setSelectedRegion(index)}
                  sx={{
                    position: 'absolute',
                    left: `${region.bbox[0]}%`,
                    top: `${region.bbox[1]}%`,
                    width: `${region.bbox[2]}%`,
                    height: `${region.bbox[3]}%`,
                    border: 3,
                    borderColor: selectedRegion === index ? 'error.main' : 'warning.main',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'error.main',
                      boxShadow: '0 0 20px rgba(244, 67, 54, 0.5)',
                    },
                  }}
                >
                  <Chip
                    label={`${region.location} (${(region.confidence * 100).toFixed(0)}%)`}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -16,
                      left: 0,
                      bgcolor: 'error.main',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <CenterFocusStrong sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="body1">No image available</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Upload a mammogram to view analysis
              </Typography>
            </Box>
          )}
        </Box>

        {/* Region Info */}
        {suspiciousRegions.length > 0 && (
          <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Suspicious Regions ({suspiciousRegions.length})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {suspiciousRegions.map((region, index) => (
                <Chip
                  key={index}
                  label={`${region.location} - ${(region.confidence * 100).toFixed(0)}%`}
                  onClick={() => setSelectedRegion(index)}
                  color={selectedRegion === index ? 'error' : 'default'}
                  variant={selectedRegion === index ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default AttentionMapViewer;
