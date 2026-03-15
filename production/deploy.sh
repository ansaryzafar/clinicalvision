#!/bin/bash
# =============================================================================
# ClinicalVision AI — VM Deployment Script
# Run this on the GCP VM after cloning the repo
# Usage: bash deploy.sh
# =============================================================================
set -euo pipefail

DOMAIN="clinicalvision.ai"
PROJECT_DIR="$HOME/clinicalvision"

echo "=========================================="
echo "  ClinicalVision AI — Production Deploy"
echo "=========================================="

cd "$PROJECT_DIR"

# ── Step 1: Copy production .env to root ──────────────────────────────────
echo "[1/6] Setting up environment variables..."
if [ ! -f .env ]; then
    cp production/.env.production .env
    echo "  ✓ .env created from production template"
else
    echo "  ✓ .env already exists (skipping)"
fi

# Also create backend-specific .env (docker-compose references it)
if [ ! -f clinicalvision_backend/.env ]; then
    cp .env clinicalvision_backend/.env
    echo "  ✓ Backend .env created"
else
    echo "  ✓ Backend .env already exists"
fi

# ── Step 2: Copy production nginx config ──────────────────────────────────
echo "[2/6] Setting up nginx production config..."
cp production/nginx.prod.conf clinicalvision_frontend/nginx.conf
echo "  ✓ Production nginx.conf installed"

# ── Step 3: Create required directories ───────────────────────────────────
echo "[3/6] Creating required directories..."
mkdir -p ssl certbot/www clinicalvision_backend/uploads clinicalvision_backend/logs clinicalvision_backend/models
echo "  ✓ Directories created"

# ── Step 4: Open firewall (GCP) ──────────────────────────────────────────
echo "[4/6] Checking firewall..."
echo "  ⚠ Ensure GCP firewall allows ports 80 and 443:"
echo "    gcloud compute firewall-rules create allow-http  --allow tcp:80  --target-tags=http-server"
echo "    gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags=http-server"

# ── Step 5: Build and start containers ────────────────────────────────────
echo "[5/6] Building Docker images (this may take 5-10 minutes)..."
docker compose build --no-cache

echo "[6/6] Starting services..."
docker compose up -d

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  Next steps:"
echo "  1. Visit http://$DOMAIN to verify the site loads"
echo "  2. Run: bash ssl-setup.sh   to obtain SSL certificate"
echo "  3. After SSL: visit https://$DOMAIN"
echo ""
