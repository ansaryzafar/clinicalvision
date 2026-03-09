import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SuspiciousRegion } from '../../services/api';
import { useHeatmapCache } from './useHeatmapCache';
import { applyWindowLevel as applyWindowLevelCached } from './heatmapCache';
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
  Tooltip,
  Paper,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  PanTool,
  Contrast,
  RotateRight,
  RestartAlt,
  Fullscreen,
  Visibility,
  VisibilityOff,
  Download,
  Straighten,
  MyLocation,
  Info,
  GridOn,
  FullscreenExit,
} from '@mui/icons-material';

/**
 * Professional Medical Image Viewer - Simplified & Reliable
 * 
 * Features:
 * - Clean image display with canvas rendering
 * - Pan, Zoom, Rotate (working reliably)
 * - Window/Level adjustments
 * - AI overlay with smooth rendering
 * - Bounding boxes for suspicious regions
 * - Fullscreen support
 * - Professional medical UI
 */

interface WindowPreset {
  name: string;
  width: number;
  center: number;
  description: string;
}

interface MeasurementPoint {
  x: number;
  y: number;
}

interface GridConfig {
  enabled: boolean;
  spacing: number; // in mm
  color: string;
  pixelsPerMm: number; // calibration
}

interface ProbeInfo {
  x: number;
  y: number;
  value: number;
}

interface WindowPreset {
  name: string;
  width: number;
  center: number;
  description: string;
}

interface MeasurementPoint {
  x: number;
  y: number;
}

interface MedicalViewerProps {
  imageFile?: File | null;
  imageUrl?: string | null;
  attentionMap?: number[][];
  suspiciousRegions?: SuspiciousRegion[];
  // Image metadata for coordinate transformation (full-size mammogram support)
  imageMetadata?: {
    original_width: number;
    original_height: number;
    model_width: number;
    model_height: number;
    scale_x: number;
    scale_y: number;
  } | null;
  // External overlay controls (optional - if not provided, uses internal state)
  externalOverlayVisible?: boolean;
  externalOverlayOpacity?: number;
  externalHeatmapMode?: 'overlay' | 'heatmap' | 'blend';
  onOverlayVisibleChange?: (visible: boolean) => void;
  onOverlayOpacityChange?: (opacity: number) => void;
  onHeatmapModeChange?: (mode: 'overlay' | 'heatmap' | 'blend') => void;
}

const MedicalViewerInner: React.FC<MedicalViewerProps> = ({
  imageFile,
  imageUrl,
  attentionMap,
  suspiciousRegions = [],
  imageMetadata = null,
  externalOverlayVisible,
  externalOverlayOpacity,
  externalHeatmapMode,
  onOverlayVisibleChange,
  onOverlayOpacityChange,
  onHeatmapModeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Cached Window/Level canvas — avoids recomputing pixel-by-pixel every render
  const wlCacheRef = useRef<{
    canvas: HTMLCanvasElement | null;
    width: number;
    center: number;
    imgSrc: string;
  }>({ canvas: null, width: 255, center: 128, imgSrc: '' });
  
  // Image state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Viewport state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [windowLevel, setWindowLevel] = useState({ width: 255, center: 128 });
  
  // UI state
  const [activeTool, setActiveTool] = useState('Pan');
  const [measurePoints, setMeasurePoints] = useState<MeasurementPoint[]>([]);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [probeInfo, setProbeInfo] = useState<ProbeInfo | null>(null);
  const [showPixelProbe, setShowPixelProbe] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Internal overlay state (used when external props not provided)
  const [internalOverlayVisible, setInternalOverlayVisible] = useState(true);
  const [internalOverlayOpacity, setInternalOverlayOpacity] = useState(0.7);
  const [internalHeatmapMode, setInternalHeatmapMode] = useState<'overlay' | 'heatmap' | 'blend'>('blend');
  
  // Use external props if provided, otherwise use internal state
  const overlayVisible = externalOverlayVisible !== undefined ? externalOverlayVisible : internalOverlayVisible;
  const overlayOpacity = externalOverlayOpacity !== undefined ? externalOverlayOpacity : internalOverlayOpacity;
  const heatmapMode = externalHeatmapMode !== undefined ? externalHeatmapMode : internalHeatmapMode;
  
  // Handlers that work with both internal and external state
  const setOverlayVisible = (visible: boolean) => {
    if (onOverlayVisibleChange) {
      onOverlayVisibleChange(visible);
    } else {
      setInternalOverlayVisible(visible);
    }
  };
  const setOverlayOpacity = (opacity: number) => {
    if (onOverlayOpacityChange) {
      onOverlayOpacityChange(opacity);
    } else {
      setInternalOverlayOpacity(opacity);
    }
  };
  const setHeatmapMode = (mode: 'overlay' | 'heatmap' | 'blend') => {
    if (onHeatmapModeChange) {
      onHeatmapModeChange(mode);
    } else {
      setInternalHeatmapMode(mode);
    }
  };
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    enabled: false,
    spacing: 5, // 5mm grid (smaller blocks)
    color: '#00ff00',
    pixelsPerMm: 10, // default calibration (adjustable)
  });

  // Window presets for mammography
  const windowPresets: WindowPreset[] = [
    { name: 'Standard', width: 255, center: 128, description: 'Default view' },
    { name: 'Soft Tissue', width: 350, center: 50, description: 'Enhanced soft tissue' },
    { name: 'Calcification', width: 150, center: 200, description: 'Bright calcifications' },
    { name: 'High Contrast', width: 100, center: 128, description: 'Maximum contrast' },
  ];

  /**
   * Load image from file or URL
   */
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setIsLoaded(true);
          resetView();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageFile);
    } else if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setIsLoaded(true);
        resetView();
      };
      img.src = imageUrl;
    }
  }, [imageFile, imageUrl]);

  /**
   * Render canvas whenever state changes (EXCLUDING mouse position)
   * Mouse position is handled by the lightweight overlay canvas
   */
  useEffect(() => {
    if (image && canvasRef.current) {
      renderCanvas();
    }
  }, [image, zoom, pan, rotation, windowLevel, overlayVisible, overlayOpacity, heatmapMode, attentionMap, suspiciousRegions, measurePoints, gridConfig]);

  /**
   * Lightweight overlay render for measurement cursor preview.
   * This runs on every mouse move during measurement mode,
   * but only redraws the overlay canvas (not the expensive main canvas).
   */
  useEffect(() => {
    renderOverlay();
  }, [currentMousePos, measurePoints, zoom, gridConfig]);

  /**
   * Fullscreen change listener
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * Wheel event listener (with passive: false to allow preventDefault)
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom]); // Re-attach when zoom changes to capture current zoom value

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in input fields
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          resetView();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          setActiveTool('Pan');
          break;
        case 'w':
          e.preventDefault();
          setActiveTool('Window/Level');
          break;
        case 'm':
          e.preventDefault();
          setActiveTool('Measure');
          break;
        case 'o':
          e.preventDefault();
          setOverlayVisible(!overlayVisible);
          break;
        case 'i':
          e.preventDefault();
          setShowPixelProbe(!showPixelProbe);
          break;
        case 'g':
          e.preventDefault();
          setGridConfig({...gridConfig, enabled: !gridConfig.enabled});
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'escape':
          if (measurePoints.length > 0) {
            setMeasurePoints([]);
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [overlayVisible, showPixelProbe, measurePoints, showShortcuts, activeTool, gridConfig]);

  /**
   * Reset view to defaults
   */
  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setWindowLevel({ width: 255, center: 128 });
    setMeasurePoints([]);
    setProbeInfo(null);
  };

  /**
   * Main canvas rendering function
   * 
   * Performance: Uses cached heatmap and cached W/L canvas to avoid
   * recomputing expensive pixel operations on every render.
   */
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate image dimensions to fit canvas
    const scale = Math.min(
      canvas.width / image.width,
      canvas.height / image.height
    ) * 0.9;

    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;

    // Draw image with window/level applied (CACHED)
    drawImageWithWindowLevel(ctx, image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

    // Draw AI overlay if visible (uses CACHED heatmap canvas)
    if (overlayVisible && attentionMap && attentionMap.length > 0) {
      drawAttentionMap(ctx, attentionMap, imgWidth, imgHeight);
    }

    // Draw bounding boxes
    if (overlayVisible && suspiciousRegions.length > 0) {
      drawBoundingBoxes(ctx, suspiciousRegions, imgWidth, imgHeight);
    }

    ctx.restore();

    // Draw completed measurement lines (in screen space) — NOT the preview cursor
    if (measurePoints.length > 0) {
      drawMeasurements(ctx);
    }

    // Draw measurement grid (in screen space)
    if (gridConfig.enabled) {
      drawMeasurementGrid(ctx);
    }
  };

  /**
   * Lightweight overlay render — only for measurement cursor preview.
   * Draws on a separate transparent canvas positioned over the main canvas.
   * This is the ONLY function triggered by mouse movement during measurement.
   */
  const renderOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw if there's a pending measurement point and mouse position
    if (measurePoints.length % 2 !== 1 || !currentMousePos) return;

    const p = measurePoints[measurePoints.length - 1];

    ctx.save();

    // Preview dashed line from pending point to mouse
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(currentMousePos.x, currentMousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Preview distance label
    const dx = currentMousePos.x - p.x;
    const dy = currentMousePos.y - p.y;
    const previewDistPx = Math.sqrt(dx * dx + dy * dy);
    const previewDistMm = (previewDistPx / zoom) / gridConfig.pixelsPerMm;

    const midX = (p.x + currentMousePos.x) / 2;
    const midY = (p.y + currentMousePos.y) / 2;

    const previewText = `${previewDistPx.toFixed(1)}px (${previewDistMm.toFixed(1)}mm)`;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(previewText);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.fillRect(midX - textMetrics.width / 2 - 4, midY - 18, textMetrics.width + 8, 18);
    ctx.fillStyle = '#ffff00';
    ctx.fillText(previewText, midX, midY - 5);

    ctx.restore();
  };

  /**
   * Draw image with window/level adjustment (CACHED)
   * Uses applyWindowLevel from heatmapCache.ts — recomputes only when W/L params change.
   */
  const drawImageWithWindowLevel = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const cache = wlCacheRef.current;
    const needsRecompute =
      !cache.canvas ||
      cache.width !== windowLevel.width ||
      cache.center !== windowLevel.center ||
      cache.imgSrc !== img.src;

    if (needsRecompute) {
      // Draw original image to a source canvas at full resolution
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) return;
      sourceCtx.drawImage(img, 0, 0);

      // Apply W/L via cached utility
      cache.canvas = applyWindowLevelCached(sourceCanvas, windowLevel.width, windowLevel.center);
      cache.width = windowLevel.width;
      cache.center = windowLevel.center;
      cache.imgSrc = img.src;
    }

    if (cache.canvas) {
      ctx.drawImage(cache.canvas, x, y, width, height);
    }
  };

  /**
   * Turbo colormap - state-of-the-art perceptually uniform colormap
   * Designed by Google for scientific visualization, better than jet/viridis for heatmaps
   * Maps value [0,1] to RGB [0,255]
   * Medical-grade Jet colormap matching Lunit/professional medical imaging
   */
  const jetColormap = (t: number): [number, number, number] => {
    // Clamp to [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Jet colormap: blue → cyan → green → yellow → red
    let r: number, g: number, b: number;
    
    if (t < 0.125) {
      // Dark blue to blue
      r = 0;
      g = 0;
      b = 0.5 + t * 4;
    } else if (t < 0.375) {
      // Blue to cyan
      r = 0;
      g = (t - 0.125) * 4;
      b = 1;
    } else if (t < 0.625) {
      // Cyan to green to yellow
      r = (t - 0.375) * 4;
      g = 1;
      b = 1 - (t - 0.375) * 4;
    } else if (t < 0.875) {
      // Yellow to red
      r = 1;
      g = 1 - (t - 0.625) * 4;
      b = 0;
    } else {
      // Red to dark red
      r = 1 - (t - 0.875) * 2;
      g = 0;
      b = 0;
    }
    
    return [
      Math.round(Math.max(0, Math.min(255, r * 255))),
      Math.round(Math.max(0, Math.min(255, g * 255))),
      Math.round(Math.max(0, Math.min(255, b * 255)))
    ];
  };

  /**
   * Enterprise-grade GradCAM++ heatmap rendering
   * Matches professional medical imaging software (Lunit INSIGHT style)
   * 
   * Three modes:
   * - 'overlay': Transparent heatmap on grayscale image
   * - 'heatmap': Full heatmap only (no underlying image)
   * - 'blend': Smooth blend of grayscale and heatmap
   */
  const drawAttentionMap = (
    ctx: CanvasRenderingContext2D,
    heatmap: number[][],
    imgWidth: number,
    imgHeight: number,
    baseImage?: HTMLImageElement
  ) => {
    if (!heatmap || heatmap.length === 0 || !heatmap[0]) return;
    
    const heatHeight = heatmap.length;
    const heatWidth = heatmap[0].length;

    // Create high-res heatmap canvas (upscale for smooth rendering)
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = imgWidth;
    heatCanvas.height = imgHeight;
    const heatCtx = heatCanvas.getContext('2d');
    if (!heatCtx) return;

    // First, draw the heatmap at native resolution then upscale
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = heatWidth;
    smallCanvas.height = heatHeight;
    const smallCtx = smallCanvas.getContext('2d');
    if (!smallCtx) return;

    const imageData = smallCtx.createImageData(heatWidth, heatHeight);
    const data = imageData.data;

    // Find min/max for normalization
    let minVal = Infinity, maxVal = -Infinity;
    for (let y = 0; y < heatHeight; y++) {
      for (let x = 0; x < heatWidth; x++) {
        const val = heatmap[y][x];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }
    const range = maxVal - minVal || 1;

    // Apply Jet colormap - FULL coverage (no threshold)
    for (let y = 0; y < heatHeight; y++) {
      for (let x = 0; x < heatWidth; x++) {
        const rawValue = heatmap[y][x];
        const normalizedValue = (rawValue - minVal) / range;
        const idx = (y * heatWidth + x) * 4;
        
        const [r, g, b] = jetColormap(normalizedValue);
        
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // Full opacity in source
      }
    }

    smallCtx.putImageData(imageData, 0, 0);

    // Upscale with high-quality interpolation
    heatCtx.imageSmoothingEnabled = true;
    heatCtx.imageSmoothingQuality = 'high';
    heatCtx.drawImage(smallCanvas, 0, 0, imgWidth, imgHeight);

    // Apply Gaussian-like blur for smoother appearance
    heatCtx.filter = 'blur(2px)';
    heatCtx.drawImage(heatCanvas, 0, 0);
    heatCtx.filter = 'none';

    // Draw based on mode
    if (heatmapMode === 'heatmap') {
      // Pure heatmap view
      ctx.globalAlpha = 1.0;
      ctx.drawImage(heatCanvas, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    } else if (heatmapMode === 'blend') {
      // Blend mode: multiply heatmap with grayscale for professional look
      ctx.globalAlpha = overlayOpacity;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(heatCanvas, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
      ctx.globalCompositeOperation = 'source-over';
      
      // Add slight screen overlay for highlights
      ctx.globalAlpha = overlayOpacity * 0.3;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(heatCanvas, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Overlay mode: transparent heatmap on top
      ctx.globalAlpha = overlayOpacity;
      ctx.drawImage(heatCanvas, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    }
    
    ctx.globalAlpha = 1.0;
  };

  /**
   * Draw subtle, professional bounding boxes (Lunit-style)
   * Supports both model-space (224x224) and original-space coordinates
   */
  const drawBoundingBoxes = (
    ctx: CanvasRenderingContext2D,
    regions: SuspiciousRegion[],
    imgWidth: number,
    imgHeight: number
  ) => {
    // Determine coordinate space:
    // - If we have imageMetadata AND bbox_original, use original coordinates
    // - Otherwise, use bbox (model space, 224x224)
    const useOriginalCoords = imageMetadata && regions.some(r => r.bbox_original);
    
    // Calculate scale factors
    const sourceWidth = useOriginalCoords ? imageMetadata!.original_width : 224;
    const sourceHeight = useOriginalCoords ? imageMetadata!.original_height : 224;
    const scaleX = imgWidth / sourceWidth;
    const scaleY = imgHeight / sourceHeight;

    regions.forEach((region, index) => {
      // Use original coordinates if available, otherwise use model coordinates
      const bbox = (useOriginalCoords && region.bbox_original) 
        ? region.bbox_original 
        : region.bbox;
      const [x, y, width, height] = bbox;

      const boxX = (x * scaleX) - imgWidth / 2;
      const boxY = (y * scaleY) - imgHeight / 2;
      const boxW = width * scaleX;
      const boxH = height * scaleY;

      // Subtle, professional white box (Lunit-style)
      // Simple white rectangle - clean and minimal
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      
      // Optional: subtle label only for high-attention regions
      if (region.attention_score > 0.7) {
        const label = `${(region.attention_score * 100).toFixed(0)}%`;
        ctx.font = `${12 / zoom}px Arial`;
        const labelWidth = ctx.measureText(label).width + 8;
        const labelHeight = 16 / zoom;
        
        // Small label at top-left of box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(boxX, boxY - labelHeight - 2, labelWidth, labelHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, boxX + 4, boxY - labelHeight / 2 - 2);
        ctx.textBaseline = 'alphabetic';
      }
    });
  };

  /**
   * Draw measurement grid overlay
   */
  const drawMeasurementGrid = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.save();
    ctx.strokeStyle = gridConfig.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([]);

    const gridSpacingPx = gridConfig.spacing * gridConfig.pixelsPerMm * zoom;
    const width = canvas.width;
    const height = canvas.height;

    // Calculate offset based on pan
    const centerX = width / 2;
    const centerY = height / 2;
    const offsetX = (centerX + pan.x) % gridSpacingPx;
    const offsetY = (centerY + pan.y) % gridSpacingPx;

    // Draw vertical lines
    for (let x = offsetX; x < width; x += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = offsetY; y < height; y += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw grid labels at intersections (every 5th line)
    ctx.font = '10px monospace';
    ctx.fillStyle = gridConfig.color;
    ctx.globalAlpha = 0.7;
    let labelCount = 0;
    for (let x = offsetX; x < width && labelCount < 10; x += gridSpacingPx * 5) {
      for (let y = offsetY; y < height && labelCount < 10; y += gridSpacingPx * 5) {
        const mmX = Math.round(((x - centerX - pan.x) / zoom) / gridConfig.pixelsPerMm);
        const mmY = Math.round(((y - centerY - pan.y) / zoom) / gridConfig.pixelsPerMm);
        if (mmX !== 0 || mmY !== 0) {
          ctx.fillText(`${mmX},${mmY}`, x + 2, y - 2);
          labelCount++;
        }
      }
    }

    ctx.restore();
  };

  /**
   * Draw measurement lines
   */
  const drawMeasurements = (ctx: CanvasRenderingContext2D) => {
    if (measurePoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    // Draw lines between points
    for (let i = 0; i < measurePoints.length - 1; i += 2) {
      const p1 = measurePoints[i];
      const p2 = measurePoints[i + 1];
      
      if (p2) {
        // Draw solid line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Calculate distance
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distancePx = Math.sqrt(dx * dx + dy * dy);
        const distanceMm = (distancePx / zoom) / gridConfig.pixelsPerMm;

        // Draw distance label with background
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const labelText = `${distancePx.toFixed(1)}px (${distanceMm.toFixed(1)}mm)`;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        // Draw background for label
        const textMetrics = ctx.measureText(labelText);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(midX - textMetrics.width / 2 - 4, midY - 20, textMetrics.width + 8, 20);
        
        // Draw label text
        ctx.fillStyle = '#00ff00';
        ctx.fillText(labelText, midX, midY - 6);

        // Draw larger endpoints with border
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#00ff00';
        
        // Point 1
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Point 2
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw pending point (first click waiting for second)
    // NOTE: The preview LINE to currentMousePos is now drawn on the overlay canvas
    // (renderOverlay) to avoid triggering full main canvas re-renders on mouse move.
    if (measurePoints.length % 2 === 1) {
      const p = measurePoints[measurePoints.length - 1];
      
      // Pulsing effect for pending point (static — doesn't need mouse pos)
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#ffff00';
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Add crosshair at pending point
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - 10, p.y);
      ctx.lineTo(p.x + 10, p.y);
      ctx.moveTo(p.x, p.y - 10);
      ctx.lineTo(p.x, p.y + 10);
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Mouse event handlers
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas scaling - map from display coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (activeTool === 'Measure') {
      // Add measurement point at precise click location
      setMeasurePoints([...measurePoints, { x, y }]);
      e.preventDefault(); // Prevent any default behavior
      e.stopPropagation(); // Stop event propagation
    } else {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas scaling - map from display coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Track mouse position for measurement preview
    if (activeTool === 'Measure' && measurePoints.length % 2 === 1) {
      setCurrentMousePos({ x, y });
    } else {
      setCurrentMousePos(null);
    }

    // Update pixel probe if enabled
    if (showPixelProbe) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const value = (pixel[0] + pixel[1] + pixel[2]) / 3;
        setProbeInfo({ x: Math.round(x), y: Math.round(y), value: Math.round(value) });
      }
    }

    // Handle pan and window/level dragging
    if (!isDragging) return;

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    if (activeTool === 'Pan') {
      setPan({ x: pan.x + dx, y: pan.y + dy });
    } else if (activeTool === 'Window/Level') {
      setWindowLevel({
        width: Math.max(1, windowLevel.width + dx),
        center: Math.max(0, Math.min(255, windowLevel.center - dy)),
      });
    }

    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCurrentMousePos(null);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.1, Math.min(10, zoom + delta)));
  };

  /**
   * Apply window preset
   */
  const applyWindowPreset = (preset: WindowPreset) => {
    setWindowLevel({ width: preset.width, center: preset.center });
  };

  /**
   * Tool actions
   */
  const handleZoomIn = () => setZoom(Math.min(10, zoom + 0.25));
  const handleZoomOut = () => setZoom(Math.max(0.1, zoom - 0.25));
  const handleRotate = () => setRotation((rotation + 90) % 360);
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'mammogram_view.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 3, border: 2, borderColor: 'primary.main' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isLoaded ? 'success.main' : 'grey.400',
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Medical Image Viewer
            </Typography>
          </Stack>
          {isLoaded && (
            <Stack direction="row" spacing={1}>
              <Chip label={`${(zoom * 100).toFixed(0)}%`} size="small" color="primary" variant="outlined" />
              <Chip label={activeTool} size="small" color="info" />
              {suspiciousRegions.length > 0 && (
                <Chip label={`${suspiciousRegions.length} Regions`} size="small" color="error" />
              )}
            </Stack>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Toolbar */}
        <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            {/* Tools */}
            <ToggleButtonGroup
              value={activeTool}
              exclusive
              onChange={(e, value) => value && setActiveTool(value)}
              size="small"
            >
              <ToggleButton value="Pan">
                <Tooltip title="Pan (P) - Drag to move">
                  <PanTool fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="Window/Level">
                <Tooltip title="Window/Level (W) - Adjust contrast">
                  <Contrast fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="Measure">
                <Tooltip title="Measure (M) - Click two points">
                  <Straighten fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* Window Presets */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 'bold', mr: 1 }}>
                Presets:
              </Typography>
              {windowPresets.map((preset) => (
                <Button
                  key={preset.name}
                  size="small"
                  variant={
                    windowLevel.width === preset.width && windowLevel.center === preset.center
                      ? 'contained'
                      : 'outlined'
                  }
                  onClick={() => applyWindowPreset(preset)}
                  sx={{ minWidth: '80px' }}
                >
                  <Tooltip title={preset.description}>
                    <span>{preset.name}</span>
                  </Tooltip>
                </Button>
              ))}
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Zoom */}
            <Tooltip title="Zoom In"><IconButton size="small" onClick={handleZoomIn}><ZoomIn /></IconButton></Tooltip>
            <Tooltip title="Zoom Out"><IconButton size="small" onClick={handleZoomOut}><ZoomOut /></IconButton></Tooltip>

            <Divider orientation="vertical" flexItem />

            {/* View */}
            <Tooltip title="Rotate 90°"><IconButton size="small" onClick={handleRotate}><RotateRight /></IconButton></Tooltip>
            <Tooltip title="Reset View"><IconButton size="small" onClick={resetView} color="warning"><RestartAlt /></IconButton></Tooltip>

            <Divider orientation="vertical" flexItem />

            {/* Overlay */}
            <Tooltip title={overlayVisible ? 'Hide Overlay (O)' : 'Show Overlay (O)'}>
              <IconButton size="small" onClick={() => setOverlayVisible(!overlayVisible)} color={overlayVisible ? 'success' : 'default'}>
                {overlayVisible ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </Tooltip>

            <Tooltip title={showPixelProbe ? 'Hide Pixel Probe (I)' : 'Show Pixel Probe (I)'}>
              <IconButton size="small" onClick={() => setShowPixelProbe(!showPixelProbe)} color={showPixelProbe ? 'info' : 'default'}>
                <MyLocation />
              </IconButton>
            </Tooltip>

            <Tooltip title={gridConfig.enabled ? 'Hide Grid (G)' : 'Show Measurement Grid (G)'}>
              <IconButton 
                size="small" 
                onClick={() => setGridConfig({...gridConfig, enabled: !gridConfig.enabled})} 
                color={gridConfig.enabled ? 'success' : 'default'}
              >
                <GridOn />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            {/* Actions */}
            <Tooltip title="Keyboard Shortcuts (?)">
              <IconButton size="small" onClick={() => setShowShortcuts(!showShortcuts)} color={showShortcuts ? 'primary' : 'default'}>
                <Info />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}>
              <IconButton size="small" onClick={handleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Download View"><IconButton size="small" onClick={handleDownload}><Download /></IconButton></Tooltip>
          </Stack>

          {/* Sliders */}
          {isLoaded && (
            <Box sx={{ mt: 2 }}>
              {overlayVisible && attentionMap && (
                <>
                  {/* Heatmap Mode Selection */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ minWidth: 100 }}>View Mode:</Typography>
                    <ToggleButtonGroup
                      value={heatmapMode}
                      exclusive
                      onChange={(e, value) => value && setHeatmapMode(value)}
                      size="small"
                    >
                      <ToggleButton value="overlay" sx={{ px: 1.5, py: 0.5, fontSize: '0.7rem' }}>
                        Overlay
                      </ToggleButton>
                      <ToggleButton value="blend" sx={{ px: 1.5, py: 0.5, fontSize: '0.7rem' }}>
                        Blend
                      </ToggleButton>
                      <ToggleButton value="heatmap" sx={{ px: 1.5, py: 0.5, fontSize: '0.7rem' }}>
                        Heatmap
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                  
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ minWidth: 100 }}>Intensity:</Typography>
                    <Slider
                      value={overlayOpacity}
                      onChange={(e, value) => setOverlayOpacity(value as number)}
                      min={0.1}
                      max={1}
                      step={0.1}
                      size="small"
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                  </Stack>
                  
                  {/* Professional Jet Color Scale Legend */}
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Attention Scale:
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Typography variant="caption" color="text.secondary">Low</Typography>
                      <Box sx={{ 
                        flex: 1,
                        height: 14,
                        borderRadius: 1,
                        background: 'linear-gradient(to right, #00007f, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #7f0000)',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }} />
                      <Typography variant="caption" color="text.secondary">High</Typography>
                    </Box>
                  </Box>
                </>
              )}
              {gridConfig.enabled && (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="caption" sx={{ minWidth: 100 }}>Grid Spacing:</Typography>
                    <Slider
                      value={gridConfig.spacing}
                      onChange={(e, value) => setGridConfig({...gridConfig, spacing: value as number})}
                      min={2}
                      max={20}
                      step={1}
                      size="small"
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}mm`}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="caption" sx={{ minWidth: 100 }}>Calibration:</Typography>
                    <Slider
                      value={gridConfig.pixelsPerMm}
                      onChange={(e, value) => setGridConfig({...gridConfig, pixelsPerMm: value as number})}
                      min={1}
                      max={20}
                      step={0.5}
                      size="small"
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}px/mm`}
                    />
                  </Stack>
                </Stack>
              )}
            </Box>
          )}
        </Paper>

        {/* Canvas */}
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: isFullscreen ? '100vh' : 600,
            bgcolor: '#000',
            borderRadius: isFullscreen ? 0 : 2,
            border: isFullscreen ? 0 : 2,
            borderColor: 'divider',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{
              width: '100%',
              height: '100%',
              cursor: activeTool === 'Pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          {/* Overlay canvas for measurement cursor preview — 
              positioned absolutely over main canvas so mouse moves 
              only trigger lightweight overlay re-renders */}
          <canvas
            ref={overlayCanvasRef}
            width={800}
            height={600}
            data-testid="overlay-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />

          {/* Fullscreen GradCAM Legend - Top of screen */}
          {isFullscreen && overlayVisible && attentionMap && attentionMap.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: 15,
                left: '50%',
                transform: 'translateX(-50%)',
                px: 2,
                py: 0.75,
                bgcolor: 'rgba(0, 0, 0, 0.75)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  GradCAM++
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>Low</Typography>
                  <Box sx={{ 
                    width: 120,
                    height: 10,
                    borderRadius: 1,
                    background: 'linear-gradient(to right, #00007f, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #7f0000)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>High</Typography>
                </Box>
                <Chip 
                  label={heatmapMode.charAt(0).toUpperCase() + heatmapMode.slice(1)} 
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255, 152, 0, 0.3)',
                    color: '#ff9800',
                    fontWeight: 600,
                    fontSize: '0.6rem',
                    height: 20,
                  }}
                />
              </Stack>
            </Paper>
          )}

          {/* Fullscreen Floating Toolbar */}
          {isFullscreen && (
            <Paper
              elevation={6}
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                p: 1.5,
                bgcolor: 'rgba(0, 0, 0, 0.85)',
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Tools */}
                <ToggleButtonGroup
                  value={activeTool}
                  exclusive
                  onChange={(e, value) => value && setActiveTool(value)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(33, 150, 243, 0.5)',
                        color: 'white',
                        border: '1px solid rgba(33, 150, 243, 0.8)',
                        '&:hover': {
                          bgcolor: 'rgba(33, 150, 243, 0.6)',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="Pan">
                    <Tooltip title="Pan Tool (P)" arrow placement="top">
                      <PanTool fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="Window/Level">
                    <Tooltip title="Window/Level (W)" arrow placement="top">
                      <Contrast fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="Measure">
                    <Tooltip title="Measure Tool (M)" arrow placement="top">
                      <Straighten fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', height: 32 }} />

                {/* Zoom */}
                <Tooltip title="Zoom In (+)" arrow placement="top">
                  <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ color: 'white', minWidth: 50, textAlign: 'center', fontWeight: 'bold' }}>
                  {(zoom * 100).toFixed(0)}%
                </Typography>
                <Tooltip title="Zoom Out (-)" arrow placement="top">
                  <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', height: 32 }} />

                {/* Quick Actions */}
                <Tooltip title="Rotate 90°" arrow placement="top">
                  <IconButton size="small" onClick={handleRotate} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <RotateRight />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset View (R)" arrow placement="top">
                  <IconButton size="small" onClick={resetView} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
                <Tooltip title={overlayVisible ? 'Hide Overlay (O)' : 'Show Overlay (O)'} arrow placement="top">
                  <IconButton 
                    size="small" 
                    onClick={() => setOverlayVisible(!overlayVisible)} 
                    sx={{ 
                      color: overlayVisible ? '#4caf50' : 'rgba(255,255,255,0.7)', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </Tooltip>
                
                {/* GradCAM Mode Controls - Only show when overlay is visible and attention map exists */}
                {overlayVisible && attentionMap && attentionMap.length > 0 && (
                  <>
                    <ToggleButtonGroup
                      value={heatmapMode}
                      exclusive
                      onChange={(e, value) => value && setHeatmapMode(value)}
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '0.6rem',
                          px: 0.75,
                          py: 0.25,
                          minWidth: 'auto',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(255, 152, 0, 0.5)',
                            color: 'white',
                            border: '1px solid rgba(255, 152, 0, 0.8)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 152, 0, 0.6)',
                            },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="overlay">
                        <Tooltip title="Transparent overlay" arrow placement="top">
                          <span>OVR</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value="blend">
                        <Tooltip title="Blended view" arrow placement="top">
                          <span>BLD</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value="heatmap">
                        <Tooltip title="Heatmap only" arrow placement="top">
                          <span>HTM</span>
                        </Tooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>
                    
                    {/* Intensity Slider */}
                    <Tooltip title={`Intensity: ${(overlayOpacity * 100).toFixed(0)}%`} arrow placement="top">
                      <Box sx={{ width: 60, mx: 0.5 }}>
                        <Slider
                          value={overlayOpacity}
                          onChange={(e, value) => setOverlayOpacity(value as number)}
                          min={0.1}
                          max={1}
                          step={0.1}
                          size="small"
                          sx={{
                            color: '#ff9800',
                            '& .MuiSlider-thumb': {
                              width: 10,
                              height: 10,
                            },
                            '& .MuiSlider-rail': {
                              bgcolor: 'rgba(255,255,255,0.3)',
                            },
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </>
                )}
                
                <Tooltip title={gridConfig.enabled ? 'Hide Grid (G)' : 'Show Grid (G)'} arrow placement="top">
                  <IconButton 
                    size="small" 
                    onClick={() => setGridConfig({...gridConfig, enabled: !gridConfig.enabled})} 
                    sx={{ 
                      color: gridConfig.enabled ? '#4caf50' : 'rgba(255,255,255,0.7)', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    <GridOn />
                  </IconButton>
                </Tooltip>
                <Tooltip title={showPixelProbe ? 'Hide Pixel Probe (I)' : 'Show Pixel Probe (I)'} arrow placement="top">
                  <IconButton 
                    size="small" 
                    onClick={() => setShowPixelProbe(!showPixelProbe)} 
                    sx={{ 
                      color: showPixelProbe ? '#2196f3' : 'rgba(255,255,255,0.7)', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    <MyLocation />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', height: 32 }} />

                <Tooltip title="Exit Fullscreen (F)" arrow placement="top">
                  <IconButton 
                    size="small" 
                    onClick={handleFullscreen} 
                    sx={{ 
                      color: 'white', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    <FullscreenExit />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          )}

          {/* Pixel Probe Display */}
          {showPixelProbe && probeInfo && isLoaded && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                p: 1.5,
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                minWidth: 150,
              }}
            >
              <Typography variant="caption" fontWeight="bold" display="block">
                Pixel Probe
              </Typography>
              <Typography variant="caption" display="block">
                X: {probeInfo.x}px
              </Typography>
              <Typography variant="caption" display="block">
                Y: {probeInfo.y}px
              </Typography>
              <Typography variant="caption" display="block">
                Value: {probeInfo.value}
              </Typography>
            </Paper>
          )}

          {/* Measurement Info */}
          {measurePoints.length > 0 && isLoaded && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                p: 1.5,
                bgcolor: 'rgba(0, 255, 0, 0.9)',
                color: 'black',
              }}
            >
              <Typography variant="caption" fontWeight="bold">
                {measurePoints.length % 2 === 0
                  ? `${measurePoints.length / 2} measurement(s)`
                  : 'Click second point'}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Press ESC to clear
              </Typography>
            </Paper>
          )}

          {!isLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">No Image Loaded</Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                Upload a mammogram to begin analysis
              </Typography>
            </Box>
          )}
        </Box>

        {/* Instructions */}
        {isLoaded && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.dark', mb: 1 }}>
                🖱️ {activeTool === 'Pan' ? 'Pan Mode' : activeTool === 'Measure' ? 'Measurement Mode' : 'Window/Level Mode'}
              </Typography>
              <Typography variant="caption" color="primary.dark">
                {activeTool === 'Pan'
                  ? 'Click and drag to move the image. Use mouse wheel to zoom.'
                  : activeTool === 'Measure'
                  ? 'Click first point, then click second point to measure distance. Each click places a precise measurement point. Press ESC to clear all measurements.'
                  : 'Drag horizontally to adjust window width (contrast), vertically for center (brightness).'}
              </Typography>
            </Paper>

            {/* Keyboard Shortcuts Panel */}
            {showShortcuts && (
              <Paper elevation={2} sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.dark', mb: 1.5 }}>
                  ⌨️ Keyboard Shortcuts
                </Typography>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" display="block" fontWeight="bold" color="info.dark">
                      Tools
                    </Typography>
                    <Typography variant="caption" display="block">P - Pan</Typography>
                    <Typography variant="caption" display="block">W - Window/Level</Typography>
                    <Typography variant="caption" display="block">M - Measure</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" display="block" fontWeight="bold" color="info.dark">
                      View
                    </Typography>
                    <Typography variant="caption" display="block">+ - Zoom In</Typography>
                    <Typography variant="caption" display="block">- - Zoom Out</Typography>
                    <Typography variant="caption" display="block">R - Reset View</Typography>
                    <Typography variant="caption" display="block">F - Fullscreen</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" display="block" fontWeight="bold" color="info.dark">
                      Overlay
                    </Typography>
                    <Typography variant="caption" display="block">O - Toggle Overlay</Typography>
                    <Typography variant="caption" display="block">I - Pixel Probe</Typography>
                    <Typography variant="caption" display="block">G - Measurement Grid</Typography>
                    <Typography variant="caption" display="block">ESC - Clear Measures</Typography>
                    <Typography variant="caption" display="block">? - Show Shortcuts</Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Status Bar */}
            <Paper elevation={1} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Typography variant="caption">
                  <strong>Zoom:</strong> {(zoom * 100).toFixed(1)}%
                </Typography>
                <Typography variant="caption">
                  <strong>Rotation:</strong> {rotation}°
                </Typography>
                <Typography variant="caption">
                  <strong>W:</strong> {windowLevel.width.toFixed(0)}
                </Typography>
                <Typography variant="caption">
                  <strong>L:</strong> {windowLevel.center.toFixed(0)}
                </Typography>
                {overlayVisible && (
                  <Chip label="AI Overlay Active" size="small" color="success" variant="outlined" sx={{ height: 20 }} />
                )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders from parent
export const MedicalViewer = React.memo(MedicalViewerInner);
MedicalViewer.displayName = 'MedicalViewer';

export default MedicalViewer;
