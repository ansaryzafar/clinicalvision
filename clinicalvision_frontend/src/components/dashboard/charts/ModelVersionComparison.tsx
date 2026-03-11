/**
 * ModelVersionComparison — Grouped bar chart
 *
 * Compares performance metrics across model versions:
 *  - Average confidence
 *  - Average latency
 *  - Total predictions (volume)
 *  - AUC-ROC (from validation metrics)
 *
 * Identifies regressions when new model versions are deployed
 * and validates that updates improve clinical performance.
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
import type { ModelVersionStats } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface ModelVersionComparisonProps {
  data: ModelVersionStats[];
}

// ────────────────────────────────────────────────────────────────────────────

const ModelVersionComparison: React.FC<ModelVersionComparisonProps> = ({ data }) => {
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
          No model version data available.
        </Typography>
      </Box>
    );
  }

  // Normalise for display: confidence as %, latency scaled for readability
  const chartData = data.map((v) => ({
    version: v.version,
    'Confidence (%)': Math.round(v.avgConfidence * 100),
    'AUC-ROC (%)': Math.round(v.aucRoc * 100),
    'Predictions': v.totalPredictions,
    'Latency (ms)': Math.round(v.avgLatencyMs),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="version"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: DASHBOARD_THEME.neutral }} />

        <Bar
          dataKey="Confidence (%)"
          fill={DASHBOARD_THEME.primary}
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="AUC-ROC (%)"
          fill={DASHBOARD_THEME.success}
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="Latency (ms)"
          fill={DASHBOARD_THEME.warning}
          fillOpacity={0.6}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ModelVersionComparison;
