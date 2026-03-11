/**
 * BiRadsBarChart — Bar chart showing BI-RADS category distribution
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
import { DASHBOARD_THEME, BIRADS_COLORS, CHART_TOOLTIP_STYLE } from './dashboardTheme';

export interface BiRadsBarChartProps {
  distribution: Record<string, number>;
}

const BiRadsBarChart: React.FC<BiRadsBarChartProps> = ({ distribution }) => {
  const entries = Object.entries(distribution).sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 180 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No BI-RADS data available yet.
        </Typography>
      </Box>
    );
  }

  const chartData = entries.map(([cat, count]) => ({
    category: `BR ${cat}`,
    count,
    fill: BIRADS_COLORS[cat] ?? DASHBOARD_THEME.neutral,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
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
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BiRadsBarChart;
