/**
 * QuadViewLayout — 2×2 Mammogram Grid Display
 *
 * Displays 4 standard mammogram views in a clinical 2×2 grid:
 *   ┌─────────┬─────────┐
 *   │   RCC   │   LCC   │
 *   ├─────────┼─────────┤
 *   │  RMLO   │  LMLO   │
 *   └─────────┴─────────┘
 *
 * Features:
 * - Correct placement by view type + laterality
 * - Placeholder panels for missing views
 * - Click to select/enlarge a panel
 * - Selected panel highlight
 * - AI risk overlay indicators
 * - Responsive layout
 * - Handles duplicate/non-standard views gracefully
 *
 * References:
 * - ACR Practice Parameter for Digital Breast Tomosynthesis
 * - Lunit INSIGHT MMG hanging protocol
 */

import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ImageNotSupported } from '@mui/icons-material';

import {
  MammogramImage,
  ViewType,
  Laterality,
  RiskLevel,
} from '../../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

/** AI result summary per image */
export interface PanelAIResult {
  riskLevel: RiskLevel;
  confidence: number;
}

export interface QuadViewLayoutProps {
  /** All images for this case (may include non-standard views) */
  images: MammogramImage[];

  /** Optional: ID of the currently selected image for highlight */
  selectedImageId?: string;

  /** Callback when a panel with an image is clicked */
  onPanelClick?: (image: MammogramImage) => void;

  /** Optional per-image AI results keyed by image ID */
  aiResults?: Record<string, PanelAIResult>;

  /** Optional: override panel height (default 320px) */
  panelHeight?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** The 4 standard quad positions in display order */
const QUAD_POSITIONS = [
  { viewType: ViewType.CC, laterality: Laterality.RIGHT, label: 'RCC' },
  { viewType: ViewType.CC, laterality: Laterality.LEFT, label: 'LCC' },
  { viewType: ViewType.MLO, laterality: Laterality.RIGHT, label: 'RMLO' },
  { viewType: ViewType.MLO, laterality: Laterality.LEFT, label: 'LMLO' },
] as const;

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4caf50',
  moderate: '#ff9800',
  high: '#f44336',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const QuadViewLayout: React.FC<QuadViewLayoutProps> = ({
  images,
  selectedImageId,
  onPanelClick,
  aiResults,
  panelHeight = 320,
}) => {
  // Map images to their quad position (first match wins for duplicates)
  const imageMap = useMemo(() => {
    const map = new Map<string, MammogramImage>();
    for (const pos of QUAD_POSITIONS) {
      const match = images.find(
        (img) =>
          img.viewType === pos.viewType &&
          img.laterality === pos.laterality &&
          !map.has(pos.label), // skip if already assigned
      );
      if (match) {
        map.set(pos.label, match);
      }
    }
    return map;
  }, [images]);

  const handlePanelClick = useCallback(
    (label: string) => {
      const img = imageMap.get(label);
      if (img && onPanelClick) {
        onPanelClick(img);
      }
    },
    [imageMap, onPanelClick],
  );

  return (
    <Box
      data-testid="quad-view-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: `${panelHeight}px ${panelHeight}px`,
        gap: 1,
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {QUAD_POSITIONS.map((pos) => {
        const image = imageMap.get(pos.label);
        const isSelected = image ? image.id === selectedImageId : false;
        const ai = image && aiResults ? aiResults[image.id] : undefined;

        return (
          <Box
            key={pos.label}
            data-testid={`quad-panel-${pos.label}`}
            className={isSelected ? 'selected' : ''}
            onClick={() => handlePanelClick(pos.label)}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0a0a0a',
              border: isSelected
                ? '2px solid #2E7D9A'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 0.5,
              cursor: image ? 'pointer' : 'default',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
              '&:hover': image
                ? { borderColor: 'rgba(46, 125, 154, 0.6)' }
                : undefined,
            }}
          >
            {/* View label */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 700,
                fontSize: 12,
                zIndex: 2,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {pos.label}
            </Typography>

            {image ? (
              <>
                {/* Image */}
                <img
                  src={image.localUrl}
                  alt={`${pos.label} mammogram view`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  draggable={false}
                />

                {/* AI risk indicator */}
                {ai && (
                  <Chip
                    label={`${Math.round(ai.confidence * 100)}%`}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: RISK_COLORS[ai.riskLevel],
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 11,
                      height: 22,
                      zIndex: 2,
                    }}
                  />
                )}
              </>
            ) : (
              /* Placeholder for missing view */
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <ImageNotSupported sx={{ fontSize: 36, color: 'rgba(255,255,255,0.15)' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                >
                  No {pos.label} image
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default QuadViewLayout;
