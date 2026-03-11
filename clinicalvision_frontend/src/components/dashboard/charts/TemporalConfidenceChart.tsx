/**
 * TemporalConfidenceChart — Composed chart: confidence + uncertainty over time
 *
 * Renders:
 *  - AreaChart: confidence band (mean)
 *  - LineChart: epistemic uncertainty overlay
 *  - LineChart: aleatoric uncertainty overlay
 *  - Scatter: high-uncertainty flagged cases (count per day)
 *
 * Uses recharts ComposedChart for multi-series visualization.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { TemporalConfidencePoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface TemporalConfidenceChartProps {
  data: TemporalConfidencePoint[];
}

// ────────────────────────────────────────────────────────────────────────────

const TemporalConfidenceChart: React.FC<TemporalConfidenceChartProps> = ({ data }) => {
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
          No temporal data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="confidenceAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0.25} />
            <stop offset="100%" stopColor={DASHBOARD_THEME.primary} stopOpacity={0} />
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
          yAxisId="left"
          domain={[0, 1]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          allowDecimals={false}
          label={{
            value: 'Flagged',
            angle: 90,
            position: 'insideRight',
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />

        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'Confidence') return [`${(value * 100).toFixed(1)}%`, name];
            if (name === 'Epistemic') return [value.toFixed(3), name];
            if (name === 'Aleatoric') return [value.toFixed(3), name];
            if (name === 'Flagged Cases') return [value, name];
            return [value, name];
          }}
          labelFormatter={(label: string) => `Date: ${label}`}
        />

        <Legend
          wrapperStyle={{ fontSize: 11, color: DASHBOARD_THEME.neutral }}
        />

        {/* Confidence area */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="avgConfidence"
          name="Confidence"
          stroke={DASHBOARD_THEME.primary}
          strokeWidth={2}
          fill="url(#confidenceAreaGrad)"
          fillOpacity={1}
        />

        {/* Epistemic uncertainty line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="avgEpistemicUncertainty"
          name="Epistemic"
          stroke={DASHBOARD_THEME.secondary}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
        />

        {/* Aleatoric uncertainty line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="avgAleatoricUncertainty"
          name="Aleatoric"
          stroke={DASHBOARD_THEME.tertiary}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="3 3"
        />

        {/* High-uncertainty flagged count bars */}
        <Bar
          yAxisId="right"
          dataKey="highUncertaintyCount"
          name="Flagged Cases"
          fill={DASHBOARD_THEME.danger}
          fillOpacity={0.3}
          maxBarSize={12}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default TemporalConfidenceChart;
