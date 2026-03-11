/**
 * ConcordanceChart — Grouped bar chart: AI vs radiologist agreement
 *
 * Displays per-category (Benign / Malignant / BI-RADS) comparison between
 * AI predictions and radiologist assessments, with agreement rate overlay.
 *
 * Key insight: Low agreement on specific categories signals where the model
 * diverges from clinical practice and needs attention.
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
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { ConcordanceEntry } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface ConcordanceChartProps {
  data: ConcordanceEntry[];
}

// ────────────────────────────────────────────────────────────────────────────

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

  // Enrich data with agreement percentage for display
  const chartData = data.map((entry) => ({
    ...entry,
    agreementPct: Math.round(entry.agreementRate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
          fill={DASHBOARD_THEME.primary}
          fillOpacity={0.8}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
        <Bar
          dataKey="radiologistCount"
          name="Radiologist Reviews"
          fill={DASHBOARD_THEME.secondary}
          fillOpacity={0.8}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
        <Bar
          dataKey="agreementPct"
          name="Agreement"
          fill={DASHBOARD_THEME.success}
          fillOpacity={0.4}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ConcordanceChart;
