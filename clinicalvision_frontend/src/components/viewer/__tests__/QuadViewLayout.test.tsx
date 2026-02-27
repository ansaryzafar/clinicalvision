/**
 * QuadViewLayout Component Tests (Phase D, Step D.3)
 *
 * TDD RED → GREEN tests for the 2×2 mammogram quad-view layout.
 * QuadViewLayout places 4 standard mammogram views in a grid:
 *   RCC | LCC
 *   RMLO | LMLO
 * with placeholders for missing views, click-to-enlarge, and
 * synchronized window/level controls.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { QuadViewLayout } from '../QuadViewLayout';
import {
  MammogramImage,
  ViewType,
  Laterality,
} from '../../../types/case.types';

// ============================================================================
// FIXTURES
// ============================================================================

function createImage(
  viewType: ViewType,
  laterality: Laterality,
  id?: string,
): MammogramImage {
  const label = `${laterality === Laterality.RIGHT ? 'R' : 'L'}${viewType}`;
  return {
    id: id ?? `img-${label}`,
    filename: `${label.toLowerCase()}.dcm`,
    fileSize: 5_000_000,
    mimeType: 'application/dicom',
    localUrl: `blob:http://localhost/${label}`,
    viewType,
    laterality,
    uploadStatus: 'uploaded',
  };
}

function createFullImageSet(): MammogramImage[] {
  return [
    createImage(ViewType.CC, Laterality.RIGHT),
    createImage(ViewType.CC, Laterality.LEFT),
    createImage(ViewType.MLO, Laterality.RIGHT),
    createImage(ViewType.MLO, Laterality.LEFT),
  ];
}

// ============================================================================
// TESTS
// ============================================================================

describe('QuadViewLayout', () => {
  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders a 2×2 grid container', () => {
    render(<QuadViewLayout images={createFullImageSet()} />);
    const grid = screen.getByTestId('quad-view-grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders 4 panels when all standard views are provided', () => {
    render(<QuadViewLayout images={createFullImageSet()} />);
    const panels = screen.getAllByTestId(/^quad-panel-/);
    expect(panels).toHaveLength(4);
  });

  it('places images in correct positions by view type and laterality', () => {
    render(<QuadViewLayout images={createFullImageSet()} />);
    // Labels should appear
    expect(screen.getByText('RCC')).toBeInTheDocument();
    expect(screen.getByText('LCC')).toBeInTheDocument();
    expect(screen.getByText('RMLO')).toBeInTheDocument();
    expect(screen.getByText('LMLO')).toBeInTheDocument();
  });

  // ── Missing views ─────────────────────────────────────────────────────

  it('shows placeholders for missing views', () => {
    // Only provide RCC and LMLO
    const images = [
      createImage(ViewType.CC, Laterality.RIGHT),
      createImage(ViewType.MLO, Laterality.LEFT),
    ];
    render(<QuadViewLayout images={images} />);
    // All 4 panels should still render
    const panels = screen.getAllByTestId(/^quad-panel-/);
    expect(panels).toHaveLength(4);
    // Missing panels should show placeholder text
    expect(screen.getByText(/no.*lcc/i)).toBeInTheDocument();
    expect(screen.getByText(/no.*rmlo/i)).toBeInTheDocument();
  });

  it('renders 4 placeholder panels when no images are provided', () => {
    render(<QuadViewLayout images={[]} />);
    const panels = screen.getAllByTestId(/^quad-panel-/);
    expect(panels).toHaveLength(4);
    expect(screen.getByText(/no.*rcc/i)).toBeInTheDocument();
    expect(screen.getByText(/no.*lcc/i)).toBeInTheDocument();
    expect(screen.getByText(/no.*rmlo/i)).toBeInTheDocument();
    expect(screen.getByText(/no.*lmlo/i)).toBeInTheDocument();
  });

  // ── Click to enlarge ───────────────────────────────────────────────────

  it('calls onPanelClick when a panel is clicked', () => {
    const onPanelClick = jest.fn();
    render(<QuadViewLayout images={createFullImageSet()} onPanelClick={onPanelClick} />);
    const rccPanel = screen.getByTestId('quad-panel-RCC');
    fireEvent.click(rccPanel);
    expect(onPanelClick).toHaveBeenCalledWith(
      expect.objectContaining({ viewType: ViewType.CC, laterality: Laterality.RIGHT }),
    );
  });

  it('does not crash when clicking a placeholder panel', () => {
    const onPanelClick = jest.fn();
    render(<QuadViewLayout images={[]} onPanelClick={onPanelClick} />);
    const panel = screen.getByTestId('quad-panel-RCC');
    expect(() => fireEvent.click(panel)).not.toThrow();
    // Should not call handler for missing image
    expect(onPanelClick).not.toHaveBeenCalled();
  });

  // ── Selected panel ─────────────────────────────────────────────────────

  it('highlights the selected panel', () => {
    render(
      <QuadViewLayout
        images={createFullImageSet()}
        selectedImageId="img-RCC"
      />,
    );
    const rccPanel = screen.getByTestId('quad-panel-RCC');
    expect(rccPanel).toHaveClass('selected');
  });

  it('does not highlight non-selected panels', () => {
    render(
      <QuadViewLayout
        images={createFullImageSet()}
        selectedImageId="img-RCC"
      />,
    );
    const lccPanel = screen.getByTestId('quad-panel-LCC');
    expect(lccPanel).not.toHaveClass('selected');
  });

  // ── AI findings overlay ────────────────────────────────────────────────

  it('renders AI risk indicators when aiResults are provided', () => {
    const aiResults = {
      'img-RCC': { riskLevel: 'high' as const, confidence: 0.92 },
      'img-LCC': { riskLevel: 'low' as const, confidence: 0.15 },
    };
    render(
      <QuadViewLayout
        images={createFullImageSet()}
        aiResults={aiResults}
      />,
    );
    // Should show risk indicator on RCC panel
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  // ── Responsive ─────────────────────────────────────────────────────────

  it('renders images using <img> tags with correct src', () => {
    render(<QuadViewLayout images={createFullImageSet()} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(4);
    const rccImg = imgs.find((img) => img.getAttribute('alt')?.includes('RCC'));
    expect(rccImg).toBeDefined();
    expect(rccImg?.getAttribute('src')).toContain('blob:');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('handles duplicate view types by using the first match', () => {
    const images = [
      createImage(ViewType.CC, Laterality.RIGHT, 'img-1'),
      createImage(ViewType.CC, Laterality.RIGHT, 'img-2'), // duplicate
      createImage(ViewType.CC, Laterality.LEFT),
      createImage(ViewType.MLO, Laterality.RIGHT),
      createImage(ViewType.MLO, Laterality.LEFT),
    ];
    render(<QuadViewLayout images={images} />);
    // Should still render 4 panels, not 5
    const panels = screen.getAllByTestId(/^quad-panel-/);
    expect(panels).toHaveLength(4);
  });

  it('ignores non-standard view types', () => {
    const images = [
      ...createFullImageSet(),
      createImage(ViewType.SPOT, Laterality.RIGHT, 'img-spot'),
    ];
    render(<QuadViewLayout images={images} />);
    // Only 4 standard panels
    const panels = screen.getAllByTestId(/^quad-panel-/);
    expect(panels).toHaveLength(4);
  });
});
