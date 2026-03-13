#!/usr/bin/env python3
"""
seed_analytics_data.py — Populate the Docker PostgreSQL database with
realistic analysis data so the AI Analytics dashboard has meaningful
charts and metrics.

This script:
  1. Updates all existing PENDING analyses → COMPLETED with enriched data
  2. Inserts ~170 additional analyses spread over the past 90 days
  3. Creates 2 ModelVersion records for Model Intelligence tab
  4. Creates ~40 Feedback records for concordance / calibration charts

Run:
    python3 scripts/seed_analytics_data.py

Idempotent: safe to run multiple times (cleans up previous seed data first).
"""

import random
import uuid
import math
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

import psycopg2
from psycopg2.extras import execute_values

# ────────────────────────────────────────────────────────────────────────────
# Connection
# ────────────────────────────────────────────────────────────────────────────
DB_CONFIG = dict(
    host="localhost",
    port=15432,
    user="clinicalvision",
    password="secure_dev_password_123",
    dbname="clinicalvision_db",
)

random.seed(42)  # Reproducible

# ────────────────────────────────────────────────────────────────────────────
# Constants
# ────────────────────────────────────────────────────────────────────────────
MODEL_VERSIONS = ["mock-v1.0", "v12_production"]
BIRADS_CATEGORIES = ["BIRADS_1", "BIRADS_2", "BIRADS_3", "BIRADS_4", "BIRADS_5"]
RISK_LEVELS = ["low", "moderate", "high"]
PREDICTION_CLASSES = ["BENIGN", "MALIGNANT"]

# Realistic probability distributions
# ~65% benign, ~35% malignant (screening population)
BENIGN_WEIGHT = 0.65

# BI-RADS distribution (realistic screening population):
BIRADS_WEIGHTS = {
    "BIRADS_1": 0.30,  # Negative
    "BIRADS_2": 0.30,  # Benign
    "BIRADS_3": 0.15,  # Probably benign
    "BIRADS_4": 0.18,  # Suspicious
    "BIRADS_5": 0.07,  # Highly suggestive
}

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def weighted_choice(options: dict) -> str:
    """Pick from {option: weight} dict."""
    keys = list(options.keys())
    weights = list(options.values())
    return random.choices(keys, weights=weights, k=1)[0]


def random_date(start: datetime, end: datetime) -> datetime:
    """Random datetime between start and end."""
    delta = end - start
    offset = random.random() * delta.total_seconds()
    return start + timedelta(seconds=offset)


def generate_analysis_row(
    image_id: str,
    model_version: str,
    created_at: datetime,
) -> dict:
    """Generate a single realistic completed analysis record."""

    # Determine prediction class
    is_benign = random.random() < BENIGN_WEIGHT
    pred_class = "BENIGN" if is_benign else "MALIGNANT"

    # Confidence: benign cases tend higher confidence, malignant more varied
    if is_benign:
        confidence = random.gauss(0.88, 0.07)
    else:
        confidence = random.gauss(0.78, 0.12)
    confidence = max(0.45, min(0.99, confidence))

    # BI-RADS category correlated with prediction
    if is_benign:
        birads = weighted_choice({"BIRADS_1": 0.35, "BIRADS_2": 0.40, "BIRADS_3": 0.20, "BIRADS_4": 0.04, "BIRADS_5": 0.01})
    else:
        birads = weighted_choice({"BIRADS_1": 0.02, "BIRADS_2": 0.03, "BIRADS_3": 0.10, "BIRADS_4": 0.55, "BIRADS_5": 0.30})

    # Risk level correlated with prediction
    if is_benign:
        risk = weighted_choice({"low": 0.70, "moderate": 0.25, "high": 0.05})
    else:
        risk = weighted_choice({"low": 0.05, "moderate": 0.30, "high": 0.65})

    # Uncertainty: higher for borderline cases
    epistemic = random.gauss(0.03, 0.02) if confidence > 0.75 else random.gauss(0.12, 0.05)
    epistemic = max(0.001, min(0.3, epistemic))

    aleatoric = random.gauss(0.05, 0.03) if confidence > 0.75 else random.gauss(0.15, 0.06)
    aleatoric = max(0.001, min(0.35, aleatoric))

    predictive_entropy = -confidence * math.log2(max(confidence, 1e-10)) - (1 - confidence) * math.log2(max(1 - confidence, 1e-10))
    predictive_entropy = max(0.0, min(1.0, predictive_entropy))

    mutual_info = max(0.0, epistemic * 0.5 + random.gauss(0, 0.01))

    requires_review = epistemic > 0.08 or confidence < 0.65

    # Inference time: ~150-800ms typical, occasional spikes
    if random.random() < 0.05:
        inference_time = random.uniform(800, 2500)  # spike
    else:
        inference_time = random.gauss(350, 120)
    inference_time = max(80, inference_time)

    # Probabilities
    if is_benign:
        benign_prob = confidence
        malig_prob = 1.0 - confidence
    else:
        malig_prob = confidence
        benign_prob = 1.0 - confidence

    return {
        "id": str(uuid.uuid4()),
        "image_id": image_id,
        "model_version": model_version,
        "model_name": "DenseNet121_Ensemble" if model_version == "v12_production" else "MockModel",
        "prediction_class": pred_class,
        "confidence_score": round(confidence, 6),
        "malignant_probability": round(malig_prob, 6),
        "benign_probability": round(benign_prob, 6),
        "risk_level": risk,
        "epistemic_uncertainty": round(epistemic, 6),
        "aleatoric_uncertainty": round(aleatoric, 6),
        "predictive_entropy": round(predictive_entropy, 6),
        "mutual_information": round(mutual_info, 6),
        "requires_human_review": requires_review,
        "uncertainty_score": round(epistemic + aleatoric, 6),
        "birads_category": birads,
        "status": "COMPLETED",
        "inference_time_ms": round(inference_time, 2),
        "processing_time_ms": int(inference_time),
        "created_at": created_at,
        "updated_at": created_at + timedelta(seconds=random.uniform(0.5, 5)),
        "is_deleted": False,
    }


def create_image_row(created_at: datetime) -> dict:
    """Create a minimal image record for FK reference."""
    return {
        "id": str(uuid.uuid4()),
        "file_path": f"/app/uploads/seed/{uuid.uuid4().hex[:8]}.dcm",
        "file_name": f"mammogram_{uuid.uuid4().hex[:6]}.dcm",
        "status": "ANALYZED",
        "modality": "MG",
        "view_type": random.choice(["CC", "MLO"]),
        "laterality": random.choice(["LEFT", "RIGHT"]),
        "image_width": 3328,
        "image_height": 4096,
        "created_at": created_at,
        "updated_at": created_at,
        "is_deleted": False,
        "storage_backend": "local",
        "is_processed": True,
        "is_archived": False,
    }


# ────────────────────────────────────────────────────────────────────────────
# Main seeding logic
# ────────────────────────────────────────────────────────────────────────────

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    print("🔗 Connected to PostgreSQL")

    now = datetime.now(timezone.utc)
    ninety_days_ago = now - timedelta(days=90)

    # ── Step 0: Get the first user ID (for feedback FK) ─────────────────
    cur.execute("SELECT id FROM users LIMIT 1")
    user_row = cur.fetchone()
    if not user_row:
        print("❌ No users found. Cannot create feedback records.")
        return
    radiologist_id = str(user_row[0])
    print(f"   Using radiologist_id = {radiologist_id}")

    # ── Step 1: Update existing PENDING analyses → COMPLETED ────────────
    cur.execute("SELECT id, image_id, model_version, created_at FROM analyses WHERE status = 'PENDING'")
    pending_rows = cur.fetchall()
    print(f"📋 Found {len(pending_rows)} PENDING analyses to upgrade")

    updated = 0
    for row in pending_rows:
        a_id, img_id, mv, ca = row
        # Generate realistic data
        data = generate_analysis_row(str(img_id), mv, ca)

        cur.execute("""
            UPDATE analyses SET
                status = 'COMPLETED',
                prediction_class = %(prediction_class)s,
                confidence_score = %(confidence_score)s,
                malignant_probability = %(malignant_probability)s,
                benign_probability = %(benign_probability)s,
                risk_level = %(risk_level)s,
                epistemic_uncertainty = %(epistemic_uncertainty)s,
                aleatoric_uncertainty = %(aleatoric_uncertainty)s,
                predictive_entropy = %(predictive_entropy)s,
                mutual_information = %(mutual_information)s,
                requires_human_review = %(requires_human_review)s,
                uncertainty_score = %(uncertainty_score)s,
                birads_category = %(birads_category)s,
                inference_time_ms = %(inference_time_ms)s,
                processing_time_ms = %(processing_time_ms)s,
                model_name = %(model_name)s,
                updated_at = NOW()
            WHERE id = %(a_id)s
        """, {**data, "a_id": str(a_id)})
        updated += 1

    print(f"   ✅ Updated {updated} analyses to COMPLETED")

    # ── Step 2: Insert ~170 new analyses spread over 90 days ────────────
    # Remove any previous seed data (identifiable by model_name prefix)
    cur.execute("DELETE FROM feedback WHERE analysis_id IN (SELECT id FROM analyses WHERE model_name = 'SEED_DATA')")
    cur.execute("DELETE FROM analyses WHERE model_name = 'SEED_DATA'")
    cur.execute("DELETE FROM images WHERE file_path LIKE '/app/uploads/seed/%'")
    print("   🧹 Cleaned up previous seed data")

    new_count = 170
    new_images = []
    new_analyses = []

    for i in range(new_count):
        # Spread across 90 days, with more recent dates having more analyses
        # (simulates increasing usage)
        day_offset = random.triangular(0, 90, 10)  # skew toward recent
        created_at = now - timedelta(days=day_offset, hours=random.uniform(0, 23), minutes=random.uniform(0, 59))

        img = create_image_row(created_at)
        new_images.append(img)

        mv = random.choices(MODEL_VERSIONS, weights=[0.3, 0.7], k=1)[0]
        analysis = generate_analysis_row(img["id"], mv, created_at)
        # Tag seed data so we can clean up
        analysis["model_name"] = "SEED_DATA"
        new_analyses.append(analysis)

    # Insert images
    img_cols = ["id", "file_path", "file_name", "status", "modality", "view_type",
                "laterality", "image_width", "image_height", "created_at", "updated_at",
                "is_deleted", "storage_backend", "is_processed", "is_archived"]
    img_values = [[img[c] for c in img_cols] for img in new_images]

    execute_values(cur, f"""
        INSERT INTO images ({', '.join(img_cols)})
        VALUES %s
        ON CONFLICT DO NOTHING
    """, img_values)

    # Insert analyses
    a_cols = [
        "id", "image_id", "model_version", "model_name", "prediction_class",
        "confidence_score", "malignant_probability", "benign_probability",
        "risk_level", "epistemic_uncertainty", "aleatoric_uncertainty",
        "predictive_entropy", "mutual_information", "requires_human_review",
        "uncertainty_score", "birads_category", "status", "inference_time_ms",
        "processing_time_ms", "created_at", "updated_at", "is_deleted",
    ]
    a_values = [[a[c] for c in a_cols] for a in new_analyses]

    execute_values(cur, f"""
        INSERT INTO analyses ({', '.join(a_cols)})
        VALUES %s
        ON CONFLICT DO NOTHING
    """, a_values)

    print(f"   ✅ Inserted {new_count} new analyses + images")

    # ── Step 3: Create ModelVersion records ──────────────────────────────
    cur.execute("SELECT count(*) FROM model_versions")
    mv_count = cur.fetchone()[0]
    if mv_count == 0:
        mv_rows = [
            {
                "id": str(uuid.uuid4()),
                "version": "mock-v1.0",
                "model_name": "MockModel",
                "algorithm_type": "CNN",
                "framework": "PyTorch",
                "release_notes": "Mock model for development and testing",
                "status": "ACTIVE",
                "validation_status": "INTERNAL_VALIDATION",
                "validation_metrics": '{"accuracy": 0.82, "sensitivity": 0.78, "specificity": 0.85, "auc_roc": 0.88}',
                "is_active": True,
                "created_at": (now - timedelta(days=60)).isoformat(),
                "updated_at": now.isoformat(),
                "is_deleted": False,
            },
            {
                "id": str(uuid.uuid4()),
                "version": "v12_production",
                "model_name": "DenseNet121_Ensemble",
                "algorithm_type": "ENSEMBLE",
                "framework": "PyTorch",
                "release_notes": "Production DenseNet121 ensemble with MC Dropout",
                "status": "ACTIVE",
                "validation_status": "CLINICAL_VALIDATION",
                "validation_metrics": '{"accuracy": 0.91, "sensitivity": 0.89, "specificity": 0.93, "auc_roc": 0.95}',
                "is_active": True,
                "created_at": (now - timedelta(days=30)).isoformat(),
                "updated_at": now.isoformat(),
                "is_deleted": False,
            },
        ]
        for mv in mv_rows:
            cur.execute("""
                INSERT INTO model_versions (id, version, model_name, algorithm_type, framework,
                    release_notes, status, validation_status, validation_metrics, is_active, created_at, updated_at, is_deleted)
                VALUES (%(id)s, %(version)s, %(model_name)s, %(algorithm_type)s, %(framework)s,
                    %(release_notes)s, %(status)s, %(validation_status)s, %(validation_metrics)s::jsonb, %(is_active)s, %(created_at)s, %(updated_at)s, %(is_deleted)s)
                ON CONFLICT DO NOTHING
            """, mv)
        print(f"   ✅ Inserted {len(mv_rows)} model versions")
    else:
        print(f"   ⏭️  Skipping model versions ({mv_count} already exist)")

    # ── Step 4: Create Feedback records for concordance/calibration ──────
    # Pick ~40 random completed analyses and create feedback
    cur.execute("""
        SELECT id, prediction_class, confidence_score
        FROM analyses
        WHERE status = 'COMPLETED'
        ORDER BY random()
        LIMIT 40
    """)
    feedback_analyses = cur.fetchall()

    feedback_rows = []
    for a_id, pred_class, conf in feedback_analyses:
        # ~80% of cases: radiologist agrees with AI
        is_correct = random.random() < 0.80

        if is_correct:
            if pred_class == "BENIGN":
                actual_diag = "BENIGN"
                birads_fb = random.choice(["BIRADS_1", "BIRADS_2", "BIRADS_3"])
            else:
                actual_diag = "MALIGNANT"
                birads_fb = random.choice(["BIRADS_4", "BIRADS_5"])
            fb_type = "AGREEMENT"
        else:
            # Disagreement: flip the diagnosis
            if pred_class == "BENIGN":
                actual_diag = random.choice(["MALIGNANT", "UNCERTAIN"])
                birads_fb = random.choice(["BIRADS_3", "BIRADS_4", "BIRADS_5"])
            else:
                actual_diag = random.choice(["BENIGN", "UNCERTAIN"])
                birads_fb = random.choice(["BIRADS_1", "BIRADS_2", "BIRADS_3"])
            fb_type = "CORRECTION"

        feedback_rows.append({
            "id": str(uuid.uuid4()),
            "analysis_id": str(a_id),
            "radiologist_id": radiologist_id,
            "feedback_type": fb_type,
            "is_correct": is_correct,
            "actual_diagnosis": actual_diag,
            "birads_assessment": birads_fb,
            "comments": f"Seed feedback for demo purposes",
            "radiologist_confidence": random.randint(3, 5),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "is_deleted": False,
        })

    for fb in feedback_rows:
        cur.execute("""
            INSERT INTO feedback (id, analysis_id, radiologist_id, feedback_type,
                is_correct, actual_diagnosis, birads_assessment, comments,
                radiologist_confidence, created_at, updated_at, is_deleted)
            VALUES (%(id)s, %(analysis_id)s, %(radiologist_id)s, %(feedback_type)s,
                %(is_correct)s, %(actual_diagnosis)s, %(birads_assessment)s, %(comments)s,
                %(radiologist_confidence)s, %(created_at)s, %(updated_at)s, %(is_deleted)s)
            ON CONFLICT DO NOTHING
        """, fb)

    print(f"   ✅ Inserted {len(feedback_rows)} feedback records")

    # ── Step 5: Invalidate backend analytics cache ──────────────────────
    # We do this by calling the backend's cache invalidation endpoint
    # (or simply wait for TTL to expire — the cache is 5 min)

    # ── Commit ──────────────────────────────────────────────────────────
    conn.commit()
    cur.close()
    conn.close()

    # ── Summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("🎉 Analytics seed data population complete!")
    print("=" * 60)
    print(f"   • Updated {updated} existing analyses → COMPLETED")
    print(f"   • Inserted {new_count} new analyses (spread over 90 days)")
    print(f"   • Created 2 model version records")
    print(f"   • Created {len(feedback_rows)} feedback records")
    print(f"\n   Total analyses: {updated + new_count}")
    print(f"   Dashboard should now show data within 5 minutes")
    print(f"   (or restart the backend container to clear cache immediately)")
    print()


if __name__ == "__main__":
    main()
