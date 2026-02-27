# ClinicalVision AI

An AI-powered breast cancer detection and clinical decision support platform designed for radiology workflows. ClinicalVision integrates deep learning mammogram classification, explainable AI, and structured clinical reporting into a production-ready application that supports radiologists in diagnostic interpretation.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [License](#license)

---

## Overview

ClinicalVision addresses the need for transparent, auditable AI assistance in breast cancer screening. The platform provides:

- Mammogram classification with calibrated confidence scores
- Bilateral (CC/MLO) dual-view analysis for comprehensive assessment
- Explainable AI outputs (Grad-CAM, LIME, SHAP) for clinical interpretability
- Structured BI-RADS reporting with automated narrative generation
- Fairness monitoring across demographic attributes to detect algorithmic bias
- A clinical workflow engine that mirrors radiology reading workflows

The system is designed as a decision-support tool. All AI outputs are presented alongside uncertainty metrics and explanations, and final diagnostic authority remains with the clinician.

---

## Key Features

### Clinical Workflow Engine
A step-by-step workflow guiding radiologists through patient intake, image upload, AI-assisted analysis, BI-RADS assessment, and report generation. Supports both clinical and research modes.

### AI Mammogram Classification
Single-image and bilateral dual-view analysis using ensemble deep learning models. Returns classification probabilities, risk stratification (low/moderate/high), and processing metadata.

### Explainable AI Suite
Multiple explanation methods to support clinical trust:
- **Grad-CAM** -- Attention heatmaps highlighting regions of interest
- **LIME** -- Local interpretable model-agnostic explanations
- **SHAP** -- Shapley value-based feature attribution
- **XAI Comparison** -- Side-by-side evaluation of explanation methods

### AI Fairness Monitoring
Dashboard tracking demographic parity and equalized odds across patient attributes (age, breast density, ethnicity). Regulatory compliance indicators aligned with FDA and NIST AI RMF guidelines. Clear disclosure when operating on demonstration data versus real evaluation data.

### BI-RADS Reporting
Full BI-RADS 0-6 categorization with 4A/4B/4C subdivisions. Automated clinical narrative generation from AI findings. PDF report export with audit trail.

### DICOM Support
Native DICOM file handling with metadata extraction, study/series browsing, and integrated medical image viewing via Cornerstone.js.

### Case Management
Priority-scored worklist, case assignment, status tracking, and historical analysis archive. Designed to integrate into existing radiology department operations.

### Model Version Management
Model registry with version tracking, performance comparison, A/B testing configuration, and rollback capabilities.

### Authentication and Access Control
JWT-based authentication with role-based permissions. Optional Auth0 SSO integration for enterprise environments. Email verification and password reset flows.

---

## Architecture

```
                    +------------------+
                    |   React Frontend |
                    |  (TypeScript/MUI)|
                    +--------+---------+
                             |
                        HTTPS/REST
                             |
                    +--------+---------+
                    |  FastAPI Backend  |
                    |   (Python 3.10)  |
                    +---+---------+----+
                        |         |
              +---------+--+  +---+----------+
              | PostgreSQL |  |  ML Pipeline  |
              |   15       |  | TF/PyTorch    |
              +------------+  +--------------+
```

**Frontend**: React 19 single-page application with MUI component library, Cornerstone.js medical image viewer, and Zustand state management.

**Backend**: FastAPI REST API with SQLAlchemy ORM, Alembic migrations, Pydantic validation, and structured logging.

**ML Pipeline**: TensorFlow and PyTorch inference with model versioning, ensemble predictions, and XAI generation.

**Database**: PostgreSQL with tables for users, images, analyses, clinical cases, reports, and audit logs.

**Infrastructure**: Docker Compose orchestration with Nginx reverse proxy, Redis caching, and Prometheus metrics.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, MUI 7, React Router 6, Zustand, Recharts, Framer Motion |
| Medical Imaging | Cornerstone.js, pydicom, OpenCV, scikit-image |
| Backend | Python 3.10, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2 |
| ML/AI | TensorFlow 2.15, PyTorch 2.1, Torchvision, HuggingFace Transformers |
| Database | PostgreSQL 15 |
| Infrastructure | Docker, Nginx, Redis 7, Prometheus |
| Authentication | JWT (python-jose), bcrypt, Auth0 (optional) |
| Testing | Jest, React Testing Library (frontend); pytest (backend) |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+
- Docker and Docker Compose (recommended)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/ansaryzafar/clinicalvision.git
cd clinicalvision

# Copy environment configuration
cp .env.development.example .env

# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

### Manual Setup

**Backend:**

```bash
cd clinicalvision_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Start the server
bash start_server.sh
```

**Frontend:**

```bash
cd clinicalvision_frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend runs on `http://localhost:3000` and proxies API requests to the backend on port 8000.

---

## Project Structure

```
clinicalvision/
├── clinicalvision_frontend/       # React TypeScript application
│   ├── public/                    # Static assets
│   └── src/
│       ├── components/            # Reusable UI components
│       │   ├── shared/            # Design system components
│       │   ├── viewer/            # Medical image viewer
│       │   └── workflow/          # Workflow step components
│       ├── contexts/              # React contexts (Auth, Workflow, Cases)
│       ├── hooks/                 # Custom React hooks
│       ├── pages/                 # Page-level components
│       ├── routes/                # Route configuration
│       ├── services/              # API client and services
│       ├── theme/                 # MUI theme configuration
│       ├── types/                 # TypeScript type definitions
│       └── __tests__/             # Test suites
│
├── clinicalvision_backend/        # FastAPI Python application
│   ├── app/
│   │   ├── api/v1/endpoints/      # REST API endpoints
│   │   ├── core/                  # Configuration and security
│   │   ├── db/                    # Database connection and sessions
│   │   ├── middleware/            # CORS, security headers, rate limiting
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── services/              # Business logic services
│   │   └── utils/                 # Utility functions
│   ├── alembic/                   # Database migration scripts
│   ├── ml_models/                 # Model weights and configuration
│   ├── tests/                     # Backend test suites
│   └── requirements.txt          # Python dependencies
│
├── docker-compose.yml             # Multi-service orchestration
├── .github/workflows/ci.yml       # CI/CD pipeline
├── .env.development.example       # Development configuration template
└── .env.production.example        # Production configuration template
```

---

## API Reference

The backend exposes a versioned REST API at `/api/v1/`. Interactive documentation is available at `/docs` (Swagger UI) and `/redoc` when the server is running.

### Core Endpoints

| Endpoint Group | Base Path | Description |
|---|---|---|
| Authentication | `/api/v1/auth` | Registration, login, JWT management, user administration |
| Inference | `/api/v1/inference` | Mammogram classification, XAI generation, bilateral analysis |
| Images | `/api/v1/images` | Image upload, retrieval, DICOM conversion, thumbnails |
| Reports | `/api/v1/reports` | BI-RADS report creation, PDF export, audit trail |
| Cases | `/api/v1/cases` | Case management, assignment, findings, status tracking |
| DICOM | `/api/v1/dicom` | DICOM metadata extraction, study/series browsing |
| Fairness | `/api/v1/fairness` | Demographic parity, equalized odds, compliance metrics |
| Models | `/api/v1/models` | Model versioning, comparison, A/B testing, rollback |
| Health | `/health` | Service health check |
| Metrics | `/metrics` | Prometheus metrics |

---

## Testing

### Frontend Tests

```bash
cd clinicalvision_frontend

# Run all tests
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage --watchAll=false

# Run a specific test suite
npm test -- --testPathPattern="audit-fixes" --watchAll=false
```

**Current status:** 81 test suites, 2,245 tests passing.

Test suites cover:
- Component rendering and interaction
- Navigation and routing
- Form validation and submission
- Authentication flows
- Accessibility compliance
- API integration mocks
- Audit fix regressions

### Backend Tests

```bash
cd clinicalvision_backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=app --cov-report=html
```

---

## Deployment

### Docker Compose (Recommended)

The provided `docker-compose.yml` configures four services:

| Service | Image | Purpose |
|---|---|---|
| `db` | postgres:15-alpine | Primary database |
| `backend` | Custom (FastAPI) | REST API and ML inference |
| `frontend` | Custom (React/Nginx) | Static frontend with reverse proxy |
| `redis` | redis:7-alpine | Session cache |

```bash
# Production deployment
cp .env.production.example .env
# Edit .env with production credentials

docker compose up -d

# With pgAdmin for database management (development only)
docker compose --profile debug up -d
```

### CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:
1. Backend linting and tests with PostgreSQL service container
2. Frontend type checking and test suite
3. Security scanning with Trivy
4. Docker image builds
5. Staged deployment to staging (develop branch) and production (main branch)

---

## Configuration

Configuration is managed through environment variables. Template files are provided:

- `.env.development.example` -- Local development defaults
- `.env.production.example` -- Production settings with security guidance
- `clinicalvision_backend/.env.example` -- Backend-specific configuration

Key configuration categories:
- **Database**: PostgreSQL connection string, pool settings
- **Security**: JWT secret key, token expiration, CORS origins
- **ML**: Model selection, mock mode toggle, inference settings
- **Monitoring**: Prometheus metrics, structured logging level
- **Email**: SMTP configuration for verification and password reset
- **Auth0**: Optional SSO provider settings

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
