/**
 * Professional Medical Imaging Color Theme
 * Inspired by Lunit INSIGHT, iCAD, and modern medical imaging platforms
 * 
 * Key characteristics:
 * - Deep black backgrounds for optimal image viewing
 * - Navy blue accents for professionalism
 * - Minimal distractions - focus on medical content
 * - High contrast for readability
 */

export const professionalColors = {
  // ========== BACKGROUND SYSTEM ==========
  // True black for medical imaging (like Lunit INSIGHT)
  background: {
    primary: '#000000',        // Pure black - main viewport background
    secondary: '#0A0E1A',      // Dark navy - elevated panels
    tertiary: '#141B2D',       // Slightly lighter navy - cards/modals
    panel: '#1A2332',          // Side panels and controls
    toolbar: '#0D1117',        // Toolbars and headers
  },

  // ========== ACCENT COLORS ==========
  // Professional blue theme (inspired by medical platforms)
  accent: {
    primary: '#2E7D9A',        // Professional teal/blue - primary actions
    light: '#3A99BB',          // Lighter blue - hover states
    dark: '#1F5770',           // Darker blue - pressed states
    secondary: '#4A9FB8',      // Complementary light blue
    highlight: '#5FB8D6',      // Highlight/selected states
    warning: '#FF9F43',        // Warning/attention states (orange)
    danger: '#E74C3C',         // Critical/danger states (red)
    success: '#2ECC71',        // Success/positive states (green)
  },

  // ========== TEXT COLORS ==========
  text: {
    primary: '#FFFFFF',        // Pure white - primary text
    secondary: '#C5D1E0',      // Light gray-blue - secondary text
    tertiary: '#8B96A5',       // Medium gray-blue - labels
    disabled: '#4A5568',       // Disabled state
    inverse: '#000000',        // Text on light backgrounds
    accent: '#5FB8D6',         // Accent text (links, highlights)
  },

  // ========== BORDER & DIVIDERS ==========
  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',     // Barely visible
    medium: 'rgba(255, 255, 255, 0.10)',     // Standard borders
    strong: 'rgba(255, 255, 255, 0.15)',     // Emphasized borders
    focus: 'rgba(94, 184, 214, 0.5)',        // Focus rings
    panel: 'rgba(46, 125, 154, 0.2)',        // Panel borders
  },

  // ========== CLINICAL STATUS COLORS ==========
  clinical: {
    abnormal: {
      main: '#E74C3C',         // Red - high risk/suspicious
      light: '#EC7063',
      dark: '#C0392B',
      bg: 'rgba(231, 76, 60, 0.15)',
    },
    normal: {
      main: '#2ECC71',         // Green - normal/benign
      light: '#58D68D',
      dark: '#27AE60',
      bg: 'rgba(46, 204, 113, 0.15)',
    },
    uncertain: {
      main: '#F39C12',         // Orange - requires review
      light: '#F5B041',
      dark: '#D68910',
      bg: 'rgba(243, 156, 18, 0.15)',
    },
    pending: {
      main: '#5FB8D6',         // Blue - pending review
      light: '#7EC8E3',
      dark: '#4A9FB8',
      bg: 'rgba(95, 184, 214, 0.15)',
    },
  },

  // ========== OVERLAY & VISUALIZATION COLORS ==========
  // For AI heatmaps and attention overlays
  visualization: {
    heatmap: {
      low: 'rgba(46, 125, 154, 0.2)',       // Low confidence - teal
      medium: 'rgba(243, 156, 18, 0.4)',    // Medium confidence - orange
      high: 'rgba(231, 76, 60, 0.6)',       // High confidence - red
    },
    roi: {
      primary: 'rgba(95, 184, 214, 0.8)',   // Region of interest - bright blue
      secondary: 'rgba(46, 204, 113, 0.7)', // Secondary ROI - green
      warning: 'rgba(243, 156, 18, 0.8)',   // Warning ROI - orange
    },
    grid: '#00FF00',                         // Measurement grid - bright green
    annotation: '#FFFF00',                   // Annotations - yellow
  },

  // ========== CONTROL PANEL COLORS ==========
  controls: {
    active: '#2E7D9A',         // Active tool/button
    inactive: '#4A5568',       // Inactive state
    hover: '#3A99BB',          // Hover state
    pressed: '#1F5770',        // Pressed state
    disabled: '#2D3748',       // Disabled state
  },

  // ========== SHADOW & DEPTH ==========
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
    md: '0 4px 8px rgba(0, 0, 0, 0.6)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.7)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.8)',
    panel: '0 0 20px rgba(46, 125, 154, 0.1)', // Glowing panel effect
  },

  // ========== GLASSMORPHISM EFFECTS ==========
  glass: {
    light: 'rgba(26, 35, 50, 0.7)',
    medium: 'rgba(13, 17, 23, 0.8)',
    heavy: 'rgba(10, 14, 26, 0.9)',
  },
};

// ========== RISK SCORE COLORS (inspired by iCAD ProFound) ==========
export const riskScoreColors = {
  veryLow: { color: '#2ECC71', label: 'Very Low' },     // 0-0.15
  low: { color: '#5FB8D6', label: 'Low' },              // 0.15-0.6
  general: { color: '#F39C12', label: 'General' },      // 0.6-1.6
  moderate: { color: '#FF9F43', label: 'Moderate' },    // 1.6-5.0
  high: { color: '#E74C3C', label: 'High' },            // 5.0+
};

// ========== QUAD VIEW COLORS (for multi-view layouts) ==========
export const viewColors = {
  rcc: '#5FB8D6',  // Right CC - blue
  lcc: '#2ECC71',  // Left CC - green
  rmlo: '#F39C12', // Right MLO - orange
  lmlo: '#E74C3C', // Left MLO - red/pink
};
