/**
 * LatencyPercentilesChart — Multi-line chart for p50/p90/p99 latencies
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { LatencyPercentilePoint } from '../../../types/metrics.types';

export interface LatencyPercentilesChartProps {
  data: LatencyPercentilePoint[];
  /** Optional SLA threshold line (ms) */
  slaThreshold?: number;
}

const LatencyPercentilesChart: React.FC<LatencyPercentilesChartProps> = ({
  data,
  slaThreshold = 500,
}) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 180 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No latency data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="date"
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${v}ms`}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [`${value}ms`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: DASHBOARD_THEME.textSecondary }}
        />
        <ReferenceLine
          y={slaThreshold}
          stroke={DASHBOARD_THEME.warning}
          strokeDasharray="6 3"
          label={{ value: `SLA ${slaThreshold}ms`, fill: DASHBOARD_THEME.warning, fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="p50"
          stroke={DASHBOARD_THEME.primary}
          strokeWidth={2}
          dot={data.length <= 14}
          name="P50 (Median)"
        />
        <Line
          type="monotone"
          dataKey="p90"
          stroke={DASHBOARD_THEME.warning}
          strokeWidth={1.5}
          dot={false}
          name="P90"
        />
        <Line
          type="monotone"
          dataKey="p99"
          stroke={DASHBOARD_THEME.danger}
          strokeWidth={1.5}
          dot={false}
          name="P99"
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LatencyPercentilesChart;
