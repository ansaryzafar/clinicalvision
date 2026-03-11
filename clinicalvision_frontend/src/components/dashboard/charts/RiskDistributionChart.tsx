/**
 * RiskDistributionChart — Horizontal bar chart for risk levels
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
import { DASHBOARD_THEME, RISK_COLORS, CHART_TOOLTIP_STYLE } from './dashboardTheme';

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

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 180 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No risk data available yet.
        </Typography>
      </Box>
    );
  }

  const chartData = [
    { label: 'Low', count: low, fill: RISK_COLORS.low },
    { label: 'Moderate', count: moderate, fill: RISK_COLORS.moderate },
    { label: 'High', count: high, fill: RISK_COLORS.high },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RiskDistributionChart;
