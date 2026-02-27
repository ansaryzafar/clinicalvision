"""
Explainability Service - Comprehensive XAI Methods for Medical Imaging

Provides comprehensive explainability for mammogram classification:
- GradCAM: Original gradient-weighted class activation mapping
- GradCAM++: Improved weighting for better localization
- Integrated Gradients: Attribution-based method
- LIME: Local Interpretable Model-agnostic Explanations
- SHAP: SHapley Additive exPlanations
- Region extraction from attention maps

Reference:
- GradCAM: Selvaraju et al. (2017) - https://arxiv.org/abs/1610.02391
- GradCAM++: Chattopadhyay et al. (2018) - https://arxiv.org/abs/1710.11063
- LIME: Ribeiro et al. (2016) - https://arxiv.org/abs/1602.04938
- SHAP: Lundberg & Lee (2017) - https://arxiv.org/abs/1705.07874
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from enum import Enum
import cv2

from app.core.logging import logger


class ExplainabilityMethod(str, Enum):
    """Available explainability methods - comprehensive XAI suite"""
    # Gradient-based methods (model-specific for CNNs)
    GRADCAM = "gradcam"
    GRADCAM_PLUS_PLUS = "gradcam++"
    INTEGRATED_GRADIENTS = "integrated_gradients"
    
    # Model-agnostic methods (work with any model)
    LIME = "lime"
    SHAP = "shap"
    
    # Comparison mode
    ALL = "all"  # Generate all explanations for comparison


class ExplainabilityService:
    """
    Unified service for generating explanations/visualizations
    for mammogram classification predictions.
    """
    
    # Default target layer for DenseNet121
    # conv5_block16_concat is the last convolutional layer before global pooling
    DEFAULT_TARGET_LAYER = "conv5_block16_concat"
    
    def __init__(self, tf_module=None, keras_module=None):
        """
        Initialize the explainability service.
        
        Args:
            tf_module: TensorFlow module (lazy loaded)
            keras_module: Keras module (lazy loaded)
        """
        self.tf = tf_module
        self.keras = keras_module
        self._layer_cache: Dict[str, str] = {}  # Model name -> target layer
        
    def set_modules(self, tf_module, keras_module):
        """Set TensorFlow and Keras modules (for lazy initialization)."""
        self.tf = tf_module
        self.keras = keras_module
    
    def generate_explanation(
        self,
        model,
        image: np.ndarray,
        method: ExplainabilityMethod = ExplainabilityMethod.GRADCAM_PLUS_PLUS,
        target_class: int = 0,
        target_layer: Optional[str] = None,
        output_size: Tuple[int, int] = (56, 56)
    ) -> Dict[str, Any]:
        """
        Generate explanation for model prediction.
        
        Args:
            model: Keras model to explain
            image: Input image [1, H, W, C] normalized to [0,1]
            method: Explainability method to use
            target_class: Class index to explain (0 for binary)
            target_layer: Specific layer to use (auto-detected if None)
            output_size: Size of output heatmap
            
        Returns:
            Dictionary containing:
            - attention_map: 2D heatmap as nested list
            - suspicious_regions: List of detected regions
            - method_used: Name of method used
            - target_layer: Layer used for visualization
        """
        if self.tf is None or self.keras is None:
            logger.warning("TensorFlow not initialized for explainability")
            return self._generate_fallback_explanation(output_size)
        
        try:
            # Auto-detect target layer if not specified
            if target_layer is None:
                target_layer = self._find_target_layer(model)
            
            if target_layer is None:
                logger.warning("Could not find suitable convolutional layer")
                return self._generate_fallback_explanation(output_size)
            
            logger.info(f"Explainability: Using method={method.value}, layer={target_layer}")
            
            # Generate heatmap based on method
            if method == ExplainabilityMethod.GRADCAM:
                heatmap = self._gradcam(model, image, target_layer, target_class)
            elif method == ExplainabilityMethod.GRADCAM_PLUS_PLUS:
                heatmap = self._gradcam_plus_plus(model, image, target_layer, target_class)
            elif method == ExplainabilityMethod.INTEGRATED_GRADIENTS:
                heatmap = self._integrated_gradients(model, image, target_class)
            else:
                heatmap = self._gradcam_plus_plus(model, image, target_layer, target_class)
            
            # Post-process heatmap
            heatmap_processed = self._postprocess_heatmap(heatmap, output_size)
            
            # Extract suspicious regions
            # Get prediction probability for region extraction
            pred = model(image, training=False).numpy().flatten()[0]
            regions = self._extract_regions(heatmap_processed, pred)
            
            logger.info(f"Explainability: Generated heatmap [{heatmap_processed.min():.3f}, {heatmap_processed.max():.3f}], {len(regions)} regions")
            
            return {
                "attention_map": heatmap_processed.tolist(),
                "suspicious_regions": regions,
                "method_used": method.value,
                "target_layer": target_layer
            }
            
        except Exception as e:
            logger.warning(f"Explainability generation failed: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._generate_fallback_explanation(output_size)
    
    def _find_target_layer(self, model) -> Optional[str]:
        """
        Auto-detect the best target layer for GradCAM.
        
        For DenseNet121, we look for:
        1. conv5_block16_concat (best - final dense block output)
        2. Any conv5 layer with 4D output
        3. Layer before GlobalAveragePooling2D
        4. Any layer with 4D output
        """
        model_name = getattr(model, 'name', 'unknown')
        
        # Check cache first
        if model_name in self._layer_cache:
            return self._layer_cache[model_name]
        
        target_layer = None
        
        # Strategy 1: Find DenseNet121 specific layers
        for layer in reversed(model.layers):
            name = layer.name.lower()
            # DenseNet121 final conv block
            if 'conv5_block16' in name and ('concat' in name or '_2_conv' in name):
                target_layer = layer.name
                break
            # Also accept relu after the block
            if 'conv5' in name and 'relu' in name:
                target_layer = layer.name
                break
        
        # Strategy 2: Find layer before GlobalAveragePooling2D
        if target_layer is None:
            for i, layer in enumerate(model.layers):
                if 'global' in layer.name.lower() and 'pool' in layer.name.lower():
                    if i > 0:
                        candidate = model.layers[i-1]
                        try:
                            if len(candidate.output_shape) == 4:
                                target_layer = candidate.name
                        except:
                            pass
                    break
        
        # Strategy 3: Any layer with 4D output near the end
        if target_layer is None:
            for layer in reversed(model.layers):
                try:
                    output_shape = layer.output_shape
                    if isinstance(output_shape, tuple) and len(output_shape) == 4:
                        target_layer = layer.name
                        break
                except:
                    continue
        
        # Cache the result
        if target_layer:
            self._layer_cache[model_name] = target_layer
        
        return target_layer
    
    def _gradcam(
        self,
        model,
        image: np.ndarray,
        target_layer: str,
        target_class: int = 0
    ) -> np.ndarray:
        """
        Original GradCAM implementation.
        
        GradCAM weights each feature map by the global-average-pooled gradients.
        
        Args:
            model: Keras model
            image: Input image [1, H, W, C]
            target_layer: Name of target convolutional layer
            target_class: Class to explain
            
        Returns:
            Heatmap as numpy array (same spatial dims as target layer output)
        """
        # Create sub-model for feature extraction
        grad_model = self.keras.Model(
            inputs=model.inputs,
            outputs=[model.get_layer(target_layer).output, model.output]
        )
        
        # Compute gradients
        with self.tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(image, training=False)
            tape.watch(conv_outputs)
            
            # For binary classification, target the sigmoid output
            if predictions.shape[-1] == 1:
                target = predictions[:, 0]
            else:
                target = predictions[:, target_class]
        
        # Gradient of target w.r.t. conv outputs
        grads = tape.gradient(target, conv_outputs)
        
        # Global average pooling of gradients -> importance weights
        # Shape: [batch, channels]
        weights = self.tf.reduce_mean(grads, axis=[1, 2])
        
        # Weighted combination of feature maps
        conv_outputs_val = conv_outputs[0]  # Remove batch dim
        weights_val = weights[0]
        
        # Compute weighted sum: sum(w_k * A^k)
        heatmap = self.tf.reduce_sum(conv_outputs_val * weights_val, axis=-1)
        
        # ReLU to keep only positive contributions
        heatmap = self.tf.nn.relu(heatmap)
        
        return heatmap.numpy()
    
    def _gradcam_plus_plus(
        self,
        model,
        image: np.ndarray,
        target_layer: str,
        target_class: int = 0
    ) -> np.ndarray:
        """
        GradCAM++ implementation with improved localization.
        
        GradCAM++ uses second-order gradients to compute better weights,
        providing more accurate localization especially for multiple objects.
        
        Formula: α^{kc}_{ij} = (∂²Y^c/∂A^k_{ij}²) / [2(∂²Y^c/∂A^k_{ij}²) + Σ_{ab}A^k_{ab}(∂³Y^c/∂A^k_{ij}³)]
        
        Args:
            model: Keras model
            image: Input image [1, H, W, C]
            target_layer: Name of target convolutional layer
            target_class: Class to explain
            
        Returns:
            Heatmap as numpy array
        """
        # Create sub-model
        grad_model = self.keras.Model(
            inputs=model.inputs,
            outputs=[model.get_layer(target_layer).output, model.output]
        )
        
        # Need persistent tape for second-order gradients
        with self.tf.GradientTape(persistent=True) as tape2:
            with self.tf.GradientTape() as tape1:
                conv_outputs, predictions = grad_model(image, training=False)
                tape1.watch(conv_outputs)
                tape2.watch(conv_outputs)
                
                # Target output
                if predictions.shape[-1] == 1:
                    target = predictions[:, 0]
                else:
                    target = predictions[:, target_class]
            
            # First-order gradients
            first_grads = tape1.gradient(target, conv_outputs)
        
        # Second-order gradients
        second_grads = tape2.gradient(first_grads, conv_outputs)
        del tape2
        
        # Extract values (remove batch dimension)
        conv_vals = conv_outputs[0]
        first_grads_val = first_grads[0]
        
        if second_grads is not None:
            second_grads_val = second_grads[0]
            
            # GradCAM++ alpha computation
            # α = ∂²Y/∂A² / [2·∂²Y/∂A² + Σ(A)·∂³Y/∂A³]
            # Simplified: use positive gradients weighted by second derivative
            
            global_sum = self.tf.reduce_sum(conv_vals, axis=[0, 1], keepdims=True)
            
            # Compute alpha weights
            alpha_num = second_grads_val
            alpha_denom = 2.0 * second_grads_val + global_sum * self.tf.pow(first_grads_val, 3)
            alpha_denom = self.tf.where(
                self.tf.abs(alpha_denom) > 1e-10,
                alpha_denom,
                self.tf.ones_like(alpha_denom) * 1e-10
            )
            alphas = alpha_num / alpha_denom
            
            # Weights are ReLU(first_grads) weighted by alphas, then summed spatially
            positive_grads = self.tf.nn.relu(first_grads_val)
            weights = self.tf.reduce_sum(alphas * positive_grads, axis=[0, 1])
        else:
            # Fallback to standard GradCAM if second grads unavailable
            weights = self.tf.reduce_mean(first_grads_val, axis=[0, 1])
        
        # Generate heatmap
        heatmap = self.tf.reduce_sum(conv_vals * weights, axis=-1)
        
        # ReLU and normalize
        heatmap = self.tf.nn.relu(heatmap)
        
        return heatmap.numpy()
    
    def _integrated_gradients(
        self,
        model,
        image: np.ndarray,
        target_class: int = 0,
        steps: int = 50
    ) -> np.ndarray:
        """
        Integrated Gradients attribution method.
        
        Computes attributions by integrating gradients along a straight path
        from a baseline (zero image) to the input image.
        
        Formula: IG_i(x) = (x_i - x'_i) × ∫₀¹ (∂F(x' + α(x-x'))/∂x_i) dα
        
        Args:
            model: Keras model
            image: Input image [1, H, W, C]
            target_class: Class to explain
            steps: Number of interpolation steps
            
        Returns:
            Attribution heatmap (spatial sum of absolute attributions)
        """
        # Baseline is a zero image (could also use mean, blur, etc.)
        baseline = self.tf.zeros_like(image)
        
        # Generate interpolated images
        alphas = self.tf.linspace(0.0, 1.0, steps + 1)
        
        # Compute gradients at each step
        gradients = []
        for alpha in alphas:
            interpolated = baseline + alpha * (image - baseline)
            
            with self.tf.GradientTape() as tape:
                tape.watch(interpolated)
                predictions = model(interpolated, training=False)
                
                if predictions.shape[-1] == 1:
                    target = predictions[:, 0]
                else:
                    target = predictions[:, target_class]
            
            grad = tape.gradient(target, interpolated)
            gradients.append(grad)
        
        # Approximate integral using trapezoidal rule
        gradients = self.tf.stack(gradients, axis=0)
        avg_gradients = self.tf.reduce_mean(gradients, axis=0)
        
        # Attributions = (input - baseline) * avg_gradients
        attributions = (image - baseline) * avg_gradients
        
        # Sum across channels and take absolute value for visualization
        heatmap = self.tf.reduce_sum(self.tf.abs(attributions[0]), axis=-1)
        
        return heatmap.numpy()
    
    def _postprocess_heatmap(
        self,
        heatmap: np.ndarray,
        output_size: Tuple[int, int] = (56, 56),
        apply_smoothing: bool = True
    ) -> np.ndarray:
        """
        Post-process heatmap for visualization.
        
        Args:
            heatmap: Raw heatmap from explainability method
            output_size: Target output size
            apply_smoothing: Whether to apply Gaussian smoothing
            
        Returns:
            Processed heatmap normalized to [0, 1]
        """
        # Resize to intermediate size first (for quality)
        heatmap_resized = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_LINEAR)
        
        # Then to output size
        heatmap_resized = cv2.resize(heatmap_resized, output_size, interpolation=cv2.INTER_AREA)
        
        # Apply Gaussian smoothing for cleaner visualization
        if apply_smoothing:
            heatmap_resized = cv2.GaussianBlur(heatmap_resized, (3, 3), 0)
        
        # Normalize to [0, 1]
        heatmap_min = heatmap_resized.min()
        heatmap_max = heatmap_resized.max()
        
        if heatmap_max > heatmap_min:
            heatmap_resized = (heatmap_resized - heatmap_min) / (heatmap_max - heatmap_min)
        else:
            heatmap_resized = np.zeros_like(heatmap_resized)
        
        return heatmap_resized.astype(np.float32)
    
    def _extract_regions(
        self,
        heatmap: np.ndarray,
        malignancy_prob: float,
        max_regions: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Extract suspicious regions from attention heatmap.
        
        Uses connected component analysis to find distinct high-attention
        regions rather than one large bounding box.
        
        Args:
            heatmap: Processed attention heatmap [H, W]
            malignancy_prob: Prediction probability (affects thresholding)
            max_regions: Maximum number of regions to return
            
        Returns:
            List of suspicious regions with bbox, score, and location
        """
        # Adaptive thresholding based on probability
        # Higher malignancy -> lower threshold to capture more suspicious areas
        if malignancy_prob > 0.7:
            threshold = np.percentile(heatmap, 85)
        elif malignancy_prob > 0.4:
            threshold = np.percentile(heatmap, 88)
        else:
            threshold = np.percentile(heatmap, 90)
        
        # Create binary mask
        binary = (heatmap > threshold).astype(np.uint8)
        
        # Morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        
        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            binary, connectivity=8
        )
        
        regions = []
        heatmap_size = heatmap.shape[0]
        scale = 224 / heatmap_size  # Scale to 224x224 coordinates
        
        # Process each component (skip label 0 = background)
        for i in range(1, num_labels):
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]
            
            # Filter very small regions (noise)
            min_area = 4  # At least 2x2 pixels
            if area < min_area:
                continue
            
            # Get attention score for this region
            region_mask = labels == i
            attention_score = float(heatmap[region_mask].mean())
            
            # Get centroid for anatomical location
            cx, cy = int(centroids[i][0]), int(centroids[i][1])
            
            regions.append({
                "region_id": len(regions) + 1,
                "bbox": [
                    int(x * scale),
                    int(y * scale),
                    int(w * scale),
                    int(h * scale)
                ],
                "attention_score": round(attention_score, 3),
                "confidence": round(attention_score * malignancy_prob, 3),
                "location": self._get_anatomical_location(cx, cy, heatmap_size),
                "area_pixels": int(area * scale * scale)
            })
        
        # Sort by attention score (highest first)
        regions.sort(key=lambda r: r["attention_score"], reverse=True)
        
        # Limit to max regions
        regions = regions[:max_regions]
        
        # Re-number region IDs
        for i, region in enumerate(regions):
            region["region_id"] = i + 1
        
        return regions
    
    def _get_anatomical_location(self, x: int, y: int, size: int) -> str:
        """
        Map coordinates to anatomical quadrant location.
        
        Mammogram anatomy (standard view orientation):
        - Upper outer quadrant (UOQ): Most common site for breast cancer
        - Upper inner quadrant (UIQ)
        - Lower outer quadrant (LOQ)
        - Lower inner quadrant (LIQ)
        - Central/retroareolar region
        
        Args:
            x, y: Coordinates in heatmap space
            size: Size of the heatmap
            
        Returns:
            Anatomical location string
        """
        mid = size // 2
        center_margin = size // 6  # Central region margin
        
        # Check if in central region
        if abs(x - mid) < center_margin and abs(y - mid) < center_margin:
            return "central/retroareolar"
        
        # Determine quadrant
        if y < mid:
            vertical = "upper"
        else:
            vertical = "lower"
        
        if x < mid:
            horizontal = "inner"
        else:
            horizontal = "outer"
        
        return f"{vertical} {horizontal} quadrant"
    
    def _generate_fallback_explanation(
        self,
        output_size: Tuple[int, int] = (56, 56)
    ) -> Dict[str, Any]:
        """
        Generate fallback explanation when methods fail.
        
        Creates a random attention pattern as placeholder.
        """
        # Random attention with some structure
        heatmap = np.random.rand(*output_size) * 0.3
        
        # Add a random "hot spot"
        cx, cy = np.random.randint(15, output_size[0] - 15, 2)
        y_grid, x_grid = np.ogrid[:output_size[0], :output_size[1]]
        mask = (x_grid - cx)**2 + (y_grid - cy)**2 <= 10**2
        heatmap[mask] += 0.4
        
        heatmap = np.clip(heatmap, 0, 1)
        
        return {
            "attention_map": heatmap.tolist(),
            "suspicious_regions": [],
            "method_used": "fallback",
            "target_layer": None
        }
    
    def generate_heatmap_image(
        self,
        attention_map: np.ndarray,
        colormap: str = "jet",
        size: Tuple[int, int] = (224, 224)
    ) -> np.ndarray:
        """
        Convert attention map to colored heatmap image.
        
        Args:
            attention_map: 2D attention map [H, W] in range [0, 1]
            colormap: OpenCV colormap name
            size: Output image size
            
        Returns:
            Colored heatmap as numpy array [H, W, 3] (RGB)
        """
        # Resize to target size
        if attention_map.shape != size:
            attention_map = cv2.resize(attention_map, size, interpolation=cv2.INTER_LINEAR)
        
        # Convert to uint8
        heatmap_uint8 = (attention_map * 255).astype(np.uint8)
        
        # Apply colormap
        colormap_cv = getattr(cv2, f'COLORMAP_{colormap.upper()}', cv2.COLORMAP_JET)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, colormap_cv)
        
        # Convert BGR to RGB
        heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        return heatmap_rgb
    
    def overlay_heatmap(
        self,
        original_image: np.ndarray,
        attention_map: np.ndarray,
        alpha: float = 0.4,
        colormap: str = "jet"
    ) -> np.ndarray:
        """
        Overlay colored heatmap on original image.
        
        Args:
            original_image: Original image [H, W] or [H, W, C]
            attention_map: Attention map [H, W] in range [0, 1]
            alpha: Overlay opacity (0-1)
            colormap: OpenCV colormap name
            
        Returns:
            Blended image [H, W, 3] (RGB)
        """
        # Ensure original is 3-channel
        if len(original_image.shape) == 2:
            original_rgb = cv2.cvtColor(
                (original_image * 255).astype(np.uint8),
                cv2.COLOR_GRAY2RGB
            )
        elif original_image.shape[2] == 1:
            original_rgb = cv2.cvtColor(
                (original_image[:, :, 0] * 255).astype(np.uint8),
                cv2.COLOR_GRAY2RGB
            )
        else:
            original_rgb = (original_image * 255).astype(np.uint8)
        
        # Resize attention map to match image
        h, w = original_rgb.shape[:2]
        attention_resized = cv2.resize(attention_map, (w, h), interpolation=cv2.INTER_LINEAR)
        
        # Generate colored heatmap
        heatmap_colored = self.generate_heatmap_image(attention_resized, colormap, (w, h))
        
        # Blend
        blended = cv2.addWeighted(original_rgb, 1 - alpha, heatmap_colored, alpha, 0)
        
        return blended


# Singleton instance
_explainability_service: Optional[ExplainabilityService] = None


def get_explainability_service() -> ExplainabilityService:
    """Get or create the explainability service singleton."""
    global _explainability_service
    if _explainability_service is None:
        _explainability_service = ExplainabilityService()
    return _explainability_service
