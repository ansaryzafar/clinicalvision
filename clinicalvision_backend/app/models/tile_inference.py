"""
Tile-Based Inference Engine for Full-Resolution Mammograms

This module implements a multi-stage analysis pipeline that:
1. Performs global classification on downsampled image
2. Uses attention heatmap to identify suspicious regions
3. Extracts and analyzes tiles from high-attention areas
4. Aggregates tile predictions into final diagnosis

This approach allows analysis of full-size mammograms (3000×4000+ pixels)
while maintaining the accuracy of the 224×224 trained model.
"""

import numpy as np
import cv2
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import asyncio
from dataclasses import dataclass, field
from enum import Enum

from app.core.logging import logger
from app.utils.coordinate_transform import (
    CoordinateTransformer,
    transform_regions_to_original,
    merge_overlapping_regions
)


class AnalysisMode(str, Enum):
    """Analysis mode selection."""
    GLOBAL_ONLY = "global_only"           # Quick: only 224×224 downsampled
    ATTENTION_GUIDED = "attention_guided"  # Default: tiles from high-attention areas
    FULL_COVERAGE = "full_coverage"        # Comprehensive: all tiles with overlap


@dataclass
class TileConfig:
    """Configuration for tile-based analysis."""
    tile_size: int = 224                   # Size of each tile (matches model input)
    overlap: float = 0.25                  # Overlap between tiles (0.25 = 25%)
    attention_threshold: float = 0.3       # Min attention to analyze tile
    min_tile_coverage: float = 0.5         # Min breast tissue coverage in tile
    max_tiles: int = 50                    # Max tiles to analyze (performance limit)
    batch_size: int = 8                    # Tiles per GPU batch


@dataclass 
class TileInfo:
    """Information about an extracted tile."""
    tile_id: int
    image: np.ndarray
    position: Tuple[int, int]              # (x, y) in original image
    attention_score: float = 0.0           # Average attention in this tile region
    breast_coverage: float = 1.0           # Fraction of tile that is breast tissue
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tile_id": self.tile_id,
            "position": self.position,
            "attention_score": self.attention_score,
            "breast_coverage": self.breast_coverage,
            "original_coords": {
                "x": self.position[0],
                "y": self.position[1],
                "width": self.image.shape[1] if len(self.image.shape) > 1 else 224,
                "height": self.image.shape[0] if len(self.image.shape) > 0 else 224
            }
        }


@dataclass
class TileResult:
    """Result from analyzing a single tile."""
    tile_info: TileInfo
    prediction: str
    malignancy_prob: float
    confidence: float
    attention_map: Optional[np.ndarray] = None
    suspicious_regions: List[Dict] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **self.tile_info.to_dict(),
            "prediction": self.prediction,
            "malignancy_prob": self.malignancy_prob,
            "confidence": self.confidence,
            "suspicious_regions": self.suspicious_regions
        }


class TileBasedInference:
    """
    Tile-based inference engine for full-resolution mammograms.
    
    This engine implements a multi-stage analysis:
    
    Stage 1 (Global): Quick classification on 224×224 downsampled image
    Stage 2 (ROI Detection): Identify high-attention regions using GradCAM
    Stage 3 (Tile Analysis): Extract and analyze tiles from suspicious areas
    Stage 4 (Aggregation): Combine tile results into final diagnosis
    
    Example:
        engine = TileBasedInference(model)
        result = await engine.analyze(image, mode=AnalysisMode.ATTENTION_GUIDED)
    """
    
    def __init__(
        self,
        model,  # BaseModelInference instance
        config: Optional[TileConfig] = None
    ):
        """
        Initialize tile-based inference engine.
        
        Args:
            model: Loaded model inference instance
            config: Tile configuration (uses defaults if None)
        """
        self.model = model
        self.config = config or TileConfig()
        self.stride = int(self.config.tile_size * (1 - self.config.overlap))
        
        logger.info(
            f"TileBasedInference initialized: tile_size={self.config.tile_size}, "
            f"overlap={self.config.overlap}, stride={self.stride}"
        )
    
    async def analyze(
        self,
        image: Image.Image,
        mode: AnalysisMode = AnalysisMode.ATTENTION_GUIDED
    ) -> Dict[str, Any]:
        """
        Perform complete multi-stage analysis on full-resolution mammogram.
        
        Args:
            image: PIL Image (any size)
            mode: Analysis mode (global_only, attention_guided, full_coverage)
            
        Returns:
            Complete analysis result with coordinates in original image space
        """
        original_size = (image.width, image.height)
        transformer = CoordinateTransformer(original_size)
        
        logger.info(
            f"Starting {mode.value} analysis on {original_size[0]}×{original_size[1]} image"
        )
        
        # Stage 1: Global classification
        global_result = await self._stage1_global_classification(image)
        
        if mode == AnalysisMode.GLOBAL_ONLY:
            # Quick mode - just return global result with coordinate metadata
            global_result['image_metadata'] = transformer.get_metadata()
            global_result['analysis_mode'] = mode.value
            global_result['tiles_analyzed'] = 0
            return global_result
        
        # Stage 2: Extract attention-guided tiles
        coarse_heatmap = np.array(global_result.get('explanation', {}).get('attention_map', []))
        if coarse_heatmap.size == 0:
            logger.warning("No attention map available, falling back to global result")
            global_result['image_metadata'] = transformer.get_metadata()
            return global_result
        
        # Convert to grayscale numpy array for tile extraction
        original_array = np.array(image.convert('L'))
        
        tiles = self._stage2_extract_tiles(
            original_array,
            coarse_heatmap,
            transformer,
            mode
        )
        
        if not tiles:
            logger.info("No tiles extracted, returning global result")
            global_result['image_metadata'] = transformer.get_metadata()
            global_result['tiles_analyzed'] = 0
            return global_result
        
        logger.info(f"Extracted {len(tiles)} tiles for detailed analysis")
        
        # Stage 3: Analyze tiles
        tile_results = await self._stage3_analyze_tiles(tiles)
        
        # Stage 4: Aggregate results
        final_result = self._stage4_aggregate(
            global_result,
            tile_results,
            transformer,
            mode
        )
        
        return final_result
    
    async def _stage1_global_classification(
        self,
        image: Image.Image
    ) -> Dict[str, Any]:
        """
        Stage 1: Perform global classification on downsampled image.
        
        This provides:
        - Overall malignancy probability
        - Coarse attention heatmap for ROI detection
        - Quick screening result
        """
        from app.utils.preprocessing import preprocess_mammogram
        
        # Preprocess to 224×224
        preprocessed = preprocess_mammogram(image)
        
        # Run inference
        result = self.model.predict(preprocessed)
        
        logger.debug(
            f"Stage 1 complete: prediction={result.get('prediction')}, "
            f"confidence={result.get('confidence', 0):.2%}"
        )
        
        return result
    
    def _stage2_extract_tiles(
        self,
        image_array: np.ndarray,
        coarse_heatmap: np.ndarray,
        transformer: CoordinateTransformer,
        mode: AnalysisMode
    ) -> List[TileInfo]:
        """
        Stage 2: Extract tiles from image based on attention heatmap.
        
        For ATTENTION_GUIDED mode, only extracts tiles from high-attention regions.
        For FULL_COVERAGE mode, extracts all tiles with overlap.
        """
        height, width = image_array.shape[:2]
        
        # Upscale heatmap to original resolution for accurate tile selection
        upscaled_heatmap = transformer.upscale_heatmap(coarse_heatmap)
        
        tiles = []
        tile_id = 0
        
        # Calculate number of tiles in each dimension
        n_tiles_x = max(1, (width - self.config.tile_size) // self.stride + 1)
        n_tiles_y = max(1, (height - self.config.tile_size) // self.stride + 1)
        
        logger.debug(f"Tile grid: {n_tiles_x}×{n_tiles_y} = {n_tiles_x * n_tiles_y} potential tiles")
        
        for yi in range(n_tiles_y):
            for xi in range(n_tiles_x):
                x = xi * self.stride
                y = yi * self.stride
                
                # Ensure we don't go out of bounds
                if x + self.config.tile_size > width:
                    x = width - self.config.tile_size
                if y + self.config.tile_size > height:
                    y = height - self.config.tile_size
                
                if x < 0 or y < 0:
                    continue
                
                # Extract tile region from heatmap
                heatmap_region = upscaled_heatmap[
                    y:y + self.config.tile_size,
                    x:x + self.config.tile_size
                ]
                attention_score = float(heatmap_region.mean()) if heatmap_region.size > 0 else 0.0
                
                # For attention-guided mode, skip low-attention tiles
                if mode == AnalysisMode.ATTENTION_GUIDED:
                    if attention_score < self.config.attention_threshold:
                        continue
                
                # Extract tile from image
                tile_image = image_array[
                    y:y + self.config.tile_size,
                    x:x + self.config.tile_size
                ]
                
                # Check breast tissue coverage (non-black pixels)
                breast_coverage = np.mean(tile_image > 10) if tile_image.size > 0 else 0
                if breast_coverage < self.config.min_tile_coverage:
                    continue
                
                tiles.append(TileInfo(
                    tile_id=tile_id,
                    image=tile_image,
                    position=(x, y),
                    attention_score=attention_score,
                    breast_coverage=breast_coverage
                ))
                tile_id += 1
                
                # Limit max tiles for performance
                if len(tiles) >= self.config.max_tiles:
                    logger.warning(
                        f"Reached max tiles limit ({self.config.max_tiles}), "
                        "some regions may not be analyzed"
                    )
                    break
            
            if len(tiles) >= self.config.max_tiles:
                break
        
        # Sort by attention score (highest first)
        tiles.sort(key=lambda t: t.attention_score, reverse=True)
        
        return tiles
    
    async def _stage3_analyze_tiles(
        self,
        tiles: List[TileInfo]
    ) -> List[TileResult]:
        """
        Stage 3: Run inference on each extracted tile.
        
        Uses batching for efficiency when multiple tiles need analysis.
        """
        from app.utils.preprocessing import preprocess_mammogram
        
        results = []
        
        # Process tiles in batches
        for i in range(0, len(tiles), self.config.batch_size):
            batch = tiles[i:i + self.config.batch_size]
            
            for tile_info in batch:
                try:
                    # Convert tile to PIL Image for preprocessing
                    tile_pil = Image.fromarray(tile_info.image)
                    
                    # Preprocess (applies CLAHE, resize if needed, 3-channel)
                    preprocessed = preprocess_mammogram(tile_pil, target_size=(224, 224))
                    
                    # Run inference
                    tile_result = self.model.predict(preprocessed)
                    
                    # Transform suspicious regions to tile-local coordinates
                    suspicious_regions = []
                    for region in tile_result.get('explanation', {}).get('suspicious_regions', []):
                        region_copy = region.copy()
                        # Adjust bbox to be relative to tile position in original image
                        if 'bbox' in region:
                            bbox = region['bbox']
                            region_copy['bbox_in_tile'] = bbox
                            region_copy['bbox_original'] = [
                                bbox[0] + tile_info.position[0],
                                bbox[1] + tile_info.position[1],
                                bbox[2],
                                bbox[3]
                            ]
                        suspicious_regions.append(region_copy)
                    
                    results.append(TileResult(
                        tile_info=tile_info,
                        prediction=tile_result.get('prediction', 'unknown'),
                        malignancy_prob=tile_result.get('probabilities', {}).get('malignant', 0.0),
                        confidence=tile_result.get('confidence', 0.0),
                        attention_map=np.array(tile_result.get('explanation', {}).get('attention_map', [])),
                        suspicious_regions=suspicious_regions
                    ))
                    
                except Exception as e:
                    logger.error(f"Error analyzing tile {tile_info.tile_id}: {e}")
                    continue
            
            # Small delay between batches to prevent GPU overload
            if i + self.config.batch_size < len(tiles):
                await asyncio.sleep(0.01)
        
        logger.debug(f"Stage 3 complete: analyzed {len(results)}/{len(tiles)} tiles")
        return results
    
    def _stage4_aggregate(
        self,
        global_result: Dict[str, Any],
        tile_results: List[TileResult],
        transformer: CoordinateTransformer,
        mode: AnalysisMode
    ) -> Dict[str, Any]:
        """
        Stage 4: Aggregate tile predictions into final diagnosis.
        
        Uses attention-weighted aggregation:
        - Higher attention tiles have more influence on final probability
        - Takes maximum of global and tile-based analysis
        - Merges overlapping suspicious regions using NMS
        """
        # Collect all suspicious regions from tiles
        all_regions = []
        weighted_probs = []
        
        for tile_result in tile_results:
            # Weight probability by tile's attention score
            weight = tile_result.tile_info.attention_score
            weighted_probs.append(tile_result.malignancy_prob * weight)
            
            # Collect regions with original coordinates
            for region in tile_result.suspicious_regions:
                region['tile_id'] = tile_result.tile_info.tile_id
                region['tile_attention'] = tile_result.tile_info.attention_score
                all_regions.append(region)
        
        # Calculate aggregated probability
        global_prob = global_result.get('probabilities', {}).get('malignant', 0.0)
        
        if weighted_probs:
            # Attention-weighted average of tile probabilities
            total_weight = sum(t.tile_info.attention_score for t in tile_results)
            if total_weight > 0:
                tile_weighted_avg = sum(weighted_probs) / total_weight
            else:
                tile_weighted_avg = sum(weighted_probs) / len(weighted_probs)
            
            # Maximum tile probability
            tile_max_prob = max(t.malignancy_prob for t in tile_results)
            
            # Final probability: weighted combination
            # Emphasize tile analysis for high-attention regions
            final_prob = max(
                global_prob,
                0.6 * tile_weighted_avg + 0.4 * tile_max_prob
            )
        else:
            final_prob = global_prob
            tile_weighted_avg = 0.0
            tile_max_prob = 0.0
        
        # Merge overlapping regions using NMS
        merged_regions = merge_overlapping_regions(all_regions, iou_threshold=0.5)
        
        # Re-number merged regions
        for i, region in enumerate(merged_regions):
            region['region_id'] = i + 1
        
        # Determine final prediction and confidence
        if final_prob >= 0.5:
            final_prediction = 'malignant'
            final_confidence = final_prob
        else:
            final_prediction = 'benign'
            final_confidence = 1.0 - final_prob
        
        # Determine risk level based on final probability
        if final_prob >= 0.7:
            risk_level = 'high'
        elif final_prob >= 0.3:
            risk_level = 'moderate'
        else:
            risk_level = 'low'
        
        # Build final result
        result = {
            **global_result,
            'prediction': final_prediction,
            'confidence': final_confidence,
            'probabilities': {
                'malignant': final_prob,
                'benign': 1.0 - final_prob
            },
            'risk_level': risk_level,
            'image_metadata': transformer.get_metadata(),
            'analysis_mode': mode.value,
            'tiles_analyzed': len(tile_results),
            'tile_analysis': {
                'global_probability': global_prob,
                'tile_weighted_average': tile_weighted_avg,
                'tile_max_probability': tile_max_prob,
                'final_probability': final_prob,
                'tiles': [t.to_dict() for t in tile_results]
            },
            'explanation': {
                **global_result.get('explanation', {}),
                'suspicious_regions': merged_regions,
                'narrative': self._generate_narrative(
                    final_prediction,
                    final_prob,
                    len(tile_results),
                    len(merged_regions)
                )
            }
        }
        
        logger.info(
            f"Stage 4 complete: final_prob={final_prob:.2%}, "
            f"tiles={len(tile_results)}, regions={len(merged_regions)}"
        )
        
        return result
    
    def _generate_narrative(
        self,
        prediction: str,
        probability: float,
        tiles_analyzed: int,
        regions_found: int
    ) -> str:
        """Generate clinical narrative for the analysis."""
        if prediction == 'malignant':
            severity = "high" if probability >= 0.8 else "moderate"
            narrative = (
                f"Multi-scale analysis detected {regions_found} suspicious region(s) "
                f"with {severity} concern for malignancy (probability: {probability:.1%}). "
                f"Analyzed {tiles_analyzed} high-attention tiles from full-resolution image. "
                "Recommend further diagnostic workup."
            )
        else:
            narrative = (
                f"Multi-scale analysis of {tiles_analyzed} tiles shows predominantly "
                f"benign characteristics (malignancy probability: {probability:.1%}). "
                f"{regions_found} region(s) identified for reference. "
                "Standard follow-up recommended."
            )
        return narrative


# Convenience function for quick analysis
async def analyze_full_mammogram(
    image: Image.Image,
    model,
    mode: AnalysisMode = AnalysisMode.ATTENTION_GUIDED,
    config: Optional[TileConfig] = None
) -> Dict[str, Any]:
    """
    Convenience function for full-mammogram analysis.
    
    Args:
        image: PIL Image of any size
        model: Loaded inference model
        mode: Analysis mode
        config: Optional tile configuration
        
    Returns:
        Complete analysis result
    """
    engine = TileBasedInference(model, config)
    return await engine.analyze(image, mode)
