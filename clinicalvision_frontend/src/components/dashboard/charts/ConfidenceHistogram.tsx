/**
 * ConfidenceHistogram — Bar chart showing confidence score distribution
 *
 * Renders a vertical bar chart with 10 bins (0–10%, 10–20%, …, 90–100%).
 * A bimodal distribution (peaks at low and high confidence) indicates
 * a well-calibrated model. A uniform spread signals potential issues.
 *
 * Supports any bin count via props for future extensibility.
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
import type { ConfidenceBin } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface ConfidenceHistogramProps {
  data: ConfidenceBin[];
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * Map a bin's midpoint to a colour along the confidence spectrum.
 * Low confidence → warning/danger, high confidence → success.
 */
function binColor(binStart: number): string {
  if (binStart >= 0.8) return DASHBOARD_THEME.success;
  if (binStart >= 0.6) return DASHBOARD_THEME.primary;
  if (binStart >= 0.4) return DASHBOARD_THEME.warning;
  return DASHBOARD_THEME.danger;
}

// ────────────────────────────────────────────────────────────────────────────

const ConfidenceHistogram: React.FC<ConfidenceHistogramProps> = ({ data }) => {
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
          No confidence distribution data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number) => [value, 'Count']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((bin, idx) => (
            <Cell key={`bin-${idx}`} fill={binColor(bin.binStart)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ConfidenceHistogram;
