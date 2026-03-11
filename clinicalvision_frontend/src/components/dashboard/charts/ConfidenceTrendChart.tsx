/**
 * ConfidenceTrendChart — Area chart showing AI confidence over time
 *
 * Renders a gradient-filled area chart with:
 *  - Solid line: average confidence per day
 *  - Light fill bands: ±1 stdDev uncertainty bands
 *  - Brush: zoomable time range selector
 *
 * Uses recharts AreaChart with LUNIT dashboard theme colours.
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
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { ConfidenceTrendPoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface ConfidenceTrendChartProps {
  data: ConfidenceTrendPoint[];
}

// ────────────────────────────────────────────────────────────────────────────

const ConfidenceTrendChart: React.FC<ConfidenceTrendChartProps> = ({ data }) => {
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
          No trend data available yet.
        </Typography>
      </Box>
    );
  }

  // Compute upper/lower bands from stdConfidence
  const chartData = data.map((point) => ({
    ...point,
    upperBand: Math.min(1, point.avgConfidence + point.stdConfidence),
    lowerBand: Math.max(0, point.avgConfidence - point.stdConfidence),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0.08} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke={DASHBOARD_THEME.gridStroke}
        />

        <XAxis
          dataKey="date"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(d: string) => d.slice(5)} // 'MM-DD'
        />

        <YAxis
          domain={[0, 1]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />

        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'avgConfidence') return [`${(value * 100).toFixed(1)}%`, 'Avg Confidence'];
            if (name === 'upperBand') return [`${(value * 100).toFixed(1)}%`, 'Upper Band'];
            if (name === 'lowerBand') return [`${(value * 100).toFixed(1)}%`, 'Lower Band'];
            return [value, name];
          }}
          labelFormatter={(label: string) => `Date: ${label}`}
        />

        {/* Upper uncertainty band */}
        <Area
          type="monotone"
          dataKey="upperBand"
          stroke="none"
          fill="url(#bandGradient)"
          fillOpacity={1}
        />

        {/* Lower uncertainty band (creates visual gap) */}
        <Area
          type="monotone"
          dataKey="lowerBand"
          stroke="none"
          fill={DASHBOARD_THEME.background}
          fillOpacity={0.8}
        />

        {/* Main confidence line */}
        <Area
          type="monotone"
          dataKey="avgConfidence"
          stroke={DASHBOARD_THEME.primary}
          strokeWidth={2}
          fill="url(#confidenceGradient)"
          fillOpacity={1}
          dot={data.length <= 14}
        />

        {data.length > 7 && (
          <Brush
            dataKey="date"
            height={20}
            stroke={DASHBOARD_THEME.primary}
            fill={DASHBOARD_THEME.cardBackground}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ConfidenceTrendChart;
