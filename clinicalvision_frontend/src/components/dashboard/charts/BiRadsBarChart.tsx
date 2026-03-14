/**
 * BiRadsBarChart — Bar chart showing BI-RADS category distribution
 * Enhanced with metallic gradient fills on each bar.
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
import { DASHBOARD_THEME, BIRADS_COLORS, CHART_TOOLTIP_STYLE, metallicStops } from './dashboardTheme';

export interface BiRadsBarChartProps {
  distribution: Record<string, number>;
}

const BiRadsBarChart: React.FC<BiRadsBarChartProps> = ({ distribution }) => {
  const entries = Object.entries(distribution).sort(([a], [b]) => Number(a) - Number(b));

  const chartData = entries.map(([cat, count]) => ({
    category: `BR ${cat}`,
    count,
    color: BIRADS_COLORS[cat] ?? DASHBOARD_THEME.neutral,
    gradId: `birads-grad-${cat}`,
  }));

  // Pre-compute metallic gradient stops for each unique colour
  const gradients = useMemo(() => {
    const unique = new Map<string, [string, string, string]>();
    chartData.forEach((d) => {
      if (!unique.has(d.gradId)) unique.set(d.gradId, metallicStops(d.color));
    });
    return unique;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 180 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No BI-RADS data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {Array.from(gradients.entries()).map(([id, [light, base, dark]]) => (
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
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={`url(#${entry.gradId})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BiRadsBarChart;
