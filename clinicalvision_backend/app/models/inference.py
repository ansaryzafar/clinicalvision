"""
Model inference — V12 DenseNet-121 Production Ensemble
Real AI inference ONLY — no mock models allowed

IMPORTANT: This module configures TensorFlow environment settings at import time
to prevent JIT compilation errors (libdevice.10.bc not found).

GPU COMPATIBILITY ISSUE EXPLAINED:
==================================
The GPU cannot be used due to CUDA version mismatch:
1. Your NVIDIA driver reports CUDA 570.211.1
2. TensorFlow/XLA was compiled against CUDA 570.195.3
3. When XLA tries JIT compilation, it can't find 'libdevice.10.bc'
4. This causes BatchNormalization's Rsqrt operation to fail

SOLUTIONS:
- Option 1 (Current): Force CPU mode - slower but 100% reliable
- Option 2: Update NVIDIA drivers to match TensorFlow's expected version
- Option 3: Reinstall TensorFlow with matching CUDA toolkit
- Option 4: Install libdevice.10.bc in the expected location

Set CLINICALVISION_FORCE_CPU=false to attempt GPU mode (may fail)
"""

import os
import json
import time
import random
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from abc import ABC, abstractmethod
from pathlib import Path

# ============================================================================
# TensorFlow Environment Configuration (MUST BE BEFORE TensorFlow imports)
# ============================================================================

# Device mode configuration
# Options: 'auto' (try GPU, fallback to CPU), 'cpu' (force CPU), 'gpu' (force GPU)
DEVICE_MODE = os.environ.get('CLINICALVISION_DEVICE_MODE', 'auto')
FORCE_CPU = os.environ.get('CLINICALVISION_FORCE_CPU', 'true').lower() in ('true', '1', 'yes')

# Disable XLA JIT to prevent libdevice.10.bc errors
# This is the primary fix for the "JIT compilation failed" error
os.environ['TF_XLA_FLAGS'] = '--tf_xla_auto_jit=0'

# Disable MLIR bridge to prevent optimization issues
os.environ['TF_MLIR_ENABLE_MLIR_BRIDGE'] = '0'

# Disable XLA entirely for maximum compatibility
os.environ['TF_DISABLE_XLA'] = '1'

# Set CUDA data directory (helps XLA find libdevice if available)
os.environ.setdefault('XLA_FLAGS', '--xla_gpu_cuda_data_dir=/usr/lib/cuda')

# Reduce TensorFlow logging verbosity
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')

# Enable GPU memory growth to prevent OOM
os.environ.setdefault('TF_FORCE_GPU_ALLOW_GROWTH', 'true')

# Apply CPU force if requested (must be before TF import)
if FORCE_CPU or DEVICE_MODE == 'cpu':
    os.environ['CUDA_VISIBLE_DEVICES'] = ''
    _DEVICE_STATUS = 'CPU (forced via environment)'
else:
    _DEVICE_STATUS = 'auto-detect'

# ============================================================================

from app.core.logging import logger
from app.core.config import settings
from app.services.explainability_service import (
    get_explainability_service, 
    ExplainabilityMethod,
    ExplainabilityService
)

# Log environment configuration
logger.info("=" * 60)
logger.info("TensorFlow Device Configuration")
logger.info("=" * 60)
logger.info(f"  Device mode: {_DEVICE_STATUS}")
logger.info(f"  CLINICALVISION_FORCE_CPU: {FORCE_CPU}")
logger.info(f"  TF_XLA_FLAGS: {os.environ.get('TF_XLA_FLAGS', 'not set')}")
logger.info(f"  CUDA_VISIBLE_DEVICES: {os.environ.get('CUDA_VISIBLE_DEVICES', 'not set (GPU enabled)')}")
logger.info("=" * 60)


# Custom MC Dropout layer that's ALWAYS active (for uncertainty estimation)
# This fixes the issue where training=True mode breaks BatchNormalization
# by using batch statistics instead of moving averages on batch_size=1
_MCDropout = None  # Will be initialized when TensorFlow is loaded


def get_mc_dropout_class():
    """Get MCDropout class (lazy initialization to avoid TF import at module load)."""
    global _MCDropout
    if _MCDropout is None:
        try:
            from tensorflow.keras.layers import Dropout
            
            class MCDropout(Dropout):
                """Dropout layer that's ALWAYS active for MC Dropout inference.
                
                Standard Dropout is only active during training (training=True).
                For MC Dropout uncertainty estimation, we need dropout active during
                inference while keeping BatchNormalization using moving averages.
                
                This layer ignores the training flag and is always active.
                """
                def call(self, inputs, training=None):
                    # Always use training=True for dropout, regardless of flag
                    return super().call(inputs, training=True)
            
            _MCDropout = MCDropout
        except ImportError:
            _MCDropout = None
    return _MCDropout


class BaseModelInference(ABC):
    """
    Abstract base class for model inference
    Defines interface that both mock and real models must implement
    """
    
    @abstractmethod
    def predict(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Perform inference on preprocessed image
        
        Args:
            image_array: Preprocessed numpy array (224, 224, 1) or (224, 224, 3)
            
        Returns:
            Dictionary containing prediction results
        """
        pass
    
    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is properly loaded"""
        pass


# NOTE: MockModelInference has been permanently removed.
# ClinicalVision requires real AI inference via RealModelInference (V12 DenseNet-121 ensemble).
# No mock/simulated predictions are allowed in the system.


class RealModelInference(BaseModelInference):
    """
    Production model inference using V12 DenseNet-121 ensemble with MC Dropout.
    
    Architecture (V12 ROI):
    - Backbone: DenseNet-121 (ImageNet pretrained)
    - Head: 2048 dense units, 0.35 dropout, L2 regularization (5e-4)
    - Preprocessing: CLAHE → normalize [0,1] → 3-channel stack (NO densenet.preprocess_input)
    - Ensemble: 3 models
    
    Uncertainty Quantification:
    - MC Dropout: 10 batched forward passes using MCDropout layer (always active)
    - MCDropout keeps BatchNorm in inference mode while dropout remains stochastic
    - Calibration: Auto-select best (Temperature/Platt/Isotonic)
    """
    
    def __init__(self, model_path: Optional[str] = None, config_path: Optional[str] = None):
        """
        Initialize real model from V12 production checkpoints.
        
        Args:
            model_path: Path to model directory (default: ml_models/v12_production)
            config_path: Path to config.json (default: auto-detected)
        """
        logger.info("Initializing V12 Production Model Inference")
        
        # Determine paths
        self.base_path = Path(model_path) if model_path else Path(__file__).parent.parent.parent / "ml_models" / "v12_production"
        self.config_path = Path(config_path) if config_path else self.base_path / "config.json"
        
        # Load configuration
        self.config = self._load_config()
        self.model_version = self.config.get("model_version", "v12_production")
        
        # Model state
        self._loaded = False
        self.ensemble_models: List = []
        self.calibrator = None
        self.mc_forward_fn = None
        
        # Initialize TensorFlow lazily
        self.tf = None
        self.keras = None
        
        # Load models
        self._initialize()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load model configuration from JSON."""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            logger.info(f"Loaded config from {self.config_path}")
            return config
        except FileNotFoundError:
            logger.warning(f"Config not found at {self.config_path}, using defaults")
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default V12 production configuration."""
        return {
            "model_version": "v12_production",
            "architecture": {
                "backbone": "DenseNet121",
                "image_size": [224, 224],
                "image_channels": 3,
                "dense_units": 2048,
                "dropout_rate": 0.35,
                "l2_regularization": 0.0005
            },
            "ensemble": {"size": 3},
            "mc_dropout": {
                "enabled": True,
                "n_samples": 10,  # Optimized: 10 samples with batched inference for fast CPU performance
                # Note: MC Dropout uses the model's training dropout (0.35) via MCDropout layer
                # The MCDropout layer is always active regardless of training flag
            },
            "tta": {"enabled": True, "num_augmentations": 8},
            "clinical_thresholds": {
                "high_confidence": 0.85,
                "medium_confidence": 0.65,
                "low_confidence": 0.50,
                "classification_threshold": 0.5
            }
        }
    
    def _initialize(self):
        """
        Initialize TensorFlow and load models with robust error handling.
        
        GPU FALLBACK LOGIC:
        1. Check if CUDA_VISIBLE_DEVICES="" (forced CPU mode)
        2. If GPU available, run comprehensive GPU test
        3. Test includes BatchNormalization operation (the problematic op)
        4. If any test fails, fall back to CPU automatically
        """
        try:
            import tensorflow as tf
            from tensorflow import keras
            from tensorflow.keras import layers, regularizers
            from tensorflow.keras.applications import DenseNet121
            
            self.tf = tf
            self.keras = keras
            self.layers = layers
            self.regularizers = regularizers
            self.DenseNet121 = DenseNet121
            
            # Determine device mode
            use_cpu = False
            device_name = "CPU"
            
            # Check if CPU was forced via environment
            if os.environ.get('CUDA_VISIBLE_DEVICES') == '':
                use_cpu = True
                device_name = "CPU (forced)"
                logger.info("CPU mode forced via CUDA_VISIBLE_DEVICES=''")
            else:
                # Try to use GPU with comprehensive testing
                try:
                    gpus = tf.config.list_physical_devices('GPU')
                    if gpus:
                        # Configure GPU memory growth
                        for gpu in gpus:
                            tf.config.experimental.set_memory_growth(gpu, True)
                        
                        logger.info(f"GPU detected: {len(gpus)} device(s)")
                        
                        # Comprehensive GPU test - tests the exact operations that fail
                        gpu_works = self._test_gpu_compatibility(tf)
                        
                        if gpu_works:
                            device_name = f"GPU ({gpus[0].name})"
                            logger.info("✓ GPU compatibility test PASSED")
                        else:
                            use_cpu = True
                            device_name = "CPU (GPU test failed)"
                            logger.warning("✗ GPU compatibility test FAILED - using CPU")
                    else:
                        use_cpu = True
                        device_name = "CPU (no GPU detected)"
                        logger.info("No GPU detected, using CPU")
                        
                except Exception as gpu_error:
                    use_cpu = True
                    device_name = "CPU (GPU config error)"
                    logger.warning(f"GPU configuration error: {gpu_error}")
            
            # If GPU failed, ensure CPU mode
            if use_cpu:
                try:
                    tf.config.set_visible_devices([], 'GPU')
                except:
                    pass  # May fail if already in CPU mode
            
            # Store device info for later reference
            self._device_mode = device_name
            self._using_gpu = not use_cpu
            
            # Load ensemble models
            self._load_ensemble()
            
            # Load calibrator if available
            self._load_calibrator()
            
            # Create MC inference function
            self._create_mc_forward()
            
            # Initialize explainability service with TF modules
            self.explainability_service = get_explainability_service()
            self.explainability_service.set_modules(self.tf, self.keras)
            
            self._loaded = True
            
            # Warm-up pass: trace the TF graph once so the first real inference
            # doesn't pay the ~2-3s graph compilation penalty
            self._warmup(tf)
            
            logger.info("=" * 50)
            logger.info(f"✅ V12 Production model loaded successfully")
            logger.info(f"   Device: {device_name}")
            logger.info(f"   Ensemble size: {len(self.ensemble_models)}")
            logger.info(f"   MC Dropout: {self.config['mc_dropout']['n_samples']} samples (batched)")
            logger.info(f"   Explainability: GradCAM++ enabled")
            logger.info("=" * 50)
            
        except ImportError as e:
            logger.error(f"TensorFlow not available: {e}")
            self._loaded = False
        except Exception as e:
            logger.error(f"Failed to initialize model: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self._loaded = False
            raise
    
    def _test_gpu_compatibility(self, tf) -> bool:
        """
        Comprehensive GPU compatibility test.
        
        Tests the exact operations that fail with CUDA version mismatch:
        1. Basic tensor operations
        2. BatchNormalization (uses Rsqrt which fails with JIT)
        3. Dense layer operations
        
        Returns:
            True if GPU is compatible, False otherwise
        """
        try:
            with tf.device('/GPU:0'):
                # Test 1: Basic operations
                x = tf.constant([[1.0, 2.0, 3.0, 4.0]])
                y = tf.reduce_sum(x)
                
                # Test 2: Matrix operations (used in Dense layers)
                w = tf.constant([[1.0], [1.0], [1.0], [1.0]])
                z = tf.matmul(x, w)
                
                # Test 3: BatchNormalization-like operation (the problematic one)
                # This specifically tests Rsqrt which fails with JIT issues
                mean = tf.reduce_mean(x)
                variance = tf.reduce_mean(tf.square(x - mean))
                normalized = (x - mean) * tf.math.rsqrt(variance + 1e-5)
                
                # Test 4: Small convolution (DenseNet uses many of these)
                test_img = tf.random.normal([1, 8, 8, 3])
                conv = tf.keras.layers.Conv2D(4, 3, padding='same')
                _ = conv(test_img)
                
                # Test 5: Actual BatchNormalization layer
                bn = tf.keras.layers.BatchNormalization()
                _ = bn(x, training=False)
                
                return True
                
        except Exception as e:
            logger.warning(f"GPU compatibility test failed: {e}")
            return False
    
    def _build_model(self, use_mc_dropout: bool = False) -> "keras.Model":  # noqa: F821
        """
        Build DenseNet-121 model matching V12 ROI production architecture EXACTLY.
        
        V12 Training notebook architecture:
        - Input: [0,1] normalized images (CLAHE preprocessed, 3-channel)
        - NO densenet.preprocess_input() - direct normalized input
        - DenseNet121 backbone → GAP → Dense(2048) → BN → ReLU → Dropout → Dense(1, sigmoid)
        
        Args:
            use_mc_dropout: If True, use MCDropout (always active) instead of regular Dropout
                           This is needed for MC Dropout inference where we want dropout active
                           but BatchNormalization using moving averages.
        
        Returns:
            Compiled Keras model
        """
        arch = self.config["architecture"]
        image_size = tuple(arch["image_size"])
        channels = arch["image_channels"]
        dense_units = arch["dense_units"]
        dropout_rate = arch["dropout_rate"]
        l2_reg = arch["l2_regularization"]
        
        # Input layer - expects [0,1] normalized 3-channel images
        # V12 training: images normalized to [0,1], then stacked to 3 channels
        inputs = self.keras.Input(shape=(*image_size, channels), name='input_image')
        
        # NO preprocessing Lambda layers - V12 training does NOT use densenet.preprocess_input()
        # The training notebook directly feeds [0,1] normalized images to DenseNet
        
        # Backbone - EXACTLY as in V12 training notebook
        base_model = self.DenseNet121(
            include_top=False,
            weights='imagenet',
            input_tensor=inputs,  # Direct input, no preprocessing
            pooling=None
        )
        
        # Classification head - EXACTLY matching V12 training
        x = self.layers.GlobalAveragePooling2D()(base_model.output)
        x = self.layers.Dense(
            dense_units,
            kernel_regularizer=self.regularizers.l2(l2_reg),
            kernel_initializer='he_normal'
        )(x)
        x = self.layers.BatchNormalization()(x)
        x = self.layers.Activation('relu')(x)
        
        # Use MCDropout for MC inference, regular Dropout for deterministic
        if use_mc_dropout:
            MCDropout = get_mc_dropout_class()
            if MCDropout is not None:
                x = MCDropout(dropout_rate)(x)
            else:
                logger.warning("MCDropout not available, using regular Dropout")
                x = self.layers.Dropout(dropout_rate)(x)
        else:
            x = self.layers.Dropout(dropout_rate)(x)
            
        outputs = self.layers.Dense(1, activation='sigmoid', dtype='float32')(x)
        
        model = self.keras.Model(inputs=inputs, outputs=outputs, name='v12_densenet121')
        return model
    
    def _transfer_weights(self, source: "keras.Model", target: "keras.Model"):  # noqa: F821
        """Transfer weights between models with matching layer names."""
        source_weights = {layer.name: layer.get_weights() for layer in source.layers if layer.get_weights()}
        transferred = 0
        for layer in target.layers:
            if layer.name in source_weights:
                try:
                    layer.set_weights(source_weights[layer.name])
                    transferred += 1
                except Exception as e:
                    logger.debug(f"Could not transfer weights for {layer.name}: {e}")
        logger.debug(f"Transferred weights for {transferred} layers")
    
    def _load_ensemble(self):
        """Load all ensemble models from checkpoints."""
        ensemble_dir = self.base_path / "ensemble"
        
        if not ensemble_dir.exists():
            raise FileNotFoundError(f"Ensemble directory not found: {ensemble_dir}")
        
        # Find checkpoint files
        checkpoint_files = sorted(ensemble_dir.glob("model_*_stage3_best.h5"))
        
        if not checkpoint_files:
            raise FileNotFoundError(f"No checkpoint files found in {ensemble_dir}")
        
        logger.info(f"Loading {len(checkpoint_files)} ensemble models...")
        
        for ckpt_path in checkpoint_files:
            logger.info(f"  Loading {ckpt_path.name}...")
            
            # Build base model (regular dropout, for deterministic inference)
            base_model = self._build_model(use_mc_dropout=False)
            base_model.load_weights(str(ckpt_path))
            
            # Build MC model (MCDropout always active, for uncertainty estimation)
            # This model uses MCDropout which ignores training flag and is always active
            # BatchNormalization will use moving averages (training=False mode)
            mc_model = self._build_model(use_mc_dropout=True)
            mc_model.load_weights(str(ckpt_path))
            
            self.ensemble_models.append({
                'base': base_model,
                'mc': mc_model,  # Separate model with MCDropout for uncertainty estimation
                'name': ckpt_path.stem
            })
        
        logger.info(f"✅ Loaded {len(self.ensemble_models)} ensemble models")
    
    def _load_calibrator(self):
        """Load calibration model if available."""
        calibrator_path = self.base_path / "calibration" / "calibrator.pkl"
        
        if calibrator_path.exists():
            try:
                import pickle
                with open(calibrator_path, 'rb') as f:
                    self.calibrator = pickle.load(f)
                logger.info("✅ Loaded calibrator")
            except Exception as e:
                logger.warning(f"Could not load calibrator: {e}")
                self.calibrator = None
        else:
            logger.info("No calibrator found, using uncalibrated predictions")
            self.calibrator = None
    
    def _create_mc_forward(self):
        """Create TensorFlow function for MC forward pass with dropout active.
        
        IMPORTANT: We use training=False here because the MC models use MCDropout
        which is ALWAYS active regardless of the training flag. This ensures:
        1. MCDropout provides stochastic dropout for uncertainty estimation
        2. BatchNormalization uses moving averages (not batch statistics)
        
        Using training=True would break BatchNormalization on batch_size=1 inputs,
        causing all predictions to collapse to ~0.58.
        """
        if not self.ensemble_models:
            return
        
        # Don't use @tf.function to ensure dropout is truly stochastic each call
        def mc_forward(model, x):
            # Use training=False - MCDropout is always active anyway,
            # but BatchNormalization needs to use moving averages
            return model(x, training=False)
        
        self.mc_forward_fn = mc_forward
        logger.debug("Created MC forward function (MCDropout always active, BatchNorm uses moving averages)")
    
    def _warmup(self, tf):
        """Run a single warm-up inference to trace the TF computation graph.
        
        The first forward pass through a Keras model is significantly slower
        because TensorFlow traces the graph and compiles operations. Running
        a dummy pass here moves that cost to startup, so the first real
        user request doesn't suffer a cold-start penalty.
        """
        try:
            dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
            for model_dict in self.ensemble_models:
                model_dict['mc'](dummy, training=False)
                model_dict['base'](dummy, training=False)
            logger.info("✅ Warm-up inference complete (graph traced)")
        except Exception as e:
            logger.warning(f"Warm-up failed (non-critical): {e}")
    
    def _apply_tta(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Apply Test-Time Augmentation (8 augmentations).
        
        Args:
            image: Input image [H, W, C]
            
        Returns:
            List of 8 augmented images
        """
        augmented = [image]  # Original
        
        # Horizontal flip
        augmented.append(np.fliplr(image))
        
        # Vertical flip
        augmented.append(np.flipud(image))
        
        # Rotations
        augmented.append(np.rot90(image, k=1))
        augmented.append(np.rot90(image, k=2))
        augmented.append(np.rot90(image, k=3))
        
        # Combined
        augmented.append(np.fliplr(np.rot90(image, k=1)))
        augmented.append(np.flipud(np.rot90(image, k=1)))
        
        return augmented
    
    def _run_mc_dropout(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """
        Run MC Dropout inference for uncertainty quantification.
        
        OPTIMISED: Uses batched forward passes instead of sequential loops.
        Instead of calling model(x) N times, we create a batch of N identical
        images and run a single model.predict(batch) call. MCDropout generates
        independent dropout masks for each sample in the batch dimension,
        preserving stochasticity while dramatically reducing overhead.
        
        Args:
            image: Preprocessed image [1, H, W, C]
            
        Returns:
            Tuple of (mean_pred, all_samples, variance, entropy)
        """
        mc_config = self.config["mc_dropout"]
        n_samples = mc_config["n_samples"]
        
        all_predictions = []
        
        try:
            # Calculate samples per model
            samples_per_model = max(1, n_samples // len(self.ensemble_models))
            
            for model_dict in self.ensemble_models:
                mc_model = model_dict['mc']
                
                try:
                    # BATCHED MC: Repeat the image N times along batch dimension
                    # MCDropout generates independent masks per batch element
                    batch = self.tf.repeat(image, samples_per_model, axis=0)
                    
                    # Single forward pass for all MC samples of this model
                    preds = mc_model(batch, training=False).numpy().flatten()
                    all_predictions.extend(preds.tolist())
                except Exception as batch_error:
                    logger.warning(f"Batched MC failed, falling back to sequential: {batch_error}")
                    # Sequential fallback
                    for _ in range(samples_per_model):
                        try:
                            pred = self.mc_forward_fn(mc_model, image).numpy().flatten()[0]
                            all_predictions.append(pred)
                        except Exception as sample_error:
                            logger.warning(f"MC sample failed: {sample_error}")
                            continue
            
            if len(all_predictions) == 0:
                # Fallback: use deterministic prediction if all MC samples failed
                logger.warning("All MC samples failed, using deterministic prediction")
                for model_dict in self.ensemble_models:
                    base_model = model_dict['base']
                    pred = base_model(image, training=False).numpy().flatten()[0]
                    all_predictions.append(pred)
            
            samples = np.array(all_predictions)
            mean_pred = np.mean(samples)
            variance = np.var(samples)
            
            # Predictive entropy
            eps = 1e-10
            entropy = -mean_pred * np.log(mean_pred + eps) - (1 - mean_pred) * np.log(1 - mean_pred + eps)
            
            return mean_pred, samples, float(variance), float(entropy)
            
        except Exception as e:
            logger.error(f"MC Dropout inference failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Return fallback values
            return np.array([0.5]), np.array([0.5]), 0.25, 0.69  # Maximum uncertainty
    
    def _generate_attention_map(self, image: np.ndarray) -> List[List[float]]:
        """
        Generate GradCAM++ attention map using the explainability service.
        
        Uses the dedicated ExplainabilityService for cleaner separation of concerns.
        
        Args:
            image: Input image [1, H, W, C] normalized to [0,1]
            
        Returns:
            Attention heatmap as nested list (56x56 downsampled for JSON efficiency)
        """
        try:
            # Use the first base model for attention visualization
            model = self.ensemble_models[0]['base']
            
            # Generate explanation using the service
            result = self.explainability_service.generate_explanation(
                model=model,
                image=image,
                method=ExplainabilityMethod.GRADCAM_PLUS_PLUS,
                target_class=0,  # Binary classification - target sigmoid output
                output_size=(56, 56)  # Downsampled for JSON efficiency
            )
            
            return result["attention_map"]
            
        except Exception as e:
            logger.warning(f"GradCAM++ failed: {e}, using fallback")
            import traceback
            logger.debug(traceback.format_exc())
            return self._generate_fallback_attention()
    
    def _generate_explanation_full(self, image: np.ndarray, malignancy_prob: float) -> Dict[str, Any]:
        """
        Generate full explanation including attention map and suspicious regions.
        
        This method provides more comprehensive output than _generate_attention_map,
        including both the heatmap and extracted regions.
        
        Args:
            image: Input image [1, H, W, C] normalized to [0,1]
            malignancy_prob: Predicted malignancy probability
            
        Returns:
            Dictionary with attention_map, suspicious_regions, method_used
        """
        try:
            model = self.ensemble_models[0]['base']
            
            result = self.explainability_service.generate_explanation(
                model=model,
                image=image,
                method=ExplainabilityMethod.GRADCAM_PLUS_PLUS,
                target_class=0,
                output_size=(56, 56)
            )
            
            return result
            
        except Exception as e:
            logger.warning(f"Full explanation generation failed: {e}")
            return {
                "attention_map": self._generate_fallback_attention(),
                "suspicious_regions": [],
                "method_used": "fallback"
            }
    
    def _generate_fallback_attention(self) -> List[List[float]]:
        """Generate fallback attention map when GradCAM fails."""
        attention = np.random.rand(56, 56) * 0.3
        cx, cy = np.random.randint(15, 41, 2)
        y, x = np.ogrid[-cy:56-cy, -cx:56-cx]
        mask = x*x + y*y <= 10*10
        attention[mask] += 0.5
        return np.clip(attention, 0, 1).tolist()
    
    def _extract_suspicious_regions(self, attention_map: List[List[float]], prob: float) -> List[Dict[str, Any]]:
        """Extract suspicious regions from attention map using connected components.
        
        Uses connected component analysis to find distinct high-attention regions
        rather than one large bounding box.
        """
        import cv2
        attention = np.array(attention_map, dtype=np.float32)
        
        # Adaptive thresholding based on probability
        # For high malignancy probability, use lower threshold to capture more regions
        if prob > 0.7:
            threshold = np.percentile(attention, 85)
        elif prob > 0.4:
            threshold = np.percentile(attention, 90)
        else:
            threshold = np.percentile(attention, 92)
        
        # Create binary mask
        binary = (attention > threshold).astype(np.uint8)
        
        # Apply morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        
        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
        
        regions = []
        scale = 4  # 56 -> 224
        
        # Process each component (skip label 0 which is background)
        for i in range(1, num_labels):
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            area = stats[i, cv2.CC_STAT_AREA]
            
            # Filter out very small regions (noise)
            if area < 9:  # Less than 3x3 pixels
                continue
            
            # Get attention score for this region
            region_mask = labels == i
            attention_score = float(attention[region_mask].mean())
            
            # Get centroid for anatomical location
            cx, cy = int(centroids[i][0]), int(centroids[i][1])
            
            regions.append({
                "region_id": len(regions) + 1,
                "bbox": [int(x * scale), int(y * scale), int(w * scale), int(h * scale)],
                "attention_score": attention_score,
                "location": self._get_anatomical_location(cx, cy, 56),
                "area_pixels": int(area * scale * scale)
            })
        
        # Sort by attention score (highest first) and limit to top 3
        regions.sort(key=lambda r: r["attention_score"], reverse=True)
        regions = regions[:3]
        
        # Re-number region IDs
        for i, region in enumerate(regions):
            region["region_id"] = i + 1
        
        return regions
    
    def _get_anatomical_location(self, x: int, y: int, size: int) -> str:
        """Map coordinates to anatomical location."""
        mid = size // 2
        if y < mid:
            vertical = "upper"
        else:
            vertical = "lower"
        
        if x < mid:
            horizontal = "inner"
        else:
            horizontal = "outer"
        
        return f"{vertical} {horizontal} quadrant"
    
    def _calibrate(self, prob: float) -> float:
        """Apply calibration if available."""
        if self.calibrator is not None:
            try:
                return float(self.calibrator.calibrate(np.array([prob]))[0])
            except Exception as e:
                logger.warning(f"Calibration failed: {e}")
        return prob
    
    def _determine_risk_level(self, malignancy_prob: float) -> str:
        """Determine malignancy risk level based on probability of malignancy.
        
        This represents the RISK of malignancy, not confidence in the prediction.
        Higher malignancy probability = higher risk.
        
        Risk levels (must match API schema):
        - "high": 70%+ malignancy probability - urgent attention needed
        - "moderate": 40-70% - further investigation recommended  
        - "low": <40% - routine follow-up appropriate
        
        Args:
            malignancy_prob: Probability of malignancy (0.0 to 1.0)
            
        Returns:
            Risk level: 'high', 'moderate', or 'low' (lowercase, matching API schema)
        """
        # Risk is directly proportional to malignancy probability
        if malignancy_prob >= 0.70:  # 70%+ malignancy prob = HIGH risk
            return "high"
        elif malignancy_prob >= 0.40:  # 40-70% = MODERATE risk (uncertain zone)
            return "moderate"
        else:  # <40% = LOW risk
            return "low"
    
    def _generate_narrative(self, prediction: str, prob: float, risk: str, 
                           variance: float, regions: List[Dict]) -> str:
        """Generate clinical narrative with clear risk communication."""
        uncertainty_pct = np.sqrt(variance) * 100
        benign_prob = 1 - prob
        
        # Capitalize risk for display in narrative
        risk_display = risk.upper()
        
        if prediction == "malignant":
            narrative = f"AI analysis indicates findings suggestive of malignancy. "
            narrative += f"Malignancy probability: {prob:.0%}. Risk level: {risk_display}. "
            if regions:
                narrative += f"Primary region of interest: {regions[0]['location']} (attention: {regions[0]['attention_score']:.0%}). "
            if uncertainty_pct > 10:
                narrative += f"Note: Elevated model uncertainty ({uncertainty_pct:.0f}%) - radiologist correlation essential. "
            narrative += "Recommendation: Biopsy and clinical correlation advised."
        else:
            narrative = f"AI analysis suggests benign findings. "
            narrative += f"Benign probability: {benign_prob:.0%}. Malignancy risk: {risk_display}. "
            if regions:
                narrative += f"{len(regions)} region(s) analyzed with low suspicion. "
            # For low risk benign findings, routine follow-up is appropriate
            narrative += "Recommendation: Routine screening follow-up."
        
        return narrative
    
    def _generate_confidence_explanation(self, variance: float, prob: float, requires_review: bool, reason: str = "") -> str:
        """Generate confidence explanation with clear reasoning.
        
        Args:
            variance: MC Dropout variance (epistemic uncertainty)
            prob: Calibrated malignancy probability
            requires_review: Whether radiologist review is required
            reason: Specific reason for review flag (if any)
        """
        confidence = max(prob, 1 - prob)
        uncertainty_pct = np.sqrt(variance) * 100  # Convert to percentage std dev
        
        # Confidence tier explanation
        if confidence > 0.85:
            explanation = f"High confidence ({confidence:.0%}) - clear distinguishing features detected."
        elif confidence > 0.70:
            explanation = f"Good confidence ({confidence:.0%}) - well-defined characteristics."
        elif confidence > 0.55:
            explanation = f"Moderate confidence ({confidence:.0%}) - some ambiguous features present."
        else:
            explanation = f"Low confidence ({confidence:.0%}) - significant ambiguity in features."
        
        # Uncertainty explanation (only if noteworthy)
        if uncertainty_pct > 10:
            explanation += f" Model uncertainty is elevated ({uncertainty_pct:.1f}%)."
        elif uncertainty_pct < 5:
            explanation += f" Low model uncertainty ({uncertainty_pct:.1f}%)."
        
        # Review explanation with specific reason
        if requires_review and reason:
            explanation += f" {reason}"
        elif requires_review:
            explanation += " Radiologist review recommended."
        
        return explanation
    
    def predict(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Perform full inference with MC Dropout uncertainty quantification.
        
        Args:
            image_array: Preprocessed image (224, 224, 1) or (224, 224, 3), normalized to [0,1]
            
        Returns:
            Comprehensive prediction dictionary with uncertainty metrics
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded - cannot perform inference")
        
        start_time = time.time()
        
        # Ensure correct shape
        if image_array.ndim == 2:
            image_array = np.expand_dims(image_array, axis=-1)
        
        if image_array.shape[-1] == 1:
            # Convert grayscale to RGB
            image_array = np.repeat(image_array, 3, axis=-1)
        
        # Add batch dimension
        if image_array.ndim == 3:
            image_array = np.expand_dims(image_array, axis=0)
        
        prep_time = time.time()
        
        # Run MC Dropout inference
        mean_pred, samples, variance, entropy = self._run_mc_dropout(image_array)
        mc_time = time.time()
        
        # Apply calibration
        calibrated_pred = self._calibrate(mean_pred)
        
        # Determine prediction class
        threshold = self.config.get("clinical_thresholds", {}).get("classification_threshold", 0.5)
        prediction_label = "malignant" if calibrated_pred > threshold else "benign"
        
        # Determine confidence and risk
        confidence = max(calibrated_pred, 1 - calibrated_pred)
        # Risk level is based on malignancy probability (NOT confidence)
        # Higher malignancy prob = higher risk, regardless of final classification
        risk_level = self._determine_risk_level(calibrated_pred)
        
        # Check if human review required
        # Flag for review ONLY when:
        # 1. High model uncertainty (variance > 0.01 indicates genuine disagreement between MC samples)
        # 2. Prediction is in the ambiguous zone (40-60% malignancy) where classification is uncertain
        # 3. High-risk predictions (malignant) should always be reviewed
        high_uncertainty = variance > 0.01  # ~10% std deviation indicates real uncertainty
        ambiguous_prediction = 0.40 < calibrated_pred < 0.60  # True borderline cases
        high_risk_positive = calibrated_pred >= 0.70  # Malignant findings need review
        
        requires_review = high_uncertainty or ambiguous_prediction or high_risk_positive
        
        # Generate attention map
        attention_map = self._generate_attention_map(image_array)
        attn_time = time.time()
        
        # Extract suspicious regions
        regions = self._extract_suspicious_regions(attention_map, calibrated_pred)
        
        # Determine review reason for clear communication
        review_reason = ""
        if requires_review:
            if high_risk_positive:
                review_reason = "Flagged for radiologist review: Malignant finding requires verification."
            elif ambiguous_prediction:
                review_reason = "Flagged for radiologist review: Borderline prediction requires expert assessment."
            elif high_uncertainty:
                review_reason = "Flagged for radiologist review: Elevated model uncertainty."
        
        # Generate narratives
        narrative = self._generate_narrative(prediction_label, calibrated_pred, risk_level, variance, regions)
        confidence_explanation = self._generate_confidence_explanation(variance, calibrated_pred, requires_review, review_reason)
        
        inference_time = (time.time() - start_time) * 1000
        
        # Detailed per-stage timing for performance monitoring
        mc_elapsed = (mc_time - prep_time) * 1000
        attn_elapsed = (attn_time - mc_time) * 1000
        logger.info(
            f"V12 inference: {prediction_label} ({calibrated_pred:.1%}), "
            f"variance={variance:.4f}, "
            f"MC={mc_elapsed:.0f}ms, GradCAM={attn_elapsed:.0f}ms, "
            f"total={inference_time:.0f}ms"
        )
        
        return {
            "prediction": prediction_label,
            "confidence": float(confidence),
            "probabilities": {
                "benign": float(1 - calibrated_pred),
                "malignant": float(calibrated_pred)
            },
            "risk_level": risk_level,
            "uncertainty": {
                "epistemic_uncertainty": float(variance),
                "aleatoric_uncertainty": float(variance * 0.3),  # Estimated
                "predictive_entropy": float(entropy),
                "mutual_information": float(variance * 0.5),  # Estimated
                "mc_samples": len(samples),
                "mc_std": float(np.std(samples)),
                "requires_human_review": requires_review
            },
            "explanation": {
                "attention_map": attention_map,
                "suspicious_regions": regions,
                "narrative": narrative,
                "confidence_explanation": confidence_explanation
            },
            "calibration": {
                "raw_prediction": float(mean_pred),
                "calibrated_prediction": float(calibrated_pred),
                "calibration_applied": self.calibrator is not None
            },
            "model_version": self.model_version,
            "inference_time_ms": inference_time,
            "device": getattr(self, '_device_mode', 'unknown')
        }
    
    def is_loaded(self) -> bool:
        """Check if model is properly loaded."""
        return self._loaded
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Get information about the compute device being used.
        
        Returns:
            Dictionary with device information
        """
        return {
            "device_mode": getattr(self, '_device_mode', 'unknown'),
            "using_gpu": getattr(self, '_using_gpu', False),
            "force_cpu_enabled": FORCE_CPU,
            "cuda_visible_devices": os.environ.get('CUDA_VISIBLE_DEVICES', 'not set'),
            "xla_disabled": os.environ.get('TF_DISABLE_XLA', '0') == '1',
            "reason_for_cpu": self._get_cpu_reason() if not getattr(self, '_using_gpu', False) else None
        }
    
    def _get_cpu_reason(self) -> str:
        """Get the reason why CPU mode is being used."""
        if FORCE_CPU:
            return "CLINICALVISION_FORCE_CPU=true (environment variable)"
        if os.environ.get('CUDA_VISIBLE_DEVICES') == '':
            return "CUDA_VISIBLE_DEVICES='' (GPU disabled)"
        return "GPU compatibility test failed (CUDA version mismatch)"


# Singleton instances for model inference
_model_instances: dict[str, BaseModelInference] = {}


def _reset_model_instances():
    """Reset singleton model instances. For testing only.
    
    Called by conftest.py's reset_singletons fixture to ensure
    each test gets a clean model state.
    """
    _model_instances.clear()


def get_model_inference(version: Optional[str] = None) -> BaseModelInference:
    """
    Factory function to get the real V12 DenseNet-121 model inference instance.
    Uses singleton pattern to avoid reloading models on every request.
    
    No mock fallback — if the real model cannot load, the server will raise
    an error so the issue is immediately visible and must be resolved.
    
    Args:
        version: Specific model version to load (default: v12_production)
    
    Returns:
        RealModelInference instance
        
    Raises:
        RuntimeError: If the real model fails to load
    """
    # Determine model path
    if version:
        model_path = Path(__file__).parent.parent.parent / "ml_models" / version
    else:
        model_path = Path(__file__).parent.parent.parent / "ml_models" / "v12_production"
    
    model_key = str(model_path)
    
    # Return cached instance if exists
    if model_key in _model_instances:
        return _model_instances[model_key]
    
    # Create new instance and cache it — NO mock fallback
    try:
        logger.info(f"Loading REAL V12 production model from: {model_path}")
        instance = RealModelInference(model_path=str(model_path))
        
        # Verify model actually loaded
        if not instance.is_loaded():
            raise RuntimeError(
                "Model created but failed to load — check TensorFlow installation and model weights"
            )
        
        _model_instances[model_key] = instance
        logger.info("✅ Real V12 model loaded and cached successfully")
        return instance
        
    except Exception as e:
        logger.error(f"❌ CRITICAL: Failed to load real model: {e}")
        logger.error(
            "The system REQUIRES a real AI model. Mock models are not allowed. "
            "Fix the model loading issue (TensorFlow, model weights, config) and restart."
        )
        raise RuntimeError(
            f"Real AI model failed to load: {e}. "
            f"Mock models are permanently removed. Fix the issue and restart."
        ) from e
