import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * ClinicalVision AI - Medical-Grade Theme Configuration
 * 
 * Design Philosophy:
 * - Trust & Professionalism: Medical blue palette
 * - Clarity: High contrast for critical information
 * - Accessibility: WCAG 2.1 AA compliant
 * - Clinical Workflow: Reduced eye strain with soft backgrounds
 */

declare module '@mui/material/styles' {
  interface Palette {
    clinical: {
      positive: string;
      negative: string;
      uncertain: string;
      critical: string;
      background: string;
    };
  }
  interface PaletteOptions {
    clinical?: {
      positive?: string;
      negative?: string;
      uncertain?: string;
      critical?: string;
      background?: string;
    };
  }
}

const clinicalThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#00C9EA', // Lunit Teal
      light: '#00C9EA',
      dark: '#0F95AB', // Lunit Teal darker
      contrastText: '#000000',
    },
    secondary: {
      main: '#233232', // Lunit Darker Gray
      light: '#5C6A6B',
      dark: '#151515',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#D32F2F', // Clinical red for critical alerts
      light: '#EF5350',
      dark: '#C62828',
    },
    warning: {
      main: '#F57C00', // Clinical orange for warnings
      light: '#FF9800',
      dark: '#E65100',
    },
    success: {
      main: '#388E3C', // Clinical green for positive results
      light: '#66BB6A',
      dark: '#2E7D32',
    },
    info: {
      main: '#0288D1',
      light: '#03A9F4',
      dark: '#01579B',
    },
    background: {
      default: '#EFF0F4', // Lunit Lightest Gray
      paper: '#FFFFFF',
    },
    text: {
      primary: '#233232', // Lunit text color
      secondary: '#5C6A6B', // Lunit Dark Grey
      disabled: '#95A3A4',
    },
    divider: 'rgba(35, 50, 50, 0.1)',
    // Clinical-specific colors
    clinical: {
      positive: '#4CAF50', // Benign/negative finding
      negative: '#F44336', // Malignant/positive finding
      uncertain: '#FF9800', // High uncertainty
      critical: '#D32F2F', // Critical alerts
      background: '#FAFBFC', // Clinical viewer background
    },
  },
  typography: {
    fontFamily: '"Lexend", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    // Lunit-style headers with ClashGrotesk alternative
    h1: {
      fontFamily: '"ClashGrotesk", "Poppins", system-ui, sans-serif',
      fontSize: '3.75rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      color: '#151515',
    },
    h2: {
      fontFamily: '"ClashGrotesk", "Poppins", system-ui, sans-serif',
      fontSize: '3rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
      color: '#151515',
    },
    h3: {
      fontFamily: '"ClashGrotesk", "Poppins", system-ui, sans-serif',
      fontSize: '2.25rem',
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.35,
      color: '#151515',
    },
    h4: {
      fontFamily: '"ClashGrotesk", "Poppins", system-ui, sans-serif',
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
      color: '#233232',
    },
    h5: {
      fontFamily: '"Lexend", "Poppins", sans-serif',
      fontSize: '1.375rem',
      fontWeight: 500,
      letterSpacing: '-0.005em',
      lineHeight: 1.5,
      color: '#233232',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 700,
      letterSpacing: '0em',
      lineHeight: 1.5,
      color: '#1A1A1A',
    },
    // Professional body text - optimized readability with Poppins
    body1: {
      fontSize: '1.0625rem',
      lineHeight: 1.8,
      letterSpacing: '0.005em',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.9375rem',
      lineHeight: 1.75,
      letterSpacing: '0.005em',
      fontWeight: 400,
    },
    subtitle1: {
      fontSize: '1.1875rem',
      lineHeight: 1.7,
      letterSpacing: '0em',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
      fontWeight: 600,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
      fontWeight: 500,
      color: '#5A6C7D',
    },
    button: {
      textTransform: 'none', // Professional - no all-caps
      fontWeight: 600,
      letterSpacing: '0.02em',
      fontSize: '0.9375rem',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
      color: '#5A6C7D',
    },
  },
  shape: {
    borderRadius: 8, // Softer, more modern clinical interface
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)', // Subtle elevation
    '0px 4px 8px rgba(0, 0, 0, 0.08)', // Cards
    '0px 8px 16px rgba(0, 0, 0, 0.10)', // Dialogs
    '0px 12px 24px rgba(0, 0, 0, 0.12)', // Important elements
    '0px 16px 32px rgba(0, 0, 0, 0.14)', // Maximum elevation
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.10)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.14)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.10)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.14)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.10)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.14)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.10)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.12)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0277BD 0%, #01579B 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #01579B 0%, #014F86 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E8EAED',
          transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          height: 28,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #E8EAED',
          backgroundColor: '#FAFBFC',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            '&:hover fieldset': {
              borderColor: '#0277BD',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.9375rem',
        },
        standardError: {
          backgroundColor: '#FFEBEE',
          color: '#C62828',
          border: '1px solid #EF5350',
        },
        standardWarning: {
          backgroundColor: '#FFF3E0',
          color: '#E65100',
          border: '1px solid #FF9800',
        },
        standardSuccess: {
          backgroundColor: '#E8F5E9',
          color: '#2E7D32',
          border: '1px solid #66BB6A',
        },
        standardInfo: {
          backgroundColor: '#E3F2FD',
          color: '#01579B',
          border: '1px solid #03A9F4',
        },
      },
    },
  },
};

export const clinicalTheme = createTheme(clinicalThemeOptions);

export default clinicalTheme;
