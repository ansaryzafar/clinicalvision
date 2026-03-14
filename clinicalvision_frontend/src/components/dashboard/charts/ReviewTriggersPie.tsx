/**
 * ReviewTriggersPie — Horizontal bar chart showing why cases get flagged
 * Enhanced with metallic gradient fills on each bar.
 */

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE, metallicStops } from './dashboardTheme';
import type { ReviewTrigger } from '../../../types/metrics.types';

export interface ReviewTriggersPieProps {
  data: ReviewTrigger[];
}

/** Assign consistent colours to each trigger type. */
const TRIGGER_COLORS: Record<string, string> = {
  'High Epistemic Uncertainty': DASHBOARD_THEME.secondary,
  'High Aleatoric Uncertainty': DASHBOARD_THEME.tertiary,
  'Low Confidence': DASHBOARD_THEME.danger,
  'Borderline Confidence': DASHBOARD_THEME.warning,
  'High Predictive Entropy': DASHBOARD_THEME.quaternary,
};

const FALLBACK_COLORS = [
  DASHBOARD_THEME.primary,
  DASHBOARD_THEME.secondary,
  DASHBOARD_THEME.tertiary,
  DASHBOARD_THEME.quaternary,
  DASHBOARD_THEME.warning,
  DASHBOARD_THEME.danger,
];

function triggerColor(trigger: string, index: number): string {
  return TRIGGER_COLORS[trigger] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const ReviewTriggersPie: React.FC<ReviewTriggersPieProps> = ({ data }) => {
  const sortedData = (data ?? []).length > 0
    ? [...data].sort((a, b) => b.count - a.count)
    : [];
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  const chartData = sortedData.map((d, idx) => ({
    ...d,
    displayName: d.trigger.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
    color: triggerColor(d.trigger, idx),
    gradId: `trig-grad-${idx}`,
  }));

  // Pre-compute metallic gradient stops
  const gradients = useMemo(() =>
    chartData.map((d) => ({ id: d.gradId, stops: metallicStops(d.color) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [sortedData.length]);

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
          No review trigger data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <defs>
            {gradients.map(({ id, stops: [light, base, dark] }) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={dark} stopOpacity={1} />
                <stop offset="50%" stopColor={base} stopOpacity={1} />
                <stop offset="100%" stopColor={light} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <XAxis
            type="number"
            hide
            domain={[0, Math.max(...chartData.map((d) => d.count)) * 1.15]}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            width={120}
            tick={{
              fill: DASHBOARD_THEME.textSecondary,
              fontSize: 11,
              fontFamily: DASHBOARD_THEME.fontBody,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            formatter={(value: number, _name: string, props: any) => [
              `${value} cases (${props?.payload?.pct ?? 0}%)`,
              'Count',
            ]}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            label={{
              position: 'right',
              fill: DASHBOARD_THEME.textMuted,
              fontSize: 11,
              fontFamily: DASHBOARD_THEME.fontMono,
              formatter: (v: number) => {
                const item = chartData.find((d) => d.count === v);
                return item ? `${item.pct}%` : '';
              },
            }}
          >
            {chartData.map((entry, idx) => (
              <Cell key={`bar-${idx}`} fill={`url(#${entry.gradId})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ReviewTriggersPie;
