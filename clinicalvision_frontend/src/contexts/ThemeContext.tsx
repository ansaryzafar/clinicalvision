/**
 * ThemeContext - Dynamic Theme Management
 * 
 * Provides dynamic theme switching based on user settings.
 * Integrates with the global useSettings hook for persistence.
 * 
 * Based on Nielsen Heuristic #4 (Consistency & Standards):
 * Theme changes should be immediate and consistent across all components.
 * 
 * Based on Paton et al. 2021: User preferences should have clear,
 * immediate effects to maintain trust and predictability.
 * 
 * VoxLogicA UI Paper (Strippoli 2025): "UI design principles include
 * simplicity, responsiveness, progressive disclosure, consistency, and accessibility."
 */

import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, alpha } from '@mui/material';
import { professionalColors } from '../theme/professionalColors';
import { useSettings } from '../hooks/useSettings';

// ========== LIGHT THEME COLOR PALETTE ==========
// Clean, professional light theme for well-lit environments
const lightThemeColors = {
  background: {
    primary: '#FFFFFF',        // Pure white main background
    secondary: '#F8FAFC',      // Subtle gray for cards/panels
    tertiary: '#F1F5F9',       // Slightly darker for nested elements
    elevated: '#FFFFFF',       // Elevated cards (with shadow)
    panel: '#F0F4F8',          // Side panels
    toolbar: '#FAFBFC',        // Toolbars and headers
    hover: '#E2E8F0',          // Hover states
  },
  text: {
    primary: '#1A202C',        // Near-black for primary text
    secondary: '#4A5568',      // Medium gray for secondary text
    tertiary: '#718096',       // Lighter gray for labels
    disabled: '#A0AEC0',       // Disabled state
    inverse: '#FFFFFF',        // Text on dark backgrounds
    accent: '#2563EB',         // Blue accent text (links)
  },
  border: {
    subtle: 'rgba(0, 0, 0, 0.06)',
    medium: 'rgba(0, 0, 0, 0.12)',
    strong: 'rgba(0, 0, 0, 0.18)',
    focus: 'rgba(37, 99, 235, 0.5)',
    panel: 'rgba(37, 99, 235, 0.15)',
  },
  accent: {
    primary: '#2563EB',        // Bright blue for light mode
    light: '#3B82F6',          // Lighter blue
    dark: '#1D4ED8',           // Darker blue
    secondary: '#0EA5E9',      // Sky blue
    highlight: '#38BDF8',      // Highlight
  },
};

// ========== DARK THEME COLOR PALETTE ==========
// Medical imaging optimized dark theme (current professional theme)
const darkThemeColors = {
  background: professionalColors.background,
  text: professionalColors.text,
  border: professionalColors.border,
  accent: professionalColors.accent,
};

interface ThemeContextValue {
  mode: 'light' | 'dark';
  highContrast: boolean;
  toggleMode: () => void;
  toggleHighContrast: () => void;
  colors: typeof lightThemeColors | typeof darkThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeContextProvider');
  }
  return context;
};

interface ThemeContextProviderProps {
  children: React.ReactNode;
}

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const { settings, updateSetting } = useSettings();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const mode = settings.theme;
  const highContrast = settings.highContrastMode;

  const toggleMode = useCallback(() => {
    updateSetting('theme', mode === 'dark' ? 'light' : 'dark');
  }, [mode, updateSetting]);

  const toggleHighContrast = useCallback(() => {
    updateSetting('highContrastMode', !highContrast);
  }, [highContrast, updateSetting]);

  // Get current theme colors based on mode
  const colors = mode === 'light' ? lightThemeColors : darkThemeColors;

  const theme = useMemo(() => {
    const isLight = mode === 'light';
    const themeColors = isLight ? lightThemeColors : darkThemeColors;

    // High contrast enhancements
    const hcAccent = highContrast 
      ? (isLight ? '#1D4ED8' : '#4FC3F7') 
      : themeColors.accent.primary;

    const hcTextPrimary = highContrast
      ? (isLight ? '#000000' : '#FFFFFF')
      : themeColors.text.primary;

    const hcTextSecondary = highContrast
      ? (isLight ? '#1A202C' : '#E2E8F0')
      : themeColors.text.secondary;

    return createTheme({
      palette: {
        mode: isLight ? 'light' : 'dark',
        primary: {
          main: hcAccent,
          light: themeColors.accent.light,
          dark: themeColors.accent.dark,
          contrastText: isLight ? '#FFFFFF' : professionalColors.text.primary,
        },
        secondary: {
          main: themeColors.accent.secondary,
          light: themeColors.accent.highlight,
          dark: themeColors.accent.dark,
        },
        background: {
          default: themeColors.background.primary,
          paper: themeColors.background.secondary,
        },
        text: {
          primary: hcTextPrimary,
          secondary: hcTextSecondary,
          disabled: themeColors.text.disabled,
        },
        divider: themeColors.border.medium,
        error: {
          main: professionalColors.accent.danger,
          light: alpha(professionalColors.accent.danger, isLight ? 0.15 : 0.1),
        },
        warning: {
          main: professionalColors.accent.warning,
          light: alpha(professionalColors.accent.warning, isLight ? 0.15 : 0.1),
        },
        success: {
          main: professionalColors.accent.success,
          light: alpha(professionalColors.accent.success, isLight ? 0.15 : 0.1),
        },
        info: {
          main: themeColors.accent.secondary,
          light: alpha(themeColors.accent.secondary, isLight ? 0.15 : 0.1),
        },
        action: {
          hover: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
          selected: isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(46, 125, 154, 0.16)',
          disabled: isLight ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
          disabledBackground: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        },
      },
      typography: {
        fontFamily: '"Lexend", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 14,
        h1: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.2, color: hcTextPrimary },
        h2: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.3, color: hcTextPrimary },
        h3: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.3, color: hcTextPrimary },
        h4: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.4, color: hcTextPrimary },
        h5: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.4, color: hcTextPrimary },
        h6: { fontFamily: '"ClashGrotesk", "Inter", sans-serif', fontWeight: 300, lineHeight: 1.5, color: hcTextPrimary },
        subtitle1: { fontFamily: '"Lexend", "Inter", sans-serif', fontWeight: 500, lineHeight: 1.5 },
        subtitle2: { fontFamily: '"Lexend", "Inter", sans-serif', fontWeight: 500, lineHeight: 1.5 },
        body1: { fontFamily: '"Lexend", "Inter", sans-serif', fontSize: '0.875rem', lineHeight: 1.5, color: hcTextPrimary },
        body2: { fontFamily: '"Lexend", "Inter", sans-serif', fontSize: '0.8125rem', lineHeight: 1.5, color: hcTextSecondary },
        caption: { fontFamily: '"Lexend", "Inter", sans-serif', fontSize: '0.75rem', lineHeight: 1.4, color: hcTextSecondary },
        button: { fontFamily: '"Lexend", "Inter", sans-serif', textTransform: 'none' as const, fontWeight: 500 },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: themeColors.background.primary,
              color: hcTextPrimary,
              transition: 'background-color 0.3s ease, color 0.3s ease',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: themeColors.background.secondary,
              transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: themeColors.background.secondary,
              borderRadius: 12,
              border: `1px solid ${themeColors.border.subtle}`,
              boxShadow: isLight 
                ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
                : 'none',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              textTransform: 'none',
              fontWeight: 500,
            },
            contained: {
              boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              '&:hover': {
                boxShadow: isLight ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
              },
            },
            outlined: {
              borderColor: themeColors.border.medium,
              '&:hover': {
                borderColor: themeColors.accent.primary,
                backgroundColor: alpha(themeColors.accent.primary, 0.08),
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                backgroundColor: isLight ? '#FFFFFF' : themeColors.background.tertiary,
                '& fieldset': {
                  borderColor: themeColors.border.medium,
                },
                '&:hover fieldset': {
                  borderColor: themeColors.accent.primary,
                },
                '&.Mui-focused fieldset': {
                  borderColor: themeColors.accent.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: themeColors.text.secondary,
              },
              '& .MuiInputBase-input': {
                color: themeColors.text.primary,
              },
              '& .MuiFormHelperText-root': {
                color: themeColors.text.secondary,
              },
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? '#FFFFFF' : themeColors.background.tertiary,
            },
          },
        },
        MuiSlider: {
          styleOverrides: {
            root: {
              color: themeColors.accent.primary,
            },
            track: {
              backgroundColor: themeColors.accent.primary,
            },
            rail: {
              backgroundColor: themeColors.border.medium,
            },
            thumb: {
              backgroundColor: themeColors.accent.primary,
              '&:hover': {
                boxShadow: `0 0 0 8px ${alpha(themeColors.accent.primary, 0.16)}`,
              },
            },
          },
        },
        MuiSwitch: {
          styleOverrides: {
            root: {
              '& .MuiSwitch-track': {
                backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.3)',
              },
              '& .Mui-checked + .MuiSwitch-track': {
                backgroundColor: themeColors.accent.primary,
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              backgroundColor: isLight 
                ? alpha(themeColors.accent.primary, 0.1)
                : alpha(themeColors.accent.primary, 0.2),
              color: themeColors.text.primary,
            },
            filled: {
              backgroundColor: themeColors.accent.primary,
              color: '#FFFFFF',
            },
          },
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: themeColors.border.medium,
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              '&:hover': {
                backgroundColor: isLight 
                  ? 'rgba(0, 0, 0, 0.04)' 
                  : 'rgba(255, 255, 255, 0.08)',
              },
              '&.Mui-selected': {
                backgroundColor: alpha(themeColors.accent.primary, isLight ? 0.12 : 0.16),
                '&:hover': {
                  backgroundColor: alpha(themeColors.accent.primary, isLight ? 0.18 : 0.24),
                },
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? '#FFFFFF' : themeColors.background.toolbar,
              color: themeColors.text.primary,
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              borderBottom: `1px solid ${themeColors.border.subtle}`,
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: themeColors.background.panel,
              borderRight: `1px solid ${themeColors.border.subtle}`,
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor: isLight ? '#1A202C' : '#FFFFFF',
              color: isLight ? '#FFFFFF' : '#1A202C',
              fontSize: '0.75rem',
            },
          },
        },
        MuiSnackbarContent: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? '#1A202C' : '#FFFFFF',
              color: isLight ? '#FFFFFF' : '#1A202C',
            },
          },
        },
        MuiAccordion: {
          styleOverrides: {
            root: {
              backgroundColor: themeColors.background.secondary,
              '&:before': {
                display: 'none',
              },
              '&.Mui-expanded': {
                margin: 0,
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${themeColors.border.medium}`,
            },
            head: {
              backgroundColor: isLight 
                ? themeColors.background.tertiary 
                : themeColors.background.panel,
              fontWeight: 600,
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: themeColors.text.secondary,
              '&:hover': {
                backgroundColor: alpha(themeColors.accent.primary, 0.08),
                color: themeColors.accent.primary,
              },
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
            standardInfo: {
              backgroundColor: alpha(themeColors.accent.secondary, isLight ? 0.15 : 0.2),
              color: themeColors.text.primary,
            },
            standardSuccess: {
              backgroundColor: alpha(professionalColors.accent.success, isLight ? 0.15 : 0.2),
              color: themeColors.text.primary,
            },
            standardWarning: {
              backgroundColor: alpha(professionalColors.accent.warning, isLight ? 0.15 : 0.2),
              color: themeColors.text.primary,
            },
            standardError: {
              backgroundColor: alpha(professionalColors.accent.danger, isLight ? 0.15 : 0.2),
              color: themeColors.text.primary,
            },
          },
        },
      },
    });
  }, [mode, highContrast]);

  const contextValue = useMemo(() => ({
    mode,
    highContrast,
    toggleMode,
    toggleHighContrast,
    colors,
  }), [mode, highContrast, toggleMode, toggleHighContrast, colors]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeContextProvider;
