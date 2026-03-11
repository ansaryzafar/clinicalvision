/**
 * UncertaintyDecompositionChart — Stacked area chart
 *
 * Visualises how total predictive uncertainty decomposes into:
 *  - Epistemic uncertainty (model uncertainty — can be reduced with more data)
 *  - Aleatoric uncertainty (inherent data noise — irreducible)
 *
 * Rising epistemic uncertainty → model needs retraining.
 * Rising aleatoric uncertainty → image quality issues.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { UncertaintyDecompositionPoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface UncertaintyDecompositionChartProps {
  data: UncertaintyDecompositionPoint[];
}

// ────────────────────────────────────────────────────────────────────────────

const UncertaintyDecompositionChart: React.FC<UncertaintyDecompositionChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No uncertainty decomposition data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="epistemicGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.secondary} stopOpacity={0.4} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.secondary} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="aleatoricGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.tertiary} stopOpacity={0.4} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.tertiary} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />

        <XAxis
          dataKey="date"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => v.toFixed(2)}
        />

        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [value.toFixed(4), name]}
          labelFormatter={(label: string) => `Date: ${label}`}
        />

        <Legend wrapperStyle={{ fontSize: 11, color: DASHBOARD_THEME.neutral }} />

        <Area
          type="monotone"
          dataKey="epistemic"
          name="Epistemic (Model)"
          stackId="unc"
          stroke={DASHBOARD_THEME.secondary}
          strokeWidth={1.5}
          fill="url(#epistemicGrad)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="aleatoric"
          name="Aleatoric (Data)"
          stackId="unc"
          stroke={DASHBOARD_THEME.tertiary}
          strokeWidth={1.5}
          fill="url(#aleatoricGrad)"
          fillOpacity={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default UncertaintyDecompositionChart;
