/**
 * useDashboardTheme — Returns the correct dashboard theme tokens
 * based on the current MUI theme mode (light/dark).
 *
 * Usage:
 *   const dt = useDashboardTheme();
 *   <Box sx={{ color: dt.textPrimary }}>...</Box>
 */

import { useTheme } from '@mui/material';
import { useMemo } from 'react';
import {
  getDashboardTheme,
  DASHBOARD_THEME_DARK,
  DASHBOARD_THEME_LIGHT,
  type DashboardThemeTokens,
} from '../components/dashboard/charts/dashboardTheme';

export function useDashboardTheme(): DashboardThemeTokens {
  const theme = useTheme();
  return useMemo(
    () => getDashboardTheme(theme.palette.mode),
    [theme.palette.mode],
  );
}

/**
 * Build a chart tooltip style object for the current theme mode.
 */
export function useChartTooltipStyle(): React.CSSProperties {
  const dt = useDashboardTheme();
  return useMemo(
    () => ({
      backgroundColor: dt.tooltipBackground,
      border: `1px solid ${dt.tooltipBorder}`,
      borderRadius: dt.tooltipBorderRadius,
      color: dt.textPrimary,
      fontSize: 12,
    }),
    [dt],
  );
}

export { DASHBOARD_THEME_DARK, DASHBOARD_THEME_LIGHT };
export type { DashboardThemeTokens };
