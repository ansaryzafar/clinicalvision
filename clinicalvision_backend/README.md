# ClinicalVision AI Backend

Production-grade FastAPI backend for breast cancer detection system using deep learning and explainable AI.

## Features

- **AI Model Inference** - ResNet50/EfficientNet with transfer learning
- **Uncertainty Quantification** - MC Dropout for epistemic uncertainty
- **Explainable AI** - GradCAM attention maps and clinical narratives
- **Radiologist Feedback** - Continuous learning from expert validation
- **Production Ready** - Docker, monitoring, comprehensive logging
- **Development Mode** - Mock model for frontend development

## Quick Start

### 1. Local Development (Mock Model)

```bash
# Clone and navigate
cd clinicalvision_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run server
python main.py
# Or: uvicorn main:app --reload
```

Server runs at http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

Includes:
- FastAPI app (port 8000)
- PostgreSQL database (port 5432)
- pgAdmin (port 5050)

### 3. Using Real Model

```bash
# Place trained model in models/ directory
mkdir -p models
cp /path/to/best_model.pth models/

# Update .env
USE_MOCK_MODEL=false
MODEL_PATH=models/best_model.pth

# Restart server
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health/
```

### Analyze Mammogram
```bash
curl -X POST "http://localhost:8000/analyze/" \
     -F "file=@mammogram.jpg"
```

**Response:**
```json
{
  "metadata": {
    "case_id": "case_20260105_001",
    "model_version": "resnet50-v1.0",
    "inference_time_ms": 1250.5
  },
  "prediction": {
    "prediction": "malignant",
    "confidence": 0.85,
    "probabilities": {
      "benign": 0.15,
      "malignant": 0.85
    },
    "risk_level": "high"
  },
  "uncertainty": {
    "epistemic_uncertainty": 0.12,
    "predictive_entropy": 0.45,
    "requires_human_review": false
  },
  "explanation": {
    "attention_map": [[...], [...]],
    "suspicious_regions": [...],
    "clinical_narrative": "...",
    "recommendation": "..."
  }
}
```

### Submit Feedback
```bash
curl -X POST "http://localhost:8000/feedback/" \
     -H "Content-Type: application/json" \
     -d '{
       "case_id": "case_20260105_001",
       "ai_prediction": "malignant",
       "radiologist_diagnosis": "benign",
       "agreement_score": "disagree",
       "feedback_notes": "False positive"
     }'
```

## Architecture

```
clinicalvision_backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container definition
├── docker-compose.yml     # Multi-service orchestration
├── .env.example           # Configuration template
├── app/
│   ├── __init__.py
│   ├── core/              # Configuration and utilities
│   │   ├── config.py      # Settings management
│   │   └── logging.py     # Logging configuration
│   ├── api/
│   │   └── routes/        # API endpoints
│   │       ├── health.py  # Health checks
│   │       ├── analysis.py # Inference endpoints
│   │       └── feedback.py # Feedback collection
│   ├── models/
│   │   └── inference.py   # Model wrappers (mock & real)
│   ├── schemas/           # Pydantic models
│   │   ├── analysis.py    # Analysis request/response
│   │   ├── feedback.py    # Feedback schemas
│   │   └── health.py      # Health check schemas
│   └── utils/
│       └── preprocessing.py # Image preprocessing
└── tests/                 # Unit and integration tests
```

## Configuration

Edit `.env` file:

```bash
# Application
APP_NAME=ClinicalVision AI
DEBUG=false
ENVIRONMENT=production

# Model
USE_MOCK_MODEL=false
MODEL_PATH=models/best_model.pth

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Security
SECRET_KEY=your-secret-key-here

# Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
```

## Development Workflow

### Mock Model Development
1. Backend development proceeds independently of model training
2. Mock model returns realistic predictions for frontend integration
3. All API contracts and schemas validated

### Real Model Integration
1. Train model on Google Colab
2. Download best checkpoint (`best_model.pth`)
3. Place in `models/` directory
4. Update `.env`: `USE_MOCK_MODEL=false`
5. Implement `RealModelInference` in `app/models/inference.py`
6. Restart server - seamless transition

### Testing
```bash
# Run tests (TODO: Add test suite)
pytest tests/

# Code quality
black app/
flake8 app/
mypy app/
```

## Production Deployment

### Google Cloud Platform (Recommended)

```bash
# Build container
docker build -t gcr.io/PROJECT_ID/clinicalvision-api .

# Push to GCR
docker push gcr.io/PROJECT_ID/clinicalvision-api

# Deploy to Cloud Run
gcloud run deploy clinicalvision-api \
  --image gcr.io/PROJECT_ID/clinicalvision-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Environment Variables
Set in Cloud Run / K8s:
- `USE_MOCK_MODEL=false`
- `MODEL_PATH=/models/best_model.pth`
- `DATABASE_URL` (Cloud SQL)
- `SECRET_KEY` (from Secret Manager)

## Monitoring

### Health Endpoints
- `/health/` - Overall system health
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

### Logs
- Application logs: `logs/app.log`
- Access logs: stdout
- Error tracking: stderr

## Integration with Frontend

### CORS Configuration
Update `app/core/config.py`:
```python
BACKEND_CORS_ORIGINS = [
    "http://localhost:3000",  # React dev
    "https://your-frontend.com"  # Production
]
```

### Frontend Example (React)
```javascript
const analyzeImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8000/analyze/', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result;
};
```

## Next Steps

1. Backend API complete with mock model
2. Model training on Google Colab (in progress)
3. React frontend development (Week 11)
4. Integration testing with real model
5. Production deployment to GCP

## Support

For issues or questions:
- Review API docs: http://localhost:8000/docs
- Check logs: `logs/app.log`
- Validate configuration: `.env` file

## License

Proprietary - Clinical AI Project
