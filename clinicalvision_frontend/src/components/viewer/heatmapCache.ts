/**
 * Heatmap Cache Utilities
 * 
 * Performance-critical utility functions for medical image viewer.
 * These functions are extracted from MedicalViewer to enable:
 * 1. Unit testing without React rendering overhead
 * 2. Caching — compute expensive operations once, reuse the result
 * 3. Potential Web Worker offloading in the future
 * 
 * Key optimizations:
 * - buildCachedHeatmap: Computes the Jet-colormapped, upscaled, blurred
 *   heatmap canvas ONCE. The result is reused on every frame render.
 * - applyWindowLevel: Applies W/L transformation to a source canvas.
 *   Result is cached until W/L parameters change.
 */

/**
 * Jet colormap: maps a value in [0,1] to RGB [0,255].
 * Medical-grade colormap matching Lunit/professional medical imaging.
 * blue → cyan → green → yellow → red
 */
export function jetColormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));

  let r: number, g: number, b: number;

  if (t < 0.125) {
    r = 0;
    g = 0;
    b = 0.5 + t * 4;
  } else if (t < 0.375) {
    r = 0;
    g = (t - 0.125) * 4;
    b = 1;
  } else if (t < 0.625) {
    r = (t - 0.375) * 4;
    g = 1;
    b = 1 - (t - 0.375) * 4;
  } else if (t < 0.875) {
    r = 1;
    g = 1 - (t - 0.625) * 4;
    b = 0;
  } else {
    r = 1 - (t - 0.875) * 2;
    g = 0;
    b = 0;
  }

  return [
    Math.round(Math.max(0, Math.min(255, r * 255))),
    Math.round(Math.max(0, Math.min(255, g * 255))),
    Math.round(Math.max(0, Math.min(255, b * 255))),
  ];
}

/**
 * Build a pre-rendered, colormapped heatmap canvas.
 * 
 * This is the EXPENSIVE operation that was previously run on every frame.
 * Now it's computed once and the resulting canvas is reused.
 * 
 * Steps:
 * 1. Normalize the raw heatmap values to [0,1]
 * 2. Apply Jet colormap to each pixel at native resolution
 * 3. Upscale with bilinear interpolation to target dimensions
 * 4. Apply 2px Gaussian blur for smooth appearance
 * 
 * @param heatmap - Raw 2D attention map (e.g. 56×56)
 * @param targetWidth - Display width in pixels
 * @param targetHeight - Display height in pixels
 * @returns Pre-rendered HTMLCanvasElement (can be drawn directly with drawImage)
 */
export function buildCachedHeatmap(
  heatmap: number[][],
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = targetWidth;
  resultCanvas.height = targetHeight;
  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) return resultCanvas;

  if (!heatmap || heatmap.length === 0 || !heatmap[0]) {
    return resultCanvas;
  }

  const heatHeight = heatmap.length;
  const heatWidth = heatmap[0].length;

  // Step 1: Create small canvas at native heatmap resolution
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = heatWidth;
  smallCanvas.height = heatHeight;
  const smallCtx = smallCanvas.getContext('2d');
  if (!smallCtx) return resultCanvas;

  const imageData = smallCtx.createImageData(heatWidth, heatHeight);
  const data = imageData.data;

  // Step 2: Find min/max for normalization
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let y = 0; y < heatHeight; y++) {
    for (let x = 0; x < heatWidth; x++) {
      const val = heatmap[y][x];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }
  const range = maxVal - minVal || 1;

  // Step 3: Apply Jet colormap
  for (let y = 0; y < heatHeight; y++) {
    for (let x = 0; x < heatWidth; x++) {
      const normalizedValue = (heatmap[y][x] - minVal) / range;
      const idx = (y * heatWidth + x) * 4;
      const [r, g, b] = jetColormap(normalizedValue);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  smallCtx.putImageData(imageData, 0, 0);

  // Step 4: Upscale with high-quality interpolation
  resultCtx.imageSmoothingEnabled = true;
  resultCtx.imageSmoothingQuality = 'high';
  resultCtx.drawImage(smallCanvas, 0, 0, targetWidth, targetHeight);

  // Step 5: Apply Gaussian-like blur for smooth appearance
  resultCtx.filter = 'blur(2px)';
  resultCtx.drawImage(resultCanvas, 0, 0);
  resultCtx.filter = 'none';

  return resultCanvas;
}

/**
 * Apply Window/Level transformation to a source canvas.
 * 
 * This was previously done on every frame using a temporary canvas.
 * Now it's cached — recomputed only when W/L parameters change.
 * 
 * @param sourceCanvas - Canvas containing the original image
 * @param width - Window width (contrast)
 * @param center - Window center (brightness)
 * @returns New canvas with W/L transformation applied
 */
export function applyWindowLevel(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  center: number
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = w;
  resultCanvas.height = h;
  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) return resultCanvas;

  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return resultCanvas;

  // Copy source image data
  const imageData = sourceCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const lower = center - width / 2;
  const upper = center + width / 2;
  const scale = 255 / (upper - lower || 1);

  // Apply W/L transformation
  for (let i = 0; i < data.length; i += 4) {
    const value = (data[i] + data[i + 1] + data[i + 2]) / 3;
    let adjusted = (value - lower) * scale;
    adjusted = adjusted < 0 ? 0 : adjusted > 255 ? 255 : adjusted;

    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  resultCtx.putImageData(imageData, 0, 0);
  return resultCanvas;
}
