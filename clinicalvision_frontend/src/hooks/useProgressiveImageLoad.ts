/**
 * Progressive Image Loading Hook
 * 
 * Enables smooth loading experience for large mammograms by:
 * 1. Loading a thumbnail immediately for preview
 * 2. Loading full resolution progressively
 * 3. Tracking load progress for UI feedback
 */

import { useState, useEffect, useRef } from 'react';

export interface ProgressiveLoadState {
  thumbnail: string | null;
  fullImage: string | null;
  loadProgress: number;
  isLoading: boolean;
  error: string | null;
  imageDimensions: {
    width: number;
    height: number;
  } | null;
}

interface UseProgressiveImageLoadOptions {
  maxThumbnailSize?: number; // Max dimension for thumbnail (default 400)
  onLoadComplete?: (dimensions: { width: number; height: number }) => void;
}

/**
 * Hook for progressive image loading with thumbnail preview
 */
export function useProgressiveImageLoad(
  file: File | null,
  options: UseProgressiveImageLoadOptions = {}
): ProgressiveLoadState {
  const { maxThumbnailSize = 400, onLoadComplete } = options;
  
  const [state, setState] = useState<ProgressiveLoadState>({
    thumbnail: null,
    fullImage: null,
    loadProgress: 0,
    isLoading: false,
    error: null,
    imageDimensions: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const thumbnailUrlRef = useRef<string | null>(null);
  const fullImageUrlRef = useRef<string | null>(null);
  
  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
      if (fullImageUrlRef.current) URL.revokeObjectURL(fullImageUrlRef.current);
    };
  }, []);
  
  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setState({
        thumbnail: null,
        fullImage: null,
        loadProgress: 0,
        isLoading: false,
        error: null,
        imageDimensions: null,
      });
      return;
    }
    
    // Abort any previous loading
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const loadImage = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null, loadProgress: 0 }));
      
      try {
        // Create object URL for full image
        const fullUrl = URL.createObjectURL(file);
        
        // Load image to get dimensions
        const img = new Image();
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const dimensions = { width: img.width, height: img.height };
            
            // Create thumbnail using canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Calculate thumbnail size maintaining aspect ratio
              let thumbWidth = img.width;
              let thumbHeight = img.height;
              
              if (img.width > maxThumbnailSize || img.height > maxThumbnailSize) {
                const ratio = Math.min(
                  maxThumbnailSize / img.width,
                  maxThumbnailSize / img.height
                );
                thumbWidth = Math.round(img.width * ratio);
                thumbHeight = Math.round(img.height * ratio);
              }
              
              canvas.width = thumbWidth;
              canvas.height = thumbHeight;
              ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
              
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const thumbnailUrl = URL.createObjectURL(blob);
                    setState(prev => ({
                      ...prev,
                      thumbnail: thumbnailUrl,
                      loadProgress: 30,
                    }));
                  }
                },
                'image/jpeg',
                0.8
              );
            }
            
            // Set dimensions immediately
            setState(prev => ({
              ...prev,
              imageDimensions: dimensions,
              loadProgress: 50,
            }));
            
            resolve();
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = fullUrl;
        });
        
        // Simulate progressive loading for better UX
        for (let progress = 50; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setState(prev => ({ ...prev, loadProgress: progress }));
        }
        
        setState(prev => ({
          ...prev,
          fullImage: fullUrl,
          isLoading: false,
          loadProgress: 100,
        }));
        
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error.message,
          }));
        }
      }
    };
    
    loadImage();
    
    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, maxThumbnailSize]);
  
  // Handle onLoadComplete callback separately to avoid dependency issues
  useEffect(() => {
    if (state.imageDimensions && onLoadComplete && !state.isLoading && state.loadProgress === 100) {
      onLoadComplete(state.imageDimensions);
    }
  }, [state.imageDimensions, state.isLoading, state.loadProgress, onLoadComplete]);
  
  return state;
}

/**
 * Hook to determine if an image is "full-size" (high resolution)
 * Full-size is defined as > 1000px in any dimension
 */
export function useIsFullSizeMammogram(
  imageDimensions: { width: number; height: number } | null,
  threshold: number = 1000
): boolean {
  if (!imageDimensions) return false;
  return imageDimensions.width > threshold || imageDimensions.height > threshold;
}

/**
 * Hook for analysis mode recommendation based on image size
 */
export function useRecommendedAnalysisMode(
  imageDimensions: { width: number; height: number } | null
): {
  recommendedMode: 'global_only' | 'attention_guided' | 'full_coverage';
  reason: string;
  isHighRes: boolean;
} {
  if (!imageDimensions) {
    return {
      recommendedMode: 'attention_guided',
      reason: 'Default mode for unknown image size',
      isHighRes: false,
    };
  }
  
  const maxDim = Math.max(imageDimensions.width, imageDimensions.height);
  
  if (maxDim < 500) {
    return {
      recommendedMode: 'global_only',
      reason: 'Small image - tile analysis not beneficial',
      isHighRes: false,
    };
  }
  
  if (maxDim > 2000) {
    return {
      recommendedMode: 'attention_guided',
      reason: 'High-resolution mammogram - tile analysis recommended',
      isHighRes: true,
    };
  }
  
  return {
    recommendedMode: 'attention_guided',
    reason: 'Medium resolution - attention-guided analysis optimal',
    isHighRes: maxDim > 1000,
  };
}

export default useProgressiveImageLoad;
