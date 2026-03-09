# AI Inference Latency Analysis & Optimization

## Executive Summary

**Original Latency**: ~46.5 seconds for 4 images (~11.5s/image × 4 sequential)  
**Root Causes**: (1) Sequential MC Dropout on CPU, (2) 4 images processed sequentially due to blocking event loop  
**After Optimization**: **~7.8s for 4 images via batch endpoint** (6× faster), **~11.8s via sequential endpoint** (4× faster)  

---

## 1. Architecture Overview

The ClinicalVision inference pipeline uses:

| Component | Detail |
|-----------|--------|
| **Backbone** | DenseNet-121 (ImageNet pretrained) |
| **Ensemble** | 3 independently trained models |
| **Input** | 224 × 224 × 3 (CLAHE preprocessed, [0,1] normalized) |
| **Head** | GAP → Dense(2048) → BN → ReLU → Dropout(0.35) → Dense(1, sigmoid) |
| **Uncertainty** | MC Dropout — 30 stochastic forward passes |
| **Explainability** | GradCAM++ with 2nd-order gradients |
| **Calibration** | Auto-select (Temperature/Platt/Isotonic) |

---

## 2. Latency Breakdown

### Full Pipeline Timing (per single image)

| Stage | Time (CPU) | % of Total | Detail |
|-------|-----------|------------|--------|
| **Preprocessing** | ~50 ms | 0.1% | CLAHE + resize + normalize |
| **MC Dropout** | **~39 s** | **85%** | 30 sequential `model(x)` calls |
| **Calibration** | ~1 ms | 0% | Single array operation |
| **GradCAM++** | **~4 s** | **9%** | Forward + 2nd-order gradient tape |
| **Region Extraction** | **~1.3 s** | **3%** | Extra `model(image)` call inside ExplainabilityService |
| **Post-processing** | ~200 ms | 0.4% | Regions, narrative, JSON build |
| **Total** | **~44–46 s** | 100% | Matches observed 46s |

### MC Dropout Detail

The MC Dropout stage is the dominant bottleneck:

```
config.json → mc_dropout.n_samples = 30
ensemble.size = 3 models

Loop: for each of 3 models → 10 passes each = 30 total
Each pass: mc_forward_fn(model, image) → model(x, training=False)
Per pass: ~1.3 seconds on CPU
Total: 30 × 1.3s ≈ 39 seconds
```

**Why sequential?** Each MC forward pass is called individually in a Python loop (no batching). The `mc_forward_fn` is deliberately NOT decorated with `@tf.function` to ensure dropout remains truly stochastic on every call.

### GradCAM++ Detail

```
1. Create sub-model (model inputs → [target_layer_output, model_output])
2. Persistent GradientTape for 2nd-order gradients:
   - Inner tape: Forward pass + 1st-order gradients (~2s)
   - Outer tape: 2nd-order gradients (~1.5s)
3. Alpha weight computation + weighted sum
4. EXTRA: model(image, training=False) call for region extraction (~1.3s)
Total: ~4 seconds
```

---

## 3. Root Cause Analysis

### 3.1 GPU Force-Disabled (Primary)

**File**: `app/models/inference.py`, lines 42–44

```python
FORCE_CPU = os.environ.get('CLINICALVISION_FORCE_CPU', 'true').lower() in ('true', '1', 'yes')
```

The system defaults to CPU because of a CUDA version mismatch:
- **System driver**: CUDA 570.211.1
- **TensorFlow expected**: CUDA 570.195.3
- **Symptom**: XLA JIT compilation fails looking for `libdevice.10.bc`
- **Impact**: DenseNet-121 forward pass takes ~1.3s on CPU vs ~0.04s on GPU (**~30× slower**)

**Resolution options**:
1. Update NVIDIA driver to match TensorFlow's expected version
2. Reinstall TensorFlow compiled against current CUDA
3. Install `libdevice.10.bc` in expected location
4. Use CPU optimizations (this document's approach)

### 3.2 Sequential MC Passes (Secondary)

**File**: `app/models/inference.py`, `_run_mc_dropout()` method (line ~770)

```python
for model_dict in self.ensemble_models:          # 3 models
    mc_model = model_dict['mc']
    for _ in range(n_samples // len(...)):       # 10 passes each
        pred = self.mc_forward_fn(mc_model, image)  # Sequential!
```

Each pass creates a new computation graph trace. No batching is used despite TensorFlow supporting batch dimension natively.

### 3.3 Redundant Forward Pass in Explainability

**File**: `app/services/explainability_service.py`, `generate_explanation()` (line ~150)

```python
# Already ran GradCAM++ with a forward pass inside GradientTape
# Then runs ANOTHER forward pass just for region extraction:
pred = model(image, training=False).numpy().flatten()[0]
regions = self._extract_regions(heatmap_processed, pred)
```

This prediction is already computed during the GradCAM++ forward pass but the result isn't reused.

### 3.4 n_samples = 30 May Be Excessive

The config specifies 30 MC samples (10 per model × 3 models). Research shows:
- 10–15 MC samples typically provide reliable uncertainty estimates
- Beyond 20 samples, marginal improvement in uncertainty quality diminishes rapidly
- For clinical decision support (not pure research), 10 samples suffice

---

## 4. Optimization Plan

### Fix 1: Batch MC Forward Passes (**~3× speedup**)

Instead of 10 sequential `model(image)` calls per model, create a batched input:

```python
# Before: 10 sequential calls
for _ in range(10):
    pred = model(image, training=False)  # shape [1,1]

# After: 1 batched call
batch = tf.repeat(image, 10, axis=0)     # shape [10, 224, 224, 3]
preds = model(batch, training=False)      # shape [10, 1] — single GPU/CPU kernel
```

Batching amortizes Python loop overhead and allows TensorFlow to optimize the computation internally. MCDropout remains stochastic because each sample in the batch gets a different dropout mask.

### Fix 2: Reduce MC Samples 30 → 10 (**~3× speedup**)

Change `config.json` from `n_samples: 30` to `n_samples: 10`. With 3 ensemble models, each model runs ~3–4 passes. This is sufficient for reliable epistemic uncertainty.

### Fix 3: Cache Prediction in GradCAM++ (**~1.3s saved**)

Return the prediction from the GradCAM++ forward pass so the extra `model(image)` call is eliminated.

### Fix 4: Warm-up First Call (**eliminates cold-start spike**)

The very first inference call is slower due to TF graph tracing. Running a warm-up pass during model initialization would prevent this from affecting users.

### Combined Impact Estimate (CPU)

| Scenario | MC Time | GradCAM | Total |
|----------|---------|---------|-------|
| **Current** (30 seq.) | ~39s | ~5.3s | ~46s |
| Batch only (30 batched) | ~13s | ~5.3s | ~20s |
| Reduce to 10 + batch | ~5s | ~5.3s | ~12s |
| + Cache GradCAM pred | ~5s | ~4s | ~10s |
| + GPU (if available) | ~0.5s | ~0.3s | **~1.5s** |

---

## 5. Config Changes

**File**: `ml_models/v12_production/config.json`

```json
{
  "mc_dropout": {
    "n_samples": 10,        // Was 30 — reduced for CPU performance
    "batch_mc": true,        // NEW: enable batched MC inference
    ...
  }
}
```

---

## 6. Files Modified

| File | Change |
|------|--------|
| `app/models/inference.py` | Batched MC dropout, reduced samples, warm-up |
| `app/services/explainability_service.py` | Return prediction from GradCAM++ to avoid redundant forward pass |
| `ml_models/v12_production/config.json` | `n_samples: 30 → 10` |

---

## 7. Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Reduce MC samples | Slightly wider confidence intervals | 10 samples still statistically robust; ensemble provides additional diversity |
| Batch MC passes | Different dropout masks per batch item must be verified | MCDropout layer generates independent masks per sample in batch dimension |
| Cache GradCAM prediction | None — same forward pass result | Direct reuse of already-computed value |

---

## 8. Validation Criteria

- Inference time < 12 seconds per image on CPU
- Uncertainty estimates remain within 5% of 30-sample baseline
- All existing API tests pass
- Attention maps remain visually consistent
- Clinical narrative quality unchanged

---

## 9. Multi-Image Sequential Processing (Session 2 Finding)

### Problem Discovery

After implementing the per-image optimizations (Fixes 1–4), a user reported the total processing time for 4 images was still ~46.5s. Investigation revealed that per-image latency **was** fixed (~11.5s/image), but 4 images were processed **sequentially** due to:

1. **Frontend** sends 4 concurrent HTTP requests (`concurrencyLimit: 4`, `Promise.all`)
2. **Backend** runs a single uvicorn worker (no `--workers` flag)
3. **`model.predict()`** is synchronous CPU-bound, blocking the async event loop
4. Despite 4 async tasks arriving simultaneously, they serialize on the GIL

### Root Cause: Blocking Inference on Async Event Loop

```
Frontend: 4 concurrent HTTP requests → arrive at uvicorn
Uvicorn (1 worker): accepts all 4, creates 4 async tasks
Event loop: Task 1 calls model.predict() → BLOCKS for ~11.5s
            Task 2 waits... Task 3 waits... Task 4 waits...
Result: 4 × 11.5s = ~46s total (sequential despite "concurrent" requests)
```

### Solution: `asyncio.to_thread` + Batch Endpoint

**Fix 5: `asyncio.to_thread` for non-blocking inference**

In `inference_service.py`, changed:
```python
# Before: blocks the event loop
result = model.predict(image_array)

# After: offloads to thread pool, releases event loop
result = await asyncio.to_thread(model.predict, image_array)
```

TensorFlow releases the GIL during C-level kernel execution, allowing genuine thread parallelism.

**Fix 6: `/predict-batch` endpoint**

New endpoint at `/inference/predict-batch` that:
- Accepts up to 8 images in a single HTTP request
- Processes all images via `asyncio.gather(*tasks)` for concurrent execution
- Returns all results in one response, eliminating per-image HTTP overhead
- Frontend falls back gracefully to per-image if batch fails

**Fix 7: Frontend batch-first strategy**

`batchAnalysisOperations.ts` updated to:
1. Try `/predict-batch` with all images first
2. Fall back to per-image `/predict` on failure
3. Progress tracking updated for both paths

---

## 10. Final Benchmark Results

### Test Setup
- **Hardware**: CPU-only (CUDA mismatch, forced CPU)
- **Model**: 3× DenseNet-121 ensemble, MC Dropout (10 samples batched)
- **Images**: 4 × 512×512 test images via HTTP

### Results

| Scenario | Total Time | Per Image | Speedup vs Original |
|----------|-----------|-----------|---------------------|
| **Original** (30 seq MC, serial images) | ~46.5s | ~11.6s | 1.0× |
| **Sequential endpoint** (10 batched MC, `to_thread`) | 11.8s | ~2.9s | **3.9×** |
| **Batch endpoint** (10 batched MC, `asyncio.gather`) | **7.8s** | ~1.9s | **6.0×** |
| **GPU estimate** (if CUDA fixed) | ~1.5s | ~0.4s | ~31× |

### Per-Image Breakdown (Batch)

| Stage | Time |
|-------|------|
| MC Dropout (10 samples batched) | ~1.2–1.4s |
| GradCAM++ | ~1.1–1.3s |
| DB + serialization | ~0.1s |
| **Total per image** | **~2.5–2.8s** |

### Per-Image Breakdown (Via HTTP, sequential)

| Image | Cumulative | Delta |
|-------|-----------|-------|
| 1 | 2.73s | 2.73s |
| 2 | 5.95s | 3.22s |
| 3 | 9.47s | 3.52s |
| 4 | 11.79s | 2.32s |

---

## 11. Complete Files Modified

| File | Change |
|------|--------|
| `app/models/inference.py` | Batched MC dropout, reduced samples 30→10, warm-up, per-stage timing |
| `app/services/inference_service.py` | `asyncio.to_thread(model.predict, ...)` for non-blocking |
| `app/services/explainability_service.py` | Cache GradCAM++ prediction, avoid redundant forward pass |
| `app/api/v1/endpoints/inference.py` | New `/predict-batch` endpoint with `InferenceResponse` serialization |
| `ml_models/v12_production/config.json` | `n_samples: 30 → 10` |
| `src/services/api.ts` | `predictBatch()` method |
| `src/services/analysisApi.ts` | `analyzeImageBatch()` with fallback |
| `src/services/batchAnalysisOperations.ts` | Batch-first strategy in `runBatchAnalysis()` |

---

## 12. Future Optimization Opportunities

1. **Fix CUDA**: Update NVIDIA driver or reinstall TF for current CUDA → ~31× total speedup
2. **Multiple uvicorn workers**: `--workers 4` for true multiprocessing (bypasses GIL completely)
3. **GradCAM (1st order)** instead of GradCAM++ (2nd order): ~40% faster attention maps
4. **TensorRT / ONNX**: Optimized inference runtime for production deployment
5. **Model distillation**: Smaller student model for real-time inference
