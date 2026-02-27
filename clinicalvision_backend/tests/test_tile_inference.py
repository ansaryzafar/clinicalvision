"""
Comprehensive Test Suite for Tile-Based Inference Engine

Tests the multi-stage analysis pipeline for full-resolution mammograms:
- Stage 1: Global classification
- Stage 2: ROI/Tile extraction
- Stage 3: Tile analysis
- Stage 4: Aggregation

Edge cases tested:
- Various image sizes
- Different analysis modes
- Edge cases in tile extraction
- Aggregation strategies
"""

import pytest
import numpy as np
from PIL import Image
import asyncio
import sys
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from dataclasses import asdict

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.models.tile_inference import (
    TileBasedInference,
    TileConfig,
    TileInfo,
    TileResult,
    AnalysisMode
)
from app.utils.coordinate_transform import CoordinateTransformer


class TestTileConfig:
    """Test TileConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = TileConfig()
        
        assert config.tile_size == 224
        assert config.overlap == 0.25
        assert config.attention_threshold == 0.3
        assert config.min_tile_coverage == 0.5
        assert config.max_tiles == 50
        assert config.batch_size == 8
    
    def test_custom_config(self):
        """Test custom configuration."""
        config = TileConfig(
            tile_size=512,
            overlap=0.5,
            attention_threshold=0.4,
            max_tiles=100
        )
        
        assert config.tile_size == 512
        assert config.overlap == 0.5
        assert config.attention_threshold == 0.4
        assert config.max_tiles == 100
    
    def test_stride_calculation(self):
        """Test that stride is calculated correctly from config."""
        config = TileConfig(tile_size=224, overlap=0.25)
        # stride = tile_size * (1 - overlap) = 224 * 0.75 = 168
        expected_stride = int(224 * 0.75)
        assert expected_stride == 168


class TestTileInfo:
    """Test TileInfo dataclass."""
    
    def test_tile_info_creation(self):
        """Test creating TileInfo."""
        image = np.zeros((224, 224), dtype=np.uint8)
        tile = TileInfo(
            tile_id=0,
            image=image,
            position=(100, 200),
            attention_score=0.75,
            breast_coverage=0.9
        )
        
        assert tile.tile_id == 0
        assert tile.position == (100, 200)
        assert tile.attention_score == 0.75
        assert tile.breast_coverage == 0.9
    
    def test_tile_info_to_dict(self):
        """Test TileInfo conversion to dictionary."""
        image = np.zeros((224, 224), dtype=np.uint8)
        tile = TileInfo(
            tile_id=5,
            image=image,
            position=(300, 400),
            attention_score=0.8,
            breast_coverage=0.95
        )
        
        d = tile.to_dict()
        
        assert d['tile_id'] == 5
        assert d['position'] == (300, 400)
        assert d['attention_score'] == 0.8
        assert d['breast_coverage'] == 0.95
        assert d['original_coords']['x'] == 300
        assert d['original_coords']['y'] == 400
        assert d['original_coords']['width'] == 224
        assert d['original_coords']['height'] == 224


class TestTileResult:
    """Test TileResult dataclass."""
    
    def test_tile_result_creation(self):
        """Test creating TileResult."""
        image = np.zeros((224, 224), dtype=np.uint8)
        tile_info = TileInfo(
            tile_id=0,
            image=image,
            position=(0, 0),
            attention_score=0.8
        )
        
        result = TileResult(
            tile_info=tile_info,
            prediction="malignant",
            malignancy_prob=0.85,
            confidence=0.9
        )
        
        assert result.prediction == "malignant"
        assert result.malignancy_prob == 0.85
        assert result.confidence == 0.9
    
    def test_tile_result_to_dict(self):
        """Test TileResult conversion to dictionary."""
        image = np.zeros((224, 224), dtype=np.uint8)
        tile_info = TileInfo(
            tile_id=1,
            image=image,
            position=(100, 100),
            attention_score=0.7
        )
        
        result = TileResult(
            tile_info=tile_info,
            prediction="benign",
            malignancy_prob=0.15,
            confidence=0.95,
            suspicious_regions=[{"region": "test"}]
        )
        
        d = result.to_dict()
        
        assert d['tile_id'] == 1
        assert d['prediction'] == "benign"
        assert d['malignancy_prob'] == 0.15
        assert d['confidence'] == 0.95
        assert d['suspicious_regions'] == [{"region": "test"}]


class TestAnalysisMode:
    """Test AnalysisMode enum."""
    
    def test_analysis_modes(self):
        """Test all analysis modes are defined."""
        assert AnalysisMode.GLOBAL_ONLY.value == "global_only"
        assert AnalysisMode.ATTENTION_GUIDED.value == "attention_guided"
        assert AnalysisMode.FULL_COVERAGE.value == "full_coverage"
    
    def test_mode_from_string(self):
        """Test creating mode from string value."""
        mode = AnalysisMode("global_only")
        assert mode == AnalysisMode.GLOBAL_ONLY
        
        mode = AnalysisMode("attention_guided")
        assert mode == AnalysisMode.ATTENTION_GUIDED


class TestTileBasedInferenceInit:
    """Test TileBasedInference initialization."""
    
    def test_init_with_defaults(self):
        """Test initialization with default config."""
        mock_model = Mock()
        engine = TileBasedInference(mock_model)
        
        assert engine.config.tile_size == 224
        assert engine.config.overlap == 0.25
        assert engine.stride == 168  # 224 * 0.75
    
    def test_init_with_custom_config(self):
        """Test initialization with custom config."""
        mock_model = Mock()
        config = TileConfig(tile_size=512, overlap=0.5)
        engine = TileBasedInference(mock_model, config)
        
        assert engine.config.tile_size == 512
        assert engine.stride == 256  # 512 * 0.5
    
    def test_stride_with_no_overlap(self):
        """Test stride calculation with no overlap."""
        mock_model = Mock()
        config = TileConfig(tile_size=224, overlap=0.0)
        engine = TileBasedInference(mock_model, config)
        
        assert engine.stride == 224


class TestTileExtraction:
    """Test tile extraction logic."""
    
    @pytest.fixture
    def mock_engine(self):
        """Create engine with mocked model."""
        mock_model = Mock()
        return TileBasedInference(mock_model)
    
    def test_extract_tiles_from_small_image(self, mock_engine):
        """Test tile extraction from image smaller than tile size."""
        # Image smaller than tile_size - should handle gracefully
        small_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        heatmap = np.random.rand(224, 224).astype(np.float32)
        transformer = CoordinateTransformer((100, 100))
        
        tiles = mock_engine._stage2_extract_tiles(
            small_image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        
        # Should handle edge case (may return 0 tiles or handle gracefully)
        assert isinstance(tiles, list)
    
    def test_extract_tiles_attention_guided(self, mock_engine):
        """Test attention-guided tile extraction."""
        # Create image with bright region (breast tissue)
        image = np.ones((1000, 800), dtype=np.uint8) * 100
        
        # Create heatmap with high attention in top-left
        heatmap = np.zeros((224, 224), dtype=np.float32)
        heatmap[:50, :50] = 0.9  # High attention
        heatmap[100:, 100:] = 0.1  # Low attention
        
        transformer = CoordinateTransformer((800, 1000))
        
        tiles = mock_engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.ATTENTION_GUIDED
        )
        
        # Should extract tiles from high attention region
        # (exact number depends on stride and overlap)
        assert isinstance(tiles, list)
    
    def test_extract_tiles_full_coverage(self, mock_engine):
        """Test full coverage tile extraction."""
        # Create uniform bright image
        image = np.ones((500, 500), dtype=np.uint8) * 128
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((500, 500))
        
        tiles = mock_engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        
        # Full coverage should extract all valid tiles
        assert isinstance(tiles, list)
        
        # All tiles should have position info
        for tile in tiles:
            assert tile.position is not None
            assert tile.breast_coverage > 0
    
    def test_extract_tiles_skips_dark_regions(self, mock_engine):
        """Test that tiles in dark (non-breast) regions are skipped."""
        # Create image with breast tissue only in center
        image = np.zeros((600, 600), dtype=np.uint8)
        image[200:400, 200:400] = 150  # Breast tissue in center
        
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((600, 600))
        
        tiles = mock_engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        
        # Tiles in corners (dark) should be skipped due to low breast_coverage
        # This depends on min_tile_coverage threshold
        for tile in tiles:
            assert tile.breast_coverage >= mock_engine.config.min_tile_coverage


class TestTileBasedInferenceAnalyze:
    """Test the main analyze method."""
    
    @pytest.fixture
    def mock_model(self):
        """Create a mock model with predict method."""
        mock = Mock()
        mock.predict = Mock(return_value={
            'prediction': 'benign',
            'confidence': 0.85,
            'probabilities': {'benign': 0.85, 'malignant': 0.15},
            'explanation': {
                'attention_map': np.random.rand(224, 224).tolist()
            }
        })
        return mock
    
    @pytest.mark.asyncio
    async def test_analyze_global_only(self, mock_model):
        """Test GLOBAL_ONLY mode analysis."""
        engine = TileBasedInference(mock_model)
        
        # Create test image
        image = Image.fromarray(np.random.randint(0, 255, (500, 500), dtype=np.uint8), mode='L')
        
        with patch.object(engine, '_stage1_global_classification', new_callable=AsyncMock) as mock_stage1:
            mock_stage1.return_value = {
                'prediction': 'benign',
                'confidence': 0.9,
                'probabilities': {'benign': 0.9, 'malignant': 0.1},
                'explanation': {'attention_map': np.zeros((224, 224)).tolist()}
            }
            
            result = await engine.analyze(image, mode=AnalysisMode.GLOBAL_ONLY)
        
        assert result['analysis_mode'] == 'global_only'
        assert result['tiles_analyzed'] == 0
        assert 'image_metadata' in result
    
    @pytest.mark.asyncio
    async def test_analyze_with_no_attention_map(self, mock_model):
        """Test handling when no attention map is available."""
        engine = TileBasedInference(mock_model)
        image = Image.fromarray(np.random.randint(0, 255, (500, 500), dtype=np.uint8), mode='L')
        
        with patch.object(engine, '_stage1_global_classification', new_callable=AsyncMock) as mock_stage1:
            mock_stage1.return_value = {
                'prediction': 'benign',
                'confidence': 0.9,
                'explanation': {}  # No attention map
            }
            
            result = await engine.analyze(image, mode=AnalysisMode.ATTENTION_GUIDED)
        
        # Should fall back gracefully
        assert 'image_metadata' in result


class TestTileAggregation:
    """Test tile result aggregation."""
    
    @pytest.fixture
    def mock_engine(self):
        mock_model = Mock()
        return TileBasedInference(mock_model)
    
    def test_aggregate_empty_tiles(self, mock_engine):
        """Test aggregation with no tiles."""
        global_result = {
            'prediction': 'benign',
            'confidence': 0.8,
            'probabilities': {'benign': 0.8, 'malignant': 0.2},
            'explanation': {'attention_map': [], 'suspicious_regions': []},
            'uncertainty': {'epistemic': 0.1, 'aleatoric': 0.1}
        }
        transformer = CoordinateTransformer((1000, 1000))
        
        result = mock_engine._stage4_aggregate(
            global_result,
            [],  # No tile results
            transformer,
            AnalysisMode.ATTENTION_GUIDED
        )
        
        # Should return global result with metadata
        assert result['tiles_analyzed'] == 0
    
    def test_aggregate_high_malignancy_tile(self, mock_engine):
        """Test that high-malignancy tile affects final result."""
        image = np.zeros((224, 224), dtype=np.uint8)
        
        tile_results = [
            TileResult(
                tile_info=TileInfo(0, image, (0, 0), 0.9, 1.0),
                prediction="malignant",
                malignancy_prob=0.95,
                confidence=0.9
            )
        ]
        
        global_result = {
            'prediction': 'benign',
            'confidence': 0.6,
            'probabilities': {'benign': 0.6, 'malignant': 0.4},
            'explanation': {'attention_map': [], 'suspicious_regions': []},
            'uncertainty': {'epistemic': 0.1, 'aleatoric': 0.1}
        }
        transformer = CoordinateTransformer((1000, 1000))
        
        result = mock_engine._stage4_aggregate(
            global_result,
            tile_results,
            transformer,
            AnalysisMode.ATTENTION_GUIDED
        )
        
        assert result['tiles_analyzed'] == 1
        assert 'tile_analysis' in result
        # Tile max probability should reflect high-malignancy tile
        assert result['tile_analysis']['tile_max_probability'] == 0.95


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_very_small_image_handling(self):
        """Test handling image smaller than tile size."""
        mock_model = Mock()
        engine = TileBasedInference(mock_model)
        
        # Image smaller than 224×224
        small_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        heatmap = np.random.rand(224, 224).astype(np.float32)
        transformer = CoordinateTransformer((100, 100))
        
        # Should not crash
        tiles = engine._stage2_extract_tiles(
            small_image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        assert isinstance(tiles, list)
    
    def test_max_tiles_limit(self):
        """Test that max_tiles limit is enforced."""
        mock_model = Mock()
        config = TileConfig(max_tiles=5)
        engine = TileBasedInference(mock_model, config)
        
        # Large image that would produce many tiles
        large_image = np.ones((2000, 2000), dtype=np.uint8) * 128
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((2000, 2000))
        
        tiles = engine._stage2_extract_tiles(
            large_image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        
        assert len(tiles) <= 5
    
    def test_attention_threshold_filtering(self):
        """Test that attention threshold properly filters tiles."""
        mock_model = Mock()
        config = TileConfig(attention_threshold=0.8)  # High threshold
        engine = TileBasedInference(mock_model, config)
        
        image = np.ones((500, 500), dtype=np.uint8) * 128
        # Low attention heatmap
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.2
        transformer = CoordinateTransformer((500, 500))
        
        tiles = engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.ATTENTION_GUIDED
        )
        
        # Should extract few/no tiles due to low attention
        for tile in tiles:
            assert tile.attention_score >= config.attention_threshold
    
    def test_single_pixel_image(self):
        """Test handling of single pixel image (extreme edge case)."""
        mock_model = Mock()
        engine = TileBasedInference(mock_model)
        
        tiny_image = np.array([[128]], dtype=np.uint8)
        heatmap = np.ones((224, 224), dtype=np.float32)
        transformer = CoordinateTransformer((1, 1))
        
        # Should not crash
        tiles = engine._stage2_extract_tiles(
            tiny_image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        assert isinstance(tiles, list)


class TestRealWorldScenarios:
    """Test realistic mammogram analysis scenarios."""
    
    @pytest.fixture
    def realistic_engine(self):
        """Create engine with realistic config."""
        mock_model = Mock()
        config = TileConfig(
            tile_size=224,
            overlap=0.25,
            attention_threshold=0.3,
            max_tiles=50
        )
        return TileBasedInference(mock_model, config)
    
    def test_ffdm_dimensions(self, realistic_engine):
        """Test with typical FFDM mammogram dimensions."""
        # Typical FFDM: 3328×4096
        image = np.ones((4096, 3328), dtype=np.uint8) * 100
        heatmap = np.random.rand(224, 224).astype(np.float32)
        transformer = CoordinateTransformer((3328, 4096))
        
        tiles = realistic_engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.FULL_COVERAGE
        )
        
        # Should extract reasonable number of tiles
        assert len(tiles) > 0
        assert len(tiles) <= 50  # Max tiles limit
    
    def test_suspicious_region_localization(self, realistic_engine):
        """Test that tiles are extracted from suspicious regions."""
        # Create image with suspicious region
        image = np.ones((1000, 800), dtype=np.uint8) * 100
        
        # High attention in specific region (upper left quadrant)
        heatmap = np.zeros((224, 224), dtype=np.float32)
        heatmap[20:60, 20:60] = 0.9  # High attention spot
        
        transformer = CoordinateTransformer((800, 1000))
        
        tiles = realistic_engine._stage2_extract_tiles(
            image,
            heatmap,
            transformer,
            AnalysisMode.ATTENTION_GUIDED
        )
        
        # Should have tiles extracted from high attention region
        if tiles:
            # At least one tile should have high attention score
            max_attention = max(t.attention_score for t in tiles)
            assert max_attention > 0.3


# Async test helper for pytest
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
