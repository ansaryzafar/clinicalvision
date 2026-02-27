# ClinicalVision ML Models Directory

## Overview
This directory contains ML model artifacts for the ClinicalVision inference pipeline.

**⚠️ This directory is gitignored - models are stored in cloud storage for production.**

## Directory Structure

```
ml_models/
├── v12_production/           # Current production model
│   ├── ensemble/
│   │   ├── model_0_stage3_best.h5
│   │   ├── model_1_stage3_best.h5
│   │   └── model_2_stage3_best.h5
│   ├── calibration/
│   │   └── calibrator.pkl
│   └── config.json
├── cache/                    # Preprocessed data cache (optional)
└── model_registry.json       # Active model version pointer
```

## Model Versioning

| Version | AUC | Description | Status |
|---------|-----|-------------|--------|
| v12_production | TBD | DenseNet-121 ROI ensemble | **Active** |

## Deployment Workflow

### Development (Local)
```bash
# Download models from Google Drive/S3
python scripts/download_models.py --version v12_production

# Or sync manually
rclone sync gdrive:CBIS-DDSM-data/checkpoints_roi ./ml_models/v12_production/ensemble/
```

### Production (Docker/K8s)
Models are downloaded at container startup from cloud storage:
- S3: `s3://clinicalvision-models/v12_production/`
- Or mounted as a volume from persistent storage

## Environment Variables

```bash
# Model configuration
CLINICALVISION_MODEL_VERSION=v12_production
CLINICALVISION_MODEL_PATH=/app/ml_models
CLINICALVISION_MODEL_STORAGE=s3  # or 'local', 'gcs'

# Cloud storage (production)
AWS_S3_BUCKET=clinicalvision-models
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# For development with Google Drive
GDRIVE_FOLDER_ID=your_folder_id
```

## Adding New Model Versions

1. Train model using `CBIS_DDSM_Classification_V12_Production.ipynb`
2. Run MC Dropout evaluation using `CBIS_DDSM_MC_Dropout_Production.ipynb`
3. Export calibrator and config
4. Upload to cloud storage with new version tag
5. Update `model_registry.json` with new version
6. Deploy with `CLINICALVISION_MODEL_VERSION=v13_xxx`
