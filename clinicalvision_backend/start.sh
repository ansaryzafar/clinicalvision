#!/bin/bash

# ClinicalVision Backend - Quick Start Script
# This script sets up and runs the backend server

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ClinicalVision AI Backend - Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "Dependencies installed"
    echo ""
else
    echo "Dependencies already installed"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ".env file created"
    echo ""
else
    echo ".env file exists"
    echo ""
fi

# Create directories
echo "Creating required directories..."
mkdir -p uploads logs models
echo "Directories ready"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Server:     http://localhost:8000"
echo "  API Docs:   http://localhost:8000/docs"
echo "  ReDoc:      http://localhost:8000/redoc"
echo ""
echo "  Press CTRL+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the server
python main.py
