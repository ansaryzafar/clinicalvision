/**
 * EntropyHistogram — Bar chart showing predictive entropy distribution
 * Enhanced with metallic gradient fills on each bin bar.
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
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE, metallicStops } from './dashboardTheme';
import type { EntropyBin } from '../../../types/metrics.types';

export interface EntropyHistogramProps {
  data: EntropyBin[];
}

/** Map bin midpoint to colour along entropy spectrum. */
function entropyColor(binStart: number): string {
  if (binStart >= 0.6) return DASHBOARD_THEME.danger;
  if (binStart >= 0.3) return DASHBOARD_THEME.warning;
  return DASHBOARD_THEME.success;
}

/** Pre-computed metallic gradient defs for entropy colour spectrum */
const ENTROPY_GRAD_MAP: Record<string, { id: string; stops: [string, string, string] }> = {
  [DASHBOARD_THEME.success]: { id: 'ent-grad-success', stops: metallicStops(DASHBOARD_THEME.success) },
  [DASHBOARD_THEME.warning]: { id: 'ent-grad-warning', stops: metallicStops(DASHBOARD_THEME.warning) },
  [DASHBOARD_THEME.danger]: { id: 'ent-grad-danger', stops: metallicStops(DASHBOARD_THEME.danger) },
};

const EntropyHistogram: React.FC<EntropyHistogramProps> = ({ data }) => {
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
          No entropy distribution data available.
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        role="img"
        aria-label="Predictive entropy distribution histogram"
      >
        <defs>
          {Object.values(ENTROPY_GRAD_MAP).map(({ id, stops: [light, base, dark] }) => (
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
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          allowDecimals={false}
          label={{
            value: 'Count',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number) => [value, 'Cases']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => {
            const color = entropyColor(entry.binStart);
            const grad = ENTROPY_GRAD_MAP[color];
            return (
              <Cell key={`cell-${index}`} fill={grad ? `url(#${grad.id})` : color} />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EntropyHistogram;
