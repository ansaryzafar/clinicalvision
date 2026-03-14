/**
 * ModelVersionComparison — Grouped bar chart
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
import type { ModelVersionStats } from '../../../types/metrics.types';

export interface ModelVersionComparisonProps {
  data: ModelVersionStats[];
}

// Pre-compute metallic gradient stops for each bar series
const MVC_GRADS = {
  confidence: { id: 'mvc-grad-conf', stops: metallicStops(DASHBOARD_THEME.primary) },
  auc: { id: 'mvc-grad-auc', stops: metallicStops(DASHBOARD_THEME.success) },
  latency: { id: 'mvc-grad-lat', stops: metallicStops(DASHBOARD_THEME.warning) },
};

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
        <defs>
          {Object.values(MVC_GRADS).map(({ id, stops: [light, base, dark] }) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} stopOpacity={1} />
              <stop offset="50%" stopColor={base} stopOpacity={1} />
              <stop offset="100%" stopColor={dark} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
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
          fill={`url(#${MVC_GRADS.confidence.id})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="AUC-ROC (%)"
          fill={`url(#${MVC_GRADS.auc.id})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="Latency (ms)"
          fill={`url(#${MVC_GRADS.latency.id})`}
          fillOpacity={0.8}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ModelVersionComparison;
