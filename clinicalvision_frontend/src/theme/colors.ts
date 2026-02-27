/**
 * ClinicalVision Medical Imaging Color System
 * Based on AiforiaCreate UI Analysis + Commercial Medical Software Standards
 * 
 * Design Principles:
 * - Dark theme optimized for medical imaging (reduces eye strain)
 * - High contrast for critical information
 * - Medical/pathology purple accent (professional medical aesthetic)
 * - WCAG 2.1 AAA contrast ratios for critical elements
 */

export const medicalColors = {
  // ========== PRIMARY PALETTE ==========
  background: {
    primary: '#020202',      // Nearly black - main background
    secondary: '#0B0B0B',    // Elevated surfaces (cards, panels)
    tertiary: '#1A1A1A',     // Interactive elements hover
    paper: '#151515',        // Paper/modal backgrounds
  },

  // ========== ACCENT COLORS ==========
  // Medical/Pathology theme - Purple based on pathology staining
  accent: {
    primary: '#7B2D8E',      // Primary purple - main actions
    light: '#9A4DAD',        // Lighter purple - hover states
    dark: '#5A1F6A',         // Darker purple - active states
    secondary: '#C74297',    // Pink/Magenta - secondary actions
    tertiary: '#4A90E2',     // Blue - information/help
  },

  // ========== TEXT COLORS ==========
  text: {
    primary: '#FFFFFF',      // High contrast - primary text
    secondary: '#B0B0B0',    // Medium contrast - secondary text
    tertiary: '#6B6B6B',     // Low contrast - labels, captions
    disabled: '#4A4A4A',     // Disabled state
    inverse: '#020202',      // Text on light backgrounds
  },

  // ========== BORDER & DIVIDERS ==========
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',     // Barely visible dividers
    medium: 'rgba(255, 255, 255, 0.12)',     // Standard borders
    strong: 'rgba(255, 255, 255, 0.20)',     // Emphasized borders
    focus: 'rgba(123, 45, 142, 0.6)',        // Focus indicators
  },

  // ========== FUNCTIONAL COLORS ==========
  // Medical context-aware colors
  clinical: {
    // Diagnostic Results
    benign: {
      main: '#4CAF50',       // Green - benign/negative finding
      light: '#66BB6A',
      dark: '#388E3C',
      bg: 'rgba(76, 175, 80, 0.1)',
    },
    malignant: {
      main: '#EF5350',       // Red - malignant/positive finding
      light: '#FF6F6D',
      dark: '#D32F2F',
      bg: 'rgba(239, 83, 80, 0.1)',
    },
    uncertain: {
      main: '#FFA726',       // Orange - uncertain/borderline
      light: '#FFB74D',
      dark: '#F57C00',
      bg: 'rgba(255, 167, 38, 0.1)',
    },
    normal: {
      main: '#29B6F6',       // Blue - normal/baseline
      light: '#4FC3F7',
      dark: '#0288D1',
      bg: 'rgba(41, 182, 246, 0.1)',
    },
  },

  // ========== STATUS COLORS ==========
  status: {
    success: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C',
      bg: 'rgba(76, 175, 80, 0.1)',
      border: 'rgba(76, 175, 80, 0.3)',
    },
    warning: {
      main: '#FFA726',
      light: '#FFB74D',
      dark: '#F57C00',
      bg: 'rgba(255, 167, 38, 0.1)',
      border: 'rgba(255, 167, 38, 0.3)',
    },
    error: {
      main: '#EF5350',
      light: '#FF6F6D',
      dark: '#D32F2F',
      bg: 'rgba(239, 83, 80, 0.1)',
      border: 'rgba(239, 83, 80, 0.3)',
    },
    info: {
      main: '#29B6F6',
      light: '#4FC3F7',
      dark: '#0288D1',
      bg: 'rgba(41, 182, 246, 0.1)',
      border: 'rgba(41, 182, 246, 0.3)',
    },
    // AI/Processing states
    processing: {
      main: '#7B2D8E',
      bg: 'rgba(123, 45, 142, 0.1)',
    },
    queued: {
      main: '#6B6B6B',
      bg: 'rgba(107, 107, 107, 0.1)',
    },
  },

  // ========== OVERLAY COLORS ==========
  overlay: {
    light: 'rgba(0, 0, 0, 0.4)',
    medium: 'rgba(0, 0, 0, 0.6)',
    heavy: 'rgba(0, 0, 0, 0.85)',
    blur: 'rgba(11, 11, 11, 0.8)',  // For glassmorphism
  },

  // ========== SHADOW COLORS ==========
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.4)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.5)',
    '2xl': '0 24px 48px rgba(0, 0, 0, 0.6)',
    // Colored shadows for emphasis
    primary: '0 8px 24px rgba(123, 45, 142, 0.3)',
    success: '0 8px 24px rgba(76, 175, 80, 0.3)',
    error: '0 8px 24px rgba(239, 83, 80, 0.3)',
  },

  // ========== HEATMAP COLORS ==========
  // For AI model confidence visualization
  heatmap: {
    viridis: ['#440154', '#414487', '#2A788E', '#22A884', '#7AD151', '#FDE725'],
    plasma: ['#0D0887', '#6A00A8', '#B12A90', '#E16462', '#FCA636', '#F0F921'],
    inferno: ['#000004', '#420A68', '#932667', '#DD513A', '#FCA50A', '#FCFFA4'],
    hot: ['#000000', '#FF0000', '#FFFF00', '#FFFFFF'],
    cool: ['#00FFFF', '#0000FF', '#FF00FF'],
    custom: ['#7B2D8E', '#C74297', '#4A90E2', '#4CAF50'], // Brand colors
  },

  // ========== ANNOTATION COLORS ==========
  // For medical image annotations
  annotation: {
    default: '#7B2D8E',      // Default annotation color
    selected: '#C74297',      // Selected annotation
    tumor: '#EF5350',         // Tumor/lesion markers
    tissue: '#4CAF50',        // Tissue markers
    measurement: '#29B6F6',   // Measurement lines
    roi: '#FFA726',           // Region of interest
    aiPrediction: '#9A4DAD',  // AI-generated annotations
  },
};

/**
 * Legacy Lunit.io colors for compatibility
 * Can be used for landing page and marketing materials
 */
export const lunitColors = {
  teal: {
    main: '#00C9EA',
    light: '#00C9EA',
    dark: '#0F95AB',
  },
  gray: {
    darkest: '#233232',
    dark: '#5C6A6B',
    medium: '#95A3A4',
    light: '#E5E8E8',
    lightest: '#EFF0F4',
  },
  text: {
    primary: '#233232',
    secondary: '#5C6A6B',
  },
  background: {
    default: '#EFF0F4',
    paper: '#FFFFFF',
  },
};

/**
 * Export unified color system
 */
export const colors = {
  ...medicalColors,
  // Add legacy support
  legacy: {
    lunit: lunitColors,
  },
};

export default colors;
