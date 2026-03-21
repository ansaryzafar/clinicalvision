#!/usr/bin/env python3
"""
Fix Seed Data — Populate missing analytics fields & spread dates.

The original seed_production.py created 2060 analyses but omitted critical
fields that the analytics dashboard requires:
 - epistemic_uncertainty
 - aleatoric_uncertainty
 - predictive_entropy
 - mutual_information
 - inference_time_ms
 - risk_level
 - clinical_narrative
 - requires_human_review

It also created all analyses on the same date, causing temporal charts to
display a single data point.

This script:
1. Updates ALL existing analyses with realistic values for missing fields
2. Spreads created_at dates across the last 90 days
3. Ensures temporal charts, scatter plots, histograms, and trend lines
 all display proper data

Usage:
 docker exec clinicalvision-backend python -m scripts.fix_seed_data
"""

import math
import random
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.db.session import SessionLocal

random.seed(42) # Reproducible

# ── Clinical narrative templates ─────────────────────────────────────────

BENIGN_NARRATIVES = [
 "No suspicious findings detected. Breast tissue appears normal with typical fibroglandular density patterns.",
 "AI analysis indicates benign characteristics. No mass, calcification, or architectural distortion identified.",
 "Screening mammogram shows no evidence of malignancy. Symmetric breast tissue with normal parenchymal pattern.",
 "No suspicious lesions identified. Minor benign-appearing calcifications consistent with fibrocystic changes.",
 "Normal mammographic appearance. Dense breast tissue noted; supplemental screening may be considered.",
 "Benign findings only. Well-circumscribed oval density consistent with fibroadenoma or cyst.",
 "No abnormality detected. Bilateral breast tissue shows symmetrical parenchymal density.",
 "AI-assisted analysis: low-risk finding. Scattered fibroglandular densities without focal asymmetry.",
 "Unremarkable screening mammogram. No interval change compared to expected baseline patterns.",
 "No actionable findings identified by AI analysis. Stable bilateral breast tissue composition.",
 "Breast tissue demonstrates expected post-menopausal involution. No suspicious findings.",
 "Scattered benign-appearing calcifications noted. No clustering or pleomorphic morphology detected.",
 "AI model confidence is high for benign classification. Homogeneous fatty tissue predominates.",
 "No evidence of mass, architectural distortion, or suspicious calcifications. Routine follow-up recommended.",
 "Bilateral mammogram within normal limits. AI analysis supports BI-RADS 1 assessment.",
]

MALIGNANT_NARRATIVES = [
 "Suspicious finding detected: spiculated mass in upper outer quadrant. Further evaluation recommended.",
 "AI analysis flagged irregular density with indistinct margins. Diagnostic workup advised.",
 "Suspicious microcalcifications identified in clustered distribution. Biopsy may be warranted.",
 "Architectural distortion noted at 2 o'clock position. New finding compared to prior imaging patterns.",
 "AI model detected asymmetric density with possible mass effect. Additional views recommended.",
 "High-confidence malignant prediction. Irregular mass with associated skin thickening noted.",
 "Suspicious lesion identified with heterogeneous enhancement pattern. Tissue sampling recommended.",
 "AI analysis indicates concerning finding: new developing asymmetry with associated calcifications.",
 "Spiculated mass identified. AI uncertainty metrics suggest complex tissue presentation.",
 "Multiple suspicious calcifications detected in segmental distribution. Stereotactic biopsy recommended.",
]


def compute_uncertainty_values(confidence: float, is_benign: bool, model_version: str):
 """
 Generate realistic uncertainty decomposition values based on confidence.
 
 Higher confidence → lower uncertainty values.
 Malignant predictions → slightly higher epistemic uncertainty (model less certain).
 Newer model versions → slightly lower uncertainty overall.
 """
 # Version-based uncertainty modifier (newer models are more calibrated)
 version_factor = {
 "v1.0.0": 1.15,
 "v1.1.0": 1.05,
 "v1.2.0": 0.95,
 "v2.0.0-beta": 0.90,
 "v12_production": 0.85,
 }.get(model_version, 1.0)
 
 # Base uncertainty inversely related to confidence
 base_unc = (1.0 - confidence) * version_factor
 
 # Epistemic (model/knowledge uncertainty) — higher for malignant, lower for benign
 if is_benign:
 epistemic = base_unc * random.uniform(0.25, 0.45)
 else:
 epistemic = base_unc * random.uniform(0.35, 0.60)
 
 # Aleatoric (data/inherent noise uncertainty) — more stable, driven by image quality
 aleatoric = base_unc * random.uniform(0.20, 0.50)
 
 # Predictive entropy — total uncertainty, relates to both components
 # H[y|x] ≈ epistemic + aleatoric (simplified)
 predictive_entropy = epistemic + aleatoric + random.uniform(0.0, 0.05)
 
 # Mutual information — information gain from data
 mutual_info = epistemic * random.uniform(0.4, 0.8)
 
 # Clamp to reasonable ranges
 epistemic = max(0.001, min(0.50, epistemic))
 aleatoric = max(0.001, min(0.50, aleatoric))
 predictive_entropy = max(0.005, min(0.80, predictive_entropy))
 mutual_info = max(0.001, min(0.40, mutual_info))
 
 return epistemic, aleatoric, predictive_entropy, mutual_info


def compute_risk_level(confidence: float, is_benign: bool, epistemic: float):
 """Determine risk level based on prediction and uncertainty."""
 if is_benign and confidence > 0.85 and epistemic < 0.10:
 return "low"
 elif is_benign and confidence > 0.70:
 return "moderate" if random.random() < 0.3 else "low"
 elif not is_benign and confidence > 0.80:
 return "high"
 elif not is_benign:
 return "high" if random.random() < 0.7 else "moderate"
 else:
 return "moderate"


def should_require_human_review(confidence: float, is_benign: bool, epistemic: float, risk_level: str):
 """
 Determine if an analysis should be flagged for human review.
 
 Triggers:
 - High epistemic uncertainty (>0.15) → model is unsure
 - Low confidence (<0.70) → prediction unreliable
 - Malignant with moderate confidence → safety-critical
 - High risk level always reviewed
 """
 if risk_level == "high":
 return True
 if epistemic > 0.15:
 return True
 if confidence < 0.70:
 return True
 if not is_benign and confidence < 0.85:
 return random.random() < 0.7
 # Some benign cases reviewed for quality assurance
 return random.random() < 0.05


def compute_inference_time(model_version: str):
 """
 Generate realistic inference time in milliseconds.
 
 v1.0.0: older, simpler → 800-1500ms
 v1.1.0: optimized → 600-1200ms
 v1.2.0: ensemble → 1200-2500ms (slower due to multi-model)
 v2.0.0-beta: transformer → 2000-4000ms
 v12_production: production-optimized → 3000-6000ms (dense, real model)
 """
 ranges = {
 "v1.0.0": (800, 1500),
 "v1.1.0": (600, 1200),
 "v1.2.0": (1200, 2500),
 "v2.0.0-beta": (2000, 4000),
 "v12_production": (3000, 6000),
 }
 low, high = ranges.get(model_version, (800, 2000))
 return round(random.uniform(low, high), 1)


def main():
 print("=" * 60)
 print(" FIX SEED DATA — Populate Missing Fields & Spread Dates")
 print("=" * 60)
 
 db = SessionLocal()
 
 try:
 # Step 1: Get all analyses
 result = db.execute(text("""
 SELECT id, confidence_score, prediction_class, model_version,
 epistemic_uncertainty, inference_time_ms, created_at
 FROM analyses 
 ORDER BY created_at, id
 """))
 rows = result.fetchall()
 total = len(rows)
 print(f"\n Found {total} analyses to update")
 
 if total == 0:
 print(" Nothing to do.")
 return
 
 # Check how many need updating
 needs_update = sum(1 for r in rows if r.epistemic_uncertainty is None)
 print(f" {needs_update} analyses missing uncertainty fields")
 
 # Step 2: Spread dates across 90 days (but keep v12_production recent)
 print("\n Spreading dates across 90 days...")
 today = datetime.utcnow()
 
 # Separate v12_production analyses (keep them recent)
 v12_ids = [r.id for r in rows if r.model_version == "v12_production"]
 other_ids = [r.id for r in rows if r.model_version!= "v12_production"]
 
 # Spread non-v12 analyses across days 90 to 1 ago
 # Create a date distribution with more recent dates having more analyses (realistic)
 date_pool = []
 for day_offset in range(90, 0, -1):
 # Weight: more analyses on recent days (exponential-ish distribution)
 weight = max(1, int(30 * math.exp(-day_offset / 40)))
 date_pool.extend([day_offset] * weight)
 
 random.shuffle(date_pool)
 
 # Assign dates to non-v12 analyses
 batch_size = 500
 update_count = 0
 
 for i, row in enumerate(rows):
 analysis_id = row.id
 confidence = float(row.confidence_score)
 pred_class = row.prediction_class
 model_version = row.model_version
 is_benign = pred_class in ("benign", "BENIGN")
 
 # Compute uncertainty values
 epistemic, aleatoric, pred_entropy, mutual_info = compute_uncertainty_values(
 confidence, is_benign, model_version
 )
 
 # Compute risk level
 risk_level = compute_risk_level(confidence, is_benign, epistemic)
 
 # Compute human review flag
 needs_review = should_require_human_review(confidence, is_benign, epistemic, risk_level)
 
 # Inference time
 inference_time = compute_inference_time(model_version)
 
 # Clinical narrative
 if is_benign:
 narrative = random.choice(BENIGN_NARRATIVES)
 else:
 narrative = random.choice(MALIGNANT_NARRATIVES)
 
 # Date assignment
 if model_version == "v12_production":
 # Keep v12_production analyses in the last 3 days
 day_offset = random.randint(0, 3)
 else:
 # Use the weighted date pool
 pool_idx = i % len(date_pool) if date_pool else 45
 day_offset = date_pool[pool_idx] if date_pool else random.randint(1, 90)
 
 # Add some time variation within each day
 hours = random.randint(7, 22) # Working hours
 minutes = random.randint(0, 59)
 seconds = random.randint(0, 59)
 new_date = today - timedelta(days=day_offset, hours=-hours, minutes=-minutes, seconds=-seconds)
 
 # Build the UPDATE
 db.execute(text("""
 UPDATE analyses SET
 epistemic_uncertainty =:epistemic,
 aleatoric_uncertainty =:aleatoric,
 predictive_entropy =:pred_entropy,
 mutual_information =:mutual_info,
 risk_level =:risk_level,
 requires_human_review =:needs_review,
 inference_time_ms =:inference_time,
 clinical_narrative =:narrative,
 created_at =:new_date
 WHERE id =:id
 """), {
 "epistemic": round(epistemic, 6),
 "aleatoric": round(aleatoric, 6),
 "pred_entropy": round(pred_entropy, 6),
 "mutual_info": round(mutual_info, 6),
 "risk_level": risk_level,
 "needs_review": needs_review,
 "inference_time": inference_time,
 "narrative": narrative,
 "new_date": new_date,
 "id": analysis_id,
 })
 
 update_count += 1
 if update_count % batch_size == 0:
 db.commit()
 print(f" … {update_count}/{total} updated")
 
 db.commit()
 print(f" {update_count}/{total} analyses updated")
 
 # Step 3: Verification
 print("\n Verifying updates...")
 
 # Check populated fields
 verification = db.execute(text("""
 SELECT 
 COUNT(*) AS total,
 COUNT(epistemic_uncertainty) AS has_epistemic,
 COUNT(aleatoric_uncertainty) AS has_aleatoric,
 COUNT(predictive_entropy) AS has_entropy,
 COUNT(inference_time_ms) AS has_inference_time,
 COUNT(risk_level) AS has_risk_level,
 COUNT(clinical_narrative) AS has_narrative,
 COUNT(CASE WHEN requires_human_review = true THEN 1 END) AS review_flagged
 FROM analyses
 """)).fetchone()
 
 print(f" Total analyses: {verification.total}")
 print(f" Has epistemic: {verification.has_epistemic}")
 print(f" Has aleatoric: {verification.has_aleatoric}")
 print(f" Has entropy: {verification.has_entropy}")
 print(f" Has inference_time: {verification.has_inference_time}")
 print(f" Has risk_level: {verification.has_risk_level}")
 print(f" Has narrative: {verification.has_narrative}")
 print(f" Flagged for review: {verification.review_flagged}")
 
 # Check date distribution
 date_dist = db.execute(text("""
 SELECT DATE(created_at) AS d, COUNT(*) AS cnt
 FROM analyses
 GROUP BY DATE(created_at)
 ORDER BY d
 LIMIT 5
 """)).fetchall()
 
 total_dates = db.execute(text("""
 SELECT COUNT(DISTINCT DATE(created_at)) FROM analyses
 """)).scalar()
 
 print(f"\n Unique dates: {total_dates}")
 print(f" Sample date distribution:")
 for row in date_dist:
 print(f" {row.d}: {row.cnt} analyses")
 
 # Check risk level distribution
 risk_dist = db.execute(text("""
 SELECT risk_level, COUNT(*) AS cnt
 FROM analyses
 GROUP BY risk_level
 ORDER BY cnt DESC
 """)).fetchall()
 
 print(f"\n Risk level distribution:")
 for row in risk_dist:
 print(f" {row.risk_level}: {row.cnt}")
 
 # Check model version distribution
 model_dist = db.execute(text("""
 SELECT model_version, COUNT(*) AS cnt,
 ROUND(AVG(epistemic_uncertainty)::numeric, 4) AS avg_epi,
 ROUND(AVG(inference_time_ms)::numeric, 1) AS avg_latency,
 COUNT(CASE WHEN requires_human_review THEN 1 END) AS reviews
 FROM analyses
 GROUP BY model_version
 ORDER BY cnt DESC
 """)).fetchall()
 
 print(f"\n Model version stats:")
 for row in model_dist:
 print(f" {row.model_version}: {row.cnt} analyses, "
 f"avg_epi={row.avg_epi}, avg_latency={row.avg_latency}ms, "
 f"reviews={row.reviews}")
 
 print("\n" + "=" * 60)
 print(" FIX COMPLETE — All fields populated, dates spread")
 print("=" * 60)
 
 except Exception as e:
 print(f"\n Error: {e}")
 import traceback
 traceback.print_exc()
 db.rollback()
 raise
 finally:
 db.close()


if __name__ == "__main__":
 main()
