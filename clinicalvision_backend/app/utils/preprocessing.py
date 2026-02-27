"""
Image preprocessing utilities
Prepares uploaded mammograms for model inference

IMPORTANT: Must match V12 ROI training pipeline EXACTLY:
1. Convert to grayscale
2. Apply CLAHE enhancement (clip_limit=2.0, tile_size=8x8)
3. Resize to 224x224
4. Normalize to [0, 1] range
5. Stack to 3 channels
"""

import numpy as np
import cv2
from PIL import Image
from typing import Tuple, Dict, List
from app.core.logging import logger


def apply_clahe(image: np.ndarray, clip_limit: float = 2.0, tile_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Apply Contrast Limited Adaptive Histogram Equalization.
    EXACTLY as in V12 training notebook.
    
    Args:
        image: Input grayscale image (uint8)
        clip_limit: Threshold for contrast limiting
        tile_size: Size of grid for histogram equalization
        
    Returns:
        CLAHE enhanced image normalized to [0, 1]
    """
    if image.dtype != np.uint8:
        # Normalize to 0-255 range first
        image = ((image - image.min()) / (image.max() - image.min() + 1e-8) * 255).astype(np.uint8)
    
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    enhanced = clahe.apply(image)
    
    return enhanced.astype(np.float32) / 255.0


def preprocess_mammogram(
    image: Image.Image,
    target_size: Tuple[int, int] = (224, 224),
    use_clahe: bool = True
) -> np.ndarray:
    """
    Preprocess mammogram image for model inference.
    MUST MATCH V12 ROI training pipeline EXACTLY.
    
    V12 Training Pipeline:
    1. Load DICOM → convert to grayscale
    2. Normalize to 0-255 uint8
    3. Apply CLAHE enhancement
    4. Resize to 224x224 (INTER_LANCZOS4)
    5. Convert to 3-channel by stacking
    6. Result: [0,1] normalized 3-channel image
    
    Args:
        image: PIL Image object
        target_size: Target dimensions (height, width)
        use_clahe: Whether to apply CLAHE enhancement (default True, matching training)
        
    Returns:
        Preprocessed numpy array shape (224, 224, 3) in [0,1] range
    """
    
    try:
        # Step 1: Convert to grayscale if not already
        if image.mode != 'L':
            image = image.convert('L')
            logger.debug("Converted image to grayscale")
        
        # Convert to numpy for processing
        image_array = np.array(image, dtype=np.uint8)
        
        # Step 2 & 3: Apply CLAHE enhancement (as in V12 training)
        if use_clahe:
            # CLAHE returns [0,1] normalized image
            image_normalized = apply_clahe(
                image_array, 
                clip_limit=2.0,  # V12 config value
                tile_size=(8, 8)  # V12 config value
            )
            logger.debug("Applied CLAHE enhancement")
        else:
            # Simple normalization to [0,1]
            image_normalized = image_array.astype(np.float32) / 255.0
        
        # Step 4: Resize to target dimensions
        # V12 uses INTER_LANCZOS4 for high quality
        image_resized = cv2.resize(
            image_normalized, 
            target_size, 
            interpolation=cv2.INTER_LANCZOS4
        )
        logger.debug(f"Resized image to {target_size}")
        
        # Step 5: Convert to 3-channel (stack grayscale to RGB)
        # EXACTLY as V12 training: np.stack([image] * 3, axis=-1)
        image_3channel = np.stack([image_resized] * 3, axis=-1)
        
        logger.debug(f"Final shape: {image_3channel.shape}, range: [{image_3channel.min():.4f}, {image_3channel.max():.4f}]")
        
        return image_3channel.astype(np.float32)
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise ValueError(f"Image preprocessing error: {str(e)}")


def preprocess_mammogram_with_metadata(
    image: Image.Image,
    target_size: Tuple[int, int] = (224, 224),
    use_clahe: bool = True
) -> Tuple[np.ndarray, Dict]:
    """
    Preprocess mammogram and return metadata for coordinate transformation.
    
    This function preserves original image dimensions to enable accurate
    coordinate mapping between model space (224×224) and original image space.
    
    Args:
        image: PIL Image object
        target_size: Target dimensions (height, width)
        use_clahe: Whether to apply CLAHE enhancement
        
    Returns:
        Tuple of:
        - Preprocessed numpy array shape (224, 224, 3) in [0,1] range
        - Metadata dict with original dimensions and scale factors
    """
    # Store original dimensions BEFORE any processing
    original_width, original_height = image.size
    
    # Calculate scale factors for coordinate transformation
    metadata = {
        "original_width": original_width,
        "original_height": original_height,
        "model_width": target_size[0],
        "model_height": target_size[1],
        "scale_x": original_width / target_size[0],
        "scale_y": original_height / target_size[1],
        "aspect_ratio": original_width / original_height,
        "coordinate_system": "model"  # Regions returned in 224x224 space
    }
    
    # Perform standard preprocessing
    preprocessed = preprocess_mammogram(image, target_size, use_clahe)
    
    logger.debug(
        f"Preprocessed with metadata: original={original_width}x{original_height}, "
        f"model={target_size[0]}x{target_size[1]}, scale=({metadata['scale_x']:.2f}, {metadata['scale_y']:.2f})"
    )
    
    return preprocessed, metadata


def transform_bbox_to_original(
    bbox: List[int],
    scale_x: float,
    scale_y: float
) -> List[int]:
    """
    Transform bounding box from model space (224×224) to original image space.
    
    Args:
        bbox: [x, y, width, height] in model coordinates
        scale_x: Original width / model width
        scale_y: Original height / model height
        
    Returns:
        [x, y, width, height] in original image coordinates
    """
    x, y, w, h = bbox
    return [
        int(round(x * scale_x)),
        int(round(y * scale_y)),
        int(round(w * scale_x)),
        int(round(h * scale_y))
    ]


def transform_bbox_to_model(
    bbox: List[int],
    scale_x: float,
    scale_y: float
) -> List[int]:
    """
    Transform bounding box from original image space to model space (224×224).
    
    Args:
        bbox: [x, y, width, height] in original image coordinates
        scale_x: Original width / model width
        scale_y: Original height / model height
        
    Returns:
        [x, y, width, height] in model coordinates
    """
    x, y, w, h = bbox
    return [
        int(round(x / scale_x)),
        int(round(y / scale_y)),
        int(round(w / scale_x)),
        int(round(h / scale_y))
    ]


def validate_image(image: Image.Image) -> bool:
    """
    Validate uploaded image meets requirements
    
    Args:
        image: PIL Image to validate
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    
    # Check image format
    if image.format not in ['JPEG', 'PNG', 'TIFF', 'DCM']:
        raise ValueError(f"Unsupported image format: {image.format}")
    
    # Check dimensions
    width, height = image.size
    if width < 100 or height < 100:
        raise ValueError(f"Image too small: {width}x{height}. Minimum: 100x100")
    
    if width > 10000 or height > 10000:
        raise ValueError(f"Image too large: {width}x{height}. Maximum: 10000x10000")
    
    # Check color mode
    if image.mode not in ['L', 'RGB', 'RGBA']:
        raise ValueError(f"Unsupported color mode: {image.mode}")
    
    logger.debug(f"Image validated: {width}x{height}, mode: {image.mode}")
    
    return True


def save_uploaded_image(image: Image.Image, case_id: str, upload_dir: str) -> str:
    """
    Save uploaded image to disk for audit trail
    
    Args:
        image: PIL Image to save
        case_id: Unique case identifier
        upload_dir: Directory to save images
        
    Returns:
        Path to saved image
    """
    import os
    from datetime import datetime
    
    # Create upload directory if needed
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{case_id}_{timestamp}.png"
    filepath = os.path.join(upload_dir, filename)
    
    # Save image
    image.save(filepath, format='PNG')
    logger.info(f"Saved uploaded image: {filepath}")
    
    return filepath
