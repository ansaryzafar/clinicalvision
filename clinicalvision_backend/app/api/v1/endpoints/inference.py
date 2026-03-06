"""
Inference/Analysis API Endpoints - Version 1
Production-grade AI inference endpoints with authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Body, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from PIL import Image
import io
import numpy as np
import time
import base64

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.image import Image as ImageModel
from app.db.models.analysis import Analysis
from app.core.dependencies import get_current_active_user, RoleChecker
from app.core.rate_limit import limiter, get_rate_limit
from app.schemas.inference import (
    InferenceRequest,
    InferenceResponse,
    BilateralInferenceRequest,
    BilateralInferenceResponse,
    AnalysisHistoryResponse,
    InferenceStatsResponse,
    TileAnalysisRequest,
    TileAnalysisResponse,
    AnalysisModeEnum,
    TileConfig as TileConfigSchema,
    GradCAMRequest,
    GradCAMResponse,
    ExplainabilityMethodEnum,
    SuspiciousRegion,
    ImageMetadata,
    # New XAI schemas
    XAIValidationRequest,
    XAIValidationResponse,
    AttentionQualityRequest,
    AttentionQualityResponse,
    QualityScoreResponse,
    ValidationResultEnum,
    QualityMetricEnum,
    ClinicalNarrativeRequest,
    ClinicalNarrativeResponse,
    ClinicalRecommendation,
    BIRADSCategoryEnum
)
from app.services.inference_service import get_inference_service
from app.services.explainability_service import (
    get_explainability_service,
    ExplainabilityMethod as ExplainMethod
)
from app.services.xai_validation_service import get_xai_validation_service
from app.services.clinical_narrative_service import get_clinical_narrative_service
from app.utils.preprocessing import (
    preprocess_mammogram,
    preprocess_mammogram_with_metadata,
    validate_image,
    transform_bbox_to_original
)
from app.core.logging import logger

router = APIRouter()

# Role checkers
require_radiologist = RoleChecker(["admin", "radiologist", "technician"])


@router.post(
    "/predict",
    response_model=InferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Run AI inference on single mammogram image"
)
@limiter.limit(get_rate_limit("inference"))
async def predict_image(
    request: Request,
    file: UploadFile = File(..., description="Mammogram image file (JPEG, PNG, DICOM)"),
    save_result: bool = Query(False, description="Save prediction to database"),
    model_version: Optional[str] = Query(None, description="Specific model version to use"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Run AI inference on uploaded mammogram image**
    
    **Process:**
    1. Validate and preprocess uploaded image
    2. Run AI model inference
    3. Generate uncertainty metrics
    4. Optionally save result to database
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Returns:**
    - Prediction (benign/malignant) with confidence
    - Uncertainty quantification metrics
    - Explainable AI outputs (attention maps, suspicious regions)
    - Clinical recommendations
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/predict" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@mammogram.jpg" \\
         -F "save_result=true"
    ```
    """
    try:
        # Read and validate file
        contents = await file.read()
        
        # Load image
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        # Validate image
        validate_image(image)
        
        # Preprocess image WITH metadata for coordinate transformation
        try:
            preprocessed, image_metadata = preprocess_mammogram_with_metadata(image)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image preprocessing failed: {str(e)}"
            )
        
        # Create Image record in DB so analysis results can be linked
        image_id = None
        if save_result:
            try:
                img_record = ImageModel(
                    file_path=file.filename or "upload",
                    file_name=file.filename or "unknown",
                    file_size_bytes=len(contents),
                    mime_type=file.content_type or "image/png",
                    image_width=image_metadata.get("original_width"),
                    image_height=image_metadata.get("original_height"),
                    status="analyzed",
                    is_processed=True,
                    uploaded_by=current_user.id,
                    upload_source="inference_api",
                )
                db.add(img_record)
                db.flush()  # Get ID without committing
                image_id = img_record.id
                logger.info(f"Created Image record id={image_id} for inference save")
            except Exception as e:
                logger.warning(f"Failed to create Image record: {e}, proceeding without save")
                image_id = None
        
        # Run inference
        inference_service = get_inference_service()
        result = await inference_service.predict_single_image(
            image_array=preprocessed,
            image_id=image_id,
            db=db if save_result else None,
            model_version=model_version,
            save_result=save_result
        )
        
        # Add image metadata for coordinate transformation
        result['image_metadata'] = image_metadata
        
        # Transform suspicious regions to original coordinates
        if 'suspicious_regions' in result.get('explanation', {}):
            scale_x = image_metadata['scale_x']
            scale_y = image_metadata['scale_y']
            for region in result['explanation']['suspicious_regions']:
                if 'bbox' in region:
                    region['bbox_model'] = region['bbox']  # Keep model coords
                    region['bbox_original'] = transform_bbox_to_original(
                        region['bbox'], scale_x, scale_y
                    )
        
        logger.info(
            f"Inference completed for user={current_user.email}, "
            f"prediction={result['prediction']}, confidence={result['confidence']:.2%}, "
            f"original_size={image_metadata['original_width']}x{image_metadata['original_height']}"
        )
        
        return InferenceResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(e)}"
        )


@router.post(
    "/predict-tiles",
    response_model=TileAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Run tile-based AI inference on full-size mammogram"
)
@limiter.limit(get_rate_limit("inference"))
async def predict_with_tiles(
    request: Request,
    file: UploadFile = File(..., description="Mammogram image file (any resolution)"),
    mode: str = Query("attention_guided", description="Analysis mode: global_only, attention_guided, full_coverage"),
    tile_size: int = Query(224, ge=64, le=512, description="Tile size in pixels"),
    overlap: float = Query(0.25, ge=0.0, le=0.75, description="Tile overlap fraction"),
    attention_threshold: float = Query(0.3, ge=0.0, le=1.0, description="Min attention to analyze tile"),
    max_tiles: int = Query(50, ge=1, le=200, description="Maximum tiles to analyze"),
    save_result: bool = Query(False, description="Save prediction to database"),
    save_result_body: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    # Accept save_result from form body as fallback (frontend may send it there)
    if save_result_body and save_result_body.lower() == 'true':
        save_result = True
    
    """
    **Run tile-based AI inference on full-resolution mammogram**
    
    This endpoint performs multi-stage analysis for high-resolution mammograms:
    
    **Stages:**
    1. **Global Classification**: Quick analysis on 224×224 downsampled image
    2. **ROI Detection**: Identify high-attention regions using GradCAM
    3. **Tile Analysis**: Extract and analyze tiles from suspicious areas
    4. **Aggregation**: Combine tile predictions into final diagnosis
    
    **Analysis Modes:**
    - `global_only`: Quick screening (224×224 only)
    - `attention_guided`: Analyze tiles from high-attention regions (recommended)
    - `full_coverage`: Comprehensive analysis of all tiles
    
    **Returns:**
    - Final aggregated prediction with confidence
    - All suspicious regions with coordinates in original image space
    - Per-tile analysis details
    - Full uncertainty quantification
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/predict-tiles?mode=attention_guided" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@full_size_mammogram.dcm"
    ```
    """
    start_time = time.time()
    
    try:
        # Read and validate file
        contents = await file.read()
        
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        # Validate image
        validate_image(image)
        
        original_size = f"{image.width}×{image.height}"
        logger.info(
            f"Tile analysis requested: mode={mode}, image_size={original_size}, "
            f"user={current_user.email}"
        )
        
        # Create Image record for persistence if save_result is requested
        image_id = None
        if save_result:
            try:
                img_record = ImageModel(
                    file_path=file.filename or "upload",
                    file_name=file.filename or "unknown",
                    file_size_bytes=len(contents),
                    mime_type=file.content_type or "image/png",
                    image_width=image.width,
                    image_height=image.height,
                    status="analyzed",
                    is_processed=True,
                    uploaded_by=current_user.id,
                    upload_source="tile_inference_api",
                )
                db.add(img_record)
                db.flush()
                image_id = img_record.id
                logger.info(f"Created Image record id={image_id} for tile inference save")
            except Exception as e:
                logger.warning(f"Failed to create Image record for tiles: {e}")
                image_id = None
        
        # Convert mode string to enum
        try:
            analysis_mode = AnalysisModeEnum(mode)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mode: {mode}. Valid options: global_only, attention_guided, full_coverage"
            )
        
        # Import tile inference engine
        from app.models.tile_inference import (
            TileBasedInference,
            TileConfig,
            AnalysisMode
        )
        
        # Create tile configuration
        tile_config = TileConfig(
            tile_size=tile_size,
            overlap=overlap,
            attention_threshold=attention_threshold,
            max_tiles=max_tiles
        )
        
        # Get inference service and model
        inference_service = get_inference_service()
        model = inference_service.model
        
        # Create tile inference engine
        engine = TileBasedInference(model, tile_config)
        
        # Run tile-based analysis
        result = await engine.analyze(
            image,
            mode=AnalysisMode(mode)
        )
        
        # Calculate inference time
        inference_time_ms = (time.time() - start_time) * 1000
        result['inference_time_ms'] = inference_time_ms
        
        # Add case ID and timestamp if not present
        if 'case_id' not in result:
            from datetime import datetime
            import uuid
            result['case_id'] = f"tile_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        if 'timestamp' not in result:
            from datetime import datetime
            result['timestamp'] = datetime.utcnow().isoformat()
        
        if 'model_version' not in result:
            result['model_version'] = getattr(model, 'model_version', 'v12-production')
        
        # Save tile analysis results to database if requested
        if save_result and image_id and db:
            try:
                analysis = Analysis(
                    image_id=image_id,
                    model_version=result.get("model_version", "unknown"),
                    prediction_class=result.get("prediction", "unknown"),
                    confidence_score=result.get("confidence", 0.0),
                    malignant_probability=result.get("probabilities", {}).get("malignant", 0.0),
                    benign_probability=result.get("probabilities", {}).get("benign", 0.0),
                    risk_level=result.get("risk_level", "unknown"),
                    epistemic_uncertainty=result.get("uncertainty", {}).get("epistemic_uncertainty", 0.0),
                    predictive_entropy=result.get("uncertainty", {}).get("predictive_entropy", 0.0),
                    requires_human_review=result.get("uncertainty", {}).get("requires_human_review", False),
                    inference_time_ms=inference_time_ms,
                    suspicious_regions=result.get("explanation", {}).get("suspicious_regions", []),
                    clinical_narrative=result.get("explanation", {}).get("narrative"),
                    processing_metadata={
                        "analysis_mode": mode,
                        "tiles_analyzed": result.get("tiles_analyzed", 0),
                        "tile_size": tile_size,
                        "timestamp": result.get("timestamp"),
                    }
                )
                db.add(analysis)
                db.commit()
                logger.info(f"Saved tile analysis to DB: analysis_id={analysis.id}, image_id={image_id}")
            except Exception as e:
                logger.error(f"Failed to save tile analysis to DB: {e}")
                db.rollback()
        
        logger.info(
            f"Tile analysis completed for user={current_user.email}, "
            f"prediction={result['prediction']}, tiles_analyzed={result.get('tiles_analyzed', 0)}, "
            f"time={inference_time_ms:.0f}ms"
        )
        
        return TileAnalysisResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tile inference failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tile inference failed: {str(e)}"
        )


@router.post(
    "/predict-from-storage/{image_id}",
    response_model=InferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Run inference on image from storage"
)
@limiter.limit(get_rate_limit("inference"))
async def predict_from_storage(
    request: Request,
    image_id: int,
    save_result: bool = Query(True, description="Save prediction to database"),
    model_version: Optional[str] = Query(None, description="Specific model version to use"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Run AI inference on image already in storage**
    
    This endpoint allows running inference on images that were previously
    uploaded via the Image Storage API.
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Parameters:**
    - image_id: Database ID of the image
    - save_result: Whether to save prediction (default: true)
    - model_version: Specific model version (default: latest)
    
    **Returns:**
    Complete inference response with prediction and uncertainty metrics
    """
    try:
        # Get image from database
        image_record = db.query(ImageModel).filter(ImageModel.id == image_id).first()
        
        if not image_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with id={image_id} not found"
            )
        
        # Check if image file exists
        from pathlib import Path
        image_path = Path(image_record.file_path)
        
        if not image_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image file not found: {image_record.file_path}"
            )
        
        # Load and preprocess image
        try:
            image = Image.open(image_path)
            validate_image(image)
            preprocessed = preprocess_mammogram(image)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image loading/preprocessing failed: {str(e)}"
            )
        
        # Run inference
        inference_service = get_inference_service()
        result = await inference_service.predict_single_image(
            image_array=preprocessed,
            image_id=image_id,
            db=db if save_result else None,
            model_version=model_version,
            save_result=save_result
        )
        
        logger.info(
            f"Inference from storage: image_id={image_id}, user={current_user.email}, "
            f"prediction={result['prediction']}"
        )
        
        return InferenceResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference from storage failed for image_id={image_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(e)}"
        )


@router.post(
    "/predict-bilateral",
    response_model=BilateralInferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Run inference on bilateral mammogram study (4 views)"
)
@limiter.limit(get_rate_limit("inference"))
async def predict_bilateral(
    request: Request,
    bilateral_request: BilateralInferenceRequest = Body(...),  # renamed to avoid conflict with Request
    model_version: Optional[str] = Query(None, description="Specific model version to use"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Run AI inference on complete bilateral mammogram study**
    
    Analyzes all 4 standard views (Left CC, Right CC, Left MLO, Right MLO)
    and aggregates results into comprehensive assessment.
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Request Body:**
    ```json
    {
        "image_ids": {
            "left_cc": 123,
            "right_cc": 124,
            "left_mlo": 125,
            "right_mlo": 126
        }
    }
    ```
    
    **Returns:**
    - Individual predictions for each view
    - Aggregated overall assessment
    - Comparative analysis between sides
    - Most suspicious findings highlighted
    """
    try:
        # Validate and load all 4 images
        image_arrays = {}
        image_records = {}
        
        for view_name, image_id in bilateral_request.image_ids.items():
            # Get image from database
            image_record = db.query(ImageModel).filter(ImageModel.id == image_id).first()
            
            if not image_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Image not found for {view_name}: id={image_id}"
                )
            
            # Load and preprocess
            from pathlib import Path
            image_path = Path(image_record.file_path)
            
            if not image_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Image file not found for {view_name}: {image_record.file_path}"
                )
            
            try:
                image = Image.open(image_path)
                validate_image(image)
                preprocessed = preprocess_mammogram(image)
                image_arrays[view_name] = preprocessed
                image_records[view_name] = image_record
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to process {view_name}: {str(e)}"
                )
        
        # Ensure all 4 views present
        required_views = ["left_cc", "right_cc", "left_mlo", "right_mlo"]
        missing = [v for v in required_views if v not in image_arrays]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required views: {missing}"
            )
        
        # Run bilateral inference
        inference_service = get_inference_service()
        result = await inference_service.predict_bilateral(
            left_cc_array=image_arrays["left_cc"],
            right_cc_array=image_arrays["right_cc"],
            left_mlo_array=image_arrays["left_mlo"],
            right_mlo_array=image_arrays["right_mlo"],
            image_ids=bilateral_request.image_ids,
            db=db,
            model_version=model_version
        )
        
        logger.info(
            f"Bilateral inference completed: user={current_user.email}, "
            f"overall={result['overall_prediction']}, "
            f"confidence={result['overall_confidence']:.2%}"
        )
        
        return BilateralInferenceResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bilateral inference failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bilateral inference failed: {str(e)}"
        )


@router.get(
    "/history/{image_id}",
    response_model=List[AnalysisHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get inference history for specific image"
)
async def get_inference_history(
    image_id: int,
    limit: int = Query(10, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Retrieve all inference results for a specific image**
    
    Useful for tracking model performance over time and
    comparing predictions from different model versions.
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Parameters:**
    - image_id: Database ID of the image
    - limit: Maximum number of results (default: 10, max: 100)
    
    **Returns:**
    List of inference results ordered by most recent first
    """
    try:
        # Verify image exists
        image_record = db.query(ImageModel).filter(ImageModel.id == image_id).first()
        if not image_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with id={image_id} not found"
            )
        
        # Get inference history
        inference_service = get_inference_service()
        analyses = await inference_service.get_image_predictions(image_id, db, limit)
        
        # Convert to response format
        results = [
            AnalysisHistoryResponse(
                id=analysis.id,
                image_id=analysis.image_id,
                model_version=analysis.model_version,
                prediction_class=analysis.prediction_class,
                confidence_score=analysis.confidence_score,
                risk_level=analysis.risk_level,
                epistemic_uncertainty=analysis.epistemic_uncertainty,
                requires_human_review=analysis.requires_human_review,
                inference_time_ms=analysis.inference_time_ms,
                created_at=analysis.created_at
            )
            for analysis in analyses
        ]
        
        logger.info(
            f"Retrieved {len(results)} inference records for image_id={image_id}, "
            f"user={current_user.email}"
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve inference history for image_id={image_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve inference history: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=InferenceStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get inference statistics"
)
def get_inference_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Retrieve comprehensive inference statistics**
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Returns:**
    - Total inference count
    - Prediction distribution (benign vs malignant)
    - Average confidence scores
    - Uncertainty metrics
    - Model performance indicators
    """
    try:
        # Query statistics
        total_analyses = db.query(Analysis).count()
        
        # Prediction distribution
        from sqlalchemy import func
        prediction_dist = db.query(
            Analysis.prediction_class,
            func.count(Analysis.id)
        ).group_by(Analysis.prediction_class).all()
        
        # Risk level distribution (filter out None values)
        risk_dist = db.query(
            Analysis.risk_level,
            func.count(Analysis.id)
        ).filter(Analysis.risk_level.isnot(None)).group_by(Analysis.risk_level).all()
        
        # Average metrics
        avg_confidence = db.query(func.avg(Analysis.confidence_score)).scalar() or 0.0
        avg_uncertainty = db.query(func.avg(Analysis.epistemic_uncertainty)).scalar() or 0.0
        avg_inference_time = db.query(func.avg(Analysis.inference_time_ms)).scalar() or 0.0
        
        # High uncertainty cases
        high_uncertainty_count = db.query(Analysis).filter(
            Analysis.requires_human_review == True
        ).count()
        
        # Filter out None keys from dictionaries
        prediction_distribution = {str(p[0]): p[1] for p in prediction_dist if p[0] is not None}
        risk_level_distribution = {str(r[0]): r[1] for r in risk_dist if r[0] is not None}
        
        stats = InferenceStatsResponse(
            total_inferences=total_analyses,
            prediction_distribution=prediction_distribution,
            risk_level_distribution=risk_level_distribution,
            average_confidence=float(avg_confidence),
            average_epistemic_uncertainty=float(avg_uncertainty),
            average_inference_time_ms=float(avg_inference_time),
            high_uncertainty_count=high_uncertainty_count
        )
        
        logger.info(f"Inference statistics retrieved by user={current_user.email}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to retrieve inference statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )


@router.post(
    "/gradcam",
    response_model=GradCAMResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate GradCAM explanation for mammogram"
)
@limiter.limit(get_rate_limit("inference"))
async def generate_gradcam(
    request: Request,
    file: UploadFile = File(..., description="Mammogram image file"),
    method: str = Query("gradcam++", description="Method: gradcam, gradcam++, integrated_gradients"),
    output_format: str = Query("heatmap", description="Format: heatmap, image, overlay"),
    colormap: str = Query("jet", description="Colormap: jet, viridis, hot, plasma"),
    overlay_alpha: float = Query(0.4, ge=0.0, le=1.0, description="Overlay opacity"),
    current_user: User = Depends(require_radiologist)
):
    """
    **Generate GradCAM/GradCAM++ explanation for mammogram**
    
    Provides visual explanation of model attention using gradient-based
    class activation mapping.
    
    **Methods:**
    - `gradcam`: Original GradCAM (Selvaraju et al., 2017)
    - `gradcam++`: Improved GradCAM with better localization
    - `integrated_gradients`: Attribution-based method
    
    **Output Formats:**
    - `heatmap`: Returns 2D attention array (56x56)
    - `image`: Returns base64-encoded heatmap PNG
    - `overlay`: Returns base64-encoded overlay on original image
    
    **Authentication:** Requires Radiologist, Technician, or Admin role
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/gradcam?method=gradcam++&output_format=overlay" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@mammogram.jpg"
    ```
    """
    start_time = time.time()
    
    try:
        # Read and validate file
        contents = await file.read()
        
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        # Validate image
        validate_image(image)
        
        # Preprocess with metadata
        try:
            preprocessed, image_metadata = preprocess_mammogram_with_metadata(image)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image preprocessing failed: {str(e)}"
            )
        
        # Map method string to enum
        method_map = {
            "gradcam": ExplainMethod.GRADCAM,
            "gradcam++": ExplainMethod.GRADCAM_PLUS_PLUS,
            "integrated_gradients": ExplainMethod.INTEGRATED_GRADIENTS
        }
        explain_method = method_map.get(method.lower(), ExplainMethod.GRADCAM_PLUS_PLUS)
        
        # Get model and explainability service
        inference_service = get_inference_service()
        model = inference_service.get_model()
        
        if not model.is_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not available"
            )
        
        # Get explainability service
        explain_service = get_explainability_service()
        explain_service.set_modules(model.tf, model.keras)
        
        # Prepare image for inference
        if preprocessed.ndim == 2:
            preprocessed = np.expand_dims(preprocessed, axis=-1)
        if preprocessed.shape[-1] == 1:
            preprocessed = np.repeat(preprocessed, 3, axis=-1)
        if preprocessed.ndim == 3:
            preprocessed = np.expand_dims(preprocessed, axis=0)
        
        # Generate explanation
        base_model = model.ensemble_models[0]['base']
        result = explain_service.generate_explanation(
            model=base_model,
            image=preprocessed,
            method=explain_method,
            target_class=0,
            output_size=(56, 56)
        )
        
        # Prepare response based on format
        attention_map_array = None
        attention_image_b64 = None
        
        if output_format == "heatmap":
            attention_map_array = result["attention_map"]
        elif output_format in ["image", "overlay"]:
            import cv2
            
            attention_np = np.array(result["attention_map"])
            
            if output_format == "image":
                # Generate colored heatmap
                heatmap_img = explain_service.generate_heatmap_image(
                    attention_np, colormap=colormap, size=(224, 224)
                )
            else:
                # Generate overlay
                original_np = preprocessed[0] if preprocessed.ndim == 4 else preprocessed
                heatmap_img = explain_service.overlay_heatmap(
                    original_np, attention_np, alpha=overlay_alpha, colormap=colormap
                )
            
            # Encode to base64
            success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
            if success:
                attention_image_b64 = base64.b64encode(buffer).decode('utf-8')
        
        # Convert regions to schema format
        suspicious_regions = []
        for region in result.get("suspicious_regions", []):
            suspicious_regions.append(SuspiciousRegion(
                region_id=region["region_id"],
                bbox=region["bbox"],
                attention_score=region.get("attention_score", 0.0),
                location=region.get("location", "unknown"),
                area_pixels=region.get("area_pixels")
            ))
        
        inference_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"GradCAM generated: method={method}, format={output_format}, "
            f"time={inference_time:.1f}ms, user={current_user.email}"
        )
        
        return GradCAMResponse(
            method_used=result.get("method_used", method),
            target_layer=result.get("target_layer"),
            attention_map=attention_map_array,
            attention_image=attention_image_b64,
            suspicious_regions=suspicious_regions,
            image_metadata=ImageMetadata(
                original_width=image_metadata['original_width'],
                original_height=image_metadata['original_height'],
                model_width=224,
                model_height=224,
                scale_x=image_metadata['scale_x'],
                scale_y=image_metadata['scale_y'],
                aspect_ratio=image_metadata['original_width'] / image_metadata['original_height']
            ),
            inference_time_ms=inference_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GradCAM generation failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GradCAM generation failed: {str(e)}"
        )


@router.get(
    "/gradcam/image/{analysis_id}",
    response_class=Response,
    summary="Get GradCAM heatmap image for existing analysis"
)
def get_gradcam_image(
    analysis_id: int,
    colormap: str = Query("jet", description="Colormap: jet, viridis, hot, plasma"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Get GradCAM heatmap as PNG image for existing analysis**
    
    Converts stored attention map to colored PNG image.
    
    **Returns:** PNG image (image/png content type)
    """
    try:
        # Get analysis record
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis {analysis_id} not found"
            )
        
        # Check if attention map is available
        attention_map = analysis.attention_map
        
        if not attention_map:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No attention map available for analysis {analysis_id}"
            )
        
        import cv2
        
        # Convert to numpy array
        attention_np = np.array(attention_map, dtype=np.float32)
        
        # Get explainability service for image generation
        explain_service = get_explainability_service()
        
        # Generate colored heatmap
        heatmap_img = explain_service.generate_heatmap_image(
            attention_np, colormap=colormap, size=(224, 224)
        )
        
        # Encode to PNG
        success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to encode image"
            )
        
        logger.info(f"GradCAM image retrieved for analysis_id={analysis_id}, user={current_user.email}")
        
        return Response(
            content=buffer.tobytes(),
            media_type="image/png",
            headers={"Content-Disposition": f"inline; filename=gradcam_{analysis_id}.png"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get GradCAM image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get GradCAM image: {str(e)}"
        )


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health check for inference service"
)
def health_check():
    """
    **Health check endpoint for inference service**
    
    Verifies that the inference service and models are operational.
    
    **No authentication required**
    
    **Returns:**
    - Service status
    - Model availability
    - System health indicators
    """
    try:
        inference_service = get_inference_service()
        model = inference_service.get_model()
        
        is_healthy = model.is_loaded()
        
        return {
            "status": "healthy" if is_healthy else "degraded",
            "service": "inference",
            "model_loaded": is_healthy,
            "model_version": getattr(model, 'model_version', 'unknown'),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "inference",
            "model_loaded": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# ============================================================================
# XAI Validation Endpoints
# ============================================================================

@router.post(
    "/xai/validate",
    response_model=XAIValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate XAI explanation quality"
)
def validate_xai_explanation(
    request: XAIValidationRequest = Body(...),
    current_user: User = Depends(require_radiologist)
):
    """
    **Validate explainability output quality**
    
    Performs comprehensive quality checks on attention maps including:
    - **Sparsity**: Is attention focused or diffuse?
    - **Coherence**: Are nearby pixels similarly attributed?
    - **Localization**: Does attention align with known regions? (if provided)
    - **Plausibility**: Is attention on clinically relevant areas?
    
    **Use Cases:**
    - Verify explanation quality before presenting to clinicians
    - Automated quality control in production pipelines
    - Research validation of new explainability methods
    
    **Example:**
    ```json
    {
        "attention_map": [[0.1, 0.2, ...], [0.3, 0.8, ...], ...],
        "known_regions": [{"bbox": [100, 50, 40, 40]}],
        "include_faithfulness": false
    }
    ```
    """
    try:
        validation_service = get_xai_validation_service()
        
        # Convert attention map to numpy
        attention_np = np.array(request.attention_map, dtype=np.float32)
        
        # Validate
        report = validation_service.validate_explanation(
            attention_map=attention_np,
            known_regions=request.known_regions,
            prediction_func=None,  # Skip faithfulness if not requested
            original_image=None,
            reference_explanations=None
        )
        
        # Convert to response schema
        metrics = []
        for m in report.metrics:
            metrics.append(QualityScoreResponse(
                metric=QualityMetricEnum(m.metric.value),
                score=m.score,
                status=ValidationResultEnum(m.status.value),
                details=m.details,
                threshold=m.threshold,
                passed=m.status.value == "passed"
            ))
        
        logger.info(
            f"XAI validation: score={report.overall_score:.2f}, "
            f"status={report.overall_status.value}, user={current_user.email}"
        )
        
        return XAIValidationResponse(
            overall_score=report.overall_score,
            overall_status=ValidationResultEnum(report.overall_status.value),
            metrics=metrics,
            recommendations=report.recommendations,
            warnings=report.warnings,
            passed=report.overall_status.value in ["passed", "warning"],
            timestamp=report.timestamp
        )
        
    except Exception as e:
        logger.error(f"XAI validation failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"XAI validation failed: {str(e)}"
        )


@router.post(
    "/xai/quality",
    response_model=AttentionQualityResponse,
    status_code=status.HTTP_200_OK,
    summary="Quick attention quality check"
)
def check_attention_quality(
    request: AttentionQualityRequest = Body(...),
    current_user: User = Depends(require_radiologist)
):
    """
    **Quick quality score for attention maps**
    
    Lightweight quality check suitable for real-time validation.
    Returns a single quality score and level for UI display.
    
    **Quality Levels:**
    - `excellent` (≥0.8): High-quality, reliable explanation
    - `good` (≥0.6): Good quality, usable for clinical review
    - `acceptable` (≥0.4): Borderline quality, verify findings
    - `poor` (<0.4): Low quality, results may be unreliable
    
    **Example:**
    ```json
    {
        "attention_map": [[0.1, 0.2, ...], ...],
        "include_details": true
    }
    ```
    """
    try:
        validation_service = get_xai_validation_service()
        
        attention_np = np.array(request.attention_map, dtype=np.float32)
        
        result = validation_service.compute_attention_quality_score(
            attention_map=attention_np,
            include_details=request.include_details
        )
        
        return AttentionQualityResponse(
            quality_score=result["quality_score"],
            quality_level=result["quality_level"],
            is_acceptable=result["is_acceptable"],
            details=result.get("details")
        )
        
    except Exception as e:
        logger.error(f"Quality check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quality check failed: {str(e)}"
        )


# ============================================================================
# Clinical Narrative Endpoints
# ============================================================================

@router.post(
    "/narrative/generate",
    response_model=ClinicalNarrativeResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate clinical narrative explanation"
)
def generate_clinical_narrative(
    request: ClinicalNarrativeRequest = Body(...),
    current_user: User = Depends(require_radiologist)
):
    """
    **Generate clinical narrative from AI analysis**
    
    Creates radiologist-friendly narrative following ACR BI-RADS guidelines.
    Includes suggested BI-RADS category, findings, and recommendations.
    
    **Outputs:**
    - Clinical impression summary
    - BI-RADS category suggestion (0-5)
    - Structured findings list
    - Actionable recommendations with timeframes
    - Confidence explanation
    - Standard disclaimers
    
    **BI-RADS Categories:**
    - `0`: Incomplete - needs additional imaging
    - `1`: Negative
    - `2`: Benign
    - `3`: Probably benign (2-10% malignancy)
    - `4A/4B/4C`: Suspicious (10-90% malignancy)
    - `5`: Highly suggestive of malignancy (>90%)
    
    **Example:**
    ```json
    {
        "prediction": "malignant",
        "malignancy_probability": 0.72,
        "confidence": 0.85,
        "uncertainty": 0.008,
        "suspicious_regions": [{"bbox": [100, 50, 40, 40], "attention_score": 0.9}]
    }
    ```
    """
    try:
        narrative_service = get_clinical_narrative_service()
        
        # Generate narrative
        result = narrative_service.generate_narrative(
            prediction=request.prediction,
            malignancy_probability=request.malignancy_probability,
            confidence=request.confidence,
            uncertainty=request.uncertainty,
            suspicious_regions=request.suspicious_regions,
            attention_quality=request.attention_quality,
            patient_context=request.patient_context
        )
        
        logger.info(
            f"Narrative generated: birads={result['birads_category']}, "
            f"user={current_user.email}"
        )
        
        return ClinicalNarrativeResponse(
            impression=result["impression"],
            birads_category=BIRADSCategoryEnum(result["birads_category"]),
            birads_description=result["birads_description"],
            findings=result["findings"],
            recommendations=result["recommendations"],
            technical_notes=result["technical_notes"],
            confidence_explanation=result["confidence_explanation"],
            limitations=result["limitations"],
            disclaimer=result["disclaimer"],
            generated_at=result["generated_at"]
        )
        
    except Exception as e:
        logger.error(f"Narrative generation failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Narrative generation failed: {str(e)}"
        )


@router.post(
    "/narrative/from-analysis/{analysis_id}",
    response_model=ClinicalNarrativeResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate narrative from existing analysis"
)
def generate_narrative_from_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_radiologist)
):
    """
    **Generate clinical narrative for existing analysis**
    
    Retrieves stored analysis and generates clinical narrative.
    Useful for retrospective reporting or batch narrative generation.
    """
    try:
        # Get analysis record
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis {analysis_id} not found"
            )
        
        narrative_service = get_clinical_narrative_service()
        
        # Extract suspicious regions from analysis
        suspicious_regions = []
        if hasattr(analysis, 'suspicious_regions') and analysis.suspicious_regions:
            suspicious_regions = analysis.suspicious_regions
        
        # Generate narrative
        result = narrative_service.generate_narrative(
            prediction=analysis.prediction_class,
            malignancy_probability=analysis.malignant_probability if hasattr(analysis, 'malignant_probability') else analysis.confidence_score,
            confidence=analysis.confidence_score,
            uncertainty=analysis.epistemic_uncertainty if hasattr(analysis, 'epistemic_uncertainty') else 0.0,
            suspicious_regions=suspicious_regions,
            attention_quality=None,
            patient_context=None
        )
        
        logger.info(
            f"Narrative from analysis {analysis_id}: birads={result['birads_category']}, "
            f"user={current_user.email}"
        )
        
        return ClinicalNarrativeResponse(
            impression=result["impression"],
            birads_category=BIRADSCategoryEnum(result["birads_category"]),
            birads_description=result["birads_description"],
            findings=result["findings"],
            recommendations=result["recommendations"],
            technical_notes=result["technical_notes"],
            confidence_explanation=result["confidence_explanation"],
            limitations=result["limitations"],
            disclaimer=result["disclaimer"],
            generated_at=result["generated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Narrative from analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Narrative generation failed: {str(e)}"
        )


# ============================================================================
# LIME Endpoints (Local Interpretable Model-agnostic Explanations)
# ============================================================================

@router.post(
    "/lime",
    status_code=status.HTTP_200_OK,
    summary="Generate LIME explanation for mammogram"
)
@limiter.limit(get_rate_limit("inference"))
async def generate_lime_explanation(
    request: Request,
    response: Response,
    file: UploadFile = File(..., description="Mammogram image file"),
    n_segments: int = Query(50, ge=10, le=200, description="Number of superpixels"),
    n_samples: int = Query(100, ge=50, le=500, description="Number of perturbed samples"),
    top_k_features: int = Query(10, ge=1, le=50, description="Top important regions to return"),
    output_format: str = Query("heatmap", description="Format: heatmap, image, overlay"),
    colormap: str = Query("RdBu", description="Colormap for visualization"),
    overlay_alpha: float = Query(0.5, ge=0.0, le=1.0, description="Overlay opacity"),
    current_user: User = Depends(require_radiologist)
):
    """
    **Generate LIME explanation for mammogram**
    
    LIME (Local Interpretable Model-agnostic Explanations) provides
    model-agnostic local explanations using superpixel perturbation.
    
    **Method:**
    1. Segment image into superpixels using SLIC algorithm
    2. Generate perturbed samples by hiding/showing segments
    3. Get model predictions for perturbations
    4. Fit weighted linear model to explain local decision boundary
    5. Extract most important regions
    
    **Reference:** Ribeiro et al. (2016) - "Why Should I Trust You?"
    
    **Output Formats:**
    - `heatmap`: Returns 2D importance array (56x56)
    - `image`: Returns base64-encoded heatmap PNG
    - `overlay`: Returns base64-encoded overlay on original image
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/lime?n_segments=50&output_format=overlay" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@mammogram.jpg"
    ```
    """
    start_time = time.time()
    
    try:
        # Read and validate file
        contents = await file.read()
        
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        validate_image(image)
        
        # Preprocess with metadata
        preprocessed, image_metadata = preprocess_mammogram_with_metadata(image)
        
        # Get model
        inference_service = get_inference_service()
        model = inference_service.get_model()
        
        if not model.is_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not available"
            )
        
        # Import and configure LIME service
        from app.services.lime_service import get_lime_service, LIMEConfig
        lime_service = get_lime_service()
        lime_service.set_modules(model.tf, model.keras)
        
        config = LIMEConfig(
            n_segments=n_segments,
            n_samples=n_samples,
            top_k_features=top_k_features,
            output_size=(56, 56)
        )
        
        # Prepare image for inference
        if preprocessed.ndim == 2:
            preprocessed = np.expand_dims(preprocessed, axis=-1)
        if preprocessed.shape[-1] == 1:
            preprocessed = np.repeat(preprocessed, 3, axis=-1)
        if preprocessed.ndim == 3:
            preprocessed = np.expand_dims(preprocessed, axis=0)
        
        # Generate LIME explanation
        base_model = model.ensemble_models[0]['base']
        result = lime_service.generate_lime_explanation(
            model=base_model,
            image=preprocessed,
            config=config
        )
        
        # Prepare response based on format
        lime_image_b64 = None
        
        if output_format in ["image", "overlay"]:
            import cv2
            
            lime_np = np.array(result["lime_map"])
            
            if output_format == "image":
                # Generate colored heatmap
                explain_service = get_explainability_service()
                heatmap_img = explain_service.generate_heatmap_image(
                    lime_np, colormap=colormap, size=(224, 224)
                )
            else:
                # Generate overlay
                original_np = preprocessed[0] if preprocessed.ndim == 4 else preprocessed
                heatmap_img = lime_service.generate_colored_lime_overlay(
                    original_np, lime_np, alpha=overlay_alpha
                )
            
            # Encode to base64
            success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
            if success:
                lime_image_b64 = base64.b64encode(buffer).decode('utf-8')
        
        inference_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"LIME generated: segments={n_segments}, samples={n_samples}, "
            f"time={inference_time:.1f}ms, user={current_user.email}"
        )
        
        return {
            "lime_map": result["lime_map"],
            "lime_image": lime_image_b64,
            "top_regions": result.get("top_regions", []),
            "segment_importance": result.get("segment_importance", {}),
            "n_segments": result.get("n_segments", n_segments),
            "n_samples": result.get("n_samples", n_samples),
            "method_used": result.get("method_used", "lime"),
            "inference_time_ms": inference_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LIME generation failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LIME generation failed: {str(e)}"
        )


# ============================================================================
# SHAP Endpoints (SHapley Additive exPlanations)
# ============================================================================

@router.post(
    "/shap",
    status_code=status.HTTP_200_OK,
    summary="Generate SHAP explanation for mammogram"
)
@limiter.limit(get_rate_limit("inference"))
async def generate_shap_explanation(
    request: Request,
    response: Response,
    file: UploadFile = File(..., description="Mammogram image file"),
    method: str = Query("gradient", description="SHAP method: deep, gradient, partition"),
    n_samples: int = Query(50, ge=20, le=200, description="Number of samples for GradientSHAP"),
    n_background: int = Query(50, ge=10, le=100, description="Number of background samples"),
    output_format: str = Query("heatmap", description="Format: heatmap, image, overlay"),
    colormap: str = Query("RdBu_r", description="Diverging colormap for visualization"),
    overlay_alpha: float = Query(0.5, ge=0.0, le=1.0, description="Overlay opacity"),
    current_user: User = Depends(require_radiologist)
):
    """
    **Generate SHAP explanation for mammogram**
    
    SHAP (SHapley Additive exPlanations) provides game-theoretic feature
    attribution with Shapley values. Offers both local and global interpretability.
    
    **SHAP Methods:**
    - `gradient`: GradientSHAP - combines integrated gradients with sampling (recommended)
    - `deep`: DeepSHAP - uses DeepLIFT rules for fast approximation
    - `partition`: PartitionSHAP - hierarchical image explanation using superpixels
    
    **Key Properties:**
    - **Local accuracy**: Sum of attributions equals prediction difference
    - **Missingness**: Missing features contribute 0
    - **Consistency**: Higher impact features get higher attribution
    
    **Reference:** Lundberg & Lee (2017) - "A Unified Approach to Interpreting Model Predictions"
    
    **Output:**
    - Positive SHAP values (red): Support malignancy prediction
    - Negative SHAP values (blue): Support benign prediction
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/shap?method=gradient&output_format=overlay" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@mammogram.jpg"
    ```
    """
    start_time = time.time()
    
    try:
        # Read and validate file
        contents = await file.read()
        
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        validate_image(image)
        
        # Preprocess with metadata
        preprocessed, image_metadata = preprocess_mammogram_with_metadata(image)
        
        # Get model
        inference_service = get_inference_service()
        model = inference_service.get_model()
        
        if not model.is_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not available"
            )
        
        # Import and configure SHAP service
        from app.services.shap_service import get_shap_service, SHAPConfig, SHAPMethod
        shap_service = get_shap_service()
        shap_service.set_modules(model.tf, model.keras)
        
        # Map method string to enum
        method_map = {
            "deep": SHAPMethod.DEEP,
            "gradient": SHAPMethod.GRADIENT,
            "partition": SHAPMethod.PARTITION,
            "kernel": SHAPMethod.KERNEL
        }
        shap_method = method_map.get(method.lower(), SHAPMethod.GRADIENT)
        
        config = SHAPConfig(
            method=shap_method,
            n_samples=n_samples,
            n_background_samples=n_background,
            output_size=(56, 56)
        )
        
        # Prepare image for inference
        if preprocessed.ndim == 2:
            preprocessed = np.expand_dims(preprocessed, axis=-1)
        if preprocessed.shape[-1] == 1:
            preprocessed = np.repeat(preprocessed, 3, axis=-1)
        if preprocessed.ndim == 3:
            preprocessed = np.expand_dims(preprocessed, axis=0)
        
        # Generate SHAP explanation
        base_model = model.ensemble_models[0]['base']
        result = shap_service.generate_shap_explanation(
            model=base_model,
            image=preprocessed,
            config=config
        )
        
        # Prepare response based on format
        shap_image_b64 = None
        
        if output_format in ["image", "overlay"]:
            import cv2
            
            shap_np = np.array(result["shap_map"])
            
            if output_format == "image":
                # Generate diverging colormap
                explain_service = get_explainability_service()
                heatmap_img = explain_service.generate_heatmap_image(
                    shap_np, colormap=colormap, size=(224, 224)
                )
            else:
                # Generate overlay
                original_np = preprocessed[0] if preprocessed.ndim == 4 else preprocessed
                heatmap_img = shap_service.generate_colored_shap_overlay(
                    original_np, shap_np, alpha=overlay_alpha
                )
            
            # Encode to base64
            success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
            if success:
                shap_image_b64 = base64.b64encode(buffer).decode('utf-8')
        
        inference_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"SHAP generated: method={method}, samples={n_samples}, "
            f"time={inference_time:.1f}ms, user={current_user.email}"
        )
        
        return {
            "shap_map": result["shap_map"],
            "shap_image": shap_image_b64,
            "base_value": result.get("base_value", 0.5),
            "prediction_contribution": result.get("prediction_contribution", 0.0),
            "feature_importance": result.get("feature_importance", {}),
            "positive_regions": result.get("positive_regions", []),
            "negative_regions": result.get("negative_regions", []),
            "method_used": result.get("method_used", f"shap_{method}"),
            "n_samples": n_samples,
            "n_background": n_background,
            "inference_time_ms": inference_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SHAP generation failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SHAP generation failed: {str(e)}"
        )


# ============================================================================
# XAI Comparison Endpoint (Compare GradCAM, LIME, SHAP)
# ============================================================================

@router.post(
    "/xai/compare",
    status_code=status.HTTP_200_OK,
    summary="Compare multiple XAI methods on same image"
)
@limiter.limit(get_rate_limit("inference"))
async def compare_xai_methods(
    request: Request,
    response: Response,
    file: UploadFile = File(..., description="Mammogram image file"),
    methods: str = Query(
        "gradcam++,lime,shap",
        description="Comma-separated methods: gradcam, gradcam++, integrated_gradients, lime, shap"
    ),
    include_overlay: bool = Query(True, description="Include overlaid visualizations"),
    colormap: str = Query("jet", description="Colormap for visualizations"),
    current_user: User = Depends(require_radiologist)
):
    """
    **Compare multiple XAI methods on the same mammogram**
    
    Generates explanations using multiple methods for comparison and
    consensus analysis. Useful for validating findings across different
    explanation paradigms.
    
    **Supported Methods:**
    - `gradcam`: Original GradCAM (gradient-based)
    - `gradcam++`: Improved GradCAM with better localization
    - `integrated_gradients`: Attribution-based method
    - `lime`: Model-agnostic superpixel explanation
    - `shap`: Game-theoretic feature attribution
    
    **Returns:**
    - Individual explanations from each method
    - Agreement score between methods
    - Consensus regions (identified by multiple methods)
    - Natural language comparison summary
    
    **Use Cases:**
    - Cross-validate AI explanations
    - Identify robust findings (consensus)
    - Research comparison of XAI methods
    
    **Example:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/inference/xai/compare?methods=gradcam++,lime,shap" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -F "file=@mammogram.jpg"
    ```
    """
    start_time = time.time()
    
    try:
        # Parse methods
        method_list = [m.strip().lower() for m in methods.split(',')]
        valid_methods = ['gradcam', 'gradcam++', 'integrated_gradients', 'lime', 'shap']
        
        for m in method_list:
            if m not in valid_methods:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid method '{m}'. Valid: {valid_methods}"
                )
        
        # Read and validate file
        contents = await file.read()
        
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}"
            )
        
        validate_image(image)
        
        # Preprocess with metadata
        preprocessed, image_metadata = preprocess_mammogram_with_metadata(image)
        
        # Get model
        inference_service = get_inference_service()
        model = inference_service.get_model()
        
        if not model.is_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not available"
            )
        
        # Prepare image
        if preprocessed.ndim == 2:
            preprocessed = np.expand_dims(preprocessed, axis=-1)
        if preprocessed.shape[-1] == 1:
            preprocessed = np.repeat(preprocessed, 3, axis=-1)
        if preprocessed.ndim == 3:
            preprocessed = np.expand_dims(preprocessed, axis=0)
        
        base_model = model.ensemble_models[0]['base']
        
        # Generate explanations for each method
        results = {}
        all_heatmaps = []
        
        # GradCAM family methods
        gradcam_methods = {'gradcam', 'gradcam++', 'integrated_gradients'}
        if any(m in gradcam_methods for m in method_list):
            explain_service = get_explainability_service()
            explain_service.set_modules(model.tf, model.keras)
            
            for method in method_list:
                if method in gradcam_methods:
                    method_start = time.time()
                    
                    method_enum = {
                        'gradcam': ExplainMethod.GRADCAM,
                        'gradcam++': ExplainMethod.GRADCAM_PLUS_PLUS,
                        'integrated_gradients': ExplainMethod.INTEGRATED_GRADIENTS
                    }[method]
                    
                    result = explain_service.generate_explanation(
                        model=base_model,
                        image=preprocessed,
                        method=method_enum,
                        output_size=(56, 56)
                    )
                    
                    method_time = (time.time() - method_start) * 1000
                    
                    attention_image_b64 = None
                    if include_overlay:
                        import cv2
                        attention_np = np.array(result["attention_map"])
                        heatmap_img = explain_service.generate_heatmap_image(
                            attention_np, colormap=colormap, size=(224, 224)
                        )
                        success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
                        if success:
                            attention_image_b64 = base64.b64encode(buffer).decode('utf-8')
                    
                    results[method] = {
                        "method": method,
                        "attention_map": result["attention_map"],
                        "attention_image": attention_image_b64,
                        "top_regions": result.get("suspicious_regions", []),
                        "inference_time_ms": method_time,
                        "method_specific": {
                            "target_layer": result.get("target_layer")
                        }
                    }
                    all_heatmaps.append(np.array(result["attention_map"]))
        
        # LIME
        if 'lime' in method_list:
            from app.services.lime_service import get_lime_service, LIMEConfig
            lime_service = get_lime_service()
            lime_service.set_modules(model.tf, model.keras)
            
            method_start = time.time()
            config = LIMEConfig(n_segments=50, n_samples=100, output_size=(56, 56))
            result = lime_service.generate_lime_explanation(
                model=base_model,
                image=preprocessed,
                config=config
            )
            method_time = (time.time() - method_start) * 1000
            
            lime_image_b64 = None
            if include_overlay:
                import cv2
                lime_np = np.array(result["lime_map"])
                explain_service = get_explainability_service()
                heatmap_img = explain_service.generate_heatmap_image(
                    lime_np, colormap=colormap, size=(224, 224)
                )
                success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
                if success:
                    lime_image_b64 = base64.b64encode(buffer).decode('utf-8')
            
            results['lime'] = {
                "method": "lime",
                "attention_map": result["lime_map"],
                "attention_image": lime_image_b64,
                "top_regions": result.get("top_regions", []),
                "inference_time_ms": method_time,
                "method_specific": {
                    "n_segments": result.get("n_segments"),
                    "n_samples": result.get("n_samples")
                }
            }
            all_heatmaps.append(np.array(result["lime_map"]))
        
        # SHAP
        if 'shap' in method_list:
            from app.services.shap_service import get_shap_service, SHAPConfig
            shap_service = get_shap_service()
            shap_service.set_modules(model.tf, model.keras)
            
            method_start = time.time()
            config = SHAPConfig(n_samples=50, output_size=(56, 56))
            result = shap_service.generate_shap_explanation(
                model=base_model,
                image=preprocessed,
                config=config
            )
            method_time = (time.time() - method_start) * 1000
            
            shap_image_b64 = None
            if include_overlay:
                import cv2
                shap_np = np.array(result["shap_map"])
                explain_service = get_explainability_service()
                heatmap_img = explain_service.generate_heatmap_image(
                    shap_np, colormap=colormap, size=(224, 224)
                )
                success, buffer = cv2.imencode('.png', cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))
                if success:
                    shap_image_b64 = base64.b64encode(buffer).decode('utf-8')
            
            results['shap'] = {
                "method": "shap",
                "attention_map": result["shap_map"],
                "attention_image": shap_image_b64,
                "top_regions": result.get("positive_regions", []),
                "inference_time_ms": method_time,
                "method_specific": {
                    "base_value": result.get("base_value"),
                    "feature_importance": result.get("feature_importance")
                }
            }
            all_heatmaps.append(np.array(result["shap_map"]))
        
        # Calculate agreement score between methods
        agreement_score = 0.0
        consensus_regions = []
        
        if len(all_heatmaps) >= 2:
            # Normalize all heatmaps to same scale
            normalized_maps = []
            for hm in all_heatmaps:
                hm_min, hm_max = hm.min(), hm.max()
                if hm_max > hm_min:
                    normalized_maps.append((hm - hm_min) / (hm_max - hm_min))
                else:
                    normalized_maps.append(hm)
            
            # Calculate pairwise correlations
            correlations = []
            for i in range(len(normalized_maps)):
                for j in range(i + 1, len(normalized_maps)):
                    corr = np.corrcoef(normalized_maps[i].flatten(), normalized_maps[j].flatten())[0, 1]
                    if not np.isnan(corr):
                        correlations.append(corr)
            
            if correlations:
                agreement_score = float(np.mean(correlations))
            
            # Find consensus high-attention regions
            stacked = np.stack(normalized_maps, axis=0)
            consensus_map = np.mean(stacked, axis=0)
            
            # Threshold at 75th percentile
            threshold = np.percentile(consensus_map, 75)
            consensus_mask = consensus_map > threshold
            
            if consensus_mask.any():
                import cv2
                num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
                    consensus_mask.astype(np.uint8), connectivity=8
                )
                
                h, w = consensus_map.shape
                scale = 224.0 / max(h, w)
                
                for i in range(1, min(num_labels, 4)):  # Top 3 consensus regions
                    area = stats[i, cv2.CC_STAT_AREA]
                    if area < 3:
                        continue
                    
                    x = stats[i, cv2.CC_STAT_LEFT]
                    y = stats[i, cv2.CC_STAT_TOP]
                    rw = stats[i, cv2.CC_STAT_WIDTH]
                    rh = stats[i, cv2.CC_STAT_HEIGHT]
                    cx, cy = centroids[i]
                    
                    region_mask = labels == i
                    mean_attention = float(consensus_map[region_mask].mean())
                    
                    consensus_regions.append({
                        "region_id": len(consensus_regions) + 1,
                        "bbox": [int(x * scale), int(y * scale), int(rw * scale), int(rh * scale)],
                        "centroid": [int(cx * scale), int(cy * scale)],
                        "consensus_score": mean_attention,
                        "methods_agreeing": len(all_heatmaps)
                    })
        
        total_time = (time.time() - start_time) * 1000
        
        # Generate summary
        summary_parts = [
            f"Compared {len(method_list)} XAI methods: {', '.join(method_list)}."
        ]
        
        if agreement_score > 0.7:
            summary_parts.append(f"High agreement (r={agreement_score:.2f}) between methods suggests robust findings.")
        elif agreement_score > 0.4:
            summary_parts.append(f"Moderate agreement (r={agreement_score:.2f}) between methods.")
        else:
            summary_parts.append(f"Low agreement (r={agreement_score:.2f}) - methods highlight different regions.")
        
        if consensus_regions:
            summary_parts.append(f"Found {len(consensus_regions)} consensus region(s) identified by all methods.")
        
        logger.info(
            f"XAI comparison: methods={methods}, agreement={agreement_score:.2f}, "
            f"time={total_time:.1f}ms, user={current_user.email}"
        )
        
        return {
            "methods_compared": method_list,
            "results": results,
            "agreement_score": agreement_score,
            "consensus_regions": consensus_regions,
            "total_inference_time_ms": total_time,
            "summary": " ".join(summary_parts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"XAI comparison failed: {str(e)}")
        import traceback
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"XAI comparison failed: {str(e)}"
        )