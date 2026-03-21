"""
Seed Demo Cases — Populate clinical_cases, case_images tables with curated demo data.

Creates the 3 demo cases from the ClinicalVision demo data package so the
full 12-step clinical workflow can be exercised with realistic, pre-populated data.

Exports:
 DEMO_CASE_SPECS — List of 3 case specification dicts
 seed_demo_cases(db, user_id) — Main seeder (idempotent)
 create_demo_user(db) → User — Create / retrieve demo user
 build_clinical_history_json(...) → dict — Helper for clinical history JSONB

Usage (standalone):
 cd clinicalvision_backend
 python -m scripts.seed_demo_cases

Usage (from code):
 from scripts.seed_demo_cases import seed_demo_cases, create_demo_user
 from app.db.session import get_db_context
 with get_db_context() as db:
 user = create_demo_user(db)
 seed_demo_cases(db, user.id)
"""

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models.clinical_case import (
 CaseImage,
 CaseWorkflowStatus,
 CaseWorkflowStep,
 ClinicalCase,
)
from app.db.models.organization import Organization, SubscriptionTier
from app.db.models.user import User, UserRole


# ============================================================================
# DEMO CASE SPECIFICATIONS
# ============================================================================

DEMO_CASE_SPECS: List[Dict[str, Any]] = [
 # ── DEMO-001 — Benign, Easy ─────────────────────────────────────────
 {
 "demo_id": "DEMO-001",
 "patient": {
 "mrn": "DEMO-001",
 "first_name": "Jane",
 "last_name": "Thompson",
 "sex": "F",
 "dob": date(1978, 3, 15),
 },
 "clinical_history": {
 "indication": "Routine screening mammogram — annual follow-up",
 "priorStudies": "Prior screening mammogram 12 months ago, unremarkable",
 "brcaStatus": "Negative",
 "familyHistory": "No significant family history of breast cancer",
 "symptoms": "Asymptomatic",
 },
 "images": [
 {"filename": "DEMO-001_RIGHT_CC.png", "view_type": "CC", "laterality": "R"},
 {"filename": "DEMO-001_RIGHT_MLO.png", "view_type": "MLO", "laterality": "R"},
 {"filename": "DEMO-001_LEFT_CC.png", "view_type": "CC", "laterality": "L"},
 {"filename": "DEMO-001_LEFT_MLO.png", "view_type": "MLO", "laterality": "L"},
 ],
 },
 # ── DEMO-002 — Malignant, Intermediate ──────────────────────────────
 {
 "demo_id": "DEMO-002",
 "patient": {
 "mrn": "DEMO-002",
 "first_name": "Maria",
 "last_name": "Chen",
 "sex": "F",
 "dob": date(1965, 7, 22),
 },
 "clinical_history": {
 "indication": "Diagnostic mammogram — palpable mass in left breast",
 "priorStudies": "Screening mammogram 6 months ago — BI-RADS 0, recommended diagnostic workup",
 "brcaStatus": "Unknown",
 "familyHistory": "Mother diagnosed with breast cancer at age 58",
 "symptoms": "Palpable mass left breast, upper outer quadrant",
 },
 "images": [
 {"filename": "DEMO-002_RIGHT_CC.png", "view_type": "CC", "laterality": "R"},
 {"filename": "DEMO-002_RIGHT_MLO.png", "view_type": "MLO", "laterality": "R"},
 {"filename": "DEMO-002_LEFT_CC.png", "view_type": "CC", "laterality": "L"},
 {"filename": "DEMO-002_LEFT_MLO.png", "view_type": "MLO", "laterality": "L"},
 {"filename": "DEMO-002_LEFT_SPOT.png", "view_type": "SPOT", "laterality": "L"},
 {"filename": "DEMO-002_LEFT_MAG.png", "view_type": "MAG", "laterality": "L"},
 ],
 },
 # ── DEMO-003 — Malignant, Advanced ──────────────────────────────────
 {
 "demo_id": "DEMO-003",
 "patient": {
 "mrn": "DEMO-003",
 "first_name": "Sarah",
 "last_name": "Williams",
 "sex": "F",
 "dob": date(1952, 11, 8),
 },
 "clinical_history": {
 "indication": "Diagnostic mammogram — suspicious calcifications on prior screening",
 "priorStudies": "Screening mammogram 3 months ago — suspicious calcification cluster left breast",
 "brcaStatus": "Positive (BRCA2)",
 "familyHistory": "Sister and maternal aunt with breast cancer; BRCA2 carrier",
 "symptoms": "No palpable mass; calcifications identified on prior imaging",
 },
 "images": [
 {"filename": "DEMO-003_LEFT_CC.png", "view_type": "CC", "laterality": "L"},
 {"filename": "DEMO-003_LEFT_MLO.png", "view_type": "MLO", "laterality": "L"},
 ],
 },
]


# ============================================================================
# HELPER — build clinical history JSONB
# ============================================================================

def build_clinical_history_json(
 indication: str,
 prior_studies: str,
 brca_status: str,
 family_history: str,
 symptoms: str,
) -> Dict[str, str]:
 """Build a clinical history dict suitable for JSONB storage."""
 return {
 "indication": indication,
 "priorStudies": prior_studies,
 "brcaStatus": brca_status,
 "familyHistory": family_history,
 "symptoms": symptoms,
 }


# ============================================================================
# create_demo_user — create or retrieve the demo radiologist
# ============================================================================

DEMO_ORG_NAME = "ClinicalVision Demo"
DEMO_EMAIL = "demo@clinicalvision.ai"


def create_demo_user(db: Session) -> User:
 """
 Create (or retrieve) the demo radiologist user.

 Also creates a demo Organization if none exists (User.organization_id
 is NOT NULL). Idempotent — returns the existing user on subsequent calls.
 """
 # Check if user already exists
 existing = db.query(User).filter_by(email=DEMO_EMAIL).first()
 if existing is not None:
 return existing

 # Ensure a demo organisation exists
 org = db.query(Organization).filter_by(name=DEMO_ORG_NAME).first()
 if org is None:
 org = Organization(
 name=DEMO_ORG_NAME,
 subscription_tier=SubscriptionTier.PROFESSIONAL,
 is_active=True,
 email="admin@clinicalvision.ai",
 )
 db.add(org)
 db.flush() # flush to get org.id

 user = User(
 organization_id=org.id,
 email=DEMO_EMAIL,
 hashed_password="demo-seed-not-for-login", # placeholder — not a real credential
 first_name="Demo",
 last_name="Radiologist",
 role=UserRole.RADIOLOGIST,
 is_active=True,
 )
 db.add(user)
 db.flush() # flush to get user.id

 return user


# ============================================================================
# seed_demo_cases — idempotent seeder
# ============================================================================

def _generate_case_number(db: Session) -> str:
 """Generate the next available case number: CV-YYYY-NNNNNN."""
 year = datetime.utcnow().year
 count = (
 db.query(ClinicalCase).filter(ClinicalCase.case_number.like(f"CV-{year}-%")).count()
 )
 return f"CV-{year}-{count + 1:06d}"


def seed_demo_cases(db: Session, user_id: uuid.UUID) -> List[ClinicalCase]:
 """
 Seed 3 demo clinical cases into the database.

 Idempotent — checks backend_id before inserting. Existing cases are
 skipped. Returns the list of ClinicalCase objects (created or existing).
 """
 cases: List[ClinicalCase] = []

 for spec in DEMO_CASE_SPECS:
 demo_id: str = spec["demo_id"]

 # ── Idempotency guard ──────────────────────────────────────────
 existing = (
 db.query(ClinicalCase).filter_by(backend_id=demo_id).first()
 )
 if existing is not None:
 cases.append(existing)
 continue

 # ── Build clinical history JSONB ────────────────────────────────
 hist = spec["clinical_history"]
 clinical_history = build_clinical_history_json(
 indication=hist["indication"],
 prior_studies=hist["priorStudies"],
 brca_status=hist["brcaStatus"],
 family_history=hist["familyHistory"],
 symptoms=hist["symptoms"],
 )

 # ── Create ClinicalCase ─────────────────────────────────────────
 patient = spec["patient"]
 case = ClinicalCase(
 case_number=_generate_case_number(db),
 backend_id=demo_id,
 created_by=user_id,
 # Denormalized patient info
 patient_mrn=patient["mrn"],
 patient_first_name=patient["first_name"],
 patient_last_name=patient["last_name"],
 patient_dob=patient["dob"],
 patient_sex=patient["sex"],
 # Clinical history
 clinical_history=clinical_history,
 # Workflow — fresh start
 workflow_current_step=CaseWorkflowStep.PATIENT_REGISTRATION.value,
 workflow_status=CaseWorkflowStatus.DRAFT.value,
 workflow_completed_steps=[],
 workflow_locked=False,
 )
 db.add(case)
 db.flush() # get case.id for child images

 # ── Create CaseImage records ────────────────────────────────────
 for img_spec in spec["images"]:
 image = CaseImage(
 case_id=case.id,
 filename=img_spec["filename"],
 view_type=img_spec["view_type"],
 laterality=img_spec["laterality"],
 upload_status="completed",
 )
 db.add(image)

 cases.append(case)

 db.commit()
 return cases


# ============================================================================
# CLI entry-point
# ============================================================================

def main() -> None:
 """Standalone CLI: seed demo cases into the configured database."""
 from app.db.session import get_db_context

 print(" Seeding demo clinical cases …")

 with get_db_context() as db:
 user = create_demo_user(db)
 print(f" Demo user ready: {user.email} (id={user.id})")

 created = seed_demo_cases(db, user.id)
 for c in created:
 img_count = len(c.images) if c.images else 0
 print(f" {c.backend_id} → {c.case_number} ({img_count} images)")

 print(" Done — 3 demo cases seeded.")


if __name__ == "__main__":
 main()
