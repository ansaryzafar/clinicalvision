# ClinicalVision AI - Frontend

## 🏥 Production-Grade Breast Cancer Detection Interface

A professional, medical-grade React frontend for AI-powered mammogram analysis, designed specifically for radiologists and imaging professionals.

---

## ✨ Features

### Core Functionality
- ✅ **Drag-and-drop image upload** with DICOM/PNG/JPG support
- ✅ **Real-time AI analysis** with progress tracking
- ✅ **Clinical results dashboard** with confidence metrics
- ✅ **Attention map visualization** with suspicious region highlighting
- ✅ **Interactive image viewer** with zoom and overlay controls
- ✅ **Clinical narrative generation** with medical terminology

### Clinical Design
- 🎨 **Medical-themed UI** (blues/teals for trust and professionalism)
- 📱 **Responsive design** for desktop and tablet
- ♿ **WCAG 2.1 compliant** accessibility
- 🔒 **Production-ready** error handling and validation
- 📊 **Uncertainty visualization** for AI predictions
- 🎯 **Radiologist-centric** workflow

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- ClinicalVision Backend running on \`localhost:8000\`

### Installation

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm start
\`\`\`

The application will open at \`http://localhost:3000\`

---

## 📁 Project Structure

\`\`\`
src/
├── components/              # Reusable React components
│   ├── layout/
│   │   └── MainLayout.tsx   # Clinical navigation layout
│   ├── upload/
│   │   └── ImageUpload.tsx  # Drag-and-drop uploader
│   ├── results/
│   │   └── AnalysisResults.tsx  # Results dashboard
│   └── viewer/
│       └── AttentionMapViewer.tsx  # Image viewer with overlay
├── pages/                   # Route pages
│   ├── HomePage.tsx         # Main analysis page
│   ├── AboutPage.tsx        # System information
│   ├── HistoryPage.tsx      # Case history (placeholder)
│   └── SettingsPage.tsx     # Settings (placeholder)
├── services/                # API integration
│   └── api.ts               # Backend API service
├── theme/                   # Material-UI theming
│   └── clinicalTheme.ts     # Clinical color palette & typography
└── App.tsx                  # Main app with routing
\`\`\`

---

## �� Clinical Theme

### Color Palette
- **Primary**: Medical Blue (\`#0277BD\`) - Trust and professionalism
- **Secondary**: Clinical Teal (\`#00897B\`) - Healthcare standard
- **Success**: Clinical Green - Benign findings
- **Error**: Clinical Red - Malignant findings
- **Warning**: Clinical Orange - Uncertain cases

---

## 🔌 Backend Integration

### API Endpoints
- \`POST /analyze/\` - Upload and analyze mammogram
- \`GET /health/\` - Check backend status
- \`POST /feedback/\` - Submit radiologist feedback

### Configuration
Edit \`.env\`:
\`\`\`env
REACT_APP_API_URL=http://localhost:8000
\`\`\`

---

## 📦 Production Build

\`\`\`bash
npm run build
\`\`\`

Deploys to Netlify, Vercel, or any static hosting.

---

## 👨‍⚕️ Clinical Disclaimer

**FOR RESEARCH PURPOSES ONLY**

This is a clinical decision support tool. All AI predictions must be verified by qualified medical professionals.

---

**Built for radiologists and imaging professionals**
