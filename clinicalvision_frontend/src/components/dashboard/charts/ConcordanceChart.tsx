/**
 * ConcordanceChart — Grouped bar chart: AI vs radiologist agreement
 * Enhanced with metallic gradient fills on each bar series.
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE, metallicStops } from './dashboardTheme';
import type { ConcordanceEntry } from '../../../types/metrics.types';

export interface ConcordanceChartProps {
  data: ConcordanceEntry[];
}

// Pre-compute metallic gradient stops for each bar series
const CONC_GRADS = {
  ai: { id: 'conc-grad-ai', stops: metallicStops(DASHBOARD_THEME.primary) },
  rad: { id: 'conc-grad-rad', stops: metallicStops(DASHBOARD_THEME.secondary) },
  agree: { id: 'conc-grad-agree', stops: metallicStops(DASHBOARD_THEME.success) },
};

const ConcordanceChart: React.FC<ConcordanceChartProps> = ({ data }) => {
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
          No concordance data available. Feedback from radiologists is needed.
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((entry) => ({
    ...entry,
    agreementPct: Math.round(entry.agreementRate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {Object.values(CONC_GRADS).map(({ id, stops: [light, base, dark] }) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} stopOpacity={1} />
              <stop offset="50%" stopColor={base} stopOpacity={1} />
              <stop offset="100%" stopColor={dark} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="category"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'Agreement') return [`${value}%`, name];
            return [value, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: DASHBOARD_THEME.neutral }} />

        <Bar
          dataKey="aiCount"
          name="AI Predictions"
          fill={`url(#${CONC_GRADS.ai.id})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
        <Bar
          dataKey="radiologistCount"
          name="Radiologist Reviews"
          fill={`url(#${CONC_GRADS.rad.id})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
        <Bar
          dataKey="agreementPct"
          name="Agreement"
          fill={`url(#${CONC_GRADS.agree.id})`}
          fillOpacity={0.6}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ConcordanceChart;
