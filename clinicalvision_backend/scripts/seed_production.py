#!/usr/bin/env python3
"""
Production Database Seeder — Self-contained, no external dependencies (no Faker).

Seeds the production database with realistic medical imaging data so the
dashboard, analytics, fairness monitor, and AI Results Archive display
meaningful metrics.

Creates:
  - 5 organizations
  - 25 users (admins, radiologists, technicians)
  - 250 patients
  - 500 studies
  - 2000 images (4-view mammograms)
  - 2000 analyses (AI predictions: ~87% benign, ~13% malignant)
  - 500 feedback entries (radiologist ground truth)
  - 3 demo clinical cases
  - 5 model versions
  - 150 model performance logs (30 days)

Usage:
    docker exec clinicalvision-backend python -m scripts.seed_production
"""

import hashlib
import random
import sys
import os
from datetime import date, datetime, timedelta
from uuid import uuid4

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.db.models import (
    Organization, User, Patient, Study, Image, Analysis, Feedback, AuditLog,
)
from app.db.models.user import UserRole
from app.db.models.organization import SubscriptionTier
from app.db.models.patient import Gender
from app.db.models.study import Modality, StudyStatus
from app.db.models.image import ViewType, Laterality, ImageStatus
from app.db.models.analysis import PredictionClass, BIRADSCategory, AnalysisStatus
from app.db.models.feedback import FeedbackType, DiagnosisType, BIRADSAssessment

# Try importing optional models
try:
    from app.db.models.model_version import (
        ModelVersion, ModelPerformanceLog, AlgorithmType, ModelStatus,
        DeploymentEnvironment, ValidationStatus,
    )
except ImportError:
    ModelVersion = None
    ModelPerformanceLog = None
    AlgorithmType = None
    ModelStatus = None

random.seed(42)  # Reproducible

# ── Constants ──────────────────────────────────────────────────────
FACILITIES = [
    "Memorial Sloan Kettering Cancer Center",
    "Mayo Clinic Radiology",
    "Cleveland Clinic Imaging",
    "Johns Hopkins Hospital Radiology",
    "Massachusetts General Hospital",
]

SPECIALIZATIONS = [
    "Breast Imaging", "Diagnostic Radiology", "Interventional Radiology",
    "Women's Imaging", "Oncologic Imaging", "Mammography",
]

FIRST_NAMES = [
    "Alice", "Robert", "Catherine", "David", "Emily", "Frank", "Grace",
    "Henry", "Isabella", "James", "Karen", "Leo", "Maria", "Nathan",
    "Olivia", "Patrick", "Quinn", "Rachel", "Samuel", "Teresa",
    "Uma", "Victor", "Wendy", "Xavier", "Yolanda",
]

LAST_NAMES = [
    "Anderson", "Baker", "Chen", "Davis", "Evans", "Foster", "Garcia",
    "Harris", "Ibrahim", "Johnson", "Kim", "Lee", "Martinez", "Nguyen",
    "O'Brien", "Patel", "Quinn", "Rodriguez", "Smith", "Thompson",
    "Umar", "Vasquez", "Williams", "Xu", "Young",
]

INDICATIONS = [
    "Screening mammogram, asymptomatic",
    "Diagnostic workup for palpable mass",
    "Follow-up for known finding",
    "Family history of breast cancer",
    "Post-surgical surveillance",
    "Dense breast tissue evaluation",
    "Nipple discharge evaluation",
    "Pain evaluation",
    "High-risk screening (BRCA positive)",
    "Comparison with prior imaging",
]


# ── Helpers ──────────────────────────────────────────────────────

def _hash_pid(n: int, org_id: str) -> str:
    return hashlib.sha256(f"PATIENT_{org_id}_{n:06d}".encode()).hexdigest()[:32]


def _random_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


# ── Seeders ──────────────────────────────────────────────────────

def seed_organizations(db) -> list:
    print("\n  Creating 5 organizations …")
    orgs = []
    for name in FACILITIES:
        org = Organization(
            name=name,
            subscription_tier=random.choice([
                SubscriptionTier.PROFESSIONAL, SubscriptionTier.ENTERPRISE
            ]),
            email=f"admin@{name.lower().replace(' ', '')[:20]}.com"[:50],
            phone=f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}",
            is_active=True,
        )
        db.add(org)
        orgs.append(org)
    db.commit()
    for o in orgs:
        db.refresh(o)
    print(f"  ✓ {len(orgs)} organizations")
    return orgs


def seed_users(db, orgs, existing_demo_user=None) -> list:
    print("  Creating users (5 per org) …")
    users = []
    pw_hash = hashlib.sha256(b"password123").hexdigest()
    used_emails = set()
    user_counter = 0

    def _unique_email(prefix, ln):
        nonlocal user_counter
        user_counter += 1
        return f"{prefix}.{ln.lower()}.{user_counter:04d}@cv.ai"

    for oi, org in enumerate(orgs):
        # 1 admin
        fn, ln = _random_name()
        email = _unique_email("admin", ln)
        admin = User(
            organization_id=org.id, email=email,
            hashed_password=pw_hash, first_name=fn, last_name=ln,
            role=UserRole.ADMIN, is_active=True, email_verified=True,
        )
        db.add(admin); users.append(admin)

        # 3 radiologists
        for _ in range(3):
            fn, ln = _random_name()
            email = _unique_email("rad", ln)
            rad = User(
                organization_id=org.id,
                email=email,
                hashed_password=pw_hash,
                first_name=f"Dr. {fn}", last_name=ln,
                role=UserRole.RADIOLOGIST,
                license_number=f"RAD{random.randint(100000,999999)}",
                specialization=random.choice(SPECIALIZATIONS),
                is_active=True, email_verified=True,
            )
            db.add(rad); users.append(rad)

        # 1 technician
        fn, ln = _random_name()
        email = _unique_email("tech", ln)
        tech = User(
            organization_id=org.id, email=email,
            hashed_password=pw_hash, first_name=fn, last_name=ln,
            role=UserRole.TECHNICIAN, is_active=True, email_verified=True,
        )
        db.add(tech); users.append(tech)

    db.commit()
    for u in users:
        db.refresh(u)

    # Include existing demo user if present
    if existing_demo_user:
        users.append(existing_demo_user)

    print(f"  ✓ {len(users)} users")
    return users


def seed_patients(db, orgs, per_org=50) -> list:
    print(f"  Creating {per_org} patients per org …")
    patients = []
    for org in orgs:
        for i in range(per_org):
            age = random.randint(40, 80)
            dob = date.today() - timedelta(days=age * 365 + random.randint(0, 365))
            p = Patient(
                organization_id=org.id,
                patient_identifier_hash=_hash_pid(i, str(org.id)),
                date_of_birth=dob,
                gender=Gender.FEMALE,
                has_breast_cancer_history=random.choice(["no", "yes", "unknown"]),
                has_family_history=random.choice(["no", "yes", "unknown"]),
            )
            db.add(p); patients.append(p)
    db.commit()
    for p in patients:
        db.refresh(p)
    print(f"  ✓ {len(patients)} patients")
    return patients


def seed_studies(db, patients, per_patient=(1, 3)) -> list:
    print("  Creating studies …")
    studies = []; acc = 100000
    for patient in patients:
        n = random.randint(*per_patient)
        for i in range(n):
            sd = date.today() - timedelta(days=random.randint(1, 1095))
            s = Study(
                organization_id=patient.organization_id,
                patient_id=patient.id,
                accession_number=f"ACC{acc:08d}",
                study_date=sd,
                modality=Modality.MG,
                study_description="Digital Screening Mammogram" if i == 0 else "Diagnostic Mammogram",
                referring_physician=f"Dr. {random.choice(LAST_NAMES)}",
                status=StudyStatus.COMPLETED if random.random() > 0.05 else StudyStatus.ANALYZED,
                clinical_indication=random.choice(INDICATIONS),
            )
            db.add(s); studies.append(s); acc += 1
        if len(studies) % 100 == 0:
            db.commit()
    db.commit()
    for s in studies:
        db.refresh(s)
    print(f"  ✓ {len(studies)} studies")
    return studies


def seed_images(db, studies) -> list:
    print("  Creating images (4 per study) …")
    images = []
    views = [
        (ViewType.CC, Laterality.RIGHT), (ViewType.CC, Laterality.LEFT),
        (ViewType.MLO, Laterality.RIGHT), (ViewType.MLO, Laterality.LEFT),
    ]
    for study in studies:
        for vt, lat in views:
            img = Image(
                study_id=study.id,
                file_path=f"/data/{study.accession_number}/{lat.value}_{vt.value}.dcm",
                file_size_bytes=random.randint(2_000_000, 10_000_000),
                checksum=hashlib.sha256(f"{study.id}_{vt}_{lat}".encode()).hexdigest(),
                sop_instance_uid=f"1.2.840.{random.randint(100000,999999)}.{random.randint(1,999)}",
                series_instance_uid=f"1.2.840.{random.randint(100000,999999)}",
                view_type=vt, laterality=lat,
                image_width=random.choice([2048, 3328, 4096]),
                image_height=random.choice([2048, 4096, 4864]),
                bits_stored=random.choice([12, 14, 16]),
                status=ImageStatus.READY,
                quality_score=random.uniform(0.85, 1.0),
            )
            db.add(img); images.append(img)
        if len(images) % 400 == 0:
            db.commit()
    db.commit()
    for img in images:
        db.refresh(img)
    print(f"  ✓ {len(images)} images")
    return images


def seed_analyses(db, images) -> list:
    print("  Creating AI analyses (~87% benign, ~13% malignant) …")
    analyses = []
    model_versions = ["v1.0.0", "v1.1.0", "v1.2.0", "v2.0.0-beta"]
    for image in images:
        is_benign = random.random() < 0.87
        if is_benign:
            pred = PredictionClass.BENIGN
            conf = random.uniform(0.70, 0.98)
            birads = random.choice([BIRADSCategory.BIRADS_1, BIRADSCategory.BIRADS_2, BIRADSCategory.BIRADS_3])
        else:
            pred = PredictionClass.MALIGNANT
            conf = random.uniform(0.60, 0.95)
            birads = random.choice([BIRADSCategory.BIRADS_4, BIRADSCategory.BIRADS_5])

        uncertainty = random.uniform(0.05, 0.20) * (1 - conf)
        a = Analysis(
            image_id=image.id,
            model_version=random.choice(model_versions),
            model_name="DenseNet121_Ensemble",
            prediction_class=pred,
            confidence_score=conf,
            uncertainty_score=uncertainty,
            birads_category=birads,
            prediction_probabilities={
                "benign": conf if is_benign else 1 - conf,
                "malignant": 1 - conf if is_benign else conf,
            },
            explainability_data={
                "gradcam_available": True,
                "attention_maps": ["layer3", "layer4"],
                "roi_detected": random.choice([True, False]),
            },
            roi_coordinates=[{
                "x": random.randint(100, 1000), "y": random.randint(100, 1000),
                "width": random.randint(50, 200), "height": random.randint(50, 200),
                "confidence": random.uniform(0.7, 0.95),
            }] if random.random() > 0.3 else None,
            status=AnalysisStatus.COMPLETED,
            processing_time_ms=random.randint(800, 3000),
        )
        db.add(a); analyses.append(a)
        if len(analyses) % 500 == 0:
            db.commit()
            print(f"    … {len(analyses)} analyses")
    db.commit()
    for a in analyses:
        db.refresh(a)
    print(f"  ✓ {len(analyses)} analyses")
    return analyses


def seed_feedback(db, analyses, users, rate=0.25) -> list:
    print(f"  Creating radiologist feedback (~{int(rate * 100)}% of analyses) …")
    rads = [u for u in users if u.role == UserRole.RADIOLOGIST]
    if not rads:
        rads = users[:1]  # fallback

    sample_size = int(len(analyses) * rate)
    sampled = random.sample(analyses, min(sample_size, len(analyses)))
    fb_list = []

    comments_pool = [
        "Clear benign finding, no follow-up needed.",
        "Agree with AI assessment; typical benign morphology.",
        "Suspicious calcifications warrant further evaluation.",
        "Mass with irregular margins — biopsy recommended.",
        "Finding consistent with fibroadenoma.",
        "Dense tissue limits sensitivity; consider MRI.",
        "Stable compared to prior study.",
        "New asymmetry noted; additional views recommended.",
        None, None, None,  # many have no comment
    ]

    for analysis in sampled:
        rad = random.choice(rads)
        if analysis.prediction_class == PredictionClass.BENIGN:
            agrees = random.random() < 0.90
        else:
            agrees = random.random() < 0.80

        if agrees:
            actual = DiagnosisType.BENIGN if analysis.prediction_class == PredictionClass.BENIGN else DiagnosisType.MALIGNANT
            fb_type = FeedbackType.AGREEMENT
        else:
            actual = DiagnosisType.MALIGNANT if analysis.prediction_class == PredictionClass.BENIGN else DiagnosisType.BENIGN
            fb_type = FeedbackType.CORRECTION

        fb = Feedback(
            analysis_id=analysis.id,
            radiologist_id=rad.id,
            feedback_type=fb_type,
            is_correct=agrees,
            actual_diagnosis=actual,
            birads_assessment=random.choice(list(BIRADSAssessment)),
            comments=random.choice(comments_pool),
            radiologist_confidence=random.randint(3, 5),
            biopsy_performed=(actual == DiagnosisType.MALIGNANT and random.random() > 0.5),
            pathology_result=(
                "Invasive ductal carcinoma" if actual == DiagnosisType.MALIGNANT and random.random() > 0.5
                else None
            ),
        )
        db.add(fb); fb_list.append(fb)
        if len(fb_list) % 200 == 0:
            db.commit()
    db.commit()
    print(f"  ✓ {len(fb_list)} feedback entries")
    return fb_list


def seed_model_versions(db, orgs):
    """Seed model version history."""
    if ModelVersion is None:
        print("  ⚠ ModelVersion model not available, skipping")
        return

    existing = db.query(ModelVersion).count()
    if existing > 0:
        print(f"  ⚠ {existing} model versions already exist, skipping")
        return

    print("  Creating model versions …")
    org_id = orgs[0].id
    versions = [
        {"version": "v1.0.0", "model_name": "ClinicalVision-DenseNet",
         "algorithm_type": AlgorithmType.CNN,
         "architecture": "DenseNet121", "framework": "PyTorch 1.12",
         "status": ModelStatus.RETIRED,
         "training_dataset_size": 10000, "is_active": False,
         "validation_metrics": {"auc_roc": 0.89, "sensitivity": 0.85, "specificity": 0.91, "f1_score": 0.87, "accuracy": 0.88}},
        {"version": "v1.1.0", "model_name": "ClinicalVision-DenseNet",
         "algorithm_type": AlgorithmType.TRANSFER_LEARNING,
         "architecture": "DenseNet121-Enhanced", "framework": "PyTorch 1.13",
         "status": ModelStatus.RETIRED,
         "training_dataset_size": 25000, "is_active": False,
         "validation_metrics": {"auc_roc": 0.92, "sensitivity": 0.88, "specificity": 0.93, "f1_score": 0.90, "accuracy": 0.91}},
        {"version": "v1.2.0", "model_name": "ClinicalVision-Ensemble",
         "algorithm_type": AlgorithmType.ENSEMBLE,
         "architecture": "DenseNet121+ResNet50-Ensemble", "framework": "PyTorch 2.0",
         "status": ModelStatus.ACTIVE,
         "training_dataset_size": 50000, "is_active": True,
         "validation_metrics": {"auc_roc": 0.95, "sensitivity": 0.92, "specificity": 0.96, "f1_score": 0.93, "accuracy": 0.94}},
        {"version": "v2.0.0-beta", "model_name": "ClinicalVision-ViT",
         "algorithm_type": AlgorithmType.TRANSFORMER,
         "architecture": "Vision Transformer (ViT-B/16)", "framework": "PyTorch 2.1",
         "status": ModelStatus.VALIDATION,
         "training_dataset_size": 75000, "is_active": False,
         "validation_metrics": {"auc_roc": 0.96, "sensitivity": 0.93, "specificity": 0.97, "f1_score": 0.95, "accuracy": 0.95}},
        {"version": "v2.0.0", "model_name": "ClinicalVision-ViT",
         "algorithm_type": AlgorithmType.HYBRID,
         "architecture": "Vision Transformer (ViT-B/16) + DenseNet Ensemble", "framework": "PyTorch 2.2",
         "status": ModelStatus.DEVELOPMENT,
         "training_dataset_size": 100000, "is_active": False,
         "validation_metrics": {"auc_roc": 0.97, "sensitivity": 0.94, "specificity": 0.97, "f1_score": 0.96, "accuracy": 0.96}},
    ]
    td = datetime.utcnow() - timedelta(days=365)
    for v in versions:
        mv = ModelVersion(
            organization_id=org_id,
            model_name=v["model_name"],
            version=v["version"],
            algorithm_type=v["algorithm_type"],
            architecture=v["architecture"],
            framework=v["framework"],
            status=v["status"],
            is_active=v["is_active"],
            training_dataset_size=v["training_dataset_size"],
            training_date=td.isoformat(),
            validation_metrics=v["validation_metrics"],
            validation_status=ValidationStatus.CLINICAL_VALIDATION,
            intended_use="AI-assisted breast cancer detection in digital mammography",
            developed_by="ClinicalVision AI Team",
            contact_email="ai-team@clinicalvision.ai",
        )
        db.add(mv)
        td += timedelta(days=random.randint(60, 120))
    db.commit()
    print(f"  ✓ {len(versions)} model versions")


def seed_performance_logs(db, days=30):
    """Seed daily performance logs for active models."""
    if ModelPerformanceLog is None:
        print("  ⚠ ModelPerformanceLog model not available, skipping")
        return

    existing = db.query(ModelPerformanceLog).count()
    if existing > 0:
        print(f"  ⚠ {existing} performance logs exist, skipping")
        return

    if ModelVersion is None:
        return

    active_versions = db.query(ModelVersion).filter_by(is_active=True).all()
    if not active_versions:
        active_versions = db.query(ModelVersion).limit(2).all()

    if not active_versions:
        print("  ⚠ No model versions found, skipping performance logs")
        return

    print(f"  Creating {days}-day performance logs …")
    count = 0
    for mv in active_versions:
        for d in range(days):
            log_dt = datetime.utcnow() - timedelta(days=days - d)
            # Slight daily drift for realism
            base_auc = (mv.validation_metrics or {}).get("auc_roc", 0.92)
            drift = random.uniform(-0.02, 0.02)
            total_preds = random.randint(50, 200)
            agreement = random.uniform(0.80, 0.95)
            log = ModelPerformanceLog(
                model_version_id=mv.id,
                log_date=log_dt.date().isoformat(),
                measurement_window_days=1,
                total_predictions=total_preds,
                avg_confidence=random.uniform(0.78, 0.92),
                avg_inference_time_ms=random.uniform(800, 2500),
                feedback_received=random.randint(5, 40),
                agreement_rate=agreement,
                metrics={
                    "accuracy": min(1.0, max(0.5, base_auc - 0.01 + drift)),
                    "sensitivity": min(1.0, max(0.5, base_auc - 0.03 + drift)),
                    "specificity": min(1.0, max(0.5, base_auc + 0.02 + drift)),
                    "auc_roc": min(1.0, max(0.5, base_auc + drift)),
                    "f1_score": min(1.0, max(0.5, base_auc - 0.01 + drift)),
                    "precision": min(1.0, max(0.5, base_auc + 0.01 + drift)),
                },
            )
            db.add(log); count += 1
    db.commit()
    print(f"  ✓ {count} performance logs")


def seed_demo_cases(db, users):
    """Seed 3 demo clinical cases (delegates to existing script)."""
    try:
        from scripts.seed_demo_cases import seed_demo_cases as _seed, create_demo_user
        demo_user = db.query(User).filter_by(email="demo@clinicalvision.ai").first()
        if not demo_user:
            demo_user = create_demo_user(db)
        cases = _seed(db, demo_user.id)
        print(f"  ✓ {len(cases)} demo clinical cases")
    except Exception as e:
        print(f"  ⚠ Demo cases skipped: {e}")


# ── Main ──────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CLINICALVISION PRODUCTION DATABASE SEEDER")
    print("=" * 60)

    db = SessionLocal()
    try:
        # Pre-flight: count existing records
        user_count = db.query(User).count()
        analysis_count = db.query(Analysis).count()
        org_count = db.query(Organization).count()

        if analysis_count > 10:
            print(f"\n  ⚠ Database already has {analysis_count} analyses and {user_count} users.")
            print("  Skipping seed to avoid duplicates. To re-seed, truncate tables first.")
            return

        # Clean up partial previous runs (orgs created but users failed)
        if org_count > 1 and user_count <= 2 and analysis_count == 0:
            print(f"\n  ⚠ Detected partial seed ({org_count} orgs, {user_count} users, 0 analyses)")
            print("  Cleaning up partial data before fresh seed ...")
            # Delete orgs that aren't the original ClinicalVision Demo org
            db.execute(text("DELETE FROM organizations WHERE name != 'ClinicalVision Demo'"))
            db.commit()
            print("  ✓ Partial data cleaned")

        # Preserve existing demo user
        demo_user = db.query(User).filter_by(email="demo@clinicalvision.ai").first()

        start = datetime.now()

        orgs = seed_organizations(db)
        users = seed_users(db, orgs, existing_demo_user=demo_user)
        patients = seed_patients(db, orgs, per_org=50)
        studies = seed_studies(db, patients, per_patient=(1, 3))
        images = seed_images(db, studies)
        analyses = seed_analyses(db, images)
        seed_feedback(db, analyses, users, rate=0.25)
        seed_model_versions(db, orgs)
        seed_performance_logs(db, days=30)
        seed_demo_cases(db, users)

        elapsed = (datetime.now() - start).total_seconds()

        # Summary
        print("\n" + "=" * 60)
        print("  SEEDING COMPLETE")
        print("=" * 60)
        for tbl_name in ["organizations", "users", "patients", "studies",
                         "images", "analyses", "feedback", "clinical_cases",
                         "model_versions", "model_performance_logs"]:
            try:
                cnt = db.execute(text(f"SELECT count(*) FROM {tbl_name}")).scalar()
                print(f"  {tbl_name:30} {cnt:>8}")
            except:
                pass

        # Prediction distribution (use ORM to handle enum properly)
        benign = db.query(Analysis).filter(
            Analysis.prediction_class == PredictionClass.BENIGN
        ).count()
        malignant = db.query(Analysis).filter(
            Analysis.prediction_class == PredictionClass.MALIGNANT
        ).count()
        total = (benign or 0) + (malignant or 0)
        if total:
            print(f"\n  Benign:    {benign:>6} ({benign/total*100:.1f}%)")
            print(f"  Malignant: {malignant:>6} ({malignant/total*100:.1f}%)")

        print(f"\n  Time: {elapsed:.1f}s")
        print("=" * 60)

    except Exception as e:
        print(f"\n  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
