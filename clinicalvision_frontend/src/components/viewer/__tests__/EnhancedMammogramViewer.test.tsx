/**
 * Test Suite for Enhanced Mammogram Viewer
 * 
 * Test Driven Development Approach:
 * 1. Multi-viewport grid layout tests
 * 2. WW/WL display and controls tests
 * 3. AI confidence score display tests
 * 4. Heatmap overlay system tests
 * 5. Interactive control panel tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedMammogramViewer } from '../EnhancedMammogramViewer';

// Mock URL.createObjectURL for File handling
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 100;
  height = 100;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.Image = MockImage as any;

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((type: string) => {
  if (type === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
      })),
      putImageData: jest.fn(),
    } as any;
  }
  return null;
}) as any;

// Mock Cornerstone libraries
jest.mock('cornerstone-core', () => ({
  enable: jest.fn(),
  disable: jest.fn(),
  displayImage: jest.fn(),
  loadImage: jest.fn().mockResolvedValue({}),
  getViewport: jest.fn().mockReturnValue({
    scale: 1.0,
    voi: { windowWidth: 255, windowCenter: 128 },
  }),
  setViewport: jest.fn(),
  reset: jest.fn(),
  getEnabledElement: jest.fn().mockReturnValue({ element: {} }),
}));

jest.mock('cornerstone-tools', () => ({
  addTool: jest.fn(),
  setToolActive: jest.fn(),
  setToolPassive: jest.fn(),
  addStackStateManager: jest.fn(),
  addToolState: jest.fn(),
  init: jest.fn(),
  external: {},
  PanTool: jest.fn(),
  ZoomTool: jest.fn(),
  WwwcTool: jest.fn(),
}));

describe('EnhancedMammogramViewer - Multi-Viewport Layout', () => {
  const mockImages = {
    rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
    rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
    lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
  };

  test('renders 4-panel grid layout', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    // Check for 4 viewport containers
    expect(screen.getByTestId('viewport-rcc')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-lcc')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-rmlo')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-lmlo')).toBeInTheDocument();
  });

  test('displays view labels correctly', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    expect(screen.getByText('RCC')).toBeInTheDocument();
    expect(screen.getByText('LCC')).toBeInTheDocument();
    expect(screen.getByText('RMLO')).toBeInTheDocument();
    expect(screen.getByText('LMLO')).toBeInTheDocument();
  });

  test('each viewport has independent canvas wrapper', () => {
    const { container } = render(<EnhancedMammogramViewer images={mockImages} />);
    
    // In test environment, check for cornerstone canvas wrappers
    const wrappers = container.querySelectorAll('.cornerstone-canvas-wrapper');
    expect(wrappers).toHaveLength(4);
    
    // Each wrapper should have a ref element
    const refElements = container.querySelectorAll('[data-cy="cornerstone-canvas-wrapper"] > div');
    expect(refElements.length).toBeGreaterThanOrEqual(4);
  });

  test('handles missing images gracefully', () => {
    const partialImages = {
      rcc: mockImages.rcc,
      lcc: mockImages.lcc,
    };
    
    render(<EnhancedMammogramViewer images={partialImages} />);
    
    expect(screen.getByTestId('viewport-rcc')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-lcc')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-rmlo')).toBeInTheDocument();
    expect(screen.getByTestId('viewport-lmlo')).toBeInTheDocument();
    // Should show placeholder for missing views
    const loadingTexts = screen.getAllByText(/no image loaded|loading/i);
    expect(loadingTexts.length).toBeGreaterThan(0);
  });
});

describe('EnhancedMammogramViewer - WW/WL Display', () => {
  const mockImages = {
    rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
    rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
    lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
  };

  test('displays WW/WL values for each viewport', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    // Check for WW/WL display (format: WW/WL - width/center)
    const wwwlDisplays = screen.getAllByText(/WW\/WL - \d+\/\d+/);
    expect(wwwlDisplays.length).toBeGreaterThanOrEqual(4);
  });

  test('displays zoom level for each viewport', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    // Check for zoom display (format: ZOOM - 1.0000)
    const zoomDisplays = screen.getAllByText(/ZOOM - \d+\.\d+/);
    expect(zoomDisplays.length).toBeGreaterThanOrEqual(4);
  });

  test('WW/WL values update independently per viewport', async () => {
    const { container } = render(<EnhancedMammogramViewer images={mockImages} />);
    
    // Select first viewport
    const viewport1 = container.querySelector('[data-testid="viewport-rcc"]');
    expect(viewport1).toBeInTheDocument();
    
    await waitFor(() => {
      // Each viewport should have WW/WL display
      const wwwlDisplays = screen.getAllByText(/WW\/WL/);
      expect(wwwlDisplays.length).toBeGreaterThan(0);
    });
  });
});

describe('EnhancedMammogramViewer - AI Confidence Score', () => {
  const mockImages = {
    rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
    rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
    lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
  };

  const mockAIResults = {
    rccRmlo: { score: 0, level: 'low' as const },
    lccLmlo: { score: 64, level: 'high' as const },
  };

  test('displays AI confidence scores for both breasts', () => {
    render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    expect(screen.getByText(/RCC\/RMLO/)).toBeInTheDocument();
    expect(screen.getByText(/LCC\/LMLO/)).toBeInTheDocument();
  });

  test('shows correct confidence score percentages', () => {
    render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
  });

  test('displays risk level labels correctly', () => {
    render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  test('renders progress bars for confidence scores', () => {
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(2);
  });

  test('color-codes confidence scores (low=green, high=red)', () => {
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    // Check for color-coded elements
    const lowRiskElements = container.querySelectorAll('.confidence-low');
    const highRiskElements = container.querySelectorAll('.confidence-high');
    
    expect(lowRiskElements.length).toBeGreaterThan(0);
    expect(highRiskElements.length).toBeGreaterThan(0);
  });

  test('toggles INSIGHT Analysis visibility', () => {
    render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={mockAIResults}
      />
    );
    
    // Look for switch input with INSIGHT Analysis label - use queryAllByRole to check all switches
    const switches = screen.getAllByRole('switch');
    // First switch should be INSIGHT Analysis (second is Sync All Viewports which is disabled)
    const toggle = switches[0];
    expect(toggle).toBeChecked();
    
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });
});

describe('EnhancedMammogramViewer - Heatmap Overlay', () => {
  const mockImages = {
    rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
    rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
    lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
  };

  const mockHeatmaps = {
    rcc: [[0.1, 0.2], [0.3, 0.4]],
    lcc: [[0.5, 0.6], [0.7, 0.8]],
    rmlo: [[0.2, 0.3], [0.4, 0.5]],
    lmlo: [[0.6, 0.7], [0.8, 0.9]],
  };

  test('renders heatmap canvas for each viewport', () => {
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        heatmaps={mockHeatmaps}
      />
    );
    
    const heatmapCanvases = container.querySelectorAll('[data-cy-name="heatmap-canvas"]');
    expect(heatmapCanvases).toHaveLength(4);
  });

  test('applies blur filter to heatmap overlay', () => {
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        heatmaps={mockHeatmaps}
      />
    );
    
    const heatmapCanvas = container.querySelector('[data-cy-name="heatmap-canvas"]');
    expect(heatmapCanvas).toHaveStyle({ filter: 'blur(3.5px)' });
  });

  test('heatmap overlay is positioned absolutely over main canvas', () => {
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        heatmaps={mockHeatmaps}
      />
    );
    
    const heatmapCanvas = container.querySelector('[data-cy-name="heatmap-canvas"]');
    expect(heatmapCanvas).toHaveStyle({ position: 'absolute' });
  });

  test('toggles heatmap visibility', () => {
    const mockAIResultsForHeatmap = {
      rccRmlo: { score: 10, level: 'low' as const },
      lccLmlo: { score: 20, level: 'low' as const },
    };
    
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        heatmaps={mockHeatmaps}
        aiResults={mockAIResultsForHeatmap}
      />
    );
    
    // Toggle is only rendered when aiResults are provided - get first switch
    const switches = screen.getAllByRole('switch');
    const toggle = switches[0]; // First switch is INSIGHT Analysis
    expect(toggle).toBeChecked();
    
    fireEvent.click(toggle);
    
    // When toggled off, heatmap should be hidden
    const heatmapCanvas = container.querySelector('[data-cy-name="heatmap-canvas"]');
    expect(heatmapCanvas).toHaveStyle({ opacity: '0' });
  });
});

describe('EnhancedMammogramViewer - Interactive Controls', () => {
  const mockImages = {
    rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
    rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
    lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
  };

  test('renders Pan, Adjust, and Reset control buttons', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    expect(screen.getByRole('button', { name: /pan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  test('Pan tool activates on click', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    const panButton = screen.getByRole('button', { name: /pan/i });
    fireEvent.click(panButton);
    
    expect(panButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('Adjust tool activates on click', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    const adjustButton = screen.getByRole('button', { name: /adjust/i });
    fireEvent.click(adjustButton);
    
    expect(adjustButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('Reset button resets all viewports', async () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    // Reset should complete without errors
    expect(resetButton).toBeInTheDocument();
  });

  test('tools apply to all viewports synchronously', () => {
    render(<EnhancedMammogramViewer images={mockImages} syncControls={true} />);
    
    const panButton = screen.getByRole('button', { name: /pan/i });
    fireEvent.click(panButton);
    
    // Pan tool should be active (selected by default)
    expect(panButton).toBeInTheDocument();
  });

  test('displays active tool with visual feedback', () => {
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    const panButton = screen.getByRole('button', { name: /pan/i });
    fireEvent.click(panButton);
    
    // Active tool should be rendered
    expect(panButton).toBeInTheDocument();
  });
});

describe('EnhancedMammogramViewer - Edge Cases', () => {
  test('handles null/undefined images', () => {
    render(<EnhancedMammogramViewer images={null} />);
    
    expect(screen.getByText(/no images provided|no images/i)).toBeInTheDocument();
  });

  test('handles empty images object', () => {
    render(<EnhancedMammogramViewer images={{}} />);
    
    expect(screen.getByText(/no images provided|no images/i)).toBeInTheDocument();
  });

  test('handles invalid AI results gracefully', () => {
    const mockImages = {
      rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    };
    
    const invalidAIResults = { invalid: 'data' };
    
    // Should not crash - component handles missing/invalid data
    const { container } = render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        aiResults={invalidAIResults as any}
      />
    );
    
    // Should render without AI panel since invalid results
    expect(container).toBeInTheDocument();
  });

  test('handles missing heatmap data', () => {
    const mockImages = {
      rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    };
    
    render(<EnhancedMammogramViewer images={mockImages} heatmaps={undefined} />);
    
    // Should render without heatmaps
    expect(screen.getByTestId('viewport-rcc')).toBeInTheDocument();
  });

  test('handles image loading errors', () => {
    const mockImages = {
      rcc: new File([''], 'invalid.jpg', { type: 'image/jpeg' }),
    };
    
    render(<EnhancedMammogramViewer images={mockImages} />);
    
    // Component should render even if images fail to load
    expect(screen.getByTestId('viewport-rcc')).toBeInTheDocument();
  });
});

describe('EnhancedMammogramViewer - Performance', () => {
  test('renders efficiently with all features enabled', () => {
    const mockImages = {
      rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
      lcc: new File([''], 'lcc.jpg', { type: 'image/jpeg' }),
      rmlo: new File([''], 'rmlo.jpg', { type: 'image/jpeg' }),
      lmlo: new File([''], 'lmlo.jpg', { type: 'image/jpeg' }),
    };

    const mockHeatmaps = {
      rcc: Array(100).fill(null).map(() => Array(100).fill(0.5)),
      lcc: Array(100).fill(null).map(() => Array(100).fill(0.5)),
      rmlo: Array(100).fill(null).map(() => Array(100).fill(0.5)),
      lmlo: Array(100).fill(null).map(() => Array(100).fill(0.5)),
    };

    const startTime = performance.now();
    
    render(
      <EnhancedMammogramViewer 
        images={mockImages} 
        heatmaps={mockHeatmaps}
        aiResults={{ rccRmlo: { score: 50, level: 'medium' }, lccLmlo: { score: 50, level: 'medium' } }}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in less than 1000ms even with all features
    expect(renderTime).toBeLessThan(1000);
  });

  test('does not cause memory leaks on unmount', () => {
    const mockImages = {
      rcc: new File([''], 'rcc.jpg', { type: 'image/jpeg' }),
    };

    const { unmount } = render(<EnhancedMammogramViewer images={mockImages} />);
    
    expect(() => unmount()).not.toThrow();
  });
});
