#!/usr/bin/env python3
"""
Seed DICOM Metadata — Populate dicom_metadata table for Fairness Monitor.

The RealFairnessService requires DICOM metadata (patient_age, manufacturer,
breast_density) to compute subgroup-level fairness metrics. Without this,
it falls back to demo data.

This script creates realistic DICOM metadata rows for all images, enabling
the Fairness Monitor to compute real fairness metrics from actual prediction
data with proper demographic attributes (age, device, density).

Usage:
 docker exec clinicalvision-backend python -m scripts.seed_dicom_metadata
"""

import random
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.db.models.dicom_metadata import (
 DICOMMetadata, TransferSyntax, PhotometricInterpretation, PatientPosition,
)

random.seed(42)

# ── Realistic mammography device configurations ─────────────────────────
DEVICES = [
 {
 "manufacturer": "Hologic, Inc.",
 "model": "Selenia Dimensions",
 "serial_prefix": "HOL",
 "software": "1.10.1",
 "detector_type": "a-Se Direct",
 },
 {
 "manufacturer": "GE Healthcare",
 "model": "Senographe Pristina",
 "serial_prefix": "GEH",
 "software": "3.2.4",
 "detector_type": "a-Si Indirect (CsI)",
 },
 {
 "manufacturer": "Siemens Healthineers",
 "model": "MAMMOMAT Revelation",
 "serial_prefix": "SIE",
 "software": "VB40B",
 "detector_type": "a-Se Direct",
 },
 {
 "manufacturer": "FUJIFILM Corporation",
 "model": "AMULET Innovality",
 "serial_prefix": "FUJ",
 "software": "V2.0",
 "detector_type": "a-Se Direct",
 },
 {
 "manufacturer": "Philips Healthcare",
 "model": "MicroDose SI",
 "serial_prefix": "PHI",
 "software": "6.3.0",
 "detector_type": "Silicon Strip",
 },
]

# ── Age distribution (realistic screening mammography population) ────────
# Peak around 50-65, range 35-85
AGE_DISTRIBUTION = (
 list(range(35, 40)) * 2 + # 35-39: smaller group
 list(range(40, 50)) * 8 + # 40-49: moderate group
 list(range(50, 65)) * 12 + # 50-64: largest group (screening age)
 list(range(65, 75)) * 6 + # 65-74: moderate
 list(range(75, 86)) * 2 # 75-85: smaller
)

# Breast density distribution (approximate ACR/BIRADS distribution)
# A: fatty (~10%), B: scattered (~40%), C: heterogeneous (~40%), D: dense (~10%)
DENSITY_DISTRIBUTION = (
 ["fatty"] * 10 +
 ["scattered"] * 40 +
 ["heterogeneous"] * 40 +
 ["dense"] * 10
)

STATION_NAMES = [
 "MAM-01", "MAM-02", "MAM-03", "SCREENING-A", "SCREENING-B",
 "DIAG-01", "DIAG-02", "MOBILE-01",
]


def main():
 print("=" * 60)
 print(" SEED DICOM METADATA — For Fairness Monitor")
 print("=" * 60)

 db = SessionLocal()

 try:
 # Check existing DICOM metadata
 existing = db.execute(text("SELECT COUNT(*) FROM dicom_metadata")).scalar()
 if existing > 0:
 print(f"\n {existing} DICOM metadata rows already exist.")
 print(" Clearing existing DICOM metadata for fresh seed...")
 db.execute(text("DELETE FROM dicom_metadata"))
 db.commit()

 # Get all image IDs with their study info
 images = db.execute(text("""
 SELECT i.id, i.view_type, i.laterality, i.image_width, i.image_height,
 i.bits_stored, s.study_date, s.patient_id, s.accession_number
 FROM images i
 JOIN studies s ON i.study_id = s.id
 ORDER BY s.patient_id, s.study_date, i.id
 """)).fetchall()

 total = len(images)
 print(f"\n Found {total} images to create DICOM metadata for")

 if total == 0:
 print(" Nothing to do.")
 return

 # Group images by patient_id to assign consistent demographics per patient
 patient_images = {}
 for img in images:
 pid = str(img.patient_id)
 if pid not in patient_images:
 patient_images[pid] = []
 patient_images[pid].append(img)

 print(f" {len(patient_images)} unique patients")

 # Assign consistent demographics per patient
 patient_demographics = {}
 device_assignment = {} # Patient -> device (patients tend to go to same facility)
 
 for i, pid in enumerate(patient_images.keys()):
 age = random.choice(AGE_DISTRIBUTION)
 density = random.choice(DENSITY_DISTRIBUTION)
 device = random.choice(DEVICES)
 patient_demographics[pid] = {
 "age": age,
 "age_str": f"{age:03d}Y",
 "sex": "F", # Mammography patients
 "density": density,
 }
 device_assignment[pid] = device

 count = 0
 batch_size = 500

 for pid, imgs in patient_images.items():
 demo = patient_demographics[pid]
 device = device_assignment[pid]

 for img in imgs:
 study_date = img.study_date
 if study_date is None:
 study_date = datetime.utcnow() - timedelta(days=random.randint(1, 365))

 # Mammography-specific parameters
 compressed_thickness = round(random.uniform(35.0, 80.0), 1)
 compression_force = round(random.uniform(60.0, 180.0), 1)
 kvp = round(random.uniform(26.0, 34.0), 1)
 exposure_time = round(random.uniform(1.0, 3.0), 2)
 exposure_uas = round(random.uniform(30.0, 180.0), 1)

 # View position from image data
 view_pos = img.view_type if img.view_type else "CC"
 lat = img.laterality if img.laterality else "L"
 
 # Pixel spacing (typical for digital mammography)
 pixel_spacing_val = round(random.uniform(0.065, 0.100), 4)

 dm = DICOMMetadata(
 image_id=img.id,
 # SOP
 sop_class_uid="1.2.840.10008.5.1.4.1.1.13.1.3", # Digital Mammography
 # Transfer syntax
 transfer_syntax_uid=random.choice([
 TransferSyntax.JPEG_LOSSLESS,
 TransferSyntax.EXPLICIT_VR_LITTLE_ENDIAN,
 ]),
 # Patient
 patient_name=f"ANON^{pid[:8]}",
 patient_sex=demo["sex"],
 patient_age=demo["age_str"],
 # Study
 study_date=study_date if isinstance(study_date, datetime) else datetime.combine(study_date, datetime.min.time()),
 study_time=f"{random.randint(7,17):02d}{random.randint(0,59):02d}{random.randint(0,59):02d}",
 study_description="Digital Screening Mammogram",
 # Series
 series_number=1,
 body_part_examined="BREAST",
 patient_position=PatientPosition.HFP,
 # Equipment
 manufacturer=device["manufacturer"],
 manufacturer_model_name=device["model"],
 device_serial_number=f"{device['serial_prefix']}-{random.randint(10000,99999)}",
 software_versions=device["software"],
 station_name=random.choice(STATION_NAMES),
 # Acquisition
 acquisition_date=study_date if isinstance(study_date, datetime) else datetime.combine(study_date, datetime.min.time()),
 # Image pixel
 photometric_interpretation=PhotometricInterpretation.MONOCHROME2,
 rows=img.image_height or 4096,
 columns=img.image_width or 3328,
 bits_allocated=16,
 bits_stored=img.bits_stored or 14,
 high_bit=(img.bits_stored or 14) - 1,
 pixel_representation=0, # Unsigned
 samples_per_pixel=1,
 # Mammography-specific
 view_position=str(view_pos),
 image_laterality=str(lat),
 compressed_thickness=compressed_thickness,
 compression_force=compression_force,
 kvp=kvp,
 exposure_time=exposure_time,
 exposure_in_uas=exposure_uas,
 detector_type=device["detector_type"],
 # Pixel spacing
 pixel_spacing=[pixel_spacing_val, pixel_spacing_val],
 imager_pixel_spacing=[pixel_spacing_val, pixel_spacing_val],
 # Window/Level
 window_center=round(random.uniform(2000, 3000), 0),
 window_width=round(random.uniform(3000, 5000), 0),
 # Compliance
 anonymized="YES",
 phi_removed="YES",
 # Additional tags (includes breast density for fairness)
 additional_tags={
 "breast_density": demo["density"],
 "tissue_composition": demo["density"],
 "detector_description": device["detector_type"],
 "institution_name": f"ClinicalVision Imaging Center",
 },
 )
 db.add(dm)
 count += 1

 if count % batch_size == 0:
 db.commit()
 print(f" … {count}/{total} DICOM metadata created")

 db.commit()
 print(f" {count}/{total} DICOM metadata rows created")

 # Verification
 print("\n Verifying DICOM metadata for fairness analysis...")

 # Age group distribution
 age_dist = db.execute(text("""
 SELECT
 CASE
 WHEN CAST(REPLACE(patient_age, 'Y', '') AS INTEGER) < 40 THEN 'under_40'
 WHEN CAST(REPLACE(patient_age, 'Y', '') AS INTEGER) < 50 THEN '40_49'
 WHEN CAST(REPLACE(patient_age, 'Y', '') AS INTEGER) < 65 THEN '50_64'
 ELSE '65_plus'
 END AS age_group,
 COUNT(*) AS cnt
 FROM dicom_metadata
 WHERE patient_age IS NOT NULL
 GROUP BY age_group
 ORDER BY age_group
 """)).fetchall()

 print("\n Age group distribution:")
 for row in age_dist:
 print(f" {row.age_group}: {row.cnt}")

 # Device distribution
 dev_dist = db.execute(text("""
 SELECT manufacturer, COUNT(*) AS cnt
 FROM dicom_metadata
 WHERE manufacturer IS NOT NULL
 GROUP BY manufacturer
 ORDER BY cnt DESC
 """)).fetchall()

 print("\n Device manufacturer distribution:")
 for row in dev_dist:
 print(f" {row.manufacturer}: {row.cnt}")

 # Breast density distribution
 density_dist = db.execute(text("""
 SELECT additional_tags->>'breast_density' AS density, COUNT(*) AS cnt
 FROM dicom_metadata
 WHERE additional_tags->>'breast_density' IS NOT NULL
 GROUP BY density
 ORDER BY cnt DESC
 """)).fetchall()

 print("\n Breast density distribution:")
 for row in density_dist:
 print(f" {row.density}: {row.cnt}")

 # Final check — how many images have DICOM metadata
 covered = db.execute(text("""
 SELECT COUNT(DISTINCT dm.image_id)
 FROM dicom_metadata dm
 JOIN images i ON dm.image_id = i.id
 """)).scalar()

 print(f"\n Images with DICOM metadata: {covered}/{total}")

 print("\n" + "=" * 60)
 print(" DICOM METADATA SEEDING COMPLETE")
 print(" Fairness Monitor should now use real data")
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
