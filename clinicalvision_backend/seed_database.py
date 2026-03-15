"""
Database seeding script with realistic medical imaging data
Implements best practices for complex queries and future scalability
"""

import random
import hashlib
from datetime import datetime, timedelta, date
from uuid import uuid4
from faker import Faker

from app.db.session import SessionLocal
from app.db.models import (
    Organization, User, Patient, Study, Image, Analysis, Feedback, AuditLog,
    SubscriptionTier, UserRole, Gender, Modality, StudyStatus,
    ViewType, Laterality, ImageStatus, PredictionClass, BIRADSCategory,
    AnalysisStatus, FeedbackType, DiagnosisType, AuditAction, ResourceType
)

fake = Faker()
Faker.seed(42)  # Reproducible data


# Medical imaging specific data
MEDICAL_FACILITIES = [
    "Memorial Sloan Kettering Cancer Center",
    "Mayo Clinic Radiology",
    "Cleveland Clinic Imaging",
    "Johns Hopkins Hospital Radiology",
    "Massachusetts General Hospital",
    "Stanford Health Care Imaging",
    "UCSF Medical Center",
    "MD Anderson Cancer Center",
    "Cedars-Sinai Medical Center",
    "NYU Langone Health Radiology"
]

RADIOLOGIST_SPECIALIZATIONS = [
    "Breast Imaging",
    "Diagnostic Radiology",
    "Interventional Radiology",
    "Women's Imaging",
    "Oncologic Imaging",
    "Mammography"
]

CLINICAL_INDICATIONS = [
    "Screening mammogram, asymptomatic",
    "Diagnostic workup for palpable mass",
    "Follow-up for known finding",
    "Family history of breast cancer",
    "Post-surgical surveillance",
    "Dense breast tissue evaluation",
    "Nipple discharge evaluation",
    "Pain evaluation",
    "High-risk screening (BRCA positive)",
    "Comparison with prior imaging"
]

# Realistic prediction probabilities based on clinical distribution
# Benign: ~85-90%, Malignant: ~10-15%
BENIGN_WEIGHT = 0.87
MALIGNANT_WEIGHT = 0.13


def hash_patient_id(patient_number: int, org_id: str) -> str:
    """Create HIPAA-compliant hashed patient identifier"""
    raw = f"PATIENT_{org_id}_{patient_number:06d}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def generate_organizations(db, count=5):
    """Generate healthcare organizations"""
    print(f"\n📊 Creating {count} organizations...")
    orgs = []
    
    for i in range(count):
        org = Organization(
            name=MEDICAL_FACILITIES[i],
            subscription_tier=random.choice([
                SubscriptionTier.PROFESSIONAL,
                SubscriptionTier.ENTERPRISE
            ]),
            email=f"admin@{MEDICAL_FACILITIES[i].lower().replace(' ', '').replace('-', '')}.com"[:50],
            phone=fake.phone_number()[:20],
            address=fake.address()[:200],
            is_active=True
        )
        db.add(org)
        orgs.append(org)
    
    db.commit()
    for org in orgs:
        db.refresh(org)
    
    print(f"✓ Created {len(orgs)} organizations")
    return orgs


def generate_users(db, organizations, users_per_org=5):
    """Generate radiologists, admins, and technicians"""
    print(f"\n👥 Creating {users_per_org} users per organization...")
    users = []
    
    for org in organizations:
        # 1 Admin
        admin = User(
            organization_id=org.id,
            email=f"admin.{fake.user_name()}@{org.name.lower().replace(' ', '')[:20]}.com",
            hashed_password=hashlib.sha256(b"password123").hexdigest(),
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            two_factor_enabled=random.choice([True, False])
        )
        db.add(admin)
        users.append(admin)
        
        # 3 Radiologists
        for _ in range(3):
            radiologist = User(
                organization_id=org.id,
                email=f"rad.{fake.user_name()}@{org.name.lower().replace(' ', '')[:20]}.com",
                hashed_password=hashlib.sha256(b"password123").hexdigest(),
                first_name=f"Dr. {fake.first_name()}",
                last_name=fake.last_name(),
                role=UserRole.RADIOLOGIST,
                license_number=f"RAD{random.randint(100000, 999999)}",
                specialization=random.choice(RADIOLOGIST_SPECIALIZATIONS),
                is_active=True,
                email_verified=True,
                last_login=fake.iso8601(tzinfo=None)
            )
            db.add(radiologist)
            users.append(radiologist)
        
        # 1 Technician
        tech = User(
            organization_id=org.id,
            email=f"tech.{fake.user_name()}@{org.name.lower().replace(' ', '')[:20]}.com",
            hashed_password=hashlib.sha256(b"password123").hexdigest(),
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=UserRole.TECHNICIAN,
            is_active=True,
            email_verified=True
        )
        db.add(tech)
        users.append(tech)
    
    db.commit()
    for user in users:
        db.refresh(user)
    
    print(f"✓ Created {len(users)} users")
    return users


def generate_patients(db, organizations, patients_per_org=50):
    """Generate de-identified patient records"""
    print(f"\n🏥 Creating {patients_per_org} patients per organization...")
    patients = []
    
    for org in organizations:
        for i in range(patients_per_org):
            # Age distribution: 40-80 (mammography screening age)
            age = random.randint(40, 80)
            dob = date.today() - timedelta(days=age*365 + random.randint(0, 365))
            
            patient = Patient(
                organization_id=org.id,
                patient_identifier_hash=hash_patient_id(i, str(org.id)),
                date_of_birth=dob,
                gender=Gender.FEMALE,  # Mammography specific
                has_breast_cancer_history=random.choice(["no", "yes", "unknown"]),
                has_family_history=random.choice(["no", "yes", "unknown"])
            )
            db.add(patient)
            patients.append(patient)
    
    db.commit()
    for patient in patients:
        db.refresh(patient)
    
    print(f"✓ Created {len(patients)} patients")
    return patients


def generate_studies(db, patients, studies_per_patient_range=(1, 4)):
    """Generate mammogram studies with temporal distribution"""
    print(f"\n📅 Creating studies (1-{studies_per_patient_range[1]} per patient)...")
    studies = []
    accession_counter = 100000
    
    for patient in patients:
        num_studies = random.randint(*studies_per_patient_range)
        
        # Generate studies over past 3 years
        for i in range(num_studies):
            study_date = date.today() - timedelta(days=random.randint(1, 1095))
            
            study = Study(
                organization_id=patient.organization_id,
                patient_id=patient.id,
                accession_number=f"ACC{accession_counter:08d}",
                study_date=study_date,
                modality=Modality.MG,
                study_description="Digital Screening Mammogram" if i == 0 else "Diagnostic Mammogram",
                referring_physician=f"Dr. {fake.last_name()}",
                institution_name=db.query(Organization).filter_by(
                    id=patient.organization_id
                ).first().name[:100],
                status=StudyStatus.COMPLETED if random.random() > 0.05 else StudyStatus.ANALYZED,
                clinical_indication=random.choice(CLINICAL_INDICATIONS),
                comparison_available="yes" if i > 0 else "no"
            )
            db.add(study)
            studies.append(study)
            accession_counter += 1
            
            # Commit in batches
            if len(studies) % 100 == 0:
                db.commit()
    
    db.commit()
    for study in studies:
        db.refresh(study)
    
    print(f"✓ Created {len(studies)} studies")
    return studies


def generate_images(db, studies):
    """Generate 4-view mammogram images (CC & MLO, both breasts)"""
    print(f"\n🖼️  Creating images (4 per study: bilateral CC & MLO)...")
    images = []
    
    for study in studies:
        # Standard 4-view mammogram
        views = [
            (ViewType.CC, Laterality.RIGHT),
            (ViewType.CC, Laterality.LEFT),
            (ViewType.MLO, Laterality.RIGHT),
            (ViewType.MLO, Laterality.LEFT)
        ]
        
        for view_type, laterality in views:
            image = Image(
                study_id=study.id,
                file_path=f"/data/{study.accession_number}/{laterality.value}_{view_type.value}.dcm",
                file_size_bytes=random.randint(2_000_000, 10_000_000),  # 2-10 MB
                checksum=hashlib.sha256(
                    f"{study.id}_{view_type}_{laterality}".encode()
                ).hexdigest(),
                sop_instance_uid=f"1.2.840.{random.randint(100000, 999999)}.{random.randint(1, 999)}",
                series_instance_uid=f"1.2.840.{random.randint(100000, 999999)}",
                view_type=view_type,
                laterality=laterality,
                image_width=random.choice([2048, 3328, 4096]),
                image_height=random.choice([2048, 4096, 4864]),
                bits_stored=random.choice([12, 14, 16]),
                status=ImageStatus.READY,
                quality_score=random.uniform(0.85, 1.0),
                preprocessing_applied='["clahe", "normalization", "artifact_removal"]'
            )
            db.add(image)
            images.append(image)
        
        # Commit in batches
        if len(images) % 400 == 0:
            db.commit()
    
    db.commit()
    for image in images:
        db.refresh(image)
    
    print(f"✓ Created {len(images)} images")
    return images


def generate_analyses(db, images):
    """Generate AI predictions with realistic distribution"""
    print(f"\n🤖 Creating AI analyses with realistic predictions...")
    analyses = []
    
    model_versions = ["v1.0.0", "v1.1.0", "v1.2.0", "v2.0.0-beta"]
    
    for image in images:
        # Realistic distribution: ~87% benign, ~13% malignant
        is_benign = random.random() < BENIGN_WEIGHT
        
        if is_benign:
            prediction = PredictionClass.BENIGN
            confidence = random.uniform(0.70, 0.98)
            birads = random.choice([
                BIRADSCategory.BIRADS_1,
                BIRADSCategory.BIRADS_2,
                BIRADSCategory.BIRADS_3
            ])
        else:
            prediction = PredictionClass.MALIGNANT
            confidence = random.uniform(0.60, 0.95)
            birads = random.choice([
                BIRADSCategory.BIRADS_4,
                BIRADSCategory.BIRADS_5
            ])
        
        # Uncertainty increases with lower confidence
        uncertainty = random.uniform(0.05, 0.20) * (1 - confidence)
        
        analysis = Analysis(
            image_id=image.id,
            model_version=random.choice(model_versions),
            model_name="DenseNet121_Ensemble",
            prediction_class=prediction,
            confidence_score=confidence,
            uncertainty_score=uncertainty,
            birads_category=birads,
            prediction_probabilities={
                "benign": 1 - confidence if prediction == PredictionClass.MALIGNANT else confidence,
                "malignant": confidence if prediction == PredictionClass.MALIGNANT else 1 - confidence
            },
            explainability_data={
                "gradcam_available": True,
                "attention_maps": ["layer3", "layer4"],
                "roi_detected": random.choice([True, False])
            },
            roi_coordinates=[{
                "x": random.randint(100, 1000),
                "y": random.randint(100, 1000),
                "width": random.randint(50, 200),
                "height": random.randint(50, 200),
                "confidence": random.uniform(0.7, 0.95)
            }] if random.random() > 0.3 else None,
            status=AnalysisStatus.COMPLETED,
            processing_time_ms=random.randint(800, 3000)
        )
        db.add(analysis)
        analyses.append(analysis)
        
        # Commit in batches
        if len(analyses) % 500 == 0:
            db.commit()
            print(f"  Processed {len(analyses)} analyses...")
    
    db.commit()
    for analysis in analyses:
        db.refresh(analysis)
    
    print(f"✓ Created {len(analyses)} analyses")
    return analyses


def generate_feedback(db, analyses, users, feedback_rate=0.25):
    """Generate radiologist feedback (ground truth)"""
    print(f"\n⭐ Creating radiologist feedback (~{int(feedback_rate*100)}% of analyses)...")
    feedback_list = []
    
    # Get radiologists
    radiologists = [u for u in users if u.role == UserRole.RADIOLOGIST]
    
    # Only provide feedback for subset of analyses (realistic scenario)
    sample_size = int(len(analyses) * feedback_rate)
    sampled_analyses = random.sample(analyses, sample_size)
    
    for analysis in sampled_analyses:
        radiologist = random.choice(radiologists)
        
        # Radiologist agrees with AI ~90% of the time for benign
        # Radiologist agrees with AI ~80% of the time for malignant
        if analysis.prediction_class == PredictionClass.BENIGN:
            agrees = random.random() < 0.90
        else:
            agrees = random.random() < 0.80
        
        if agrees:
            actual_diagnosis = DiagnosisType.BENIGN if analysis.prediction_class == PredictionClass.BENIGN else DiagnosisType.MALIGNANT
            feedback_type = FeedbackType.AGREEMENT
        else:
            actual_diagnosis = DiagnosisType.MALIGNANT if analysis.prediction_class == PredictionClass.BENIGN else DiagnosisType.BENIGN
            feedback_type = FeedbackType.CORRECTION
        
        feedback = Feedback(
            analysis_id=analysis.id,
            radiologist_id=radiologist.id,
            feedback_type=feedback_type,
            is_correct=agrees,
            actual_diagnosis=actual_diagnosis,
            birads_assessment=random.choice(list(BIRADSCategory)),
            comments=fake.sentence() if random.random() > 0.7 else None,
            findings_description=fake.text(max_nb_chars=200) if random.random() > 0.8 else None,
            radiologist_confidence=random.randint(3, 5),
            biopsy_performed=random.choice([True, False]) if actual_diagnosis == DiagnosisType.MALIGNANT else False,
            pathology_result="Invasive ductal carcinoma" if actual_diagnosis == DiagnosisType.MALIGNANT and random.random() > 0.5 else None
        )
        db.add(feedback)
        feedback_list.append(feedback)
        
        # Commit in batches
        if len(feedback_list) % 200 == 0:
            db.commit()
    
    db.commit()
    for fb in feedback_list:
        db.refresh(fb)
    
    print(f"✓ Created {len(feedback_list)} feedback entries")
    return feedback_list


def generate_audit_logs(db, users, analyses, images, sample_rate=0.1):
    """Generate HIPAA-compliant audit logs"""
    print(f"\n📝 Creating audit logs (sampling {int(sample_rate*100)}% of activities)...")
    logs = []
    
    # Sample activities to log
    sampled_images = random.sample(images, int(len(images) * sample_rate))
    sampled_analyses = random.sample(analyses, int(len(analyses) * sample_rate))
    
    for image in sampled_images:
        user = random.choice(users)
        log = AuditLog(
            user_id=user.id,
            action=AuditAction.VIEW,
            resource_type=ResourceType.IMAGE,
            resource_id=image.id,
            ip_address=fake.ipv4(),
            user_agent=fake.user_agent(),
            request_method="GET",
            request_path=f"/api/v1/images/{image.id}",
            status_code="200",
            success="true",
            session_id=str(uuid4())
        )
        db.add(log)
        logs.append(log)
    
    for analysis in sampled_analyses:
        user = random.choice([u for u in users if u.role in [UserRole.RADIOLOGIST, UserRole.ADMIN]])
        log = AuditLog(
            user_id=user.id,
            action=AuditAction.ANALYZE,
            resource_type=ResourceType.ANALYSIS,
            resource_id=analysis.id,
            ip_address=fake.ipv4(),
            user_agent=fake.user_agent(),
            request_method="POST",
            request_path=f"/api/v1/analyses",
            status_code="201",
            success="true",
            details={"model_version": analysis.model_version},
            session_id=str(uuid4())
        )
        db.add(log)
        logs.append(log)
        
        if len(logs) % 300 == 0:
            db.commit()
    
    db.commit()
    for log in logs:
        db.refresh(log)
    
    print(f"✓ Created {len(logs)} audit log entries")
    return logs


def print_statistics(db):
    """Print database statistics"""
    print("\n" + "="*70)
    print("📊 DATABASE SEEDING COMPLETE - STATISTICS")
    print("="*70)
    
    stats = {
        "Organizations": db.query(Organization).count(),
        "Users": db.query(User).count(),
        "Patients": db.query(Patient).count(),
        "Studies": db.query(Study).count(),
        "Images": db.query(Image).count(),
        "Analyses": db.query(Analysis).count(),
        "Feedback": db.query(Feedback).count(),
        "Audit Logs": db.query(AuditLog).count()
    }
    
    for table, count in stats.items():
        print(f"  {table:20} {count:>8,} records")
    
    # Prediction distribution
    benign_count = db.query(Analysis).filter_by(prediction_class=PredictionClass.BENIGN).count()
    malignant_count = db.query(Analysis).filter_by(prediction_class=PredictionClass.MALIGNANT).count()
    total_predictions = benign_count + malignant_count
    
    print(f"\n📈 Prediction Distribution:")
    print(f"  Benign:     {benign_count:>6,} ({benign_count/total_predictions*100:.1f}%)")
    print(f"  Malignant:  {malignant_count:>6,} ({malignant_count/total_predictions*100:.1f}%)")
    
    # AI accuracy (from feedback)
    correct_predictions = db.query(Feedback).filter_by(is_correct=True).count()
    total_feedback = db.query(Feedback).count()
    if total_feedback > 0:
        accuracy = correct_predictions / total_feedback * 100
        print(f"\n🎯 AI Model Accuracy (with radiologist feedback):")
        print(f"  Correct:    {correct_predictions:>6,} / {total_feedback:,} ({accuracy:.1f}%)")
    
    print("\n" + "="*70)
    print("✅ Database ready for complex queries and analytics!")
    print("="*70)


def seed_database():
    """Main seeding function"""
    print("="*70)
    print("🌱 SEEDING DATABASE WITH REALISTIC MEDICAL IMAGING DATA")
    print("="*70)
    
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(Organization).count() > 0:
            print("\n⚠️  Database already contains data!")
            response = input("Do you want to clear and reseed? (yes/no): ")
            if response.lower() != 'yes':
                print("Seeding cancelled.")
                return
            
            # Clear existing data (in correct order due to foreign keys)
            print("\n🗑️  Clearing existing data...")
            db.query(AuditLog).delete()
            db.query(Feedback).delete()
            db.query(Analysis).delete()
            db.query(Image).delete()
            db.query(Study).delete()
            db.query(Patient).delete()
            db.query(User).delete()
            db.query(Organization).delete()
            db.commit()
            print("✓ Existing data cleared")
        
        start_time = datetime.now()
        
        # Generate data in correct order
        orgs = generate_organizations(db, count=5)
        users = generate_users(db, orgs, users_per_org=5)
        patients = generate_patients(db, orgs, patients_per_org=50)
        studies = generate_studies(db, patients, studies_per_patient_range=(1, 4))
        images = generate_images(db, studies)
        analyses = generate_analyses(db, images)
        feedback = generate_feedback(db, analyses, users, feedback_rate=0.25)
        audit_logs = generate_audit_logs(db, users, analyses, images, sample_rate=0.1)
        
        # Print statistics
        print_statistics(db)
        
        elapsed = datetime.now() - start_time
        print(f"\n⏱️  Time elapsed: {elapsed.total_seconds():.2f} seconds")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
