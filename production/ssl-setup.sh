#!/bin/bash
# =============================================================================
# ClinicalVision AI — SSL Certificate Setup (Let's Encrypt)
# Run this AFTER the site is accessible on HTTP (port 80)
# Usage: bash ssl-setup.sh
# =============================================================================
set -euo pipefail

DOMAIN="clinicalvision.ai"
EMAIL="admin@clinicalvision.ai"
PROJECT_DIR="$HOME/clinicalvision"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  SSL Certificate Setup (Let's Encrypt)"
echo "=========================================="

# ── Step 1: Install certbot if not present ────────────────────────────────
if ! command -v certbot &> /dev/null; then
    echo "[1/4] Installing certbot..."
    sudo apt update
    sudo apt install -y certbot
else
    echo "[1/4] certbot already installed"
fi

# ── Step 2: Stop frontend temporarily to free port 80 ────────────────────
echo "[2/4] Stopping frontend container briefly..."
docker compose stop frontend

# ── Step 3: Obtain certificate ────────────────────────────────────────────
echo "[3/4] Obtaining SSL certificate..."
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# ── Step 4: Copy certs to project ssl directory ──────────────────────────
echo "[4/4] Installing certificates..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/privkey.pem
sudo chown $USER:$USER ssl/*.pem
chmod 600 ssl/privkey.pem

# ── Step 5: Enable HTTPS in nginx config ─────────────────────────────────
echo "Enabling HTTPS in nginx config..."

# Uncomment the HTTPS server block and the HTTP→HTTPS redirect
NGINX_CONF="clinicalvision_frontend/nginx.conf"

# Enable the HTTP→HTTPS redirect (uncomment the return 301 line)
sed -i 's|    # return 301 https://\$host\$request_uri;|    return 301 https://$host$request_uri;|' "$NGINX_CONF"

# Comment out the HTTP content-serving blocks (everything after the redirect
# that was previously serving the app on HTTP)
# We'll use a simpler approach: replace the nginx conf with the full SSL version
python3 - "$NGINX_CONF" << 'PYEOF'
import sys

conf_path = sys.argv[1]
with open(conf_path, 'r') as f:
    content = f.read()

# Uncomment the HTTPS server block
content = content.replace('# server {\n#     listen 443', 'server {\n    listen 443')

# Simple approach: uncomment all lines in the HTTPS block
lines = content.split('\n')
in_https_block = False
result = []
for line in lines:
    # Detect start of HTTPS block (already uncommented the first line)
    if 'listen 443 ssl http2;' in line and not line.strip().startswith('#'):
        in_https_block = True
        result.append(line)
        continue
    
    if in_https_block:
        # Uncomment lines that start with #
        stripped = line.lstrip()
        if stripped.startswith('# }') and len(stripped) == 3:
            result.append(line.replace('# }', '}'))
            in_https_block = False
            continue
        if stripped.startswith('#'):
            # Remove the leading # and one space
            indent = len(line) - len(stripped)
            uncommented = ' ' * indent + stripped[2:] if stripped.startswith('# ') else ' ' * indent + stripped[1:]
            result.append(uncommented)
        else:
            result.append(line)
    else:
        result.append(line)

with open(conf_path, 'w') as f:
    f.write('\n'.join(result))

PYEOF

# Remove the HTTP app-serving blocks (keep only the redirect + acme-challenge)
# This is handled by the return 301 redirect we already uncommented

echo ""
echo "=========================================="
echo "  SSL Setup Complete!"
echo "=========================================="

# ── Restart frontend with new config ─────────────────────────────────────
echo "Rebuilding frontend with SSL config..."
docker compose up -d --build frontend

echo ""
echo "  ✓ https://$DOMAIN should now be live"
echo "  ✓ http://$DOMAIN redirects to HTTPS"
echo ""
echo "  Auto-renewal cron (add with: sudo crontab -e):"
echo "  0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/ssl/ && cd $PROJECT_DIR && docker compose restart frontend"
echo ""
