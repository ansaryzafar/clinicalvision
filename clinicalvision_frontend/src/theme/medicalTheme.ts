/**
 * ClinicalVision Production Theme
 * Medical Imaging Application - Dark Theme
 * 
 * Features:
 * - Domain-focused design
 * - Medical imaging optimized color palette
 * - Production-grade component customization
 * - Easy extensibility for plugins
 */

import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';
import { colors } from './colors';

// ========== SPACING SYSTEM ==========
// Base unit: 8px (all spacing is multiples of 8)
const spacing = 8;

// ========== TYPOGRAPHY SYSTEM ==========
const typography = {
  // Font stacks
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
  fontFamilyDisplay: '"Poppins", system-ui, sans-serif',
  fontFamilyMono: '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace',

  // Font sizes (14px base)
  fontSize: 14,

  // Font weights
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,

  // Type scale
  h1: {
    fontFamily: '"Poppins", system-ui, sans-serif',
    fontSize: '2.5rem',      // 36px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: colors.text.primary,
  },
  h2: {
    fontFamily: '"Poppins", system-ui, sans-serif',
    fontSize: '2rem',        // 30px
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.015em',
    color: colors.text.primary,
  },
  h3: {
    fontFamily: '"Poppins", system-ui, sans-serif',
    fontSize: '1.5rem',      // 24px
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.text.primary,
  },
  h4: {
    fontSize: '1.25rem',     // 18px
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.text.primary,
  },
  h5: {
    fontSize: '1.125rem',    // 16px
    fontWeight: 600,
    lineHeight: 1.5,
    color: colors.text.primary,
  },
  h6: {
    fontSize: '1rem',        // 14px
    fontWeight: 600,
    lineHeight: 1.5,
    color: colors.text.primary,
  },
  body1: {
    fontSize: '1rem',        // 14px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.text.primary,
  },
  body2: {
    fontSize: '0.875rem',    // 12px
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: '0.75rem',     // 11px
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.text.tertiary,
    letterSpacing: '0.01em',
  },
  button: {
    fontSize: '0.875rem',    // 12px
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.02em',
    textTransform: 'none' as const,
  },
  overline: {
    fontSize: '0.75rem',     // 11px
    fontWeight: 600,
    lineHeight: 2,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: colors.text.tertiary,
  },
};

// ========== BREAKPOINTS ==========
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1536,
    xxl: 1920,
  },
};

// ========== SHADOWS ==========
const shadows = [
  'none',
  colors.shadow.sm,
  colors.shadow.md,
  colors.shadow.md,
  colors.shadow.lg,
  colors.shadow.lg,
  colors.shadow.xl,
  colors.shadow.xl,
  colors.shadow['2xl'],
  colors.shadow['2xl'],
  ...Array(15).fill(colors.shadow['2xl']),
] as any;

// ========== SHAPE ==========
const shape = {
  borderRadius: 8,  // Base border radius
};

// ========== TRANSITIONS ==========
const transitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

// ========== THEME OPTIONS ==========
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    
    primary: {
      main: colors.accent.primary,
      light: colors.accent.light,
      dark: colors.accent.dark,
      contrastText: colors.text.primary,
    },
    
    secondary: {
      main: colors.accent.secondary,
      light: alpha(colors.accent.secondary, 0.8),
      dark: alpha(colors.accent.secondary, 1),
      contrastText: colors.text.primary,
    },
    
    error: {
      main: colors.status.error.main,
      light: colors.status.error.light,
      dark: colors.status.error.dark,
      contrastText: colors.text.primary,
    },
    
    warning: {
      main: colors.status.warning.main,
      light: colors.status.warning.light,
      dark: colors.status.warning.dark,
      contrastText: colors.text.inverse,
    },
    
    info: {
      main: colors.status.info.main,
      light: colors.status.info.light,
      dark: colors.status.info.dark,
      contrastText: colors.text.primary,
    },
    
    success: {
      main: colors.status.success.main,
      light: colors.status.success.light,
      dark: colors.status.success.dark,
      contrastText: colors.text.primary,
    },
    
    background: {
      default: colors.background.primary,
      paper: colors.background.secondary,
    },
    
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    
    divider: colors.border.subtle,
    
    action: {
      active: colors.text.primary,
      hover: alpha(colors.text.primary, 0.08),
      selected: alpha(colors.accent.primary, 0.12),
      disabled: colors.text.disabled,
      disabledBackground: alpha(colors.text.disabled, 0.12),
      focus: alpha(colors.accent.primary, 0.12),
    },
  },

  typography: typography as any,
  spacing,
  breakpoints,
  shape,
  shadows,
  transitions,

  // ========== COMPONENT OVERRIDES ==========
  components: {
    // ===== BUTTONS =====
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: colors.shadow.md,
          },
        },
        containedPrimary: {
          background: colors.accent.primary,
          '&:hover': {
            background: colors.accent.light,
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        outlined: {
          borderColor: colors.border.medium,
          '&:hover': {
            borderColor: colors.border.strong,
            background: alpha(colors.text.primary, 0.05),
          },
        },
        text: {
          '&:hover': {
            background: alpha(colors.text.primary, 0.05),
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1rem',
        },
      },
    },

    // ===== ICON BUTTON =====
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease',
          '&:hover': {
            background: alpha(colors.text.primary, 0.08),
          },
        },
      },
    },

    // ===== CARDS =====
    MuiCard: {
      styleOverrides: {
        root: {
          background: colors.background.secondary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: 12,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: colors.border.medium,
            boxShadow: colors.shadow.md,
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: spacing * 3,
          '&:last-child': {
            paddingBottom: spacing * 3,
          },
        },
      },
    },

    // ===== PAPER =====
    MuiPaper: {
      styleOverrides: {
        root: {
          background: colors.background.secondary,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: colors.shadow.sm,
        },
        elevation2: {
          boxShadow: colors.shadow.md,
        },
        elevation4: {
          boxShadow: colors.shadow.lg,
        },
        elevation8: {
          boxShadow: colors.shadow.xl,
        },
      },
    },

    // ===== APP BAR =====
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: alpha(colors.background.secondary, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.border.subtle}`,
          boxShadow: 'none',
        },
      },
    },

    // ===== DRAWER =====
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: colors.background.primary,
          borderRight: `1px solid ${colors.border.subtle}`,
        },
      },
    },

    // ===== DIALOG =====
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: colors.background.secondary,
          borderRadius: 12,
          boxShadow: colors.shadow['2xl'],
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: spacing * 3,
          borderBottom: `1px solid ${colors.border.subtle}`,
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: spacing * 3,
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: `${spacing * 2}px ${spacing * 3}px`,
          borderTop: `1px solid ${colors.border.subtle}`,
        },
      },
    },

    // ===== MENU =====
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: colors.background.tertiary,
          border: `1px solid ${colors.border.medium}`,
          borderRadius: 8,
          boxShadow: colors.shadow.xl,
          marginTop: spacing,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          margin: `${spacing / 2}px ${spacing}px`,
          padding: `${spacing}px ${spacing * 1.5}px`,
          '&:hover': {
            background: alpha(colors.text.primary, 0.08),
          },
          '&.Mui-selected': {
            background: alpha(colors.accent.primary, 0.12),
            '&:hover': {
              background: alpha(colors.accent.primary, 0.16),
            },
          },
        },
      },
    },

    // ===== INPUTS =====
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            '& fieldset': {
              borderColor: colors.border.medium,
            },
            '&:hover fieldset': {
              borderColor: colors.border.strong,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.accent.primary,
              borderWidth: 2,
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: alpha(colors.background.tertiary, 0.3),
          '&:hover': {
            background: alpha(colors.background.tertiary, 0.5),
          },
          '&.Mui-focused': {
            background: alpha(colors.background.tertiary, 0.5),
          },
        },
      },
    },

    // ===== CHIPS =====
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        filled: {
          background: alpha(colors.text.primary, 0.08),
        },
        outlined: {
          borderColor: colors.border.medium,
        },
      },
    },

    // ===== TOOLTIPS =====
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: colors.background.tertiary,
          border: `1px solid ${colors.border.medium}`,
          borderRadius: 6,
          padding: `${spacing}px ${spacing * 1.5}px`,
          fontSize: '0.75rem',
          boxShadow: colors.shadow.lg,
        },
        arrow: {
          color: colors.background.tertiary,
        },
      },
    },

    // ===== TABLES =====
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: alpha(colors.background.tertiary, 0.5),
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: colors.border.subtle,
          padding: `${spacing * 1.5}px ${spacing * 2}px`,
        },
        head: {
          fontWeight: 600,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: alpha(colors.text.primary, 0.02),
          },
          '&.Mui-selected': {
            background: alpha(colors.accent.primary, 0.08),
            '&:hover': {
              background: alpha(colors.accent.primary, 0.12),
            },
          },
        },
      },
    },

    // ===== TABS =====
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
          '&.Mui-selected': {
            color: colors.accent.primary,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: colors.accent.primary,
          height: 3,
        },
      },
    },

    // ===== DIVIDER =====
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.border.subtle,
        },
      },
    },

    // ===== LINEAR PROGRESS =====
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          height: 4,
          background: alpha(colors.text.primary, 0.08),
        },
        bar: {
          borderRadius: 2,
        },
      },
    },

    // ===== CIRCULAR PROGRESS =====
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: colors.accent.primary,
        },
      },
    },

    // ===== ALERT =====
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid',
        },
        standardSuccess: {
          background: colors.status.success.bg,
          borderColor: colors.status.success.border,
          color: colors.status.success.light,
        },
        standardError: {
          background: colors.status.error.bg,
          borderColor: colors.status.error.border,
          color: colors.status.error.light,
        },
        standardWarning: {
          background: colors.status.warning.bg,
          borderColor: colors.status.warning.border,
          color: colors.status.warning.light,
        },
        standardInfo: {
          background: colors.status.info.bg,
          borderColor: colors.status.info.border,
          color: colors.status.info.light,
        },
      },
    },

    // ===== BACKDROP =====
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: colors.overlay.medium,
          backdropFilter: 'blur(8px)',
        },
      },
    },
  },
};

// ========== CREATE THEME ==========
export const clinicalTheme = createTheme(themeOptions);

// ========== CUSTOM THEME EXTENSIONS =====
// Add custom properties for domain-specific usage
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      medical: typeof colors;
      glassmorphism: {
        background: string;
        border: string;
        blur: string;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      medical?: typeof colors;
      glassmorphism?: {
        background: string;
        border: string;
        blur: string;
      };
    };
  }
}

// Extend theme with custom properties
clinicalTheme.custom = {
  medical: colors,
  glassmorphism: {
    background: alpha(colors.background.secondary, 0.6),
    border: colors.border.subtle,
    blur: 'blur(20px)',
  },
};

export default clinicalTheme;
