/**
 * Professional Medical Imaging Theme
 * Based on Lunit INSIGHT and modern medical imaging platforms
 * 
 * Optimized for:
 * - Medical image viewing (dark backgrounds)
 * - Professional clinical workflows
 * - High-contrast, accessible UI
 * - Minimal distraction from medical content
 */

import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';
import { professionalColors, riskScoreColors, viewColors } from './professionalColors';

// Typography setup
const typography = {
  fontFamily: '"Roboto", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyDisplay: '"Roboto", "Inter", system-ui, sans-serif',
  fontFamilyMono: '"Roboto Mono", "Courier New", monospace',

  fontSize: 14,

  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    color: professionalColors.text.primary,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: professionalColors.text.primary,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: professionalColors.text.primary,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: professionalColors.text.primary,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: professionalColors.text.primary,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
    color: professionalColors.text.primary,
  },
  body1: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: professionalColors.text.primary,
  },
  body2: {
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: professionalColors.text.secondary,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
    color: professionalColors.text.tertiary,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
  },
};

// Theme configuration
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: professionalColors.accent.primary,
      light: professionalColors.accent.light,
      dark: professionalColors.accent.dark,
      contrastText: professionalColors.text.primary,
    },
    secondary: {
      main: professionalColors.accent.secondary,
      light: professionalColors.accent.highlight,
      dark: professionalColors.accent.dark,
      contrastText: professionalColors.text.primary,
    },
    error: {
      main: professionalColors.accent.danger,
      light: professionalColors.clinical.abnormal.light,
      dark: professionalColors.clinical.abnormal.dark,
    },
    warning: {
      main: professionalColors.accent.warning,
      light: professionalColors.clinical.uncertain.light,
      dark: professionalColors.clinical.uncertain.dark,
    },
    success: {
      main: professionalColors.accent.success,
      light: professionalColors.clinical.normal.light,
      dark: professionalColors.clinical.normal.dark,
    },
    info: {
      main: professionalColors.clinical.pending.main,
      light: professionalColors.clinical.pending.light,
      dark: professionalColors.clinical.pending.dark,
    },
    background: {
      default: professionalColors.background.primary,
      paper: professionalColors.background.secondary,
    },
    text: {
      primary: professionalColors.text.primary,
      secondary: professionalColors.text.secondary,
      disabled: professionalColors.text.disabled,
    },
    divider: professionalColors.border.medium,
  },
  typography,
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: professionalColors.background.primary,
          color: professionalColors.text.primary,
          scrollbarWidth: 'thin',
          scrollbarColor: `${professionalColors.controls.inactive} ${professionalColors.background.secondary}`,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: professionalColors.background.secondary,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: professionalColors.controls.inactive,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: professionalColors.controls.hover,
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 16px',
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: professionalColors.shadow.sm,
          '&:hover': {
            boxShadow: professionalColors.shadow.md,
          },
        },
        outlined: {
          borderColor: professionalColors.border.medium,
          '&:hover': {
            borderColor: professionalColors.accent.light,
            backgroundColor: alpha(professionalColors.accent.primary, 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: professionalColors.background.tertiary,
          border: `1px solid ${professionalColors.border.subtle}`,
          borderRadius: 8,
          boxShadow: professionalColors.shadow.md,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: professionalColors.background.secondary,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: professionalColors.shadow.sm,
        },
        elevation2: {
          boxShadow: professionalColors.shadow.md,
        },
        elevation3: {
          boxShadow: professionalColors.shadow.lg,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: professionalColors.background.toolbar,
          boxShadow: 'none',
          borderBottom: `1px solid ${professionalColors.border.medium}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: professionalColors.background.panel,
          borderRight: `1px solid ${professionalColors.border.medium}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: professionalColors.text.secondary,
          '&:hover': {
            backgroundColor: alpha(professionalColors.accent.primary, 0.08),
            color: professionalColors.accent.light,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: professionalColors.background.panel,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: professionalColors.background.panel,
          border: `1px solid ${professionalColors.border.medium}`,
          color: professionalColors.text.primary,
          fontSize: '0.75rem',
          boxShadow: professionalColors.shadow.lg,
        },
        arrow: {
          color: professionalColors.background.panel,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: professionalColors.background.panel,
            '& fieldset': {
              borderColor: professionalColors.border.medium,
            },
            '&:hover fieldset': {
              borderColor: professionalColors.accent.light,
            },
            '&.Mui-focused fieldset': {
              borderColor: professionalColors.accent.primary,
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${professionalColors.border.subtle}`,
          color: professionalColors.text.primary,
        },
        head: {
          backgroundColor: professionalColors.background.panel,
          fontWeight: 600,
          color: professionalColors.text.primary,
        },
      },
    },
  },
};

export const professionalTheme = createTheme(themeOptions);

// Export color utilities for use in components
export { professionalColors, riskScoreColors, viewColors };
