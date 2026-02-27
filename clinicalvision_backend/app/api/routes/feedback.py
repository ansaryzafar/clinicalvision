"""
Feedback collection endpoints
Enables radiologists to provide feedback on AI predictions
Critical for continuous model improvement and monitoring
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
import uuid

from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.core.logging import logger
from app.core.dependencies import get_current_active_user
from app.db.models.user import User

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback: FeedbackCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Submit radiologist feedback on AI prediction
    
    **Purpose:**
    - Validate AI predictions against ground truth
    - Identify model weaknesses and edge cases
    - Build dataset for model retraining
    - Track radiologist-AI agreement metrics
    
    **Workflow:**
    1. Radiologist reviews AI prediction
    2. Provides final diagnosis and agreement level
    3. Optionally adds clinical notes
    4. System stores feedback for analysis
    
    **Returns:**
    - Confirmation with feedback ID
    - Timestamp of submission
    
    **Example Request:**
    ```json
    {
        "case_id": "case_20260105_001",
        "radiologist_id": "RAD_12345",
        "ai_prediction": "malignant",
        "radiologist_diagnosis": "benign",
        "agreement_score": "disagree",
        "feedback_notes": "Lesion appears to be fibroadenoma",
        "time_to_review_seconds": 180
    }
    ```
    """
    
    try:
        feedback_id = f"fb_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
        
        logger.info(
            f"Feedback received - Case: {feedback.case_id}, "
            f"AI: {feedback.ai_prediction}, "
            f"Radiologist: {feedback.radiologist_diagnosis}, "
            f"Agreement: {feedback.agreement_score}"
        )
        
        # TODO: Store feedback in database
        # This will be implemented when database layer is added
        # For now, just log the feedback
        
        # Calculate agreement for metrics
        ai_pred = feedback.ai_prediction.lower()
        # Handle both enum and string types for radiologist_diagnosis
        rad_diag = feedback.radiologist_diagnosis.value if hasattr(feedback.radiologist_diagnosis, 'value') else str(feedback.radiologist_diagnosis).lower()
        
        if ai_pred == rad_diag.lower():
            logger.info(f"✓ Agreement - Feedback {feedback_id}")
        else:
            logger.warning(f"✗ Disagreement - Feedback {feedback_id}")
        
        # Log review time for efficiency metrics
        if feedback.time_to_review_seconds:
            logger.info(f"Review time: {feedback.time_to_review_seconds}s")
        
        response = FeedbackResponse(
            feedback_id=feedback_id,
            case_id=feedback.case_id,
            status="recorded",
            timestamp=datetime.utcnow(),
            message="Thank you for your feedback. It will help improve our AI model."
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to record feedback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record feedback"
        )


@router.get("/metrics")
async def get_feedback_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get aggregate feedback metrics for model monitoring
    
    **Metrics Include:**
    - Agreement rate (AI vs Radiologist)
    - Confusion matrix breakdown
    - Average review time
    - Common disagreement patterns
    
    TODO: Implement database aggregation when persistence layer is added
    """
    
    # Placeholder for future implementation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Feedback metrics not yet implemented"
    )


@router.get("/{case_id}")
async def get_case_feedback(
    case_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all feedback for a specific case
    Useful for reviewing controversial cases
    
    TODO: Implement database lookup when persistence layer is added
    """
    
    # Placeholder for future implementation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Case feedback retrieval not yet implemented"
    )
