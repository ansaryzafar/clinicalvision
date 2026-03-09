/**
 * useHeatmapCache — React hook for caching expensive heatmap rendering.
 * 
 * The GradCAM++ attention map (56×56 float array) needs to be:
 * 1. Normalized
 * 2. Jet-colormapped
 * 3. Upscaled to display resolution
 * 4. Gaussian blurred
 * 
 * This was previously computed on EVERY canvas render (including mouse moves).
 * This hook computes it ONCE when the attention map changes, and returns a
 * cached HTMLCanvasElement that can be drawn with a single ctx.drawImage() call.
 */

import { useMemo } from 'react';
import { buildCachedHeatmap } from './heatmapCache';

/**
 * Cache the colormapped heatmap canvas.
 * Recomputes only when attentionMap reference, targetWidth, or targetHeight change.
 * 
 * @param attentionMap - Raw 2D attention map from GradCAM++ (e.g. 56×56)
 * @param targetWidth - Display width
 * @param targetHeight - Display height
 * @returns Cached HTMLCanvasElement or null
 */
export function useHeatmapCache(
  attentionMap: number[][] | undefined,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement | null {
  return useMemo(() => {
    if (!attentionMap || attentionMap.length === 0 || targetWidth <= 0 || targetHeight <= 0) {
      return null;
    }
    return buildCachedHeatmap(attentionMap, targetWidth, targetHeight);
  }, [attentionMap, targetWidth, targetHeight]);
}
