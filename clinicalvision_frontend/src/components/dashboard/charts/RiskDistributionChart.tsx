/**
 * RiskDistributionChart — Bar chart for risk levels
 * Enhanced with metallic gradient fills.
 */

import React, { useMemo } from 'react';
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
import { DASHBOARD_THEME, RISK_COLORS, CHART_TOOLTIP_STYLE, metallicStops } from './dashboardTheme';

export interface RiskDistributionChartProps {
  low: number;
  moderate: number;
  high: number;
}

const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  low,
  moderate,
  high,
}) => {
  const total = low + moderate + high;

  const chartData = [
    { label: 'Low', count: low, color: RISK_COLORS.low, gradId: 'risk-grad-low' },
    { label: 'Moderate', count: moderate, color: RISK_COLORS.moderate, gradId: 'risk-grad-mod' },
    { label: 'High', count: high, color: RISK_COLORS.high, gradId: 'risk-grad-high' },
  ];

  const gradients = useMemo(() =>
    chartData.map((d) => ({ id: d.gradId, stops: metallicStops(d.color) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [low, moderate, high]);

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 180 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No risk data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {gradients.map(({ id, stops: [light, base, dark] }) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} stopOpacity={1} />
              <stop offset="50%" stopColor={base} stopOpacity={1} />
              <stop offset="100%" stopColor={dark} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="label"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          allowDecimals={false}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={`url(#${entry.gradId})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RiskDistributionChart;
