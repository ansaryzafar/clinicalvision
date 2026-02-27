/**
 * FindingMarkers — SVG Overlay for AI-Detected Findings
 *
 * Renders bounding boxes from SuspiciousRegion data as an SVG overlay
 * on top of a mammogram viewer. Boxes are color-coded by confidence:
 *   - High (≥ 0.7): Red
 *   - Medium (0.3–0.7): Orange
 *   - Low (< 0.3): Green
 *
 * Features:
 * - Bounding boxes positioned from bbox [x, y, w, h]
 * - Color-coded by attentionScore
 * - Click on marker to show finding details
 * - Toggle all markers visible/hidden
 * - SVG <title> for accessibility tooltips
 * - Clamping for out-of-bounds bounding boxes
 * - Graceful handling of empty/malformed data
 *
 * References:
 * - ACR BI-RADS 5th Edition lesion marking
 * - DICOM Structured Report (SR) overlay patterns
 */

import React, { useCallback, useMemo } from 'react';
import type { SuspiciousRegion } from '../../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

export interface FindingMarkersProps {
  /** Array of suspicious regions to display */
  regions: SuspiciousRegion[];

  /** Width of the image/overlay in pixels */
  width: number;

  /** Height of the image/overlay in pixels */
  height: number;

  /** Callback when a region bounding box is clicked */
  onRegionClick?: (region: SuspiciousRegion, index: number) => void;

  /** Whether the overlay is visible (default: true) */
  visible?: boolean;

  /** Stroke width for bounding boxes (default: 2) */
  strokeWidth?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Confidence thresholds for color coding */
const HIGH_THRESHOLD = 0.7;
const MEDIUM_THRESHOLD = 0.3;

/** Colors matching the risk-level palette */
const COLORS = {
  high: '#f44336',     // Red
  medium: '#ff9800',   // Orange
  low: '#4caf50',      // Green
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/** Get color based on attention score */
function getColor(attentionScore: number): string {
  if (attentionScore >= HIGH_THRESHOLD) return COLORS.high;
  if (attentionScore >= MEDIUM_THRESHOLD) return COLORS.medium;
  return COLORS.low;
}

/** Clamp a bounding box to fit within image dimensions */
function clampBbox(
  bbox: [number, number, number, number],
  maxWidth: number,
  maxHeight: number,
): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = bbox;
  const cx = Math.max(0, Math.min(x, maxWidth));
  const cy = Math.max(0, Math.min(y, maxHeight));
  const cw = Math.max(0, Math.min(w, maxWidth - cx));
  const ch = Math.max(0, Math.min(h, maxHeight - cy));
  return { x: cx, y: cy, w: cw, h: ch };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FindingMarkers: React.FC<FindingMarkersProps> = ({
  regions,
  width,
  height,
  onRegionClick,
  visible = true,
  strokeWidth = 2,
}) => {
  const handleClick = useCallback(
    (region: SuspiciousRegion, index: number) => {
      if (onRegionClick) {
        onRegionClick(region, index);
      }
    },
    [onRegionClick],
  );

  /** Pre-compute clamped boxes */
  const boxes = useMemo(
    () =>
      regions.map((region, idx) => ({
        region,
        index: idx,
        ...clampBbox(region.bbox, width, height),
        color: getColor(region.attentionScore),
      })),
    [regions, width, height],
  );

  return (
    <svg
      data-testid="finding-markers-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: visible ? 'auto' : 'none',
        display: visible ? 'block' : 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {boxes.map(({ region, index, x, y, w, h, color }) => (
        <g key={index}>
          <rect
            data-testid={`finding-rect-${index}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            rx={2}
            ry={2}
            style={{ cursor: onRegionClick ? 'pointer' : 'default' }}
            onClick={() => handleClick(region, index)}
          >
            {region.description && <title>{region.description}</title>}
          </rect>
          {/* Render description as label above the box */}
          {region.description && (
            <text
              x={x + 2}
              y={y - 4}
              fill={color}
              fontSize={10}
              fontWeight={600}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            />
          )}
        </g>
      ))}
    </svg>
  );
};

export default FindingMarkers;
