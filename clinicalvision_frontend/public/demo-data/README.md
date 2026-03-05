# ClinicalVision AI — Demo Data Package

## What's Included

3 curated mammogram cases (10 images total) sourced from the **CBIS-DDSM**
dataset (The Cancer Imaging Archive) for testing the complete ClinicalVision
clinical workflow.

These are **real de-identified mammogram images**, not synthetic data.

## How to Use

### Quick Start (Recommended)
1. Log in to ClinicalVision
2. On the workflow page, click **"Load Demo Case"**
3. Select a case — patient info and images load automatically
4. Proceed through the 10-step clinical workflow

### Manual Upload
1. Download this package
2. Start a new case in the workflow
3. Enter patient info from `case-info.json`
4. Upload PNG images from the case folder

## Cases

| Case | ID | Difficulty | Views | Source Patient | Expected BI-RADS |
|------|-----|-----------|-------|---------------|-----------------|
| Normal Screening | DEMO-001 | Easy | 4 | P_00021 (BENIGN) | 1-2 |
| Suspicious Mass | DEMO-002 | Intermediate | 4 | P_00092 (MALIGNANT) | 4-5 |
| Calcification | DEMO-003 | Advanced | 2 | P_00012 (MALIGNANT) | 4B-4C |

## AI Features to Test

- **MC Dropout** uncertainty quantification (30 forward passes)
- **GradCAM++** attention heatmaps
- **BI-RADS** assessment suggestions
- **Suspicious region** detection with bounding boxes

## Attribution

Images sourced from the CBIS-DDSM dataset:

> Lee RS, Gimenez F, Hoogi A, Miyake KK, Goben M, Rubin DL.
> "A curated mammography data set for use in computer-aided detection
> and diagnosis research." Scientific Data, 4:170177, 2017.
> DOI: 10.1038/sdata.2017.177

Original data from The Cancer Imaging Archive (TCIA).
Licensed under TCIA Data Usage Policy — free for research and education.
