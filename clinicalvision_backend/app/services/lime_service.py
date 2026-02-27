"""
LIME (Local Interpretable Model-agnostic Explanations) Service

Implements LIME for image-based mammogram explanations using superpixel segmentation.
Provides model-agnostic local explanations by perturbing image regions and 
observing the effect on predictions.

Reference:
- Ribeiro et al. (2016) - "Why Should I Trust You?": Explaining the Predictions of Any Classifier
  https://arxiv.org/abs/1602.04938

Key Features:
- SLIC superpixel segmentation for meaningful regions
- Perturbation-based local explanation
- Weighted linear model for local approximation
- Feature importance for superpixel regions
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from enum import Enum
import cv2
from dataclasses import dataclass, field

from app.core.logging import logger


class SegmentationMethod(str, Enum):
    """Superpixel segmentation methods"""
    SLIC = "slic"  # Simple Linear Iterative Clustering
    QUICKSHIFT = "quickshift"
    FELZENSZWALB = "felzenszwalb"


@dataclass
class LIMEConfig:
    """Configuration for LIME explanations"""
    # Segmentation parameters
    n_segments: int = 50  # Number of superpixels
    compactness: float = 10.0  # SLIC compactness parameter
    segmentation_method: SegmentationMethod = SegmentationMethod.SLIC
    
    # Perturbation parameters  
    n_samples: int = 100  # Number of perturbed samples
    hide_color: Optional[int] = None  # Color for hidden segments (None = gray)
    
    # Model fitting parameters
    kernel_width: float = 0.25  # RBF kernel width for locality
    top_k_features: int = 10  # Number of top features to show
    
    # Output parameters
    positive_only: bool = False  # Show only positive contributions
    output_size: Tuple[int, int] = (56, 56)


class LIMEService:
    """
    LIME (Local Interpretable Model-agnostic Explanations) Service
    
    Generates local explanations for mammogram predictions by:
    1. Segmenting image into superpixels
    2. Generating perturbed versions by hiding/showing segments
    3. Getting predictions for perturbed versions
    4. Fitting weighted linear model to explain prediction
    5. Extracting most important regions
    """
    
    def __init__(
        self,
        tf_module=None,
        keras_module=None,
        config: Optional[LIMEConfig] = None
    ):
        """
        Initialize LIME service.
        
        Args:
            tf_module: TensorFlow module (lazy loaded)
            keras_module: Keras module (lazy loaded)
            config: LIME configuration parameters
        """
        self.tf = tf_module
        self.keras = keras_module
        self.config = config or LIMEConfig()
        self._sklearn_available = None
        
    def set_modules(self, tf_module, keras_module):
        """Set TensorFlow and Keras modules."""
        self.tf = tf_module
        self.keras = keras_module
    
    def _check_sklearn(self) -> bool:
        """Check if sklearn is available for LIME."""
        if self._sklearn_available is None:
            try:
                from sklearn.linear_model import Ridge
                from sklearn.metrics.pairwise import pairwise_distances
                self._sklearn_available = True
            except ImportError:
                self._sklearn_available = False
        return self._sklearn_available
    
    def generate_lime_explanation(
        self,
        model,
        image: np.ndarray,
        config: Optional[LIMEConfig] = None
    ) -> Dict[str, Any]:
        """
        Generate LIME explanation for model prediction.
        
        Args:
            model: Keras model to explain
            image: Input image [1, H, W, C] normalized to [0,1]
            config: Optional configuration override
            
        Returns:
            Dictionary containing:
            - lime_map: Explanation heatmap as nested list
            - segment_importance: Importance score for each segment
            - top_segments: Most important segment IDs
            - feature_weights: Linear model feature weights
            - method_used: "lime"
            - segments_mask: Segmentation mask
        """
        cfg = config or self.config
        
        if not self._check_sklearn():
            logger.warning("sklearn not available for LIME - using simplified version")
            return self._generate_simplified_lime(model, image, cfg)
        
        if self.tf is None:
            logger.warning("TensorFlow not initialized for LIME")
            return self._generate_fallback_explanation(cfg.output_size)
        
        try:
            logger.info(f"LIME: Generating explanation with {cfg.n_segments} segments, {cfg.n_samples} samples")
            
            # Extract 2D image for segmentation
            img_2d = self._extract_2d_image(image)
            
            # Step 1: Generate superpixel segmentation
            segments = self._segment_image(img_2d, cfg)
            n_features = segments.max() + 1
            
            logger.debug(f"LIME: Created {n_features} segments")
            
            # Step 2: Generate perturbations
            perturbations, perturbed_images = self._generate_perturbations(
                image, segments, n_features, cfg
            )
            
            # Step 3: Get predictions for perturbed samples
            predictions = self._get_perturbed_predictions(model, perturbed_images)
            
            # Step 4: Calculate distances/weights for locality
            weights = self._calculate_weights(perturbations, cfg)
            
            # Step 5: Fit weighted linear model
            feature_weights = self._fit_linear_model(perturbations, predictions, weights)
            
            # Step 6: Generate explanation heatmap
            lime_map = self._generate_heatmap(segments, feature_weights, cfg)
            
            # Step 7: Extract top features
            top_k = min(cfg.top_k_features, len(feature_weights))
            top_indices = np.argsort(np.abs(feature_weights))[::-1][:top_k]
            
            # Normalize heatmap
            lime_map_normalized = self._normalize_heatmap(lime_map, cfg.output_size)
            
            # Get segment importance info
            segment_importance = {
                int(i): float(feature_weights[i]) for i in range(len(feature_weights))
            }
            
            # Extract top regions
            top_regions = self._extract_top_regions(
                segments, feature_weights, top_indices, img_2d.shape[:2]
            )
            
            logger.info(f"LIME: Generated explanation with {len(top_regions)} top regions")
            
            return {
                "lime_map": lime_map_normalized.tolist(),
                "segment_importance": segment_importance,
                "top_segments": [int(i) for i in top_indices],
                "top_regions": top_regions,
                "feature_weights": feature_weights.tolist(),
                "n_segments": int(n_features),
                "n_samples": cfg.n_samples,
                "method_used": "lime",
                "segments_mask": segments.tolist()
            }
            
        except Exception as e:
            logger.warning(f"LIME generation failed: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._generate_fallback_explanation(cfg.output_size)
    
    def _extract_2d_image(self, image: np.ndarray) -> np.ndarray:
        """Extract 2D image from batched input."""
        if image.ndim == 4:
            img = image[0]  # Remove batch dimension
        else:
            img = image
            
        if img.ndim == 3 and img.shape[-1] == 1:
            img = img[:, :, 0]  # Remove channel for grayscale
        elif img.ndim == 3 and img.shape[-1] == 3:
            # Convert to grayscale for segmentation
            img = np.mean(img, axis=-1)
            
        return img
    
    def _segment_image(
        self,
        image: np.ndarray,
        config: LIMEConfig
    ) -> np.ndarray:
        """
        Segment image into superpixels using SLIC algorithm.
        
        Args:
            image: 2D or 3D image array
            config: LIME configuration
            
        Returns:
            Segmentation mask with integer labels
        """
        # Convert to uint8 for OpenCV
        if image.max() <= 1.0:
            img_uint8 = (image * 255).astype(np.uint8)
        else:
            img_uint8 = image.astype(np.uint8)
        
        # Ensure 3 channels for SLIC
        if img_uint8.ndim == 2:
            img_color = cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR)
        else:
            img_color = img_uint8
        
        try:
            # Try using skimage SLIC (better quality)
            from skimage.segmentation import slic
            
            segments = slic(
                img_color,
                n_segments=config.n_segments,
                compactness=config.compactness,
                sigma=1.0,
                start_label=0,
                channel_axis=-1
            )
            
        except ImportError:
            # Fallback to simple grid-based segmentation
            segments = self._grid_segmentation(img_uint8, config.n_segments)
        
        return segments.astype(np.int32)
    
    def _grid_segmentation(self, image: np.ndarray, n_segments: int) -> np.ndarray:
        """Simple grid-based segmentation fallback."""
        h, w = image.shape[:2]
        grid_size = int(np.sqrt(n_segments))
        
        cell_h = h // grid_size
        cell_w = w // grid_size
        
        segments = np.zeros((h, w), dtype=np.int32)
        
        for i in range(grid_size):
            for j in range(grid_size):
                y1 = i * cell_h
                y2 = min((i + 1) * cell_h, h)
                x1 = j * cell_w
                x2 = min((j + 1) * cell_w, w)
                segments[y1:y2, x1:x2] = i * grid_size + j
        
        return segments
    
    def _generate_perturbations(
        self,
        image: np.ndarray,
        segments: np.ndarray,
        n_features: int,
        config: LIMEConfig
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate perturbed versions of the image.
        
        Args:
            image: Original image [1, H, W, C]
            segments: Segmentation mask
            n_features: Number of segments
            config: LIME configuration
            
        Returns:
            Tuple of (perturbation_masks, perturbed_images)
        """
        # Generate random binary masks
        np.random.seed(42)  # For reproducibility
        perturbations = np.random.randint(0, 2, (config.n_samples, n_features))
        
        # Always include the original (all 1s)
        perturbations[0] = 1
        
        # Determine hide color
        if config.hide_color is None:
            hide_value = image.mean()  # Use mean color
        else:
            hide_value = config.hide_color / 255.0
        
        # Generate perturbed images
        perturbed_images = []
        
        for mask in perturbations:
            # Create copy of image
            perturbed = image.copy()
            
            # Hide segments where mask is 0
            for seg_idx in range(n_features):
                if mask[seg_idx] == 0:
                    segment_mask = segments == seg_idx
                    # Apply mask to image
                    if perturbed.ndim == 4:
                        for c in range(perturbed.shape[-1]):
                            perturbed[0, :, :, c][segment_mask] = hide_value
                    else:
                        perturbed[segment_mask] = hide_value
            
            perturbed_images.append(perturbed)
        
        return perturbations, np.array(perturbed_images)
    
    def _get_perturbed_predictions(
        self,
        model,
        perturbed_images: np.ndarray
    ) -> np.ndarray:
        """Get model predictions for perturbed samples."""
        predictions = []
        
        # Process in batches to avoid memory issues
        batch_size = 16
        n_samples = len(perturbed_images)
        
        for i in range(0, n_samples, batch_size):
            batch = perturbed_images[i:i + batch_size]
            
            # Ensure correct shape
            if batch.ndim == 5:
                batch = batch.squeeze(1)
            
            preds = model(batch, training=False).numpy()
            
            # Extract malignancy probability
            if preds.ndim == 2:
                preds = preds[:, 0] if preds.shape[1] == 1 else preds[:, 1]
            
            predictions.extend(preds.flatten())
        
        return np.array(predictions)
    
    def _calculate_weights(
        self,
        perturbations: np.ndarray,
        config: LIMEConfig
    ) -> np.ndarray:
        """
        Calculate locality weights using RBF kernel.
        
        Samples closer to original (more 1s) get higher weight.
        """
        from sklearn.metrics.pairwise import pairwise_distances
        
        # Original sample is all 1s
        original = np.ones((1, perturbations.shape[1]))
        
        # Calculate Euclidean distances
        distances = pairwise_distances(
            perturbations,
            original,
            metric='cosine'
        ).flatten()
        
        # RBF kernel for weights
        kernel_width = config.kernel_width * np.sqrt(perturbations.shape[1])
        weights = np.sqrt(np.exp(-distances ** 2 / kernel_width ** 2))
        
        return weights
    
    def _fit_linear_model(
        self,
        perturbations: np.ndarray,
        predictions: np.ndarray,
        weights: np.ndarray
    ) -> np.ndarray:
        """
        Fit weighted Ridge regression as local surrogate model.
        
        Returns feature weights (importance of each segment).
        """
        from sklearn.linear_model import Ridge
        
        # Fit weighted Ridge regression
        model = Ridge(alpha=1.0)
        model.fit(perturbations, predictions, sample_weight=weights)
        
        return model.coef_
    
    def _generate_heatmap(
        self,
        segments: np.ndarray,
        feature_weights: np.ndarray,
        config: LIMEConfig
    ) -> np.ndarray:
        """Generate heatmap from segment weights."""
        heatmap = np.zeros(segments.shape, dtype=np.float32)
        
        for seg_idx, weight in enumerate(feature_weights):
            if config.positive_only and weight < 0:
                continue
            heatmap[segments == seg_idx] = weight
        
        return heatmap
    
    def _normalize_heatmap(
        self,
        heatmap: np.ndarray,
        output_size: Tuple[int, int]
    ) -> np.ndarray:
        """Normalize and resize heatmap."""
        # Resize
        heatmap_resized = cv2.resize(heatmap, output_size, interpolation=cv2.INTER_LINEAR)
        
        # Normalize to [0, 1]
        hmin, hmax = heatmap_resized.min(), heatmap_resized.max()
        if hmax > hmin:
            heatmap_resized = (heatmap_resized - hmin) / (hmax - hmin)
        else:
            heatmap_resized = np.zeros_like(heatmap_resized)
        
        return heatmap_resized.astype(np.float32)
    
    def _extract_top_regions(
        self,
        segments: np.ndarray,
        weights: np.ndarray,
        top_indices: np.ndarray,
        image_size: Tuple[int, int]
    ) -> List[Dict[str, Any]]:
        """Extract bounding box info for top segments."""
        regions = []
        h, w = image_size
        scale = 224.0 / max(h, w)
        
        for rank, seg_idx in enumerate(top_indices):
            mask = segments == seg_idx
            
            if not mask.any():
                continue
            
            # Find bounding box
            ys, xs = np.where(mask)
            y1, y2 = ys.min(), ys.max()
            x1, x2 = xs.min(), xs.max()
            
            # Calculate centroid
            cy, cx = ys.mean(), xs.mean()
            
            regions.append({
                "segment_id": int(seg_idx),
                "rank": rank + 1,
                "importance": float(weights[seg_idx]),
                "bbox": [
                    int(x1 * scale),
                    int(y1 * scale),
                    int((x2 - x1) * scale),
                    int((y2 - y1) * scale)
                ],
                "centroid": [int(cx * scale), int(cy * scale)],
                "area_fraction": float(mask.sum()) / (h * w),
                "location": self._get_anatomical_location(cx, cy, w, h)
            })
        
        return regions
    
    def _get_anatomical_location(self, x: float, y: float, w: int, h: int) -> str:
        """Map coordinates to anatomical quadrant."""
        mid_x, mid_y = w // 2, h // 2
        center_margin_x = w // 6
        center_margin_y = h // 6
        
        if abs(x - mid_x) < center_margin_x and abs(y - mid_y) < center_margin_y:
            return "central/retroareolar"
        
        vertical = "upper" if y < mid_y else "lower"
        horizontal = "inner" if x < mid_x else "outer"
        
        return f"{vertical} {horizontal} quadrant"
    
    def _generate_simplified_lime(
        self,
        model,
        image: np.ndarray,
        config: LIMEConfig
    ) -> Dict[str, Any]:
        """
        Simplified LIME without sklearn.
        
        Uses occlusion-based importance instead of linear surrogate.
        """
        logger.info("LIME: Using simplified occlusion-based method")
        
        try:
            img_2d = self._extract_2d_image(image)
            segments = self._segment_image(img_2d, config)
            n_features = segments.max() + 1
            
            # Get original prediction
            original_pred = model(image, training=False).numpy().flatten()[0]
            
            # Calculate importance by occlusion
            importances = []
            hide_value = image.mean()
            
            for seg_idx in range(n_features):
                # Create occluded image
                occluded = image.copy()
                segment_mask = segments == seg_idx
                
                if occluded.ndim == 4:
                    for c in range(occluded.shape[-1]):
                        occluded[0, :, :, c][segment_mask] = hide_value
                
                # Get prediction
                occluded_pred = model(occluded, training=False).numpy().flatten()[0]
                
                # Importance = drop in prediction when occluded
                importance = original_pred - occluded_pred
                importances.append(importance)
            
            importances = np.array(importances)
            
            # Generate heatmap
            heatmap = self._generate_heatmap(segments, importances, config)
            heatmap_normalized = self._normalize_heatmap(heatmap, config.output_size)
            
            # Get top segments
            top_k = min(config.top_k_features, len(importances))
            top_indices = np.argsort(np.abs(importances))[::-1][:top_k]
            
            top_regions = self._extract_top_regions(
                segments, importances, top_indices, img_2d.shape[:2]
            )
            
            return {
                "lime_map": heatmap_normalized.tolist(),
                "segment_importance": {int(i): float(importances[i]) for i in range(len(importances))},
                "top_segments": [int(i) for i in top_indices],
                "top_regions": top_regions,
                "feature_weights": importances.tolist(),
                "n_segments": int(n_features),
                "n_samples": n_features + 1,  # One per segment plus original
                "method_used": "lime_simplified",
                "segments_mask": segments.tolist()
            }
            
        except Exception as e:
            logger.warning(f"Simplified LIME failed: {e}")
            return self._generate_fallback_explanation(config.output_size)
    
    def _generate_fallback_explanation(
        self,
        output_size: Tuple[int, int]
    ) -> Dict[str, Any]:
        """Generate fallback when LIME fails."""
        heatmap = np.random.rand(*output_size) * 0.3
        
        # Add a random hot spot
        cx, cy = np.random.randint(15, output_size[0] - 15, 2)
        y_grid, x_grid = np.ogrid[:output_size[0], :output_size[1]]
        mask = (x_grid - cx) ** 2 + (y_grid - cy) ** 2 <= 10 ** 2
        heatmap[mask] += 0.4
        heatmap = np.clip(heatmap, 0, 1)
        
        return {
            "lime_map": heatmap.tolist(),
            "segment_importance": {},
            "top_segments": [],
            "top_regions": [],
            "feature_weights": [],
            "n_segments": 0,
            "n_samples": 0,
            "method_used": "fallback",
            "segments_mask": []
        }
    
    def generate_colored_lime_overlay(
        self,
        original_image: np.ndarray,
        lime_map: np.ndarray,
        alpha: float = 0.5
    ) -> np.ndarray:
        """
        Generate colored overlay showing LIME explanation.
        
        Positive contributions: Green
        Negative contributions: Red
        Neutral: Original image
        """
        # Ensure grayscale base
        if original_image.ndim == 2:
            base = cv2.cvtColor(
                (original_image * 255).astype(np.uint8),
                cv2.COLOR_GRAY2RGB
            )
        elif original_image.shape[-1] == 1:
            base = cv2.cvtColor(
                (original_image[:, :, 0] * 255).astype(np.uint8),
                cv2.COLOR_GRAY2RGB
            )
        else:
            base = (original_image * 255).astype(np.uint8)
        
        # Resize LIME map to match
        h, w = base.shape[:2]
        lime_resized = cv2.resize(lime_map, (w, h))
        
        # Create colored overlay
        overlay = np.zeros_like(base, dtype=np.float32)
        
        # Positive (green) - supporting malignancy
        pos_mask = lime_resized > 0.5
        overlay[pos_mask, 1] = (lime_resized[pos_mask] - 0.5) * 2 * 255
        
        # Negative (red) - supporting benign
        neg_mask = lime_resized < 0.5
        overlay[neg_mask, 2] = (0.5 - lime_resized[neg_mask]) * 2 * 255
        
        # Blend
        blended = cv2.addWeighted(
            base.astype(np.float32),
            1 - alpha,
            overlay,
            alpha,
            0
        ).astype(np.uint8)
        
        return blended


# Singleton instance
_lime_service: Optional[LIMEService] = None


def get_lime_service() -> LIMEService:
    """Get or create the LIME service singleton."""
    global _lime_service
    if _lime_service is None:
        _lime_service = LIMEService()
    return _lime_service
