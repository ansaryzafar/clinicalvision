#!/bin/bash
# ClinicalVision Backend Server Startup Script
# This script ensures proper environment configuration for robust model inference

set -e

echo "=========================================="
echo "ClinicalVision Backend Server Startup"
echo "=========================================="

# Change to the backend directory
cd "$(dirname "$0")"

# ============================================
# TensorFlow / GPU Configuration
# ============================================
# 
# WHY GPU DOESN'T WORK:
# Your system has a CUDA version mismatch:
# - Driver: CUDA 570.211.1
# - TensorFlow expects: CUDA 570.195.3
# - Result: XLA JIT can't find libdevice.10.bc
# - Symptom: BatchNormalization Rsqrt operation fails
#
# TO FIX GPU (choose one):
# 1. Update NVIDIA drivers: sudo apt install nvidia-driver-XXX
# 2. Reinstall TensorFlow: pip install tensorflow==X.X.X
# 3. Install matching CUDA toolkit
#
# TO TRY GPU MODE (may fail):
#   export CLINICALVISION_FORCE_CPU=false
#   ./start_server.sh
# ============================================

# Disable XLA JIT auto-compilation (prevents libdevice.10.bc errors)
export TF_XLA_FLAGS="--tf_xla_auto_jit=0"

# Disable MLIR bridge
export TF_MLIR_ENABLE_MLIR_BRIDGE=0

# Disable XLA entirely for maximum compatibility
export TF_DISABLE_XLA=1

# Set CUDA data directory (helps XLA find required files if needed)
export XLA_FLAGS="--xla_gpu_cuda_data_dir=/usr/lib/cuda"

# Reduce TensorFlow logging verbosity
export TF_CPP_MIN_LOG_LEVEL=2

# Prevent TensorFlow from allocating all GPU memory at once
export TF_FORCE_GPU_ALLOW_GROWTH=true

# DEVICE MODE CONFIGURATION
# Set CLINICALVISION_FORCE_CPU=false to attempt GPU mode
# Default: true (CPU mode for reliability)
export CLINICALVISION_FORCE_CPU="${CLINICALVISION_FORCE_CPU:-true}"

if [ "$CLINICALVISION_FORCE_CPU" = "true" ] || [ "$CLINICALVISION_FORCE_CPU" = "1" ]; then
    export CUDA_VISIBLE_DEVICES=""
    echo ""
    echo "Device Mode: CPU-ONLY (forced)"
    echo "  - Reason: GPU has CUDA version mismatch"
    echo "  - To try GPU: CLINICALVISION_FORCE_CPU=false ./start_server.sh"
    echo ""
else
    echo ""
    echo "Device Mode: AUTO-DETECT (GPU if compatible)"
    echo "  - Will test GPU compatibility at startup"
    echo "  - Falls back to CPU if GPU test fails"
    echo ""
fi

echo "TensorFlow Configuration:"
echo "  - XLA JIT: disabled"
echo "  - MLIR: disabled"
echo "  - Memory growth: enabled"

# ============================================
# Python Environment Detection
# ============================================
CONDA_ENV="clinicalvision"

# Detect and activate conda environment
if command -v conda &> /dev/null; then
    echo "Checking conda environments..."
    
    # Source conda
    if [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
        source "$HOME/miniconda3/etc/profile.d/conda.sh"
    elif [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
        source "$HOME/anaconda3/etc/profile.d/conda.sh"
    fi
    
    # Try to activate the environment
    if conda activate "$CONDA_ENV" 2>/dev/null; then
        echo "Activated conda environment: $CONDA_ENV"
    else
        echo "Warning: Could not activate conda environment '$CONDA_ENV'"
        echo "Using current Python environment"
    fi
fi

# Display Python info
echo ""
echo "Python environment:"
python --version
which python

# ============================================
# Server Configuration
# ============================================
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-1}"  # Single worker for model loading
LOG_LEVEL="${LOG_LEVEL:-info}"

echo ""
echo "Server configuration:"
echo "  - Host: $HOST"
echo "  - Port: $PORT"
echo "  - Workers: $WORKERS"
echo "  - Log level: $LOG_LEVEL"

# ============================================
# Pre-flight Checks
# ============================================
echo ""
echo "Running pre-flight checks..."

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Warning: Port $PORT is already in use"
    read -p "Kill existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "uvicorn.*:$PORT" || true
        sleep 1
        echo "Existing process killed"
    else
        echo "Exiting to avoid port conflict"
        exit 1
    fi
fi

# Check if model files exist
MODEL_DIR="ml_models/v12_production"
if [ -d "$MODEL_DIR" ]; then
    echo "✓ Model directory found: $MODEL_DIR"
    MODEL_COUNT=$(find "$MODEL_DIR/ensemble" -name "*.h5" 2>/dev/null | wc -l)
    echo "  Found $MODEL_COUNT ensemble model files"
else
    echo "⚠ Warning: Model directory not found: $MODEL_DIR"
    echo "  Server will start but inference may not work"
fi

# ============================================
# Start Server
# ============================================
echo ""
echo "=========================================="
echo "Starting ClinicalVision Backend Server..."
echo "=========================================="
echo ""

# Start uvicorn with proper configuration
exec uvicorn main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --log-level "$LOG_LEVEL" \
    --timeout-keep-alive 120 \
    --limit-concurrency 100
