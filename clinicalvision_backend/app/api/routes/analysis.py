"""
Mammogram analysis endpoints
Core AI inference API for breast cancer detection
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from PIL import Image
import io
import time
import uuid
from datetime import datetime

from app.schemas.analysis import AnalysisResponse, AnalysisMetadata, PredictionResult, UncertaintyMetrics, ExplanationData
from app.models.inference import get_model_inference
from app.utils.preprocessing import preprocess_mammogram, validate_image, save_uploaded_image
from app.core.config import settings
from app.core.logging import logger
from app.core.dependencies import get_current_active_user
from app.db.models.user import User

router = APIRouter(prefix="/analyze", tags=["analysis"])

# Initialize model (singleton pattern)
_model_instance = None

def get_model():
    """Get or initialize model instance"""
    global _model_instance
    if _model_instance is None:
        _model_instance = get_model_inference()
        logger.info("Model instance initialized")
    return _model_instance


@router.post("/", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_mammogram(
    file: UploadFile = File(..., description="Mammogram image (JPEG, PNG, DICOM)"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze mammogram image for breast cancer detection
    
    **Pipeline:**
    1. Validate uploaded image
    2. Preprocess image (resize, normalize)
    3. Run AI inference (classification + uncertainty)
    4. Generate explanations (attention maps, narratives)
    5. Return comprehensive analysis results
    
    **Returns:**
    - Prediction (benign/malignant) with confidence
    - Uncertainty metrics (epistemic, aleatoric, entropy)
    - Explainable AI outputs (attention maps, suspicious regions)
    - Clinical recommendations
    
    **Example Usage:**
    ```bash
    curl -X POST "http://localhost:8000/analyze/" \\
         -F "file=@mammogram.jpg"
    ```
    """
    
    inference_start = time.time()
    case_id = f"case_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
    
    try:
        # Validate file size
        contents = await file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024:.1f}MB"
            )
        
        # Validate file extension
        file_ext = file.filename.split('.')[-1].lower()
        if f".{file_ext}" not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: .{file_ext}. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        logger.info(f"Processing case: {case_id}, file: {file.filename}, size: {len(contents)} bytes")
        
        # Load and validate image
        image = Image.open(io.BytesIO(contents))
        validate_image(image)
        
        # Save uploaded image for audit trail
        saved_path = save_uploaded_image(image, case_id, settings.UPLOAD_DIR)
        logger.debug(f"Image saved: {saved_path}")
        
        # Preprocess image
        preprocessed = preprocess_mammogram(image)
        logger.debug(f"Image preprocessed: shape={preprocessed.shape}")
        
        # Run model inference
        model = get_model()
        prediction_result = model.predict(preprocessed)
        
        inference_time_ms = (time.time() - inference_start) * 1000
        logger.info(f"Inference completed in {inference_time_ms:.2f}ms - Prediction: {prediction_result['prediction']}")
        
        # Generate clinical narrative based on results
        clinical_narrative = _generate_clinical_narrative(prediction_result)
        recommendation = _generate_recommendation(prediction_result)
        
        # Build response
        response = AnalysisResponse(
            metadata=AnalysisMetadata(
                case_id=case_id,
                model_version=prediction_result['model_version'],
                inference_time_ms=inference_time_ms,
                timestamp=datetime.utcnow()
            ),
            prediction=PredictionResult(
                prediction=prediction_result['prediction'],
                confidence=prediction_result['confidence'],
                probabilities=prediction_result['probabilities'],
                risk_level=prediction_result['risk_level']
            ),
            uncertainty=UncertaintyMetrics(**prediction_result['uncertainty']),
            explanation=ExplanationData(
                attention_map=prediction_result['explanation']['attention_map'],
                suspicious_regions=prediction_result['explanation']['suspicious_regions'],
                clinical_narrative=clinical_narrative,
                recommendation=recommendation
            )
        )
        
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Validation error for case {case_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Inference error for case {case_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during analysis"
        )


def _generate_clinical_narrative(result: dict) -> str:
    """
    Generate human-readable clinical narrative from AI results
    """
    prediction = result['prediction']
    confidence = result['confidence']
    uncertainty = result['uncertainty']
    regions = result['explanation']['suspicious_regions']
    
    narrative_parts = []
    
    # Main finding
    if prediction == 'malignant':
        narrative_parts.append(
            f"AI analysis detected suspicious findings consistent with malignancy "
            f"(confidence: {confidence:.1%})."
        )
    else:
        narrative_parts.append(
            f"AI analysis suggests benign characteristics "
            f"(confidence: {confidence:.1%})."
        )
    
    # Regions of interest
    if regions:
        locations = [r['location'] for r in regions[:2]]  # Top 2 regions
        narrative_parts.append(
            f"Notable regions identified in: {', '.join(locations)}."
        )
    
    # Uncertainty considerations
    if uncertainty['requires_human_review']:
        narrative_parts.append(
            f"High uncertainty detected (epistemic: {uncertainty['epistemic_uncertainty']:.3f}). "
            f"Radiologist review strongly recommended."
        )
    
    return " ".join(narrative_parts)


def _generate_recommendation(result: dict) -> str:
    """
    Generate clinical action recommendation
    """
    prediction = result['prediction']
    confidence = result['confidence']
    uncertainty = result['uncertainty']
    risk_level = result['risk_level']
    
    if uncertainty['requires_human_review']:
        return "Immediate radiologist review required due to high model uncertainty."
    
    if risk_level == 'high':
        return "Recommend biopsy for histopathological confirmation and additional imaging (ultrasound, MRI)."
    elif risk_level == 'moderate':
        return "Recommend short-interval follow-up (3-6 months) and consider additional diagnostic imaging."
    else:
        return "Routine screening interval appropriate. Continue regular mammographic surveillance."


@router.get("/history/{case_id}")
async def get_case_history(case_id: str):
    """
    Retrieve historical analysis for a specific case
    TODO: Implement database lookup when persistence layer is added
    """
    # Placeholder for future implementation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Case history retrieval not yet implemented"
    )
