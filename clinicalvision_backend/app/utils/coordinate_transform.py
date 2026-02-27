"""
Coordinate Transformation Utilities for Full-Size Mammogram Support

This module provides utilities for transforming coordinates between:
- Model space (224×224 pixels)
- Original image space (variable size, e.g., 3000×4000 pixels)

This is critical for accurate lesion localization in clinical workflows.
"""

import numpy as np
import cv2
from typing import Tuple, List, Dict, Any, Optional


class CoordinateTransformer:
    """
    Transform coordinates between model space and original image space.
    
    The model processes images at 224×224 resolution, but clinical mammograms
    are typically 3000×4000+ pixels. This class handles all coordinate
    transformations to ensure accurate overlay and localization.
    
    Usage:
        transformer = CoordinateTransformer((3000, 4000), model_size=224)
        original_bbox = transformer.model_to_original([50, 60, 30, 40])
        # Returns: [669, 1071, 401, 714] (scaled to original image)
    """
    
    def __init__(
        self,
        original_size: Tuple[int, int],
        model_size: int = 224
    ):
        """
        Initialize the coordinate transformer.
        
        Args:
            original_size: (width, height) of original image in pixels
            model_size: Size of model input (default 224)
        """
        self.original_width, self.original_height = original_size
        self.model_size = model_size
        
        # Calculate scale factors
        self.scale_x = self.original_width / model_size
        self.scale_y = self.original_height / model_size
        
        # Store for reference
        self.original_size = original_size
    
    def model_to_original(self, bbox: List[int]) -> List[int]:
        """
        Convert bounding box from model space (224×224) to original image space.
        
        Args:
            bbox: [x, y, width, height] in model coordinates
            
        Returns:
            [x, y, width, height] in original image coordinates
        """
        x, y, w, h = bbox
        return [
            int(round(x * self.scale_x)),
            int(round(y * self.scale_y)),
            int(round(w * self.scale_x)),
            int(round(h * self.scale_y))
        ]
    
    def original_to_model(self, bbox: List[int]) -> List[int]:
        """
        Convert bounding box from original image space to model space (224×224).
        
        Args:
            bbox: [x, y, width, height] in original image coordinates
            
        Returns:
            [x, y, width, height] in model coordinates
        """
        x, y, w, h = bbox
        return [
            int(round(x / self.scale_x)),
            int(round(y / self.scale_y)),
            int(round(w / self.scale_x)),
            int(round(h / self.scale_y))
        ]
    
    def model_point_to_original(self, x: int, y: int) -> Tuple[int, int]:
        """Convert a single point from model space to original space."""
        return (
            int(round(x * self.scale_x)),
            int(round(y * self.scale_y))
        )
    
    def original_point_to_model(self, x: int, y: int) -> Tuple[int, int]:
        """Convert a single point from original space to model space."""
        return (
            int(round(x / self.scale_x)),
            int(round(y / self.scale_y))
        )
    
    def upscale_heatmap(
        self,
        heatmap: np.ndarray,
        interpolation: int = cv2.INTER_CUBIC
    ) -> np.ndarray:
        """
        Upscale attention heatmap to original image resolution.
        
        Args:
            heatmap: 2D numpy array (typically 56×56 or 224×224)
            interpolation: OpenCV interpolation method
            
        Returns:
            Heatmap scaled to original image dimensions
        """
        return cv2.resize(
            heatmap.astype(np.float32),
            (self.original_width, self.original_height),
            interpolation=interpolation
        )
    
    def downscale_to_model(
        self,
        image: np.ndarray,
        interpolation: int = cv2.INTER_LANCZOS4
    ) -> np.ndarray:
        """
        Downscale original image to model input size.
        
        Args:
            image: Original image as numpy array
            interpolation: OpenCV interpolation method
            
        Returns:
            Image resized to model_size × model_size
        """
        return cv2.resize(
            image,
            (self.model_size, self.model_size),
            interpolation=interpolation
        )
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata dictionary for API response.
        
        Returns:
            Dictionary with coordinate transformation metadata
        """
        return {
            "original_width": self.original_width,
            "original_height": self.original_height,
            "model_width": self.model_size,
            "model_height": self.model_size,
            "scale_x": self.scale_x,
            "scale_y": self.scale_y,
            "aspect_ratio": self.original_width / self.original_height
        }


def transform_regions_to_original(
    regions: List[Dict[str, Any]],
    transformer: CoordinateTransformer
) -> List[Dict[str, Any]]:
    """
    Transform all regions from model space to original space.
    
    Args:
        regions: List of region dicts with 'bbox' key
        transformer: CoordinateTransformer instance
        
    Returns:
        Regions with added 'bbox_original' and 'bbox_model' keys
    """
    transformed = []
    for region in regions:
        region_copy = region.copy()
        if 'bbox' in region:
            region_copy['bbox_model'] = region['bbox']
            region_copy['bbox_original'] = transformer.model_to_original(region['bbox'])
        transformed.append(region_copy)
    return transformed


def merge_overlapping_regions(
    regions: List[Dict[str, Any]],
    iou_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Merge overlapping regions using Non-Maximum Suppression (NMS).
    
    Args:
        regions: List of regions with 'bbox_original' key
        iou_threshold: IoU threshold for merging
        
    Returns:
        Merged list of regions
    """
    if not regions:
        return []
    
    # Extract bboxes and scores
    bboxes = np.array([r.get('bbox_original', r.get('bbox', [0,0,0,0])) for r in regions])
    scores = np.array([r.get('attention_score', 0.5) for r in regions])
    
    # Convert [x, y, w, h] to [x1, y1, x2, y2]
    x1 = bboxes[:, 0]
    y1 = bboxes[:, 1]
    x2 = bboxes[:, 0] + bboxes[:, 2]
    y2 = bboxes[:, 1] + bboxes[:, 3]
    
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        
        w = np.maximum(0, xx2 - xx1)
        h = np.maximum(0, yy2 - yy1)
        
        intersection = w * h
        iou = intersection / (areas[i] + areas[order[1:]] - intersection)
        
        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]
    
    return [regions[i] for i in keep]
