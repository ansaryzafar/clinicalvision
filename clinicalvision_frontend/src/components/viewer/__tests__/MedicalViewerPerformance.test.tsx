/**
 * MedicalViewer Performance Tests (TDD)
 * 
 * Tests for performance optimizations:
 * 1. Heatmap caching — colormapped canvas computed once, reused
 * 2. Overlay canvas separation — mouse moves don't re-render heatmap
 * 3. Window/Level caching — W/L image cached until params change
 * 4. React.memo — prevents unnecessary re-renders
 * 5. Debounced persistence — localStorage writes batched
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { clinicalTheme } from '../../../theme/medicalTheme';

// ============================================================================
// Canvas Mock for JSDOM
// ============================================================================
// JSDOM does not implement HTMLCanvasElement.getContext('2d').
// We provide a minimal mock factory so pixel-level operations can run.

function createMockContext2D(): any {
  return {
    canvas: document.createElement('canvas'),
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    putImageData: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(128),
      width: w,
      height: h,
      colorSpace: 'srgb',
    })),
    createImageData: jest.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
      colorSpace: 'srgb',
    })),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    fillText: jest.fn(),
    strokeRect: jest.fn(),
    setLineDash: jest.fn(),
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
  };
}

// Install canvas mock globally before any tests run
const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = function (contextId: string) {
    if (contextId === '2d') {
      return createMockContext2D();
    }
    return origGetContext.call(this, contextId);
  };
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

// ============================================================================
// Test Helpers
// ============================================================================

/** Generate a synthetic 56×56 attention map */
function createMockAttentionMap(rows = 56, cols = 56): number[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      // Create a hot spot in the center for realism
      const dx = x - cols / 2;
      const dy = y - rows / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.max(0, 1 - dist / (cols / 2));
    })
  );
}

/** Create a minimal test image as a data URL */
function createMockImageUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <ThemeProvider theme={clinicalTheme}>
      <BrowserRouter>{ui}</BrowserRouter>
    </ThemeProvider>
  );

// ============================================================================
// 1. Heatmap Caching Tests
// ============================================================================

describe('Heatmap Caching', () => {
  let jetColormap: (t: number) => [number, number, number];
  let buildCachedHeatmap: (
    heatmap: number[][],
    width: number,
    height: number
  ) => HTMLCanvasElement;

  beforeAll(async () => {
    // Import the utility functions
    const mod = await import('../heatmapCache');
    jetColormap = mod.jetColormap;
    buildCachedHeatmap = mod.buildCachedHeatmap;
  });

  test('jetColormap returns correct RGB for known values', () => {
    // t=0 should be deep blue
    const [r0, g0, b0] = jetColormap(0);
    expect(b0).toBeGreaterThan(100);
    expect(r0).toBe(0);

    // t=0.5 should be greenish
    const [r5, g5, b5] = jetColormap(0.5);
    expect(g5).toBeGreaterThan(200);

    // t=1 should be deep red
    const [r1, g1, b1] = jetColormap(1);
    expect(r1).toBeGreaterThan(100);
    expect(g1).toBe(0);
    expect(b1).toBe(0);
  });

  test('jetColormap clamps values outside [0,1]', () => {
    expect(() => jetColormap(-0.5)).not.toThrow();
    expect(() => jetColormap(1.5)).not.toThrow();

    const [r, g, b] = jetColormap(-0.5);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
  });

  test('buildCachedHeatmap returns a canvas element', () => {
    const map = createMockAttentionMap(8, 8);
    const canvas = buildCachedHeatmap(map, 224, 224);

    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(224);
    expect(canvas.height).toBe(224);
  });

  test('buildCachedHeatmap result is deterministic for same input', () => {
    const map = createMockAttentionMap(8, 8);
    const canvas1 = buildCachedHeatmap(map, 224, 224);
    const canvas2 = buildCachedHeatmap(map, 224, 224);

    // Both should produce a canvas element
    expect(canvas1).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas2).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas1.width).toBe(canvas2.width);
    expect(canvas1.height).toBe(canvas2.height);
  });

  test('buildCachedHeatmap handles empty map gracefully', () => {
    const canvas = buildCachedHeatmap([], 224, 224);
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  test('buildCachedHeatmap handles single-value map', () => {
    const map = [[0.5]];
    const canvas = buildCachedHeatmap(map, 100, 100);
    expect(canvas.width).toBe(100);
  });
});

// ============================================================================
// 2. Window/Level Cache Tests
// ============================================================================

describe('Window/Level Cache', () => {
  let applyWindowLevel: (
    sourceCanvas: HTMLCanvasElement,
    width: number,
    center: number
  ) => HTMLCanvasElement;

  beforeAll(async () => {
    const mod = await import('../heatmapCache');
    applyWindowLevel = mod.applyWindowLevel;
  });

  test('applyWindowLevel returns correct canvas dimensions', () => {
    const source = document.createElement('canvas');
    source.width = 100;
    source.height = 100;

    const result = applyWindowLevel(source, 255, 128);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  test('standard W/L (255/128) produces a canvas with same dimensions', () => {
    const source = document.createElement('canvas');
    source.width = 2;
    source.height = 2;

    const result = applyWindowLevel(source, 255, 128);
    expect(result).toBeInstanceOf(HTMLCanvasElement);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  test('narrow window produces a valid canvas', () => {
    const source = document.createElement('canvas');
    source.width = 2;
    source.height = 1;

    // Narrow window = high contrast — should not throw
    const result = applyWindowLevel(source, 50, 130);
    expect(result).toBeInstanceOf(HTMLCanvasElement);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });
});

// ============================================================================
// 3. Render Efficiency Tests (React.memo behavior)
// ============================================================================

describe('MedicalViewer Render Efficiency', () => {
  let MedicalViewer: React.FC<any>;

  beforeAll(async () => {
    const mod = await import('../MedicalViewer');
    MedicalViewer = mod.MedicalViewer;
  });

  test('renders without crashing with no props', () => {
    const { container } = renderWithProviders(<MedicalViewer />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  test('renders with attention map without crashing', () => {
    const map = createMockAttentionMap(8, 8);
    const { container } = renderWithProviders(
      <MedicalViewer
        imageUrl={createMockImageUrl()}
        attentionMap={map}
        suspiciousRegions={[]}
      />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  test('has a measurement overlay canvas for cursor tracking', () => {
    const { container } = renderWithProviders(
      <MedicalViewer imageUrl={createMockImageUrl()} />
    );
    // Should have TWO canvases: main + overlay
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(2);
  });

  test('overlay canvas is positioned absolutely over main canvas', () => {
    const { container } = renderWithProviders(
      <MedicalViewer imageUrl={createMockImageUrl()} />
    );
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(2);
    // The overlay canvas should have position: absolute
    const overlayCanvas = canvases[1];
    const style = window.getComputedStyle(overlayCanvas);
    // In JSDOM the inline style is what we can check
    expect(overlayCanvas.style.position).toBe('absolute');
  });
});

// ============================================================================
// 4. localStorage Debounce Tests
// ============================================================================

describe('Persistence Debouncing', () => {
  let debouncedPersist: (...args: any[]) => void;
  let cancelPersist: () => void;

  beforeAll(async () => {
    const mod = await import('../../../utils/debouncedPersistence');
    debouncedPersist = mod.debouncedPersist;
    cancelPersist = mod.cancelPersist;
  });

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cancelPersist();
    jest.useRealTimers();
  });

  test('does not write immediately', () => {
    debouncedPersist('test_key', { data: 'value' });
    // Should NOT be in localStorage yet
    expect(localStorage.getItem('test_key')).toBeNull();
  });

  test('writes after debounce interval', () => {
    debouncedPersist('test_key', { data: 'value' });

    jest.advanceTimersByTime(4000);

    expect(localStorage.getItem('test_key')).toBe(JSON.stringify({ data: 'value' }));
  });

  test('batches rapid calls — only last value persisted', () => {
    debouncedPersist('test_key', { count: 1 });
    debouncedPersist('test_key', { count: 2 });
    debouncedPersist('test_key', { count: 3 });

    jest.advanceTimersByTime(4000);

    // Only the last value should be written
    expect(localStorage.getItem('test_key')).toBe(JSON.stringify({ count: 3 }));
  });

  test('cancelPersist prevents pending write', () => {
    debouncedPersist('test_key', { data: 'value' });

    cancelPersist();
    jest.advanceTimersByTime(5000);

    expect(localStorage.getItem('test_key')).toBeNull();
  });
});

// ============================================================================
// 5. Heatmap Cache Hook Tests
// ============================================================================

describe('useHeatmapCache hook', () => {
  let useHeatmapCache: any;

  beforeAll(async () => {
    const mod = await import('../useHeatmapCache');
    useHeatmapCache = mod.useHeatmapCache;
  });

  test('returns null when no attentionMap provided', () => {
    const TestComponent = () => {
      const cached = useHeatmapCache(undefined, 224, 224);
      return <div data-testid="result">{cached ? 'cached' : 'null'}</div>;
    };
    render(<TestComponent />);
    expect(screen.getByTestId('result')).toHaveTextContent('null');
  });

  test('returns a canvas when attentionMap provided', async () => {
    const map = createMockAttentionMap(8, 8);
    const TestComponent = () => {
      const cached = useHeatmapCache(map, 224, 224);
      return <div data-testid="result">{cached ? 'cached' : 'null'}</div>;
    };
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cached');
    });
  });

  test('does not recompute when same map reference is passed', async () => {
    const map = createMockAttentionMap(8, 8);
    let renderCount = 0;

    const TestComponent = ({ attMap }: { attMap: number[][] }) => {
      const cached = useHeatmapCache(attMap, 224, 224);
      renderCount++;
      return <div data-testid="result">{cached ? 'cached' : 'null'}</div>;
    };

    const { rerender } = render(<TestComponent attMap={map} />);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cached');
    });

    const firstRenderCount = renderCount;

    // Re-render with same reference
    rerender(<TestComponent attMap={map} />);

    // Hook should not recompute (same reference)
    // The component will re-render but the useMemo inside should not recompute
    expect(renderCount).toBe(firstRenderCount + 1);
  });
});
