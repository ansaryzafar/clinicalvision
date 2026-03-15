"""
Seed script for Industry Standards Implementation
Generates comprehensive sample data for DICOM metadata, clinical reports, model versions, and performance logs
"""

import random
import uuid
from datetime import datetime, timedelta
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import SessionLocal
from app.db.models import (
    Image, Study, User, Analysis,
    DICOMMetadata, ClinicalReport, ReportWorkflowHistory,
    ModelVersion, ModelPerformanceLog,
    TransferSyntax, PhotometricInterpretation, PatientPosition,
    ReportType, ReportStatus, BIRADSCategory, RecommendationAction,
    AlgorithmType, ModelStatus, DeploymentEnvironment, ValidationStatus
)


# ==================== Configuration ====================

@contextmanager
def get_db_session():
    """Database session context manager"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


MANUFACTURERS = [
    ("GE Healthcare", "Senographe Essential"),
    ("Hologic", "Selenia Dimensions"),
    ("Siemens", "Mammomat Inspiration"),
    ("Philips", "MicroDose Mammography"),
    ("GE Healthcare", "Senographe Pristina"),
]

VIEW_POSITIONS = ["CC", "MLO", "ML", "LM"]
LATERALITY = ["L", "R"]

BIRADS_DISTRIBUTION = {
    "0": 0.05,  # 5% - Need additional imaging
    "1": 0.60,  # 60% - Negative
    "2": 0.20,  # 20% - Benign
    "3": 0.08,  # 8% - Probably benign
    "4A": 0.03, # 3% - Low suspicion
    "4B": 0.02, # 2% - Moderate suspicion
    "4C": 0.01, # 1% - Moderate-high suspicion
    "5": 0.008, # 0.8% - High suspicion
    "6": 0.002, # 0.2% - Known malignancy
}


# ==================== Helper Functions ====================

def random_date_in_range(start_date, end_date):
    """Generate a random datetime between start and end dates"""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return start_date + timedelta(days=random_days)


def generate_dicom_metadata_for_image(db: Session, image: Image):
    """Generate realistic DICOM metadata for an image"""
    manufacturer, model = random.choice(MANUFACTURERS)
    view_position = random.choice(VIEW_POSITIONS)
    laterality = random.choice(LATERALITY)
    
    # Realistic pixel dimensions
    dimensions = random.choice([(2048, 2048), (3328, 2560), (4096, 3328)])
    rows, columns = dimensions
    
    # Realistic acquisition parameters
    kvp = random.uniform(26.0, 32.0)
    exposure_time = random.uniform(1000.0, 2000.0)
    compressed_thickness = random.uniform(30.0, 70.0)
    compression_force = random.uniform(80.0, 150.0)
    pixel_spacing = random.uniform(0.05, 0.10)
    
    metadata = DICOMMetadata(
        image_id=image.id,
        sop_class_uid="1.2.840.10008.5.1.4.1.1.1.2",  # Digital Mammography X-Ray Image
        transfer_syntax_uid=random.choice([ts.value for ts in TransferSyntax]),
        
        # Patient info (anonymized)
        patient_sex="F",
        patient_age=random.randint(35, 75),
        
        # Study info
        study_date=image.created_at,
        body_part_examined="BREAST",
        
        # Equipment
        manufacturer=manufacturer,
        manufacturer_model_name=model,
        patient_position=random.choice([pp.value for pp in PatientPosition]),
        
        # Image parameters
        photometric_interpretation=PhotometricInterpretation.MONOCHROME2.value,
        rows=rows,
        columns=columns,
        bits_allocated=16,
        bits_stored=random.choice([12, 14, 16]),
        samples_per_pixel=1,
        
        # Mammography specific
        view_position=view_position,
        image_laterality=laterality,
        compressed_thickness=compressed_thickness,
        compression_force=compression_force,
        kvp=kvp,
        exposure_time=exposure_time,
        pixel_spacing=f"[{pixel_spacing:.3f}, {pixel_spacing:.3f}]",
        
        # HIPAA compliance
        anonymized="YES",
        phi_removed="YES",
    )
    
    return metadata


def select_birads_category():
    """Select BI-RADS category based on realistic distribution"""
    rand = random.random()
    cumulative = 0
    for category, probability in BIRADS_DISTRIBUTION.items():
        cumulative += probability
        if rand <= cumulative:
            return category
    return "1"  # Default to negative


def generate_findings_for_birads(birads: str):
    """Generate structured findings based on BI-RADS category"""
    findings = {
        "masses": [],
        "calcifications": [],
        "asymmetries": [],
        "architectural_distortion": []
    }
    
    if birads == "0":
        # Incomplete - need additional views
        findings["asymmetries"].append({
            "location": random.choice(["UOQ", "UIQ", "LOQ", "LIQ"]),
            "description": "Asymmetric density requiring additional evaluation"
        })
    elif birads == "1":
        # Negative - no findings
        pass
    elif birads == "2":
        # Benign findings
        findings["masses"].append({
            "location": random.choice(["UOQ", "UIQ"]),
            "size_mm": random.randint(5, 15),
            "description": "Simple cyst, benign appearance"
        })
    elif birads == "3":
        # Probably benign
        findings["masses"].append({
            "location": random.choice(["UOQ", "LOQ"]),
            "size_mm": random.randint(8, 12),
            "description": "Probably benign mass, recommend short-term follow-up"
        })
    elif birads in ["4A", "4B", "4C"]:
        # Suspicious
        findings["masses"].append({
            "location": random.choice(["UOQ", "UIQ", "LOQ"]),
            "size_mm": random.randint(10, 25),
            "description": f"Suspicious mass with irregular margins - BI-RADS {birads}"
        })
        if random.random() > 0.5:
            findings["calcifications"].append({
                "location": "same quadrant",
                "morphology": "pleomorphic",
                "distribution": "clustered"
            })
    elif birads == "5":
        # Highly suggestive of malignancy
        findings["masses"].append({
            "location": random.choice(["UOQ", "UIQ"]),
            "size_mm": random.randint(15, 35),
            "description": "Highly suspicious mass, biopsy recommended"
        })
    elif birads == "6":
        # Known malignancy
        findings["masses"].append({
            "location": "Known",
            "size_mm": random.randint(20, 40),
            "description": "Known biopsy-proven malignancy"
        })
    
    return findings


def generate_impression_for_birads(birads: str):
    """Generate impression text based on BI-RADS category"""
    impressions = {
        "0": "Incomplete assessment. Additional imaging recommended.",
        "1": "Negative for malignancy. No suspicious findings identified.",
        "2": "Benign findings. No evidence of malignancy.",
        "3": "Probably benign finding. Recommend short-term follow-up in 6 months.",
        "4A": "Low suspicion for malignancy. Biopsy recommended.",
        "4B": "Moderate suspicion for malignancy. Biopsy strongly recommended.",
        "4C": "Moderate to high suspicion for malignancy. Biopsy strongly recommended.",
        "5": "Highly suggestive of malignancy. Biopsy required.",
        "6": "Known biopsy-proven malignancy. Treatment planning in progress.",
    }
    return impressions.get(birads, impressions["1"])


def generate_recommendations_for_birads(birads: str):
    """Generate recommendations based on BI-RADS category"""
    if birads == "0":
        return [{"action": "additional_imaging", "description": "Additional mammographic views and/or ultrasound"}]
    elif birads == "1":
        return [{"action": "routine_screening", "description": "Continue annual screening mammography"}]
    elif birads == "2":
        return [{"action": "routine_screening", "description": "Continue annual screening mammography"}]
    elif birads == "3":
        return [{"action": "short_term_followup", "description": "6-month follow-up mammogram"}]
    elif birads in ["4A", "4B", "4C"]:
        return [{"action": "biopsy", "description": "Image-guided biopsy recommended"}]
    elif birads == "5":
        return [{"action": "biopsy", "description": "Urgent biopsy required"}]
    elif birads == "6":
        return [{"action": "treatment", "description": "Continue treatment as planned"}]
    return []


def generate_clinical_report(db: Session, study: Study, author: User, birads: str = None):
    """Generate a clinical report for a study"""
    if birads is None:
        birads = select_birads_category()
    
    # Generate report number
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    report_number = f"RPT-{timestamp}-{str(uuid.uuid4())[:8].upper()}"
    
    # Generate structured data
    findings = generate_findings_for_birads(birads)
    impression = generate_impression_for_birads(birads)
    recommendations = generate_recommendations_for_birads(birads)
    
    # Determine if critical
    is_critical = birads in ["4C", "5", "6"]
    
    # AI assisted for 70% of reports
    ai_assisted = random.random() < 0.7
    
    report = ClinicalReport(
        study_id=study.id,
        report_number=report_number,
        report_type=ReportType.BIRADS.value,
        author_id=author.id,
        status=ReportStatus.DRAFT.value,
        findings=findings,
        impression=impression,
        clinical_history="Screening mammogram" if birads in ["0", "1", "2"] else "Diagnostic mammogram",
        technique="Digital mammography with CAD",
        overall_birads=birads,
        recommendations=recommendations,
        ai_assisted=ai_assisted,
        ai_confidence=random.uniform(0.85, 0.98) if ai_assisted else None,
        ai_findings_reviewed=ai_assisted,
        reading_time_minutes=random.randint(5, 20),
        complexity_score=random.randint(1, 5),
        critical_finding=is_critical,
        notification_sent=False,
        version=1,
        drafted_at=datetime.now(),
    )
    
    return report


def advance_report_workflow(db: Session, report: ClinicalReport, users: list):
    """Advance a report through workflow stages"""
    workflow_states = [
        (ReportStatus.DRAFT, ReportStatus.PENDING_REVIEW),
        (ReportStatus.PENDING_REVIEW, ReportStatus.REVIEWED),
        (ReportStatus.REVIEWED, ReportStatus.APPROVED),
        (ReportStatus.APPROVED, ReportStatus.SIGNED),
    ]
    
    current_status = report.status
    history_entries = []
    
    for from_status, to_status in workflow_states:
        if current_status == from_status.value:
            # Select appropriate user for this transition
            if to_status == ReportStatus.REVIEWED:
                # Try to get different radiologist, fall back to same if needed
                available_reviewers = [u for u in users if u.role == "radiologist" and u.id != report.author_id]
                if not available_reviewers:
                    available_reviewers = [u for u in users if u.role == "radiologist"]
                reviewer = random.choice(available_reviewers)
                report.reviewer_id = reviewer.id
                report.reviewed_at = datetime.now()
                changed_by = reviewer
            elif to_status == ReportStatus.APPROVED:
                approver = random.choice([u for u in users if u.role == "radiologist"])
                report.approver_id = approver.id
                report.approved_at = datetime.now()
                changed_by = approver
            elif to_status == ReportStatus.SIGNED:
                report.signed_at = datetime.now()
                changed_by = users[0]  # Could be author or approver
            else:
                changed_by = random.choice(users)
            
            # Create workflow history entry
            history = ReportWorkflowHistory(
                report_id=report.id,
                from_status=from_status.value,
                to_status=to_status.value,
                changed_by_id=changed_by.id,
                notes=f"Report transitioned from {from_status.value} to {to_status.value}",
                ip_address=f"192.168.1.{random.randint(1, 255)}",
                user_agent="Mozilla/5.0 (Clinical Vision Platform)",
            )
            history_entries.append(history)
            
            # Update report status
            report.status = to_status.value
            current_status = to_status.value
            
            # Stop at random stage for some reports (to show variety)
            if random.random() < 0.3:
                break
    
    return history_entries


def generate_model_version(
    name: str,
    version: str,
    auc_roc: float,
    status: ModelStatus,
    is_active: bool = False,
    fda_cleared: bool = False
):
    """Generate a model version with realistic parameters"""
    
    # Training parameters
    training_date = random_date_in_range(
        datetime.now() - timedelta(days=365),
        datetime.now()
    )
    
    hyperparameters = {
        "learning_rate": random.uniform(0.0001, 0.001),
        "batch_size": random.choice([16, 32, 64]),
        "epochs": random.randint(50, 150),
        "optimizer": random.choice(["Adam", "AdamW", "SGD"]),
        "dropout_rate": random.uniform(0.3, 0.6),
        "weight_decay": random.uniform(0.0001, 0.001),
    }
    
    # Calculate other metrics based on AUC-ROC
    sensitivity = auc_roc - random.uniform(0.02, 0.05)
    specificity = auc_roc - random.uniform(0.01, 0.03)
    accuracy = (sensitivity + specificity) / 2
    auc_pr = auc_roc - random.uniform(0.01, 0.03)
    
    validation_metrics = {
        "accuracy": round(accuracy, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "auc_roc": round(auc_roc, 4),
        "auc_pr": round(auc_pr, 4),
        "f1_score": round((2 * sensitivity * specificity) / (sensitivity + specificity), 4),
        "precision": round(specificity, 4),
        "recall": round(sensitivity, 4),
    }
    
    model = ModelVersion(
        model_name=name,
        version=version,
        algorithm_type=AlgorithmType.CNN.value,
        architecture="DenseNet121",
        framework="PyTorch 2.0",
        training_date=training_date,
        training_duration_hours=random.uniform(8.0, 48.0),
        training_dataset_size=random.randint(8000, 15000),
        training_dataset_version="CBIS-DDSM-v2",
        hyperparameters=hyperparameters,
        validation_metrics=validation_metrics,
        validation_status=ValidationStatus.EXTERNAL_VALIDATION.value if fda_cleared else ValidationStatus.INTERNAL_VALIDATION.value,
        fda_approval_status="CLEARED" if fda_cleared else "NOT_SUBMITTED",
        fda_clearance_number=f"K{random.randint(100000, 999999)}" if fda_cleared else None,
        fda_clearance_date=training_date + timedelta(days=180) if fda_cleared else None,
        intended_use="Computer-aided detection of breast lesions in digital mammography",
        indications_for_use="For use as a second reader in screening and diagnostic mammography",
        status=status.value,
        deployment_environment=DeploymentEnvironment.PRODUCTION.value if is_active else None,
        deployment_date=training_date + timedelta(days=200) if is_active else None,
        is_active=is_active,
        explainability_method="GradCAM",
        uncertainty_quantification=True,
        ethics_approval=True,
        developed_by="Clinical Vision AI Team",
        contact_email="ai-team@clinicalvision.com",
    )
    
    return model


def generate_performance_log(model_version_id: uuid.UUID, log_date: datetime, base_auc: float):
    """Generate a performance log entry with realistic metrics"""
    
    # Add some variation and potential drift over time
    days_since_deployment = (datetime.now() - log_date).days
    drift_factor = max(0, days_since_deployment / 100)  # Gradual performance decline
    
    auc_variation = random.uniform(-0.02, 0.01) - (drift_factor * 0.01)
    current_auc = max(0.7, min(0.99, base_auc + auc_variation))
    
    metrics = {
        "accuracy": round(current_auc - 0.01, 4),
        "sensitivity": round(current_auc - 0.02, 4),
        "specificity": round(current_auc - 0.01, 4),
        "auc_roc": round(current_auc, 4),
        "auc_pr": round(current_auc - 0.02, 4),
    }
    
    log = ModelPerformanceLog(
        model_version_id=model_version_id,
        log_date=log_date,
        measurement_window_days=1,
        metrics=metrics,
        total_predictions=random.randint(50, 200),
        avg_confidence=random.uniform(0.85, 0.95),
        avg_inference_time_ms=random.uniform(100, 300),
        feedback_received=random.randint(5, 20),
        agreement_rate=random.uniform(0.85, 0.98),
        performance_alert=current_auc < (base_auc - 0.05),
        drift_alert=current_auc < (base_auc - 0.08),
        notes="Normal operation" if current_auc >= (base_auc - 0.05) else "Performance degradation detected",
    )
    
    return log


# ==================== Main Seeding Functions ====================

def seed_dicom_metadata(db: Session):
    """Seed DICOM metadata for all images"""
    print("\n" + "="*70)
    print("SEEDING DICOM METADATA")
    print("="*70)
    
    # Get all images without DICOM metadata
    images = db.query(Image).filter(
        ~Image.id.in_(db.query(DICOMMetadata.image_id))
    ).all()
    
    total = len(images)
    print(f"Found {total} images without DICOM metadata")
    
    if total == 0:
        print("✓ All images already have DICOM metadata")
        return
    
    batch_size = 100
    for i, image in enumerate(images, 1):
        metadata = generate_dicom_metadata_for_image(db, image)
        db.add(metadata)
        
        if i % batch_size == 0:
            db.commit()
            print(f"  Progress: {i}/{total} ({i*100//total}%)")
    
    db.commit()
    print(f"✓ Created {total} DICOM metadata records")


def seed_clinical_reports(db: Session, num_reports: int = 150):
    """Seed clinical reports with various BI-RADS categories"""
    print("\n" + "="*70)
    print("SEEDING CLINICAL REPORTS")
    print("="*70)
    
    # Get radiologist users
    radiologists = db.query(User).filter(User.role == "radiologist").all()
    if not radiologists:
        print("✗ No radiologists found. Please seed users first.")
        return
    
    # Get studies without reports
    studies = db.query(Study).filter(
        ~Study.id.in_(db.query(ClinicalReport.study_id))
    ).limit(num_reports).all()
    
    total = len(studies)
    print(f"Found {total} studies available for reports")
    
    if total == 0:
        print("✓ All selected studies already have reports")
        return
    
    # Create reports
    reports_created = 0
    for i, study in enumerate(studies, 1):
        author = random.choice(radiologists)
        report = generate_clinical_report(db, study, author)
        db.add(report)
        db.flush()  # Get report ID
        
        # Advance 70% of reports through workflow
        if random.random() < 0.7:
            history_entries = advance_report_workflow(db, report, radiologists)
            for entry in history_entries:
                db.add(entry)
        
        # Create amendments for 15% of signed reports
        if report.status == ReportStatus.SIGNED.value and random.random() < 0.15:
            amendment = ClinicalReport(
                study_id=study.id,
                report_number=report.report_number + "-A1",
                report_type=report.report_type,
                author_id=report.author_id,
                reviewer_id=report.reviewer_id,
                approver_id=report.approver_id,
                status=ReportStatus.SIGNED.value,
                findings=report.findings,
                impression=report.impression + " [Amended: Corrected typographical error]",
                clinical_history=report.clinical_history,
                technique=report.technique,
                overall_birads=report.overall_birads,
                recommendations=report.recommendations,
                ai_assisted=report.ai_assisted,
                version=2,
                parent_report_id=report.id,
                amendment_reason="Typographical correction",
                signed_at=datetime.now(),
            )
            db.add(amendment)
        
        reports_created += 1
        if i % 50 == 0:
            db.commit()
            print(f"  Progress: {i}/{total} ({i*100//total}%)")
    
    db.commit()
    
    # Print summary
    report_counts = db.query(ClinicalReport.status, func.count(ClinicalReport.id))\
        .group_by(ClinicalReport.status).all()
    
    print(f"\n✓ Created {reports_created} clinical reports")
    print("\nReport Status Distribution:")
    for status, count in report_counts:
        print(f"  {status}: {count}")
    
    birads_counts = db.query(ClinicalReport.overall_birads, func.count(ClinicalReport.id))\
        .group_by(ClinicalReport.overall_birads).all()
    
    print("\nBI-RADS Distribution:")
    for birads, count in sorted(birads_counts, key=lambda x: x[0]):
        print(f"  BI-RADS {birads}: {count}")


def seed_model_versions(db: Session):
    """Seed model versions showing progression"""
    print("\n" + "="*70)
    print("SEEDING MODEL VERSIONS")
    print("="*70)
    
    # Check if already seeded
    existing = db.query(ModelVersion).count()
    if existing >= 5:
        print(f"✓ Already have {existing} model versions")
        return
    
    models = [
        # v1.0.0 - Initial model (lower performance)
        generate_model_version(
            "BreastCancer_DenseNet121",
            "1.0.0",
            0.85,
            ModelStatus.DEPRECATED,
            is_active=False,
            fda_cleared=False
        ),
        
        # v1.1.0 - Improved training
        generate_model_version(
            "BreastCancer_DenseNet121",
            "1.1.0",
            0.89,
            ModelStatus.DEPRECATED,
            is_active=False,
            fda_cleared=False
        ),
        
        # v2.0.0 - Architecture improvements
        generate_model_version(
            "BreastCancer_DenseNet121",
            "2.0.0",
            0.92,
            ModelStatus.DEPRECATED,
            is_active=False,
            fda_cleared=False
        ),
        
        # v2.1.0 - Current production (FDA cleared)
        generate_model_version(
            "BreastCancer_DenseNet121",
            "2.1.0",
            0.94,
            ModelStatus.ACTIVE,
            is_active=True,
            fda_cleared=True
        ),
        
        # v3.0.0-beta - Under development
        generate_model_version(
            "BreastCancer_DenseNet121",
            "3.0.0-beta",
            0.96,
            ModelStatus.DEVELOPMENT,
            is_active=False,
            fda_cleared=False
        ),
    ]
    
    for model in models:
        db.add(model)
    
    db.commit()
    print(f"✓ Created {len(models)} model versions")
    print("\nModel Versions:")
    for model in models:
        metrics = model.validation_metrics
        print(f"  {model.version}: AUC-ROC={metrics['auc_roc']}, Status={model.status}, Active={model.is_active}")


def seed_performance_logs(db: Session, days: int = 30):
    """Seed performance logs for active models"""
    print("\n" + "="*70)
    print("SEEDING PERFORMANCE LOGS")
    print("="*70)
    
    # Get deployed models
    deployed_models = db.query(ModelVersion).filter(
        ModelVersion.deployment_date.isnot(None)
    ).all()
    
    if not deployed_models:
        print("✗ No deployed models found")
        return
    
    print(f"Found {len(deployed_models)} deployed models")
    
    logs_created = 0
    for model in deployed_models:
        # Get deployment date - ensure it's a datetime object
        if isinstance(model.deployment_date, str):
            deployment_date = datetime.fromisoformat(model.deployment_date.replace('Z', '+00:00'))
        else:
            deployment_date = model.deployment_date or (datetime.now() - timedelta(days=days))
        
        base_auc = model.validation_metrics.get("auc_roc", 0.90)
        
        # Generate logs from deployment to now
        current_date = deployment_date
        while current_date <= datetime.now():
            log = generate_performance_log(model.id, current_date, base_auc)
            db.add(log)
            logs_created += 1
            current_date += timedelta(days=1)
        
        print(f"  {model.version}: Created {logs_created} logs")
    
    db.commit()
    print(f"\n✓ Created {logs_created} performance log entries")


def print_summary(db: Session):
    """Print summary of seeded data"""
    print("\n" + "="*70)
    print("SEEDING COMPLETE - SUMMARY")
    print("="*70)
    
    counts = {
        "Images": db.query(Image).count(),
        "Studies": db.query(Study).count(),
        "Users": db.query(User).count(),
        "DICOM Metadata": db.query(DICOMMetadata).count(),
        "Clinical Reports": db.query(ClinicalReport).count(),
        "Report History": db.query(ReportWorkflowHistory).count(),
        "Model Versions": db.query(ModelVersion).count(),
        "Performance Logs": db.query(ModelPerformanceLog).count(),
    }
    
    print("\n📊 Record Counts:")
    for table, count in counts.items():
        print(f"  {table}: {count:,}")
    
    # Critical findings
    critical_reports = db.query(ClinicalReport).filter(
        ClinicalReport.critical_finding == True
    ).count()
    print(f"\n⚠️  Critical Findings: {critical_reports}")
    
    # Active models
    active_models = db.query(ModelVersion).filter(
        ModelVersion.is_active == True
    ).count()
    print(f"🚀 Active Models: {active_models}")
    
    print("\n" + "="*70)
    print("Ready for API development!")
    print("="*70)


# ==================== Main ====================

def main():
    """Main seeding function"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*20 + "INDUSTRY STANDARDS DATA SEEDING" + " "*17 + "║")
    print("║" + " "*18 + "Clinical Vision Platform v1.0" + " "*19 + "║")
    print("╚" + "="*68 + "╝")
    print("\nThis will populate the database with comprehensive sample data:")
    print("  • DICOM metadata for ~2,500 images")
    print("  • ~150 clinical reports (various BI-RADS categories)")
    print("  • Report workflow history")
    print("  • 5 model versions (showing progression)")
    print("  • ~150 performance logs (30 days)")
    print("\nEstimated time: 2-3 minutes\n")
    
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("Seeding cancelled.")
        return
    
    print("\nStarting seeding process...")
    start_time = datetime.now()
    
    with get_db_session() as db:
        try:
            # Seed in order (respecting dependencies)
            seed_dicom_metadata(db)
            seed_model_versions(db)
            seed_clinical_reports(db)
            seed_performance_logs(db)
            
            print_summary(db)
            
            elapsed = datetime.now() - start_time
            print(f"\n⏱️  Total time: {elapsed.seconds} seconds")
            
        except Exception as e:
            print(f"\n✗ Error during seeding: {str(e)}")
            db.rollback()
            raise


if __name__ == "__main__":
    main()
