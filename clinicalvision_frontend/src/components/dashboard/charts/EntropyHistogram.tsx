/**
 * EntropyHistogram — Bar chart showing predictive entropy distribution
 *
 * Renders a vertical bar chart of predictive entropy values.
 * Low entropy → confident predictions, High entropy → uncertain predictions.
 *
 * Colour coding:
 *   - Low entropy bins (< 0.3)  → success (green)
 *   - Medium bins (0.3–0.6)     → warning (amber)
 *   - High entropy bins (> 0.6) → danger (red)
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { EntropyBin } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface EntropyHistogramProps {
  data: EntropyBin[];
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * Map bin midpoint to colour along entropy spectrum.
 * Low entropy → green, medium → amber, high → red.
 */
function entropyColor(binStart: number): string {
  if (binStart >= 0.6) return DASHBOARD_THEME.danger;
  if (binStart >= 0.3) return DASHBOARD_THEME.warning;
  return DASHBOARD_THEME.success;
}

// ────────────────────────────────────────────────────────────────────────────

const EntropyHistogram: React.FC<EntropyHistogramProps> = ({ data }) => {
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
          No entropy distribution data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        role="img"
        aria-label="Predictive entropy distribution histogram"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="label"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          allowDecimals={false}
          label={{
            value: 'Count',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number) => [value, 'Cases']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entropyColor(entry.binStart)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EntropyHistogram;
