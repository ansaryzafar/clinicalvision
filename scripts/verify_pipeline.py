#!/usr/bin/env python3
"""
End-to-end verification of the ClinicalVision AI pipeline.
Tests: Auth → Health → Inference → DB persistence → Analytics → System Health
"""

import requests
import json
import io
import psycopg2
from PIL import Image

BASE = "http://localhost:8000"
DB = dict(host='localhost', port=15432, user='clinicalvision',
          password='secure_dev_password_123', dbname='clinicalvision_db')

passed = 0
failed = 0

def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {label}")
    else:
        failed += 1
        print(f"  ❌ {label} — {detail}")

# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("STEP 1: Authentication")
print("=" * 60)
auth_resp = requests.post(f"{BASE}/api/v1/auth/login", json={
    "email": "test@clinicalvision.ai", "password": "TestPass123!"
})
check("Login returns 200", auth_resp.status_code == 200, f"got {auth_resp.status_code}")
token = auth_resp.json().get("access_token", "")
headers = {"Authorization": f"Bearer {token}"}
check("JWT token obtained", len(token) > 20)

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 2: Backend Health Check")
print("=" * 60)
health = requests.get(f"{BASE}/health/").json()
check("Backend status healthy", health["status"] == "healthy")
check("AI model loaded", health["model_loaded"] is True)
check("Database connected", health.get("database_connected") is True)
check("API service healthy", health.get("services", {}).get("api") == "healthy")
check("Model service healthy", health.get("services", {}).get("model") == "healthy")
check("DB service healthy", health.get("services", {}).get("database") == "healthy")
print(f"     Uptime: {health.get('uptime_seconds', 0):.0f}s")

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 3: Pre-inference DB state")
print("=" * 60)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
cur.execute("SELECT count(*) FROM analyses")
total_before = cur.fetchone()[0]
print(f"     Total analyses before: {total_before}")
conn.close()

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 4: Running AI Inference (save_result=true)")
print("=" * 60)
test_img = Image.new('L', (256, 256), color=128)
for x in range(100, 150):
    for y in range(100, 150):
        test_img.putpixel((x, y), 200)
img_buffer = io.BytesIO()
test_img.save(img_buffer, format='PNG')
img_buffer.seek(0)

infer_resp = requests.post(
    f"{BASE}/inference/predict?save_result=true",
    headers=headers,
    files={"file": ("test_mammogram.png", img_buffer, "image/png")}
)
check("Inference returns 200", infer_resp.status_code == 200, f"got {infer_resp.status_code}: {infer_resp.text[:200]}")

if infer_resp.status_code == 200:
    result = infer_resp.json()
    pred = result.get("prediction", "").upper()
    check("Prediction class present", pred in ("BENIGN", "MALIGNANT"), result.get("prediction"))
    check("Confidence in [0,1]", 0.0 <= result.get("confidence", -1) <= 1.0)
    check("Risk level present", result.get("risk_level") in ("low", "moderate", "high"))
    check("Uncertainty object present", "uncertainty" in result)
    check("Inference time recorded", result.get("inference_time_ms", 0) > 0)
    check("Case ID generated", result.get("case_id") is not None)
    check("Model version set", result.get("model_version") is not None)
    check("Explanation present", "explanation" in result)
    print(f"     Prediction: {result['prediction']}, Confidence: {result['confidence']:.4f}")
    print(f"     Risk: {result['risk_level']}, Review: {result['uncertainty']['requires_human_review']}")
    print(f"     Time: {result.get('inference_time_ms', 0):.0f}ms, Model: {result.get('model_version')}")

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 5: DB Persistence Verification")
print("=" * 60)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
cur.execute("SELECT count(*) FROM analyses")
total_after = cur.fetchone()[0]
check("New analysis saved to DB", total_after == total_before + 1, f"before={total_before}, after={total_after}")

cur.execute("SELECT status, count(*) FROM analyses GROUP BY status ORDER BY status")
status_counts = {row[0]: row[1] for row in cur.fetchall()}
print(f"     Status distribution: {status_counts}")
check("No PENDING analyses remain", status_counts.get("PENDING", 0) == 0, f"PENDING={status_counts.get('PENDING', 0)}")

# Check the latest analysis was saved as COMPLETED
cur.execute("""
    SELECT status, prediction_class, confidence_score, model_version,
           inference_time_ms, risk_level, birads_category,
           epistemic_uncertainty, processing_metadata
    FROM analyses ORDER BY created_at DESC LIMIT 1
""")
latest = cur.fetchone()
check("Latest analysis status is COMPLETED", latest[0] == "COMPLETED", f"got {latest[0]}")
check("Latest has prediction_class", latest[1] in ("BENIGN", "MALIGNANT"))
check("Latest has confidence_score", latest[2] is not None and latest[2] > 0)
check("Latest has model_version", latest[3] is not None)
check("Latest has inference_time_ms", latest[4] is not None and latest[4] > 0)
check("Latest has risk_level", latest[5] in ("low", "moderate", "high"))
check("Latest has processing_metadata", latest[8] is not None)
print(f"     Latest: {latest[1]}, conf={latest[2]:.4f}, model={latest[3]}, time={latest[4]:.0f}ms")

conn.close()

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 6: Analytics Endpoints Verification")
print("=" * 60)
# Overview
ov = requests.get(f"{BASE}/api/v1/analytics/overview?period=all", headers=headers)
check("Overview returns 200", ov.status_code == 200)
if ov.status_code == 200:
    ovd = ov.json()
    check("Overview has total_analyses > 0", ovd["kpis"]["total_analyses"] > 0)
    check("Overview has confidence_trend data", len(ovd["confidence_trend"]) > 0)
    check("Overview has prediction_distribution", ovd["prediction_distribution"]["benign"] + ovd["prediction_distribution"]["malignant"] > 0)
    check("Overview has birads_distribution", len(ovd["birads_distribution"]) > 0)
    check("Overview has risk_distribution", ovd["risk_distribution"]["low"] + ovd["risk_distribution"]["moderate"] + ovd["risk_distribution"]["high"] > 0)
    check("Overview has latency_percentiles", len(ovd["latency_percentiles"]) > 0)
    print(f"     Total: {ovd['kpis']['total_analyses']}, Conf: {ovd['kpis']['average_confidence']:.1%}")

# Performance
perf = requests.get(f"{BASE}/api/v1/analytics/performance?period=all", headers=headers)
check("Performance returns 200", perf.status_code == 200)
if perf.status_code == 200:
    pd = perf.json()
    check("Performance has sensitivity", pd["kpis"]["sensitivity"] >= 0)
    check("Performance has confidence_histogram", len(pd["confidence_histogram"]) > 0)
    check("Performance has uncertainty_scatter", len(pd["uncertainty_scatter"]) > 0)
    check("Performance has temporal_confidence", len(pd["temporal_confidence"]) > 0)
    print(f"     Sens: {pd['kpis']['sensitivity']:.1%}, Spec: {pd['kpis']['specificity']:.1%}, AUC: {pd['kpis']['auc_roc']:.1%}")

# Model Intelligence
mi = requests.get(f"{BASE}/api/v1/analytics/model-intelligence?period=all", headers=headers)
check("Model Intelligence returns 200", mi.status_code == 200)
if mi.status_code == 200:
    mid = mi.json()
    check("MI has uncertainty_decomposition", len(mid["uncertainty_decomposition"]) > 0)
    check("MI has model_version_comparison", len(mid["model_version_comparison"]) > 0)
    check("MI has review_triggers", len(mid["review_triggers"]) > 0)
    check("MI has entropy_distribution", len(mid["entropy_distribution"]) > 0)

# System Health
sh = requests.get(f"{BASE}/api/v1/analytics/system-health", headers=headers)
check("System Health returns 200", sh.status_code == 200)
if sh.status_code == 200:
    shd = sh.json()
    check("Model status healthy", shd["model_status"] == "healthy")
    check("Backend status healthy", shd["backend_status"] == "healthy")
    check("Uptime > 0", shd["uptime_seconds"] > 0)
    print(f"     Model: {shd['model_version']}, Uptime: {shd['uptime_seconds']:.0f}s, Errors: {shd['error_count_24h']}")

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("STEP 7: Database Integrity Checks")
print("=" * 60)
conn = psycopg2.connect(**DB)
cur = conn.cursor()

# FK integrity: every analysis has a valid image
cur.execute("""
    SELECT count(*) FROM analyses a
    LEFT JOIN images i ON a.image_id = i.id
    WHERE i.id IS NULL
""")
orphans = cur.fetchone()[0]
check("No orphaned analyses (all have valid image FK)", orphans == 0, f"orphans={orphans}")

# Users exist
cur.execute("SELECT count(*) FROM users")
user_count = cur.fetchone()[0]
check("Users table populated", user_count > 0, f"count={user_count}")

# Model versions exist
cur.execute("SELECT count(*) FROM model_versions")
mv_count = cur.fetchone()[0]
check("Model versions populated", mv_count > 0, f"count={mv_count}")

# Feedback records exist
cur.execute("SELECT count(*) FROM feedback")
fb_count = cur.fetchone()[0]
check("Feedback records exist", fb_count > 0, f"count={fb_count}")

conn.close()

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} checks")
print("=" * 60)
if failed == 0:
    print("🎉 ALL CHECKS PASSED — Full pipeline is operational!")
else:
    print(f"⚠️  {failed} checks failed — review above for details")
