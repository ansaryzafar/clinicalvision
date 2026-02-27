/**
 * FindingMarkers Component Tests (Phase D, Step D.4)
 *
 * TDD RED → GREEN tests for the SVG overlay that draws bounding boxes
 * from SuspiciousRegion data, color-coded by confidence, with click
 * interaction and toggle visibility.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FindingMarkers } from '../FindingMarkers';
import type { SuspiciousRegion } from '../../../types/case.types';

// ============================================================================
// FIXTURES
// ============================================================================

function createRegion(overrides?: Partial<SuspiciousRegion>): SuspiciousRegion {
  return {
    bbox: [100, 200, 50, 60],
    attentionScore: 0.85,
    description: 'Suspicious mass in upper outer quadrant',
    ...overrides,
  };
}

const MOCK_REGIONS: SuspiciousRegion[] = [
  createRegion({ bbox: [10, 20, 30, 40], attentionScore: 0.95, description: 'High confidence mass' }),
  createRegion({ bbox: [150, 80, 40, 50], attentionScore: 0.55, description: 'Moderate calcification' }),
  createRegion({ bbox: [200, 300, 25, 25], attentionScore: 0.2, description: 'Low confidence area' }),
];

// ============================================================================
// TESTS
// ============================================================================

describe('FindingMarkers', () => {
  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders an SVG overlay element', () => {
    render(
      <FindingMarkers
        regions={MOCK_REGIONS}
        width={512}
        height={512}
      />,
    );
    const svg = screen.getByTestId('finding-markers-svg');
    expect(svg).toBeInTheDocument();
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('renders a rect for each suspicious region', () => {
    render(
      <FindingMarkers
        regions={MOCK_REGIONS}
        width={512}
        height={512}
      />,
    );
    const rects = screen.getAllByTestId(/^finding-rect-/);
    expect(rects).toHaveLength(3);
  });

  it('sets correct position and size from bbox', () => {
    const regions = [createRegion({ bbox: [100, 200, 50, 60] })];
    render(
      <FindingMarkers
        regions={regions}
        width={512}
        height={512}
      />,
    );
    const rect = screen.getByTestId('finding-rect-0');
    expect(rect.getAttribute('x')).toBe('100');
    expect(rect.getAttribute('y')).toBe('200');
    expect(rect.getAttribute('width')).toBe('50');
    expect(rect.getAttribute('height')).toBe('60');
  });

  // ── Color coding ──────────────────────────────────────────────────────

  it('colors high-confidence regions in red', () => {
    const regions = [createRegion({ attentionScore: 0.85 })];
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    // High confidence (>= 0.7) → red stroke
    expect(rect.getAttribute('stroke')).toMatch(/f44336|red/i);
  });

  it('colors medium-confidence regions in yellow/orange', () => {
    const regions = [createRegion({ attentionScore: 0.5 })];
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    expect(rect.getAttribute('stroke')).toMatch(/ff9800|orange|yellow/i);
  });

  it('colors low-confidence regions in green', () => {
    const regions = [createRegion({ attentionScore: 0.2 })];
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    expect(rect.getAttribute('stroke')).toMatch(/4caf50|green/i);
  });

  // ── Click interaction ──────────────────────────────────────────────────

  it('calls onRegionClick when a bounding box is clicked', () => {
    const onRegionClick = jest.fn();
    render(
      <FindingMarkers
        regions={MOCK_REGIONS}
        width={512}
        height={512}
        onRegionClick={onRegionClick}
      />,
    );
    const rect = screen.getByTestId('finding-rect-0');
    fireEvent.click(rect);
    expect(onRegionClick).toHaveBeenCalledWith(MOCK_REGIONS[0], 0);
  });

  it('does not crash when clicking without onRegionClick handler', () => {
    render(<FindingMarkers regions={MOCK_REGIONS} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    expect(() => fireEvent.click(rect)).not.toThrow();
  });

  // ── Toggle visibility ──────────────────────────────────────────────────

  it('hides all markers when visible=false', () => {
    render(
      <FindingMarkers
        regions={MOCK_REGIONS}
        width={512}
        height={512}
        visible={false}
      />,
    );
    const svg = screen.getByTestId('finding-markers-svg');
    expect(svg).toHaveStyle({ display: 'none' });
  });

  it('shows markers by default (visible not specified)', () => {
    render(<FindingMarkers regions={MOCK_REGIONS} width={512} height={512} />);
    const svg = screen.getByTestId('finding-markers-svg');
    expect(svg).not.toHaveStyle({ display: 'none' });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('renders nothing when regions array is empty', () => {
    render(<FindingMarkers regions={[]} width={512} height={512} />);
    const svg = screen.getByTestId('finding-markers-svg');
    expect(svg).toBeInTheDocument();
    const rects = screen.queryAllByTestId(/^finding-rect-/);
    expect(rects).toHaveLength(0);
  });

  it('handles zero-dimension bounding boxes gracefully', () => {
    const regions = [createRegion({ bbox: [0, 0, 0, 0] })];
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    expect(rect).toBeInTheDocument();
  });

  it('clamps bounding boxes that exceed image dimensions', () => {
    const regions = [createRegion({ bbox: [500, 500, 100, 100] })]; // exceeds 512×512
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    const rect = screen.getByTestId('finding-rect-0');
    // Width should be clamped to 12 (512 - 500)
    const w = Number(rect.getAttribute('width'));
    const h = Number(rect.getAttribute('height'));
    expect(w).toBeLessThanOrEqual(12);
    expect(h).toBeLessThanOrEqual(12);
  });

  it('renders labels/descriptions as title elements for accessibility', () => {
    const regions = [createRegion({ description: 'Test finding description' })];
    render(<FindingMarkers regions={regions} width={512} height={512} />);
    // SVG <title> element for tooltip
    expect(screen.getByText('Test finding description')).toBeInTheDocument();
  });
});
