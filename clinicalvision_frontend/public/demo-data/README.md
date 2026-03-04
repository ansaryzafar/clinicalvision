# ClinicalVision AI — Demo Data Package

## What's Included

3 curated mammogram cases (12 images total) for testing the complete
ClinicalVision clinical workflow, including AI analysis with:

- **MC Dropout** uncertainty quantification
- **GradCAM++** attention heatmaps
- **BI-RADS** assessment suggestions
- **Suspicious region** detection

## Cases

| Case | ID | Difficulty | Views | Expected Outcome |
|------|-----|-----------|-------|-----------------|
| Normal Screening | DEMO-001 | Easy | 4 | BI-RADS 1-2 (Benign) |
| Suspicious Mass | DEMO-002 | Intermediate | 6 | BI-RADS 4-5 (Suspicious) |
| Calcification Follow-up | DEMO-003 | Advanced | 2 | BI-RADS 4B-4C (Calcification) |

## Quick Start

### Step 1: Create an Account
Navigate to your ClinicalVision instance and register.

### Step 2: Start New Analysis
Click **"New Analysis"** from the dashboard, or use the
**"Load Demo Case"** button for one-click setup.

### Step 3: Enter Patient Information
Each case folder contains a `case-info.json` with patient demographics:

**Case 1 — Jane A. Thompson**
- MRN: DEMO-001
- DOB: 1968-03-15
- Indication: Routine annual screening

**Case 2 — Maria R. Chen**
- MRN: DEMO-002
- DOB: 1975-09-22
- Indication: Palpable mass, right breast

**Case 3 — Sarah L. Williams**
- MRN: DEMO-003
- DOB: 1982-11-08
- Indication: Calcifications on prior screening

### Step 4: Upload Images
Drag and drop the PNG files from the case folder.
View types and laterality are auto-detected from filenames.

### Step 5: Run AI Analysis
Click **"Analyze"** — the AI model processes each image with:
- 3-model DenseNet-121 ensemble
- 10 MC Dropout forward passes per model (30 total)
- GradCAM++ attention mapping
- Suspicious region detection

### Step 6: Review Results
- View prediction confidence and uncertainty
- Examine GradCAM++ heatmap overlays
- Review detected suspicious regions
- Open the full Analysis Suite for detailed XAI visualization

### Step 7: Complete Workflow
Assign BI-RADS, generate report, finalize, and sign.

## Test Scenarios

| Scenario | Case | What to Test |
|----------|------|-------------|
| Happy path (4-view standard) | Case 1 | Full workflow with normal result |
| Diagnostic workup with additional views | Case 2 | SPOT + MAG views, higher BI-RADS |
| Partial views (incomplete set) | Case 3 | Missing-view warning, targeted study |
| Batch analysis performance | All | Process multiple images, check timing |
| GradCAM++ heatmap quality | Case 2 | Attention should highlight mass region |
| MC Dropout uncertainty | Case 3 | High uncertainty expected for calcifications |

## Attribution

These are synthetic demo images generated for ClinicalVision workflow testing.
Image synthesis inspired by mammographic appearance characteristics.
For research with real clinical data, refer to the CBIS-DDSM dataset:

> Lee RS, Gimenez F, Hoogi A, et al. "A curated mammography data set for use
> in computer-aided detection and diagnosis research." Scientific Data, 2017.
> DOI: 10.1038/sdata.2017.177
