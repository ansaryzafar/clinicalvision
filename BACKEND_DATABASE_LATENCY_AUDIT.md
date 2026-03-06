# ClinicalVision — Enterprise Backend & Database Latency Audit

> **Audit Date:** June 2025  
> **Scope:** Full backend stack — FastAPI application, PostgreSQL database, SQLAlchemy ORM, Alembic migrations, Docker deployment, API endpoints, service layer  
> **Audited Files:** 19,382+ lines across 10 endpoint files, 17 service files, 12 schema files, 13 model files, 8 migrations, 6 core modules, middleware, Docker configs  
> **Severity Scale:** 🔴 Critical · 🟡 Moderate · 🟢 Good Practice  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Latency Findings](#3-critical-latency-findings)
4. [Database Schema & Indexing Audit](#4-database-schema--indexing-audit)
5. [API Endpoint Audit](#5-api-endpoint-audit)
6. [Service Layer Audit](#6-service-layer-audit)
7. [Infrastructure & Deployment Audit](#7-infrastructure--deployment-audit)
8. [Security Findings with Performance Impact](#8-security-findings-with-performance-impact)
9. [What's Done Well](#9-whats-done-well)
10. [Prioritized Remediation Plan](#10-prioritized-remediation-plan)
11. [Latency Optimization Roadmap](#11-latency-optimization-roadmap)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

This audit identified **38 critical issues**, **27 moderate issues**, and documents the full backend and database state of the ClinicalVision platform. The findings reveal a system that has strong architectural foundations but suffers from several latency-critical anti-patterns that would cause significant performance degradation under production load.

### Top 5 Latency-Critical Findings

| # | Finding | Estimated Impact | Effort to Fix |
|---|---------|-----------------|---------------|
| 1 | **Synchronous SQLAlchemy blocking async FastAPI event loop** | 10-100x latency under concurrent load | High |
| 2 | **All 8 composite/GIN performance indexes permanently dropped by migration bug** | 5-50x slower queries on filtered/JSONB operations | Medium |
| 3 | **No `created_at` index on any table** | Sequential scans on ALL paginated/date-range queries | Low |
| 4 | **File uploads read entire files into memory (up to 500MB)** | OOM crashes, 2-5x memory overhead per upload | Medium |
| 5 | **Statistics endpoints execute 7+ separate DB queries with no caching** | 7x unnecessary DB round trips per statistics call | Low |

### Overall Health Assessment

| Category | Score | Status |
|----------|-------|--------|
| Database Schema Design | 4/10 | 🔴 Critical issues |
| Index Strategy | 2/10 | 🔴 Catastrophic — indexes dropped |
| API Latency Patterns | 4/10 | 🔴 Multiple blocking patterns |
| Connection Management | 5/10 | 🟡 Functional but suboptimal |
| Query Optimization | 3/10 | 🔴 N+1, no eager loading, Python pagination |
| Caching Strategy | 1/10 | 🔴 No caching anywhere |
| Security Posture | 4/10 | 🟡 Auth exists but has gaps |
| Deployment Config | 3/10 | 🔴 Dev settings in production |
| Error Handling | 7/10 | 🟢 Solid exception hierarchies |
| Code Organization | 6/10 | 🟢 Clean service layer pattern |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Application                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Middleware│→ │ API Endpoints│→ │   Service Layer   │  │
│  │ (CORS,   │  │ (10 files,   │  │ (17 files,        │  │
│  │  GZip,   │  │  5,643 lines)│  │  ~5,000 lines)    │  │
│  │  Security)│  └──────┬───────┘  └────────┬──────────┘  │
│  └──────────┘         │                    │             │
│                       ▼                    ▼             │
│            ┌──────────────────┐  ┌─────────────────┐    │
│            │ Pydantic Schemas │  │ SQLAlchemy ORM   │    │
│            │ (12 files)       │  │ (SYNCHRONOUS ⚠️) │    │
│            └──────────────────┘  └────────┬────────┘    │
│                                           │             │
│                                           ▼             │
│                                  ┌────────────────┐     │
│                                  │  PostgreSQL 15  │     │
│                                  │  (Docker)       │     │
│                                  └────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Stack:** FastAPI + SQLAlchemy (sync) + PostgreSQL 15 + Alembic + Docker  
**Auth:** JWT (HS256) + optional Auth0  
**ML:** TensorFlow 2.15.0 + PyTorch 2.1.2  
**Rate Limiting:** slowapi (in-memory)  
**Monitoring:** Prometheus metrics  

---

## 3. Critical Latency Findings

### 3.1 🔴 Synchronous SQLAlchemy Blocking Async Event Loop

**File:** `app/db/session.py`  
**Impact:** 10-100x latency degradation under concurrent load  

The application uses FastAPI (async) but creates a **synchronous** SQLAlchemy engine:

```python
# CURRENT — BLOCKING
engine = create_engine(settings.DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(bind=engine)
```

Multiple endpoint files declare `async def` handlers but call synchronous DB operations:
- `app/api/v1/endpoints/account.py` — all endpoints are `async def` with sync DB
- `app/api/v1/endpoints/dicom.py` — all endpoints are `async def` with sync DB
- `app/api/v1/endpoints/fairness.py` — `async def` with sync DB
- `app/api/v1/endpoints/models.py` — all endpoints are `async def` with sync DB
- `app/api/v1/endpoints/reports.py` — all endpoints are `async def` with sync DB
- `app/api/v1/endpoints/inference.py` — `async def` with sync DB + sync ML inference

When an `async def` endpoint calls a synchronous database operation, it **blocks the entire async event loop**. All other concurrent requests wait until the DB call completes. Under 50+ concurrent users, this creates a serialized bottleneck.

**Fix:**
```python
# OPTION A: Use async SQLAlchemy (recommended)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
engine = create_async_engine("postgresql+asyncpg://...", pool_size=10)

# OPTION B: Use sync def endpoints (quick fix)
# Change all `async def endpoint(...)` to `def endpoint(...)` 
# FastAPI will run sync handlers in a threadpool automatically
```

---

### 3.2 🔴 CATASTROPHIC: All 8 Performance Indexes Dropped by Migration Bug

**File:** `alembic/versions/1e8539f93b11_*.py`  
**Impact:** 5-50x slower queries on all filtered, sorted, and JSONB operations  

Migration `a4786542fcb3` correctly created 8 critical performance indexes:

| Index Name | Table | Columns | Purpose |
|-----------|-------|---------|---------|
| `ix_users_org_role` | users | (organization_id, role) | Filter users by org + role |
| `ix_studies_patient_date` | studies | (patient_id, study_date) | Patient study history |
| `ix_images_study_view` | images | (study_id, view_type) | Study image retrieval |
| `ix_analyses_image_status` | analyses | (image_id, status) | Analysis lookup by image |
| `ix_feedback_analysis_type` | feedback | (analysis_id, feedback_type) | Feedback retrieval |
| `ix_analyses_metadata_gin` | analyses | metadata (GIN) | JSONB search on analysis metadata |
| `ix_analyses_class_probs_gin` | analyses | class_probabilities (GIN) | JSONB search on predictions |
| `ix_images_preprocessing_gin` | images | preprocessing_applied (GIN) | JSONB search on preprocessing |

**The subsequent migration `1e8539f93b11` DROPS ALL 8 INDEXES and they are NEVER recreated.** Every multi-column query and every JSONB query now does a **full sequential table scan**.

**Fix:** Create a new Alembic migration to recreate all 8 indexes:
```python
def upgrade():
    op.create_index('ix_users_org_role', 'users', ['organization_id', 'role'])
    op.create_index('ix_studies_patient_date', 'studies', ['patient_id', 'study_date'])
    op.create_index('ix_images_study_view', 'images', ['study_id', 'view_type'])
    op.create_index('ix_analyses_image_status', 'analyses', ['image_id', 'status'])
    op.create_index('ix_feedback_analysis_type', 'feedback', ['analysis_id', 'feedback_type'])
    op.create_index('ix_analyses_metadata_gin', 'analyses', ['metadata'], postgresql_using='gin')
    op.create_index('ix_analyses_class_probs_gin', 'analyses', ['class_probabilities'], postgresql_using='gin')
    op.create_index('ix_images_preprocessing_gin', 'images', ['preprocessing_applied'], postgresql_using='gin')
```

---

### 3.3 🔴 28 Redundant UUID Indexes (2 per Table × 14 Tables)

**File:** `app/db/base.py`  
**Impact:** 3× write overhead per INSERT/UPDATE, wasted disk and RAM  

The `BaseModel` class defines the `id` column with **triple indexing**:

```python
class BaseModel(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, unique=True, index=True, default=uuid.uuid4)
```

- `primary_key=True` → automatically creates a unique B-tree index
- `unique=True` → creates a SECOND unique constraint/index (redundant)
- `index=True` → creates a THIRD explicit index (redundant)

Across 14 tables, this creates **28 unnecessary indexes** that must be updated on every INSERT and UPDATE.

**Fix:**
```python
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
# primary_key alone provides the unique B-tree index
```

---

### 3.4 🔴 No `created_at` Index on Any Table

**File:** `app/db/base.py`  
**Impact:** Sequential scan on ALL paginated queries, ALL date-range filters  

```python
created_at = Column(DateTime, default=datetime.utcnow)  # No index=True
```

Every pagination query that orders by `created_at` (which is all of them) and every date-range filter must do a **full table scan**. This is the single most impactful missing index in the system.

**Fix:**
```python
created_at = Column(DateTime, default=datetime.utcnow, index=True)
```

---

### 3.5 🔴 File Uploads Read Entire Files into Memory

**Files:** `app/api/v1/endpoints/images.py`, `inference.py`, `dicom.py`, `app/services/storage_service.py`  
**Impact:** OOM crashes on large DICOM files, 2-5× memory overhead per upload  

```python
# images.py — reads entire file into RAM
contents = await file.read()  # Up to 500MB in one allocation
temp_path = f"/tmp/{uuid4()}_{file.filename}"
with open(temp_path, "wb") as f:
    f.write(contents)
```

For a 500MB DICOM file, this allocates ~1GB of RAM (original bytes + file copy). Under concurrent uploads, the server will OOM.

**Fix:** Stream uploads in chunks:
```python
async def stream_upload(file: UploadFile, dest_path: str, chunk_size: int = 8192):
    async with aiofiles.open(dest_path, "wb") as out:
        while chunk := await file.read(chunk_size):
            await out.write(chunk)
```

---

### 3.6 🔴 Python-Level Pagination (Load All, Slice in Memory)

**File:** `app/api/v1/endpoints/cases.py`  
**Impact:** Loads ALL records into memory, then discards most of them  

```python
# cases.py — GET /cases/{id}/images
images = case.images  # Loads ALL images from DB via lazy load
paginated = images[skip:skip + limit]  # Slices in Python
```

If a case has 10,000 images, all 10,000 are loaded from PostgreSQL into Python objects, then 9,990 are thrown away. This wastes memory, DB bandwidth, and CPU.

**Fix:** Use SQL-level pagination:
```python
images = db.query(Image).filter(Image.case_id == case_id).offset(skip).limit(limit).all()
total = db.query(func.count(Image.id)).filter(Image.case_id == case_id).scalar()
```

---

### 3.7 🔴 Statistics Endpoints Execute 7+ Separate DB Queries

**Files:** All statistics endpoints across `reports.py`, `inference.py`, `dicom.py`, `models.py`  
**Impact:** 7× unnecessary DB round trips per statistics request  

Every statistics endpoint follows the same anti-pattern:

```python
# 7 separate queries (7 round trips to PostgreSQL)
total = db.query(func.count(Model.id)).scalar()
by_status = db.query(Model.status, func.count()).group_by(Model.status).all()
by_type = db.query(Model.type, func.count()).group_by(Model.type).all()
avg_confidence = db.query(func.avg(Model.confidence)).scalar()
avg_time = db.query(func.avg(Model.processing_time)).scalar()
critical = db.query(func.count()).filter(Model.is_critical == True).scalar()
recent = db.query(Model).order_by(Model.created_at.desc()).limit(5).all()
```

**Fix:** Combine into a single query using window functions or CTEs:
```python
stats = db.execute(text("""
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        AVG(confidence) as avg_confidence,
        AVG(processing_time) as avg_time,
        COUNT(*) FILTER (WHERE is_critical) as critical_count
    FROM analyses
""")).fetchone()
```

Or implement a caching layer (Redis/in-memory with TTL):
```python
@cache(ttl=300)  # 5 minute cache
def get_statistics(db: Session) -> dict: ...
```

---

### 3.8 🔴 No Rate Limiting on Inference Endpoints

**File:** `app/api/v1/endpoints/inference.py` (2,027 lines)  
**Impact:** Single user can DoS the server by spamming GPU/CPU-intensive predictions  

The inference endpoints are the most compute-intensive operations in the system (ML model inference, GradCAM, LIME, SHAP), yet NONE have rate limiting:

```python
@router.post("/predict")           # No @limiter.limit()
@router.post("/predict/bilateral")  # No @limiter.limit()
@router.post("/xai/gradcam")       # No @limiter.limit()
@router.post("/xai/compare")       # Runs 3+ models sequentially, 30+ seconds
```

**Fix:**
```python
@router.post("/predict")
@limiter.limit("10/minute")  # Inference rate limit
async def predict(request: Request, ...): ...
```

---

### 3.9 🔴 Connection Pool Configuration Gaps

**File:** `app/db/session.py`  
**Impact:** Connection leaks, stale connections, no graceful degradation  

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    # MISSING: pool_recycle — stale connections never recycled
    # MISSING: pool_timeout — infinite wait for connection
    # MISSING: echo_pool — no pool debugging
)
```

Without `pool_recycle`, connections that have been idle for hours may be silently dropped by PostgreSQL or network equipment, causing intermittent failures. Without `pool_timeout`, under high load, requests will hang indefinitely waiting for a connection.

**Fix:**
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,     # Recycle connections after 1 hour
    pool_timeout=30,       # Fail after 30s if no connection available
    echo_pool="debug" if settings.DEBUG else False,
)
```

---

### 3.10 🔴 Auto-Commit on Read-Only GET Requests

**File:** `app/db/session.py`  
**Impact:** Unnecessary COMMIT on every GET request, wasted round trip  

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()  # Commits even on GET requests that read nothing
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
```

Every request, including read-only GETs, sends a COMMIT to PostgreSQL. This is an unnecessary network round trip that adds ~0.5-1ms per request.

**Fix:**
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
# Let individual service methods call db.commit() explicitly after writes
```

---

## 4. Database Schema & Indexing Audit

### 4.1 Model Summary

| Model | File | Columns | Relationships | Key Issues |
|-------|------|---------|---------------|------------|
| Organization | organization.py | 12 | 3 (users, patients, studies) | N+1 risk, name not unique |
| User | user.py | 18 | 2 (org, studies) | `last_login` is String not DateTime, no failed_login tracking |
| Patient | patient.py | 17 | 2 (org, studies) | `patient_hash` NOT unique, medical_history is String not Boolean |
| Study | study.py | 14 | 3 (patient, images, org) | `is_priority` is String not Boolean, no composite index |
| Image | image.py | 30+ | 3 | Widest table, `is_deleted` index dropped, duplicate status columns |
| Analysis | analysis.py | 29 | 2 | Dual image tracking, 4 redundant confidence fields |
| Feedback | feedback.py | 12 | 2 | No unique constraint on (radiologist_id, analysis_id) |
| AuditLog | audit_log.py | 15 | 0 | `success` is String not Boolean, no `created_at` index |
| ClinicalCase | clinical_case.py | 25+ | 0 | Denormalized patient PII (HIPAA risk), status is String not Enum |
| ClinicalReport | clinical_report.py | 25+ | 3 | 4 timestamp columns are String not DateTime |
| DICOMMetadata | dicom_metadata.py | 40+ | 1 | Most columns nullable, boolean flags stored as String |
| ModelVersion | model_version.py | 35+ | 0 | 9 date columns stored as String, no unique (name, version) |

### 4.2 Missing Indexes (Direct Latency Impact)

| Table | Column(s) | Query Pattern Affected | Priority |
|-------|-----------|----------------------|----------|
| ALL tables | `created_at` | Pagination, date-range filters, sorting | 🔴 P0 |
| ALL tables | `is_deleted` (partial: `WHERE is_deleted = false`) | Every soft-delete query | 🔴 P0 |
| users | `organization_id` | Filter users by org | 🔴 P0 |
| users | `(organization_id, role)` | Filter org users by role | 🔴 P0 (was dropped) |
| studies | `(patient_id, study_date)` | Patient study history | 🔴 P0 (was dropped) |
| images | `(study_id, view_type)` | Study image retrieval | 🔴 P0 (was dropped) |
| analyses | `(image_id, status)` | Analysis lookup | 🔴 P0 (was dropped) |
| analyses | `metadata` (GIN) | JSONB search | 🟡 P1 (was dropped) |
| analyses | `class_probabilities` (GIN) | JSONB search | 🟡 P1 (was dropped) |
| audit_log | `created_at` | HIPAA audit queries | 🔴 P0 |
| audit_log | `(user_id, action)` | User activity audit | 🟡 P1 |
| clinical_case | `current_step` | Workflow filtering | 🟡 P1 |
| analyses | `requires_review` | Review queue filtering | 🟡 P1 |

### 4.3 Type Mismatches (Query & Index Impact)

Storing values as `String` when they should be typed columns prevents proper indexing, comparison operators, and adds serialization overhead:

| Table | Column | Current Type | Should Be | Impact |
|-------|--------|-------------|-----------|--------|
| user | `last_login` | String | DateTime | Can't index, can't compare dates |
| patient | `medical_history` | String | Boolean | Inconsistent truthiness checks |
| patient | `family_history` | String | Boolean | Same |
| study | `is_priority` | String | Boolean | Can't use boolean index |
| audit_log | `success` | String ("true"/"false") | Boolean | String comparison vs boolean |
| audit_log | `status_code` | String | Integer | Can't do range queries (4xx, 5xx) |
| clinical_case | `status` | String | Enum | No constraint validation |
| clinical_case | `priority` | String | Enum | Same |
| clinical_report | 4 timestamp columns | String | DateTime | Can't sort, can't index |
| dicom_metadata | `compression_flag` | String | Boolean | String comparison |
| dicom_metadata | `lossy_flag` | String | Boolean | Same |
| model_version | 9 date columns | String | DateTime | Can't sort or range-query |

**Total: 20+ columns with wrong types across the schema.**

### 4.4 Data Integrity Gaps

| Issue | Table | Impact |
|-------|-------|--------|
| `patient_hash` is NOT unique | patient | Duplicate patients possible |
| No unique constraint on `(radiologist_id, analysis_id)` | feedback | Duplicate feedback possible |
| No unique constraint on `(model_name, version)` | model_version | Duplicate model versions possible |
| `organization.name` is not unique | organization | Duplicate org names |
| `user.license_number` is not unique | user | Duplicate license numbers |
| `feedback.usability_rating` has no CHECK constraint | feedback | Invalid ratings (e.g., -999) |
| `attention_map_data` stores 50K entries as JSONB per row | analysis | Massive row bloat, slow `SELECT *` |

### 4.5 Relationship & N+1 Risk Map

All relationships use SQLAlchemy's default **lazy loading**, which triggers a new DB query each time a relationship is accessed:

```
Organization.users → lazy load → N+1 when listing orgs with user counts
Organization.patients → lazy load → N+1
Organization.studies → lazy load → N+1  
User.organization → lazy load → N+1 when listing users with org names
Patient.studies → lazy load → N+1
Study.images → lazy load → N+1
Study.patient → lazy load → N+1
Image.analyses → lazy load → N+1
Image.study → lazy load → N+1
```

**Example:** Listing 50 studies with patient names and image counts:
- 1 query for studies
- 50 queries for `study.patient` (lazy load each)
- 50 queries for `study.images` (lazy load each)
- **Total: 101 queries instead of 1-3 with eager loading**

---

## 5. API Endpoint Audit

### 5.1 Endpoint Inventory

| File | Routes | Lines | Auth Gaps | Rate Limit Gaps |
|------|--------|-------|-----------|----------------|
| auth.py | 11 | 545 | ✅ Proper | `/refresh` missing |
| auth0.py | 7 | 364 | CSRF not verified | All missing |
| account.py | 8 | 425 | Info leak on 2 endpoints | All missing |
| cases.py | 12 | 343 | No ownership check | None applied |
| dicom.py | 7 | 529 | ✅ Role-based | None applied |
| fairness.py | 3 | 158 | ✅ Proper | None applied |
| images.py | 13 | 756 | ✅ Role-based | None applied |
| inference.py | 16 | 2,027 | 1 unauthenticated | **None on GPU ops** |
| models.py | 11 | 852 | 1 unauthenticated | None applied |
| reports.py | 10 | 644 | Ignores auth user | None applied |
| **TOTAL** | **98** | **5,643** | **5 gaps** | **~90 endpoints unprotected** |

### 5.2 Critical Endpoint Issues

#### 🔴 Unauthenticated Information Disclosure

```
GET /api/v1/account/check-email?email=user@example.com
→ Returns: { user_exists: true, account_created: "2024-01-15", full_name: "..." }
```

No authentication required. Attackers can enumerate all users and harvest PII.

```
GET /api/v1/models/compare
→ Returns: All AI model names, versions, validation metrics
```

No authentication. Anyone can enumerate the ML model inventory.

#### 🔴 Report Author Mismatch

```python
# reports.py — POST /api/v1/reports/
current_user = Depends(get_current_active_user)  # Gets authenticated user
# But then...
radiologist = db.query(User).filter(User.role == "radiologist").first()
report.author_id = radiologist.id  # Ignores authenticated user!
```

The authenticated user is discarded and a random radiologist is assigned as report author.

#### 🔴 `async def` + Sync DB Blocking Pattern

| Endpoint File | Handler Type | DB Type | Blocking? |
|--------------|-------------|---------|-----------|
| auth.py | `def` (sync) | Sync | ✅ No (FastAPI runs in threadpool) |
| auth0.py | `async def` | Async HTTP | ✅ No (true async) |
| account.py | `async def` | **Sync** | 🔴 **YES** |
| cases.py | `def` (sync) | Sync | ✅ No |
| dicom.py | `async def` | **Sync** | 🔴 **YES** |
| fairness.py | `async def` | **Sync** | 🔴 **YES** |
| images.py | Mixed | **Sync** | 🔴 **Partially** |
| inference.py | `async def` | **Sync + ML** | 🔴 **YES** |
| models.py | `async def` | **Sync** | 🔴 **YES** |
| reports.py | `async def` | **Sync** | 🔴 **YES** |

**7 of 10 endpoint files block the event loop.**

### 5.3 Pagination Issues

| Endpoint | Method | Issue |
|----------|--------|-------|
| `GET /cases/{id}/images` | Python slice | Loads ALL, slices in memory |
| `GET /cases/{id}/findings` | Python slice | Same |
| `GET /fairness/alerts` | Python slice | Same |
| `GET /auth/users` | Separate count query | 2 round trips |
| `GET /reports/` | Separate count query | 2 round trips |
| `GET /images/` | Separate count query | 2 round trips |

### 5.4 Missing Caching Opportunities

| Endpoint | Data Volatility | Recommended TTL |
|----------|----------------|-----------------|
| `GET /inference/statistics` | Changes per analysis | 5 minutes |
| `GET /reports/statistics` | Changes per report | 5 minutes |
| `GET /dicom/statistics` | Changes per upload | 10 minutes |
| `GET /models/performance` | Changes per deployment | 15 minutes |
| `GET /fairness/dashboard` | Changes per analysis batch | 10 minutes |
| `GET /images/statistics/storage` | Changes per upload | 10 minutes |
| `GET /auth0/.well-known` | Never changes at runtime | 1 hour |
| `GET /models/compare` | Changes per deployment | 15 minutes |

**Estimated latency savings: 60-80% reduction on statistics endpoints with 5-minute caching.**

---

## 6. Service Layer Audit

### 6.1 Service Inventory

| Service | Lines | Key Patterns | Issues |
|---------|-------|-------------|--------|
| auth_service.py | 480 | Login, register, user CRUD | 2 queries per login, no eager loading |
| case_service.py | 294 | Case CRUD, workflow | Uses `joinedload` ✅, race condition on case numbers |
| dicom_service.py | 586 | DICOM upload, anonymization | 7 queries for stats, bare `except` swallows errors |
| inference_service.py | 377 | ML prediction, bilateral | Commits inside save (loses caller rollback), sync ML in async |
| reports_service.py | 670 | Report CRUD, workflow | Good `joinedload` ✅, 7 queries for stats |
| models_service.py | 773 | Model version management | N queries in loop (should be `IN`), 7+ queries for stats |
| fairness_service.py | 309 | Fairness monitoring | In-memory state lost on restart |
| real_fairness_service.py | 478 | Real fairness from DB | Complex 3-table JOIN with no index strategy |
| storage_service.py | 452 | File storage, integrity | Reads entire files into memory for hash |

### 6.2 Query Anti-Patterns

#### Pattern 1: N+1 Query (Missing Eager Loading)

```python
# auth_service.py — login
user = db.query(User).filter(User.email == email).first()
# Later, accessing user.organization triggers ANOTHER query
org_name = user.organization.name  # N+1!
```

**Fix:** `db.query(User).options(joinedload(User.organization)).filter(...).first()`

#### Pattern 2: Separate Count + Data Queries

```python
# Multiple services
total = db.query(func.count(Model.id)).filter(...).scalar()  # Query 1
items = db.query(Model).filter(...).offset(skip).limit(limit).all()  # Query 2
```

**Fix:** Use window functions:
```python
from sqlalchemy import over
query = db.query(Model, func.count(Model.id).over().label('total'))
```

#### Pattern 3: Loop Queries Instead of Batch

```python
# models_service.py
for model_id in model_ids:
    model = db.query(ModelVersion).get(model_id)  # N queries!
```

**Fix:** `models = db.query(ModelVersion).filter(ModelVersion.id.in_(model_ids)).all()`

#### Pattern 4: Service Commits Inside Methods

```python
# inference_service.py
async def save_analysis(self, db, analysis_data):
    db.add(analysis)
    db.commit()  # Commits here!
    # Caller can no longer rollback if subsequent operations fail
```

**Fix:** Let the endpoint/caller control transaction boundaries.

### 6.3 SQL Injection Risk

**File:** `app/db/query_utils.py`

```python
def date_range_filter(query, model, start_date, end_date):
    column = getattr(model, f"{field_name}")  # f-string with user input
    # If field_name comes from query params, this is injectable
```

While `getattr` limits the attack surface (can only access existing model attributes), the pattern is fragile and should use an allowlist.

---

## 7. Infrastructure & Deployment Audit

### 7.1 Docker Configuration

**File:** `docker-compose.yml`

| Issue | Severity | Detail |
|-------|----------|--------|
| Hardcoded weak DB password | 🔴 | `POSTGRES_PASSWORD=clinicalvision_pass` |
| DEBUG=true in compose | 🔴 | Exposes stack traces in production |
| DB port 5432 exposed | 🔴 | Direct DB access from host |
| pgAdmin with admin/admin | 🔴 | Default credentials |
| No Redis service | 🟡 | Rate limiting uses per-worker memory |
| No resource limits | 🟡 | No `mem_limit`, `cpus` set |
| No healthcheck on app | 🟡 | Docker can't restart unhealthy containers |

**File:** `Dockerfile`

| Issue | Severity | Detail |
|-------|----------|--------|
| Runs as root | 🔴 | Container escape = full host access |
| No multi-stage build | 🟡 | Image includes build tools in production |
| Python 3.10 | 🟡 | EOL October 2026, should be 3.12 |
| Broken healthcheck | 🔴 | Uses `wget` which isn't installed |
| No `.dockerignore` | 🟡 | Copies unnecessary files |

### 7.2 Application Server

**File:** `start_server.sh`

| Issue | Severity | Detail |
|-------|----------|--------|
| `--reload` flag in production | 🔴 | File watcher overhead, unexpected restarts |
| Single worker default | 🟡 | Can't utilize multiple CPU cores |
| No `--proxy-headers` | 🟡 | Can't get real client IPs behind reverse proxy |
| No `--limit-max-requests` | 🟡 | No worker recycling, memory leaks accumulate |
| No gunicorn | 🟡 | No process manager, no graceful restarts |

**Recommended production command:**
```bash
gunicorn app.main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --proxy-headers \
    --forwarded-allow-ips="*" \
    --limit-max-requests 10000 \
    --max-requests-jitter 1000 \
    --timeout 120 \
    --graceful-timeout 30
```

### 7.3 FastAPI Application

**File:** `app/main.py` (221 lines)

| Issue | Severity | Detail |
|-------|----------|--------|
| `/docs` and `/redoc` exposed in ALL environments | 🟡 | Should be disabled in production |
| `/metrics` unauthenticated | 🔴 | Prometheus metrics leak internal data |
| CORS allows all origins (`*`) | 🔴 | Should restrict to known frontend domains |
| No graceful shutdown handler | 🟡 | Connections may be dropped on restart |
| No request ID middleware | 🟡 | Can't correlate logs across services |
| GZipMiddleware on all responses | 🟡 | Unnecessary CPU for binary/small responses |

### 7.4 Logging

**File:** `app/core/logging.py` (55 lines)

| Issue | Severity | Detail |
|-------|----------|--------|
| No log rotation | 🔴 | `FileHandler` fills disk, should be `RotatingFileHandler` |
| No structured JSON logging | 🟡 | Can't parse logs in ELK/Datadog |
| No request correlation ID | 🟡 | Can't trace requests across log entries |
| PII logged in dependencies.py | 🔴 | User emails/roles logged on every role check |

### 7.5 Dependencies

**File:** `requirements.txt`

| Issue | Severity | Detail |
|-------|----------|--------|
| All packages pinned to Jan 2024 (~18 months old) | 🟡 | Missing security patches |
| Both TensorFlow 2.15.0 AND PyTorch 2.1.2 | 🔴 | ~4GB combined, only one needed |
| Missing `asyncpg` | 🔴 | Required for async SQLAlchemy |
| Missing `gunicorn` | 🟡 | Required for production process management |
| Missing `aiofiles` | 🟡 | Required for async file I/O |
| Missing `redis` | 🟡 | Required for distributed rate limiting |
| `python-jose` used | 🟡 | Unmaintained, should use `PyJWT` |

---

## 8. Security Findings with Performance Impact

### 8.1 Authentication & Authorization

| Finding | Severity | Latency Impact |
|---------|----------|---------------|
| JWT uses HS256 (symmetric) | 🟡 | None (fast), but less secure than RS256 |
| No token revocation/blacklist | 🔴 | Stolen tokens valid for 30 min |
| No JTI (JWT ID) claim | 🟡 | Can't detect replay attacks |
| Refresh token hardcoded 7 days (ignores Settings) | 🟡 | None |
| No failed login tracking | 🔴 | No lockout, brute-force possible |
| No account lockout mechanism | 🔴 | Same |
| `dependencies.py` logs PII on every role check | 🔴 | Slight I/O overhead + compliance risk |

### 8.2 Rate Limiting

| Finding | Severity | Latency Impact |
|---------|----------|---------------|
| In-memory storage (not Redis) | 🔴 | Per-worker counters, ineffective with multiple workers |
| Only applied to 2 of 98 endpoints | 🔴 | 96 endpoints unprotected from abuse |
| No rate limit on inference/ML endpoints | 🔴 | GPU DoS vector |
| No rate limit on password reset | 🔴 | Email bombing vector |
| REDIS_URL bypasses Settings class | 🟡 | Config inconsistency |

### 8.3 HIPAA Compliance Concerns

| Finding | Severity |
|---------|----------|
| `clinical_case.py` stores patient name, age, gender as plain text | 🔴 |
| Audit log has no `created_at` index (HIPAA requires efficient audit queries) | 🔴 |
| Audit log `success` is String not Boolean (inconsistent audit data) | 🟡 |
| Audit log inherits soft-delete (should be append-only) | 🔴 |
| PII logged in `dependencies.py` | 🔴 |
| No encryption at rest for patient data | 🔴 |

---

## 9. What's Done Well

Despite the issues found, the codebase has several strong architectural patterns:

| Area | Positive Finding |
|------|-----------------|
| **Service Layer** | Clean separation of concerns — endpoints delegate to services |
| **Exception Handling** | Custom exception hierarchies mapped to proper HTTP status codes |
| **Role-Based Access** | Dependency injection pattern for role checks |
| **Pydantic Schemas** | Consistent use of response models for serialization |
| **Soft Delete** | Uniform `is_deleted` pattern across all models |
| **File Integrity** | SHA-256 checksums for uploaded files |
| **Background Tasks** | Email operations properly deferred to background tasks |
| **`joinedload` Usage** | `case_service.py` and `reports_service.py` use eager loading correctly |
| **GZip Compression** | Enabled globally for response compression |
| **Pool Pre-ping** | `pool_pre_ping=True` detects stale connections |
| **UUID Primary Keys** | Secure, non-sequential identifiers |
| **CORS Middleware** | Present (though overly permissive) |
| **Rate Limit Infrastructure** | slowapi integrated (though underutilized) |
| **Migration History** | 8 Alembic migrations tracking schema evolution |

---

## 10. Prioritized Remediation Plan

### Phase 1: Critical Fixes (Week 1-2) — Immediate Latency Wins

| # | Task | Impact | Effort | Files |
|---|------|--------|--------|-------|
| 1 | **Recreate 8 dropped performance indexes** via new Alembic migration | 5-50× query speedup | 2 hours | New migration |
| 2 | **Add `created_at` index** to BaseModel | Pagination speedup on all tables | 30 min | `base.py` + migration |
| 3 | **Add partial index on `is_deleted = false`** | Soft-delete query speedup | 30 min | `base.py` + migration |
| 4 | **Remove redundant UUID indexes** (`unique=True, index=True`) | Reduce write overhead | 30 min | `base.py` + migration |
| 5 | **Fix `async def` → `def`** on all endpoints using sync DB | Unblock event loop | 4 hours | 7 endpoint files |
| 6 | **Combine statistics queries** into single SQL | 7× fewer round trips | 4 hours | All stats endpoints |
| 7 | **Fix auto-commit on GET requests** | Eliminate unnecessary COMMIT | 30 min | `session.py` |
| 8 | **Add `pool_recycle` and `pool_timeout`** to engine | Prevent connection leaks | 15 min | `session.py` |

### Phase 2: Security & Stability (Week 3-4)

| # | Task | Impact | Effort | Files |
|---|------|--------|--------|-------|
| 9 | **Add rate limiting to all inference endpoints** | Prevent GPU DoS | 2 hours | `inference.py` |
| 10 | **Fix unauthenticated endpoints** (check-email, model compare) | Close info disclosure | 1 hour | `account.py`, `models.py` |
| 11 | **Fix report author mismatch** | Correct report attribution | 30 min | `reports.py` |
| 12 | **Remove `--reload` from production start script** | Eliminate file watcher overhead | 15 min | `start_server.sh` |
| 13 | **Disable `/docs`, `/redoc` in production** | Reduce attack surface | 30 min | `main.py` |
| 14 | **Add log rotation** | Prevent disk fill | 30 min | `logging.py` |
| 15 | **Fix Docker: non-root user, healthcheck** | Security + orchestration | 1 hour | `Dockerfile` |
| 16 | **Restrict CORS origins** | Security | 15 min | `main.py` |

### Phase 3: Performance Optimization (Week 5-8)

| # | Task | Impact | Effort | Files |
|---|------|--------|--------|-------|
| 17 | **Implement streaming file uploads** | Prevent OOM on large DICOMs | 4 hours | `images.py`, `inference.py` |
| 18 | **Add Redis caching for statistics endpoints** | 60-80% latency reduction | 8 hours | All stats endpoints |
| 19 | **Fix Python-level pagination** → SQL pagination | Prevent memory bombs | 2 hours | `cases.py`, `fairness.py` |
| 20 | **Add `joinedload`/`selectinload`** to all list queries | Eliminate N+1 queries | 4 hours | All service files |
| 21 | **Migrate to async SQLAlchemy** (`asyncpg`) | Full async stack | 16 hours | `session.py`, all services |
| 22 | **Add gunicorn with multiple workers** | Utilize all CPU cores | 2 hours | `start_server.sh`, requirements |
| 23 | **Extract `attention_map_data` to separate table** | Reduce row bloat in analyses | 4 hours | `analysis.py`, migration |
| 24 | **Fix 20+ type mismatches** (String → Boolean/DateTime/Enum) | Enable proper indexing | 8 hours | Multiple models + migration |

### Phase 4: Enterprise Hardening (Week 9-12)

| # | Task | Impact | Effort | Files |
|---|------|--------|--------|-------|
| 25 | **Implement request correlation IDs** | Log traceability | 4 hours | Middleware + logging |
| 26 | **Add structured JSON logging** | Production observability | 4 hours | `logging.py` |
| 27 | **Implement token revocation (Redis blacklist)** | Security | 8 hours | `security.py` |
| 28 | **Add failed login tracking + account lockout** | HIPAA compliance | 4 hours | `user.py`, `auth_service.py` |
| 29 | **Fix audit log** (append-only, proper types, indexes) | HIPAA compliance | 4 hours | `audit_log.py`, migration |
| 30 | **Remove denormalized PII from clinical_case** | HIPAA compliance | 4 hours | `clinical_case.py`, services |
| 31 | **Multi-stage Docker build** | Smaller, more secure image | 2 hours | `Dockerfile` |
| 32 | **Update all dependencies** to latest versions | Security patches | 4 hours | `requirements.txt` |

---

## 11. Latency Optimization Roadmap

### Expected Latency Improvements

| Optimization | Before (est.) | After (est.) | Improvement |
|-------------|--------------|-------------|-------------|
| Recreate dropped indexes | 50-500ms (seq scan) | 1-10ms (index scan) | **10-50×** |
| Add `created_at` index | 20-200ms (pagination) | 1-5ms | **10-40×** |
| Fix async/sync blocking | 100-5000ms (under load) | 10-50ms | **10-100×** |
| Combine statistics queries | 7× round trip (~35ms) | 1× round trip (~5ms) | **7×** |
| Redis caching (stats) | 5-35ms (DB query) | <1ms (cache hit) | **10-50×** |
| Streaming uploads | OOM at 500MB | Constant ~8KB memory | **∞ (prevents crash)** |
| SQL pagination | O(n) memory | O(limit) memory | **100-1000×** |
| Eager loading (N+1 fix) | 50-100 queries | 1-3 queries | **20-50×** |
| Remove auto-commit on GET | +1ms per GET | 0ms | **-1ms per request** |

### Monitoring Recommendations

1. **Add APM** (Application Performance Monitoring): Datadog, New Relic, or open-source alternative (Jaeger + Prometheus)
2. **Track P50/P95/P99 latencies** per endpoint
3. **Monitor DB query counts** per request (catch N+1 regressions)
4. **Set up slow query logging** in PostgreSQL (`log_min_duration_statement = 100`)
5. **Monitor connection pool saturation** (`pool.checkedout()` / `pool.size()`)
6. **Alert on error rates** > 1% per endpoint

---

## 12. Appendices

### A. Files Audited

<details>
<summary>Click to expand full file list</summary>

**Core Infrastructure (6 files, ~1,100 lines)**
- `app/main.py` (221 lines)
- `app/core/config.py` (170 lines)
- `app/core/dependencies.py` (305 lines)
- `app/core/file_validator.py` (208 lines)
- `app/core/logging.py` (55 lines)
- `app/core/rate_limit.py` (81 lines)
- `app/core/security.py` (~260 lines)

**Database Layer (3 files, ~560 lines)**
- `app/db/session.py` (95 lines)
- `app/db/base.py` (56 lines)
- `app/db/query_utils.py` (411 lines)

**Models (13 files, ~1,625 lines)**
- `app/models/organization.py`
- `app/models/user.py`
- `app/models/patient.py`
- `app/models/study.py`
- `app/models/image.py` (112 lines, 30+ columns)
- `app/models/analysis.py` (105 lines, 29 columns)
- `app/models/feedback.py`
- `app/models/audit_log.py`
- `app/models/clinical_case.py` (224 lines)
- `app/models/clinical_report.py` (210 lines)
- `app/models/dicom_metadata.py` (171 lines, 40+ columns)
- `app/models/model_version.py` (277 lines, 35+ columns)

**Migrations (8 files)**
- `alembic/versions/` — all 8 migration files analyzed

**API Endpoints (10 files, ~5,643 lines)**
- `app/api/v1/endpoints/auth.py` (545 lines)
- `app/api/v1/endpoints/auth0.py` (364 lines)
- `app/api/v1/endpoints/account.py` (425 lines)
- `app/api/v1/endpoints/cases.py` (343 lines)
- `app/api/v1/endpoints/dicom.py` (529 lines)
- `app/api/v1/endpoints/fairness.py` (158 lines)
- `app/api/v1/endpoints/images.py` (756 lines)
- `app/api/v1/endpoints/inference.py` (2,027 lines)
- `app/api/v1/endpoints/models.py` (852 lines)
- `app/api/v1/endpoints/reports.py` (644 lines)

**Services (9+ files, ~4,400+ lines)**
- `app/services/auth_service.py` (480 lines)
- `app/services/case_service.py` (294 lines)
- `app/services/dicom_service.py` (586 lines)
- `app/services/inference_service.py` (377 lines)
- `app/services/reports_service.py` (670 lines)
- `app/services/models_service.py` (773 lines)
- `app/services/fairness_service.py` (309 lines)
- `app/services/real_fairness_service.py` (478 lines)
- `app/services/storage_service.py` (452 lines)

**Deployment & Config**
- `docker-compose.yml` (55 lines)
- `Dockerfile` (27 lines)
- `requirements.txt` (45 lines)
- `start_server.sh` (174 lines)
- `alembic.ini`
- `.env.example`

</details>

### B. Quick Reference: Index Recreation SQL

```sql
-- Run this directly in PostgreSQL to immediately fix the dropped indexes
-- Or create as an Alembic migration

-- Composite indexes (dropped by migration 1e8539f93b11)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_org_role 
    ON users (organization_id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_studies_patient_date 
    ON studies (patient_id, study_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_images_study_view 
    ON images (study_id, view_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_analyses_image_status 
    ON analyses (image_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_feedback_analysis_type 
    ON feedback (analysis_id, feedback_type);

-- GIN indexes for JSONB columns (dropped by same migration)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_analyses_metadata_gin 
    ON analyses USING gin (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_analyses_class_probs_gin 
    ON analyses USING gin (class_probabilities);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_images_preprocessing_gin 
    ON images USING gin (preprocessing_applied);

-- NEW: Critical missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_base_created_at 
    ON users (created_at);
-- Repeat for: patients, studies, images, analyses, feedback, audit_log, 
-- clinical_cases, clinical_reports, dicom_metadata, model_versions

-- Partial index for soft-delete optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_not_deleted 
    ON users (id) WHERE is_deleted = false;
-- Repeat for all soft-deletable tables
```

### C. Connection Pool Sizing Guide

```
Optimal pool_size = (num_cores * 2) + effective_spindle_count
For PostgreSQL on SSD with 4 cores: pool_size = (4 * 2) + 1 = 9 ≈ 10

With gunicorn workers:
  Total connections = pool_size × num_workers
  4 workers × 10 pool = 40 connections
  PostgreSQL max_connections default = 100
  Leaves 60 for pgAdmin, migrations, monitoring
```

### D. Benchmark Commands

```bash
# Baseline latency measurement
wrk -t4 -c50 -d30s http://localhost:8000/api/v1/auth/users

# DB query analysis
psql -c "SELECT schemaname, tablename, seq_scan, idx_scan, 
         seq_tup_read, idx_tup_fetch 
         FROM pg_stat_user_tables ORDER BY seq_scan DESC;"

# Check for missing indexes (sequential scans > 1000)
psql -c "SELECT relname, seq_scan, seq_tup_read, 
         idx_scan, idx_tup_fetch 
         FROM pg_stat_user_tables 
         WHERE seq_scan > 1000 ORDER BY seq_tup_read DESC;"

# Connection pool status (from Python)
# engine.pool.status()  → "Pool size: 10 Connections in pool: 8 Current overflow: 0"
```

---

*End of audit report. Total issues cataloged: 65 (38 critical, 27 moderate). Estimated remediation effort: 12-16 weeks for full implementation.*
