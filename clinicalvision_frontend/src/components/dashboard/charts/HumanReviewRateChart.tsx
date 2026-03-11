/**
 * HumanReviewRateChart — Line chart with threshold marker
 *
 * Tracks the percentage of analyses flagged for human review over time.
 * A rising rate may indicate model degradation or data distribution shift.
 *
 * Includes a configurable threshold reference line (default 20%)
 * and shaded area for the review rate.
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
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { HumanReviewRatePoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface HumanReviewRateChartProps {
  data: HumanReviewRatePoint[];
  /** Threshold line for acceptable review rate (0-1). Default 0.20 */
  threshold?: number;
}

// ────────────────────────────────────────────────────────────────────────────

const HumanReviewRateChart: React.FC<HumanReviewRateChartProps> = ({
  data,
  threshold = 0.20,
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
          No human review rate data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="reviewRateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.warning} stopOpacity={0.3} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.warning} stopOpacity={0} />
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
          domain={[0, Math.max(0.5, threshold * 2)]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'Review Rate') return [`${(value * 100).toFixed(1)}%`, name];
            return [value, name];
          }}
          labelFormatter={(label: string) => `Date: ${label}`}
        />

        {/* Threshold reference line */}
        <ReferenceLine
          y={threshold}
          stroke={DASHBOARD_THEME.danger}
          strokeDasharray="6 3"
          label={{
            value: `Threshold ${Math.round(threshold * 100)}%`,
            fill: DASHBOARD_THEME.danger,
            fontSize: 10,
            position: 'right',
          }}
        />

        <Area
          type="monotone"
          dataKey="reviewRate"
          name="Review Rate"
          stroke={DASHBOARD_THEME.warning}
          strokeWidth={2}
          fill="url(#reviewRateGrad)"
          fillOpacity={1}
          dot={data.length <= 14}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default HumanReviewRateChart;
