# ClinicalVision AI - Model Training Notebooks

This directory contains the complete set of Jupyter notebooks documenting the iterative model development process for ClinicalVision AI's breast cancer classification system. The notebooks span 20 training experiments across four architecture families, trained on the CBIS-DDSM dataset.

## Directory Structure

```
notebooks/
├── 00_eda/                     # Exploratory Data Analysis
│   └── CBIS_DDSM_EDA.ipynb
├── 01_single_model/            # Single-model pipeline iterations (V1–V12)
│   ├── CBIS_DDSM_Pipeline_V1_Baseline.ipynb
│   ├── CBIS_DDSM_Pipeline_V4_FocalLoss.ipynb
│   ├── CBIS_DDSM_Pipeline_V5_Cached.ipynb
│   ├── CBIS_DDSM_Pipeline_V6_Improved.ipynb
│   ├── CBIS_DDSM_Pipeline_V7_Aggressive.ipynb
│   ├── CBIS_DDSM_Pipeline_V8_Ensemble.ipynb
│   ├── CBIS_DDSM_Pipeline_V9_Optimal.ipynb
│   ├── CBIS_DDSM_Pipeline_V10_Regression.ipynb
│   ├── CBIS_DDSM_Pipeline_V11_StableGrowth.ipynb
│   └── CBIS_DDSM_Pipeline_V12_ROI.ipynb
├── 02_ensemble/                # Multi-architecture ensemble experiments
│   ├── CBIS_DDSM_DenseNet121_V2.ipynb
│   ├── CBIS_DDSM_DenseNet121_V3.ipynb
│   ├── CBIS_DDSM_DenseNet121_V4.ipynb
│   ├── CBIS_DDSM_DenseNet169_V1.ipynb
│   ├── CBIS_DDSM_EfficientNetB4_V1.ipynb
│   └── CBIS_DDSM_EfficientNetB4_V2.ipynb
├── 03_uncertainty/             # MC Dropout uncertainty quantification
│   └── CBIS_DDSM_MC_Dropout_Production.ipynb
└── 04_production/              # Final production model pipeline
    └── CBIS_DDSM_V12_Production.ipynb
```

## Training Journey Summary

### Single-Model Pipeline (01_single_model/)

| Version | Description | AUC | Key Change |
|---------|------------|-----|------------|
| V1 | ResNet-18 baseline | 0.500 | Initial pipeline with SGD, cross-entropy loss |
| V4 | DenseNet-121 + focal loss | 0.707 | Switched to DenseNet-121, introduced focal loss (alpha=0.75, gamma=2.0) |
| V5 | Preprocessing cache | 0.710 | Added DICOM preprocessing cache for faster iteration |
| V6 | Improved augmentation | 0.723 | Refined augmentation pipeline, learning rate tuning |
| V7 | Aggressive regularization | 0.732 | Stronger weight decay, gradient clipping |
| V8 | Ensemble strategy | 0.735 | Introduced multi-seed ensemble averaging |
| V9 | Optimal hyperparameters | 0.738 | Peak single-model performance with cosine annealing |
| V10 | Regression (instructive failure) | 0.640 | Overly aggressive augmentation caused artefact learning |
| V11 | Stable recovery | 0.720 | Conservative rollback with lessons from V10 |
| V12 | ROI-cropped images | 0.769 | Switched to ROI crops, removing full-mammogram noise |

### Ensemble Experiments (02_ensemble/)

| Architecture | Ensemble AUC | Notes |
|-------------|-------------|-------|
| DenseNet-121 V2 | 0.757 | Three-model ensemble, variance reduction confirmed |
| DenseNet-121 V3 | 0.762 | Stage-optimized progressive fine-tuning |
| DenseNet-121 V4 | 0.769 | Disabled mixed-precision, tighter gradient clipping |
| DenseNet-169 V1 | 0.737 | Deeper architecture, imbalanced sensitivity/specificity |
| EfficientNet-B4 V1 | 0.770 | 380x380 resolution, balanced metrics |
| EfficientNet-B4 V2 | 0.765 | Optimized training schedule |

### Production Model (04_production/)

The final production model (DenseNet-121 ROI ensemble) achieves:
- **AUC: 0.798**
- Sensitivity: 0.676, Specificity: 0.728
- 3-model ensemble with mean probability aggregation
- MC Dropout uncertainty quantification (30 stochastic forward passes)

## Dataset

All experiments use the **CBIS-DDSM** (Curated Breast Imaging Subset of the Digital Database for Screening Mammography) dataset:
- Training: 2,347 images
- Validation: 504 images
- Test: 701 images

## Execution Environment

Notebooks were executed on Google Colab with T4 GPU. Checkpoints were saved to Google Drive for persistence across sessions.

## Notes

- Cell outputs have been stripped to reduce repository size.
