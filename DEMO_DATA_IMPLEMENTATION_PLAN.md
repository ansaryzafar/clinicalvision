# Demo & Test Data — Implementation Plan

## Executive Summary

Provide testers and initial users with a **professional, one-click download** of curated demo patient data and mammogram images, served directly from the ClinicalVision site. This enables end-to-end workflow testing without requiring access to the CBIS-DDSM dataset or any external tools.

---

## 1. Current State Analysis

### What Exists

| Asset | Location | Status |
|---|---|---|
| 2 × sample PNGs (224×224) | `sample_images/` (project root) | ⚠️ Tiny cropped patches — not realistic full mammograms |
| 1 × JPEG repeated 5× | `clinicalvision_backend/uploads/` | ⚠️ Same file duplicated |
| CBIS-DDSM DICOMs | Google Drive (`/CBIS-DDSM-data/CBIS-DDSM/`) | ✅ 3,568 images, 1,566 patients |
| CBIS-DDSM CSVs | Google Drive (`/CBIS-DDSM-data/csv/`) | ✅ Mass/Calc train/test metadata |
| EDA outputs | Google Drive (`/CBIS-DDSM-data/eda_complete/`) | ✅ Complete dataset CSV |
| `/demo` route | `src/pages/DemoPage.tsx` | ❌ Lead-capture form only — no interactive demo |
| `REACT_APP_ENABLE_DEMO` | `.env` | ❌ Defined but never wired up |
| `seed_demo_data.py` | — | ❌ Does not exist |

### What the App Accepts

| Format | Max Size | Extension |
|---|---|---|
| JPEG | 50 MB | `.jpg`, `.jpeg` |
| PNG | 50 MB | `.png` |
| DICOM | 500 MB | `.dcm`, `.dicom` |

### What the Workflow Requires

The 10-step clinical workflow expects:

1. **Patient Registration** — MRN, first/last name, DOB, sex
2. **Clinical History** — Indication, prior studies, BRCA status, etc.
3. **Image Upload** — ≥1 mammogram (PNG/JPEG/DICOM)
4. **Image Verification** — View type (CC/MLO/ML/LM/XCCL/XCCM/SPOT/MAG) + Laterality (R/L)
5. **AI Analysis** → **Image Analysis** → **BI-RADS Assessment** → **Report** → **Finalize** → **Sign**

**Standard 4-view set:** RCC, LCC, RMLO, LMLO

---

## 2. Demo Data Package Design

### 2.1 Patient Profiles (3 Curated Cases)

Each case tells a clinically meaningful story that exercises different parts of the workflow:

#### Case 1 — Normal/Benign (Complete 4-View)

| Field | Value |
|---|---|
| **MRN** | `DEMO-001` |
| **Name** | Jane A. Thompson |
| **DOB** | 1968-03-15 |
| **Sex** | F |
| **Clinical Indication** | Routine annual screening mammography |
| **Prior Studies** | Annual screening — no prior findings |
| **BRCA Status** | Negative |
| **Family History** | No significant family history |
| **Expected BI-RADS** | 1 (Negative) or 2 (Benign Finding) |
| **Images** | 4 views: RCC, LCC, RMLO, LMLO |

> **Purpose:** Happy path — tests the complete 4-view standard workflow with a normal/benign case.

#### Case 2 — Suspicious Finding (Targeted Views)

| Field | Value |
|---|---|
| **MRN** | `DEMO-002` |
| **Name** | Maria R. Chen |
| **DOB** | 1975-09-22 |
| **Sex** | F |
| **Clinical Indication** | Palpable mass, right breast, 2 o'clock |
| **Prior Studies** | Previous benign biopsy (2023) |
| **BRCA Status** | Unknown |
| **Family History** | Mother — breast cancer at age 52 |
| **Expected BI-RADS** | 4 (Suspicious) or 5 (Highly Suggestive) |
| **Images** | 4 standard + 2 additional: R-SPOT, R-MAG |

> **Purpose:** Tests the full clinical narrative — history of concern, additional diagnostic views, higher BI-RADS assessment.

#### Case 3 — Calcification Case (Minimal Views)

| Field | Value |
|---|---|
| **MRN** | `DEMO-003` |
| **Name** | Sarah L. Williams |
| **DOB** | 1982-11-08 |
| **Sex** | F |
| **Clinical Indication** | Calcifications noted on prior screening |
| **Prior Studies** | Screening 6 months ago — BI-RADS 3 |
| **BRCA Status** | Positive (BRCA1) |
| **Family History** | Sister — breast cancer at age 45, maternal aunt — ovarian cancer |
| **Expected BI-RADS** | 4B or 4C |
| **Images** | 2 views: LCC, LMLO (left only — targeted follow-up) |

> **Purpose:** Tests partial-view workflow (incomplete 4-view triggers warning), BRCA-positive path, calcification-specific findings.

### 2.2 Image Selection from CBIS-DDSM

**Source:** CBIS-DDSM dataset on Google Drive at `/content/drive/MyDrive/CBIS-DDSM-data/`

#### Selection Criteria

| Criterion | Rationale |
|---|---|
| Use **full mammogram** DICOM, not ROI crops | Realistic clinical experience — cropped 224×224 patches look artificial |
| Select both CC and MLO views | Complete standard screening set |
| Include both LEFT and RIGHT laterality | Tests laterality assignment and 4-view completeness |
| Include benign + malignant pathology | Covers both diagnostic outcomes |
| Select clear, high-quality images | First impression for demo users must be professional |
| Provide DICOM + PNG versions of each | Tests both upload pathways |

#### Image Mapping

| Demo Case | CBIS-DDSM Source | View | Side | Pathology |
|---|---|---|---|---|
| **Case 1** — RCC | Mass-Training, benign patient | CC | RIGHT | BENIGN |
| **Case 1** — LCC | Mass-Training, benign patient | CC | LEFT | BENIGN |
| **Case 1** — RMLO | Mass-Training, benign patient | MLO | RIGHT | BENIGN |
| **Case 1** — LMLO | Mass-Training, benign patient | MLO | LEFT | BENIGN |
| **Case 2** — RCC | Mass-Training, malignant patient | CC | RIGHT | MALIGNANT |
| **Case 2** — LCC | Mass-Training, malignant patient | CC | LEFT | MALIGNANT |
| **Case 2** — RMLO | Mass-Training, malignant patient | MLO | RIGHT | MALIGNANT |
| **Case 2** — LMLO | Mass-Training, malignant patient | MLO | LEFT | MALIGNANT |
| **Case 2** — R-SPOT | Mass-Training, same patient (crop) | CC | RIGHT | MALIGNANT |
| **Case 2** — R-MAG | Mass-Training, same patient (crop) | CC | RIGHT | MALIGNANT |
| **Case 3** — LCC | Calc-Training, malignant patient | CC | LEFT | MALIGNANT |
| **Case 3** — LMLO | Calc-Training, malignant patient | MLO | LEFT | MALIGNANT |

**Total: 12 images** (provided in both DICOM and PNG → 24 files)

#### Image Preparation Pipeline

```
CBIS-DDSM DICOM (uint16, ~500KB each)
       │
       ├──→ Keep original .dcm files (rename to descriptive names)
       │
       └──→ Convert to PNG via pydicom + PIL:
              - Apply DICOM windowing (VOI LUT)
              - Normalize to 8-bit grayscale
              - Save as high-quality PNG
              - Resize to max 2048px longest edge (manageable file size)
```

#### File Naming Convention

Descriptive, self-documenting names that hint at view/laterality for auto-detection:

```
DEMO-001_RIGHT_CC.dcm        DEMO-001_RIGHT_CC.png
DEMO-001_LEFT_CC.dcm         DEMO-001_LEFT_CC.png
DEMO-001_RIGHT_MLO.dcm       DEMO-001_RIGHT_MLO.png
DEMO-001_LEFT_MLO.dcm        DEMO-001_LEFT_MLO.png
DEMO-002_RIGHT_CC.dcm        DEMO-002_RIGHT_CC.png
...
```

> The `MultiImageUpload` component already parses filenames for view type and laterality auto-suggestion — this naming ensures seamless auto-detection.

---

## 3. Storage Architecture

### 3.1 Where to Store

**Primary:** `clinicalvision_frontend/public/demo-data/`

| Pros | Rationale |
|---|---|
| ✅ Served by CRA's static file server | No backend dependency for downloads |
| ✅ Available at `/demo-data/...` URL | Direct browser download links |
| ✅ No authentication required | Testers can download before creating accounts |
| ✅ CDN-compatible | When deployed, static assets get edge caching |
| ✅ Git LFS friendly | Binary files tracked efficiently |

### 3.2 Directory Structure

```
public/demo-data/
├── README.md                          # Quick-start instructions
├── demo-data-guide.pdf                # Professional PDF guide (optional)
├── ClinicalVision_Demo_Package.zip    # ⬇️ One-click download (all 3 cases)
│
├── case-1-normal/
│   ├── case-info.json                 # Patient demographics + clinical history
│   ├── dicom/
│   │   ├── DEMO-001_RIGHT_CC.dcm
│   │   ├── DEMO-001_LEFT_CC.dcm
│   │   ├── DEMO-001_RIGHT_MLO.dcm
│   │   └── DEMO-001_LEFT_MLO.dcm
│   └── png/
│       ├── DEMO-001_RIGHT_CC.png
│       ├── DEMO-001_LEFT_CC.png
│       ├── DEMO-001_RIGHT_MLO.png
│       └── DEMO-001_LEFT_MLO.png
│
├── case-2-suspicious/
│   ├── case-info.json
│   ├── dicom/
│   │   ├── DEMO-002_RIGHT_CC.dcm
│   │   ├── DEMO-002_LEFT_CC.dcm
│   │   ├── DEMO-002_RIGHT_MLO.dcm
│   │   ├── DEMO-002_LEFT_MLO.dcm
│   │   ├── DEMO-002_RIGHT_SPOT.dcm
│   │   └── DEMO-002_RIGHT_MAG.dcm
│   └── png/
│       ├── DEMO-002_RIGHT_CC.png
│       ├── DEMO-002_LEFT_CC.png
│       ├── DEMO-002_RIGHT_MLO.png
│       ├── DEMO-002_LEFT_MLO.png
│       ├── DEMO-002_RIGHT_SPOT.png
│       └── DEMO-002_RIGHT_MAG.png
│
├── case-3-calcification/
│   ├── case-info.json
│   ├── dicom/
│   │   ├── DEMO-003_LEFT_CC.dcm
│   │   └── DEMO-003_LEFT_MLO.dcm
│   └── png/
│       ├── DEMO-003_LEFT_CC.png
│       └── DEMO-003_LEFT_MLO.png
│
└── manifest.json                      # Machine-readable index of all demo data
```

### 3.3 `case-info.json` Schema

```json
{
  "caseId": "DEMO-001",
  "version": "1.0.0",
  "patient": {
    "mrn": "DEMO-001",
    "firstName": "Jane",
    "lastName": "Thompson",
    "middleInitial": "A",
    "dateOfBirth": "1968-03-15",
    "sex": "F"
  },
  "clinicalHistory": {
    "indication": "Routine annual screening mammography",
    "priorStudies": "Annual screening — no prior findings",
    "brcaStatus": "Negative",
    "familyHistory": "No significant family history",
    "symptoms": "None — asymptomatic screening",
    "hormoneTherapy": "None",
    "priorBiopsies": "None"
  },
  "expectedOutcome": {
    "biRads": "1 or 2",
    "description": "Normal/Benign — no suspicious findings",
    "pathology": "BENIGN"
  },
  "images": [
    {
      "filename": "DEMO-001_RIGHT_CC",
      "viewType": "CC",
      "laterality": "R",
      "formats": ["dcm", "png"],
      "source": "CBIS-DDSM Mass-Training",
      "originalCaseId": "Mass-Training_P_XXXXX_RIGHT_CC"
    }
  ]
}
```

### 3.4 `manifest.json` — Global Index

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-03-02T00:00:00Z",
  "description": "ClinicalVision AI Demo Data Package",
  "totalCases": 3,
  "totalImages": 12,
  "formats": ["DICOM (.dcm)", "PNG (.png)"],
  "zipDownload": "/demo-data/ClinicalVision_Demo_Package.zip",
  "cases": [
    {
      "id": "DEMO-001",
      "label": "Normal / Benign Screening",
      "difficulty": "Easy",
      "views": 4,
      "path": "/demo-data/case-1-normal/"
    },
    {
      "id": "DEMO-002",
      "label": "Suspicious Mass Finding",
      "difficulty": "Intermediate",
      "views": 6,
      "path": "/demo-data/case-2-suspicious/"
    },
    {
      "id": "DEMO-003",
      "label": "Calcification Follow-up",
      "difficulty": "Advanced",
      "views": 2,
      "path": "/demo-data/case-3-calcification/"
    }
  ]
}
```

---

## 4. Frontend Integration — Demo Data Download Section

### 4.1 Where in the UI

**Option A (Recommended): Dedicated section on the Landing Page**

Add a "Try with Sample Data" section between the Features and CTA sections, with:
- Headline: "Get Started with Demo Data"
- Subtext: "Download curated mammogram datasets to test the full clinical workflow"
- 3 case cards (Normal, Suspicious, Calcification) with difficulty badges
- "Download All Cases (.zip)" primary button
- Individual case download links

**Option B: In-app guidance on the New Analysis page**

When a user starts a new analysis with zero uploaded images, show a prompt:
> "New to ClinicalVision? [Download sample mammograms](/demo-data/ClinicalVision_Demo_Package.zip) to try the full workflow."

**Recommended:** Implement **both** — Landing Page for discoverability, In-app for contextual guidance.

### 4.2 Component Design

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 Get Started with Demo Data                             │
│  Download curated mammogram cases to test the full workflow │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 📋 Case 1    │ │ 📋 Case 2    │ │ 📋 Case 3    │        │
│  │              │ │              │ │              │        │
│  │ Normal       │ │ Suspicious   │ │ Calcification│        │
│  │ Screening    │ │ Mass         │ │ Follow-up    │        │
│  │              │ │              │ │              │        │
│  │ 4 views      │ │ 6 views      │ │ 2 views      │        │
│  │ ⬇ DICOM  PNG │ │ ⬇ DICOM  PNG │ │ ⬇ DICOM  PNG │        │
│  │ 🟢 Easy      │ │ 🟡 Medium    │ │ 🔴 Advanced  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│        [ ⬇ Download Complete Demo Package (.zip) ]          │
│                                                             │
│  Includes patient demographics, clinical history,           │
│  and step-by-step testing instructions                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Image Preparation Script

### 5.1 `prepare_demo_data.py`

Location: `scripts/prepare_demo_data.py`

This script runs once (on a machine with Google Drive access) to:

1. **Read** CBIS-DDSM CSV metadata
2. **Select** specific patients matching our case criteria
3. **Extract** their DICOM files
4. **Rename** files to our `DEMO-XXX_SIDE_VIEW` convention
5. **Convert** DICOMs to 8-bit PNGs with proper windowing
6. **Generate** `case-info.json` for each case
7. **Generate** `manifest.json`
8. **Create** `ClinicalVision_Demo_Package.zip`
9. **Output** everything to `clinicalvision_frontend/public/demo-data/`

### 5.2 Patient Selection Algorithm

```python
def select_demo_patients(csv_data):
    """
    Select 3 optimal patients from CBIS-DDSM for demo cases.
    
    Criteria:
    - Case 1: Benign mass patient with all 4 standard views accessible
    - Case 2: Malignant mass patient with ≥4 views, clear findings
    - Case 3: Malignant calc patient with LEFT laterality images
    
    Preference: 
    - High subtlety for Case 1 (looks normal)
    - Low subtlety for Case 2 (obvious finding)
    - Medium subtlety for Case 3 (realistic calcification)
    - All must have valid, loadable DICOM files
    """
```

### 5.3 DICOM-to-PNG Conversion

```python
def dicom_to_png(dcm_path, output_path, max_size=2048):
    """
    Convert DICOM to high-quality 8-bit PNG.
    
    Steps:
    1. Read DICOM pixel data
    2. Apply VOI LUT / Window Level (if present)
    3. Normalize to 0-255 range
    4. Apply CLAHE for contrast enhancement (optional)
    5. Resize to max_size longest edge (preserve aspect ratio)
    6. Save as PNG with maximum compression
    """
```

---

## 6. Git LFS Strategy

### Why Git LFS

The demo images (12 DICOMs + 12 PNGs) could total 15-40 MB. Regular Git handles this poorly.

### Setup

```bash
# Track demo data binaries with Git LFS
git lfs install
git lfs track "clinicalvision_frontend/public/demo-data/**/*.dcm"
git lfs track "clinicalvision_frontend/public/demo-data/**/*.png"
git lfs track "clinicalvision_frontend/public/demo-data/**/*.zip"
```

### Alternative: External Hosting

If Git LFS is not available or the dataset is too large:

| Option | Pros | Cons |
|---|---|---|
| **GitHub Releases** | Free, versioned, direct download URLs | Requires manual upload per release |
| **S3/CloudFront** | Fast CDN, scalable, versioned | Costs money, needs AWS setup |
| **Zenodo** | Free, DOI-citable, academic credibility | Slower, less control |
| **Google Drive (shared)** | Already have the data there | Unreliable API, quotas |

**Recommendation:** Use **Git LFS** for the curated demo package (small enough at ~30MB) and link to **Zenodo** for the full CBIS-DDSM dataset in documentation.

---

## 7. Backend Seed Script

### 7.1 `seed_demo_data.py`

Location: `clinicalvision_backend/scripts/seed_demo_data.py`

For testers who want a **pre-populated** instance:

```python
"""
Seeds the database with demo patient records and uploads demo images.

Usage:
    python scripts/seed_demo_data.py [--reset] [--images-dir PATH]

This script:
1. Creates 3 demo patient records (DEMO-001, DEMO-002, DEMO-003)
2. Creates clinical history entries for each
3. Uploads demo images from the specified directory
4. Assigns correct view types and laterality
5. Optionally runs AI inference on all uploaded images
"""
```

### 7.2 What It Creates

| Entity | Count | Details |
|---|---|---|
| Users | 1 | `demo@clinicalvision.ai` / `DemoUser2026!` (radiologist role) |
| Patients | 3 | DEMO-001, DEMO-002, DEMO-003 |
| Studies | 3 | One per patient |
| Images | 12 | Uploaded via the API with correct metadata |
| Clinical History | 3 | Pre-filled from `case-info.json` |

---

## 8. Testing Workflow Documentation

### 8.1 Included in the ZIP Package

A `README.md` inside the demo data package with step-by-step instructions:

```markdown
# ClinicalVision AI — Demo Data Quick Start

## What's Included
- 3 curated mammogram cases (12 images total)
- Patient demographics and clinical history for each case
- Available in both DICOM (.dcm) and PNG (.png) formats

## Quick Start

### Step 1: Create an Account
Navigate to [your-instance]/register and create an account.

### Step 2: Start New Analysis
Click "New Analysis" from the dashboard.

### Step 3: Enter Patient Information
Use the patient data from the case-info.json file:
- MRN: DEMO-001
- Name: Jane A. Thompson
- DOB: 1968-03-15
- Sex: Female

### Step 4: Enter Clinical History
Copy the clinical history from case-info.json.

### Step 5: Upload Images
Drag and drop the images from the `png/` or `dicom/` folder.
The system will auto-detect view types from filenames.

### Step 6: Verify Images
Confirm the view type and laterality assignments.

### Step 7: Run AI Analysis
Click "Run Analysis" — the AI model will process all uploaded images.

### Step 8-10: Complete the Workflow
Review findings, assign BI-RADS, generate report, and finalize.

## Suggested Test Scenarios
| Scenario | Case | What to Test |
|---|---|---|
| Happy path (4-view) | Case 1 | Full workflow, normal result |
| Diagnostic workup | Case 2 | Additional views, high BI-RADS |
| Partial views | Case 3 | Missing view warning, targeted study |
| Mixed formats | Any | Upload DICOM and PNG together |
| Re-upload | Any | Delete an image and re-upload |
```

---

## 9. Implementation Phases

### Phase 1 — Data Preparation (1-2 days)

- [ ] Write `scripts/prepare_demo_data.py`
- [ ] Run on Google Colab (has Drive access + pydicom)
- [ ] Select 3 optimal patients from CBIS-DDSM CSVs
- [ ] Extract and rename DICOM files
- [ ] Convert to PNG with proper windowing
- [ ] Generate `case-info.json` and `manifest.json`
- [ ] Create ZIP package
- [ ] Validate all 24 files upload correctly in the app

### Phase 2 — Frontend Integration (1 day)

- [ ] Create `public/demo-data/` directory with prepared data
- [ ] Add demo data download section to Landing Page
- [ ] Add contextual "Try sample data" prompt in New Analysis empty state
- [ ] Set up Git LFS tracking for binary files
- [ ] Update `.gitignore` if needed

### Phase 3 — Backend Seeding (0.5 days)

- [ ] Create `clinicalvision_backend/scripts/seed_demo_data.py`
- [ ] Test seeding on fresh database
- [ ] Add `make seed-demo` or `npm run seed:demo` convenience command
- [ ] Document in backend README

### Phase 4 — Testing & Polish (0.5 days)

- [ ] End-to-end test: download ZIP → upload → complete workflow for all 3 cases
- [ ] Verify DICOM metadata is preserved
- [ ] Verify PNG auto-detection works
- [ ] Test download links work in production build
- [ ] Write/update TDD tests for demo data section

---

## 10. Security & Legal Considerations

### CBIS-DDSM License

The CBIS-DDSM dataset is publicly available under the **TCIA Data Usage Policy**:
- ✅ Free for research and educational use
- ✅ No patient privacy concerns (fully de-identified)
- ✅ Attribution required: cite the original CBIS-DDSM paper
- ⚠️ Include attribution in `README.md` and `manifest.json`

### Required Attribution

```
Demo images sourced from the CBIS-DDSM dataset:
Lee RS, Gimenez F, Hoogi A, Miyake KK, Gober M, Rubin DL.
"A curated mammography data set for use in computer-aided detection
and diagnosis research." Scientific Data, 4:170177, 2017.
DOI: 10.1038/sdata.2017.177

Original data from The Cancer Imaging Archive (TCIA).
```

### Demo Data Security

- Demo images are **public** (no auth required to download)
- Demo patient records are **clearly fictional** (MRN prefix `DEMO-`)
- No real PHI is included anywhere
- Demo accounts use clearly marked credentials
- Backend seed script is **not** accessible via API — must be run manually

---

## 11. File Size Estimates

| Component | Estimated Size |
|---|---|
| 12 × DICOM files (uint16, ~500KB each) | ~6 MB |
| 12 × PNG files (8-bit, resized to 2048px) | ~8 MB |
| 3 × case-info.json | < 10 KB |
| manifest.json + README.md | < 20 KB |
| **Total uncompressed** | **~14 MB** |
| **ZIP compressed** | **~10 MB** |

This is well within Git LFS free tier (1 GB storage, 1 GB/month bandwidth on GitHub).

---

## 12. Success Criteria

| Metric | Target |
|---|---|
| Time from download to first AI analysis | < 10 minutes |
| Image upload success rate (all formats) | 100% |
| View auto-detection accuracy | ≥ 10/12 correct |
| All 3 cases complete full 10-step workflow | ✅ |
| Zero errors or crashes during demo flow | ✅ |
| Works without backend seeding (manual entry) | ✅ |
| Works with backend seeding (pre-populated) | ✅ |
| Download link accessible without login | ✅ |

---

## 13. Critical System Evaluation — AI Inference & Performance

### 13.1 Current AI Inference Architecture

```
User uploads image
       │
       ▼
Frontend: BatchAnalysisRunner
  ├── Chunks images (concurrencyLimit: 4)
  ├── Per-image: analyzeImage() → api.predict()
  │     ├── Axios POST /inference/predict (timeout: 180s)
  │     └── 3 retries with exponential backoff (1s, 2s, 4s)
  └── Batch timeout per-image: 60s ← ⚠️ CONFLICTS with Axios 180s
       │
       ▼
Backend: FastAPI POST /api/v1/inference/predict
  ├── Image validation + preprocessing (CLAHE → resize 224×224 → [0,1] → 3ch)
  ├── InferenceService.predict()
  │     ├── RealModelInference.predict()
  │     │     ├── _run_mc_dropout(): 3 models × 10 samples = 30 forward passes
  │     │     ├── _calibrate(): 1 call (⚠️ calibrator.pkl MISSING)
  │     │     └── _generate_attention_map(): 1 GradCAM++ pass
  │     │     = TOTAL: ~31 DenseNet-121 forward passes on CPU
  │     └── Transform suspicious regions to original image coords
  └── Return InferenceResponse JSON
```

### 13.2 Critical Issues Found

#### 🔴 ISSUE 1: CPU-Only Inference — Extreme Latency Risk

| Factor | Value |
|---|---|
| Device | CPU only (`CLINICALVISION_FORCE_CPU=true` default) |
| GPU status | Disabled — CUDA version mismatch (driver 570.211.1 vs TF expects 570.195.3) |
| Forward passes per image | ~31 (30 MC Dropout + 1 GradCAM++) |
| DenseNet-121 per forward pass (CPU) | ~100–200ms |
| **Estimated time per image** | **3–6 seconds** (31 × 100–200ms) |
| 4-view case (Case 1) | **12–24 seconds total** |
| 6-view case (Case 2) | **18–36 seconds total** |

**Verdict:** Acceptable for demo purposes. 3–6 seconds per image is within the 60-second
batch timeout. However, this estimate is optimistic — DenseNet-121 on CPU with Python
overhead could be 200–400ms per pass, pushing to **6–12 seconds per image**.

**Mitigation options:**
- Reduce MC Dropout samples from 30 → 10 for demo mode (3× speedup)
- Disable TTA (already disabled in practice — confirmed unused)
- Add inference time logging to validate actual performance
- Consider `ONNX Runtime` for CPU acceleration (2–3× faster than TensorFlow CPU)

#### 🔴 ISSUE 2: Missing Calibration File

The `calibration/calibrator.pkl` file is **missing** from:
```
clinicalvision_backend/ml_models/v12_production/calibration/
└── (empty directory)
```

The code handles this gracefully (uses raw predictions), but:
- ECE (Expected Calibration Error) was 0.141 — moderate miscalibration
- Without calibration, confidence scores may be systematically over/under-confident
- Demo users will see uncalibrated probabilities

**Impact on demo:** BI-RADS suggestions may seem inconsistent with displayed probabilities.

**Fix:** Regenerate `calibrator.pkl` from validation data, or skip calibration with a documented note.

#### 🟡 ISSUE 3: Timeout Conflict

| Layer | Timeout |
|---|---|
| Frontend batch per-image | 60,000ms (60s) |
| Frontend Axios per-request | 180,000ms (180s) |
| Backend uvicorn | No explicit timeout |

The **batch timeout (60s)** races against **Axios timeout (180s)**.
If inference takes 65 seconds:
- Batch layer cancels (thinks it timed out)
- But Axios request is still running (has 115s left)
- Result: Image marked "failed" even though backend may still be processing

**Fix:** Align timeouts — batch per-image timeout should be ≥ Axios timeout,
or remove the batch-level timeout and rely solely on Axios.

#### 🟡 ISSUE 4: Mock Model vs Real Model Parity

The `USE_MOCK_MODEL=false` is set in `.env`, meaning the **real model should load**.
However, several gaps exist between mock and real responses:

| Field | Real Model | Mock Model |
|---|---|---|
| `inference_time_ms` | ✅ Real timing | ✅ Simulated 300–800ms |
| `calibration` block | ✅ Present (if calibrator exists) | ❌ Missing |
| `mc_samples` count | ✅ 30 | ❌ Not returned |
| `mc_std` | ✅ Real std dev | ❌ Not returned |
| `image_metadata` | ✅ Original dimensions | ❌ May be missing |
| `suspicious_regions.area_pixels` | ✅ Computed | ✅ Simulated |
| `attention_map` shape | 56×56 | 56×56 ✅ Matches |

**Impact:** If the real model fails to load (weights corruption, TF version mismatch),
the system silently falls back to... nothing. There is no fallback.
`USE_MOCK_MODEL=false` + model load failure = **500 error on every inference request**.

**Fix:** Add a fallback strategy — if real model fails to load, log error and
optionally fall back to mock with a warning banner in the UI.

#### 🟢 ISSUE 5: Model Weights Present and Valid

All 3 ensemble model files exist and are ~106 MB each (total ~318 MB):
```
model_0_stage3_best.h5  — 110,779,960 bytes ✅
model_1_stage3_best.h5  — 110,763,960 bytes ✅
model_2_stage3_best.h5  — 110,763,960 bytes ✅
```

These are proper HDF5 TensorFlow/Keras checkpoint files with consistent sizes.

#### 🟢 ISSUE 6: Frontend Display Completeness

The `WorkflowAnalysisSuite` and `AnalysisSuite` components display ALL expected findings:

| Display Element | Shown in Workflow? | Shown in Full Suite? |
|---|---|---|
| Prediction (Benign/Malignant) | ✅ Chip | ✅ Chip |
| Confidence percentage | ✅ | ✅ |
| Risk level (Low/Moderate/High) | ✅ Color chip | ✅ Spectrum bar |
| Probabilities (B/M) | ✅ | ✅ |
| Suspicious regions list | ✅ Cards | ✅ Cards |
| Attention/GradCAM heatmap | ❌ (no viewer in workflow) | ✅ Full viewer |
| Bounding boxes on image | ❌ | ✅ |
| Uncertainty (MC Dropout) | ✅ | ✅ |
| Model version | ✅ Footer | ✅ |
| Processing time | ✅ Footer | ✅ |
| BI-RADS suggestion | ✅ Batch summary | ✅ Panel |
| GradCAM overlay controls | ❌ | ✅ (toggle/blend/heat modes) |
| LIME/SHAP visualizations | ❌ | ❌ (API typed but not wired) |

**Verdict:** Workflow step shows summary cards. Full AnalysisSuite (accessible via "Open Fullscreen Suite")
shows the complete experience with heatmap overlays and viewer tools.
Demo testers should be instructed to use both views.

### 13.3 "Try Demo" Button — Current vs Proposed Wiring

**Current behavior:**
```
"Try Demo" click → navigate('/register?redirect=/workflow')
  → User must create account
  → After register, redirect to /workflow
  → Empty workflow — no preloaded data
  → User must manually enter patient info + upload images
```

**Proposed behavior:**
```
"Try Demo" click → navigate('/register?redirect=/workflow&demo=true')
  → User creates account (or logs in)
  → Redirect to /workflow with ?demo=true query param
  → Workflow detects demo mode:
      a) Shows banner: "Demo Mode — Using sample data"
      b) Pre-fills patient info from case-info.json (Case 1: Jane Thompson)
      c) Shows "Download Sample Images" prompt at Image Upload step
      d) Links to /demo-data/case-1-normal/png/ for drag-and-drop
  → From there, user proceeds normally through all 10 steps
```

**Alternative (simpler, Phase 1 approach):**
```
"Try Demo" click → navigate('/register?redirect=/workflow')
  → Same as now BUT:
  → New Analysis page shows a persistent "Demo Data Available" card
  → Card links to /demo-data/ClinicalVision_Demo_Package.zip
  → Card also shows inline patient info for quick copy-paste
  → User downloads images, fills in data, uploads — full manual flow
```

### 13.4 Performance Benchmarking Plan

Before shipping demo data, we MUST establish actual inference timings:

```python
# benchmark_inference.py — Run once to establish baseline
import time
from ml.inference import get_model_inference

model = get_model_inference()  # Force real model load

# Warm-up (first inference is slower due to TF graph compilation)
_ = model.predict(test_image)

# Benchmark
times = []
for i in range(10):
    start = time.perf_counter()
    result = model.predict(test_image)
    elapsed = (time.perf_counter() - start) * 1000
    times.append(elapsed)
    print(f"Run {i+1}: {elapsed:.0f}ms")

print(f"Mean: {sum(times)/len(times):.0f}ms")
print(f"P95:  {sorted(times)[8]:.0f}ms")
```

**Expected results matrix:**

| Configuration | Est. Time/Image | Demo Viable? |
|---|---|---|
| Real model, 30 MC, CPU | 3–12s | ✅ Acceptable |
| Real model, 10 MC, CPU | 1–4s | ✅ Good |
| Real model, 30 MC, GPU | 0.5–2s | ✅ Excellent |
| Mock model | 0.3–0.8s | ✅ Instant (but fake) |

### 13.5 Recommended Pre-Implementation Actions

| # | Action | Priority | Rationale |
|---|---|---|---|
| 1 | Run real model inference benchmark on CPU | 🔴 Critical | We don't know actual latency — could be 3s or 30s |
| 2 | Verify real model loads without crash | 🔴 Critical | USE_MOCK_MODEL=false but never tested at runtime |
| 3 | Fix timeout conflict (60s batch vs 180s axios) | 🟡 High | Demo users will see false "failed" if inference > 60s |
| 4 | Regenerate or skip calibrator.pkl | 🟡 High | Affects BI-RADS consistency |
| 5 | Add model load fallback (real → mock with warning) | 🟡 High | Prevents total failure if model can't load |
| 6 | Add inference timing to demo test plan | 🟢 Medium | Document expected wait times for testers |
| 7 | Wire demo=true query param to workflow | 🟢 Medium | Smoother onboarding for demo users |
| 8 | Test GradCAM++ on real model output | 🟢 Medium | Heatmaps may look different than mock |

---

## 14. Brand Consistency Audit

### 14.1 Pages That Need Demo Integration

| Page | Current State | Needed |
|---|---|---|
| **Landing Page** | "Try Demo" → register redirect | Wire to demo flow + add download section |
| **Dashboard** | No demo mention | Add "Demo Cases Available" card for new users |
| **New Analysis** | Empty state | Add "Try with sample data" contextual prompt |
| **DemoPage** (`/demo`) | Lead-capture form | Keep as-is (for enterprise leads) — separate from testing |

### 14.2 Design System Tokens for Demo UI

All demo UI elements MUST use the established Lunit-inspired design tokens:

| Token | Value | Usage |
|---|---|---|
| Font heading | ClashGrotesk | Section titles |
| Font body | Lexend | Cards, descriptions |
| Primary teal | `#00C9EA` | Download buttons, badges |
| Dark gray | `#1A1A2E` | Card text |
| Light gray | `#EFF0F4` | Card backgrounds |
| Border radius | 16px | Card corners |
| Green | `#22C55E` | "Easy" difficulty badge |
| Orange | `#F59E0B` | "Medium" difficulty badge |
| Red | `#FF4444` | "Advanced" difficulty badge |

### 14.3 Responsive Considerations

Demo data cards must work on:
- Desktop (3 cards in a row)
- Tablet (2 cards + 1 below)
- Mobile (stacked cards with full-width download button)

---

## 15. Revised Implementation Phases

### Phase 0 — System Validation (BEFORE any demo work) — 0.5 days

- [ ] Start backend with `USE_MOCK_MODEL=false` — verify real model loads
- [ ] Run single inference on CPU — measure actual time
- [ ] Verify GradCAM++ heatmap is generated correctly
- [ ] Verify suspicious regions are detected
- [ ] Check calibration graceful fallback (missing pkl)
- [ ] Fix batch timeout (60s → 180s to match Axios)
- [ ] Document baseline performance numbers
- [ ] Test full 10-step workflow with real model end-to-end

### Phase 1 — Data Preparation (1-2 days)

- [ ] Write `scripts/prepare_demo_data.py`
- [ ] Run on Google Colab (has Drive access + pydicom)
- [ ] Select 3 optimal patients from CBIS-DDSM CSVs
- [ ] Extract and rename DICOM files
- [ ] Convert to PNG with proper windowing
- [ ] Generate `case-info.json` and `manifest.json`
- [ ] Create ZIP package
- [ ] Validate all 24 files upload correctly in the app

### Phase 2 — Frontend Integration (1 day)

- [ ] Create `public/demo-data/` directory with prepared data
- [ ] Add demo data download section to Landing Page (Lunit design system)
- [ ] Wire "Try Demo" button to include demo context
- [ ] Add contextual "Try sample data" prompt in New Analysis empty state
- [ ] Set up Git LFS tracking for binary files
- [ ] Ensure brand consistency across all new demo UI

### Phase 3 — Backend Seeding & Performance (0.5 days)

- [ ] Create `clinicalvision_backend/scripts/seed_demo_data.py`
- [ ] Test seeding on fresh database
- [ ] Add inference performance logging for demo cases
- [ ] Generate calibrator.pkl or document its absence

### Phase 4 — End-to-End Validation (0.5 days)

- [ ] Download ZIP → manual upload → run all 3 cases through full workflow
- [ ] Measure and document inference times per case
- [ ] Verify all findings cards display correctly (prediction, confidence, regions, heatmap)
- [ ] Verify BI-RADS suggestion is reasonable for each case
- [ ] Test on slow network simulation (3G throttle)
- [ ] Test abort/retry during batch analysis
- [ ] Test mixed format upload (DICOM + PNG in same case)
- [ ] Screenshot each step for tester documentation
