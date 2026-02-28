# ClinicalVision AI Frontend - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
# CI=false prevents react-scripts from treating warnings as errors
# TSC_COMPILE_ON_ERROR=true allows build to succeed despite TS warnings
# DISABLE_ESLINT_PLUGIN=true prevents ESLint warnings from blocking build
# These replicate the local .env settings that are gitignored
ENV NODE_ENV=production \
    CI=false \
    TSC_COMPILE_ON_ERROR=true \
    DISABLE_ESLINT_PLUGIN=true \
    GENERATE_SOURCEMAP=false
RUN npm run build

# =============================================================================
# Stage 2: Production
# =============================================================================
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Security: Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
