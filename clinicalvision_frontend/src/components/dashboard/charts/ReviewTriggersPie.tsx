/**
 * ReviewTriggersPie — Horizontal bar chart showing why cases get flagged
 *
 * Redesigned from pie/donut to horizontal bars for much clearer
 * categorical comparison. Each bar shows:
 *  - Trigger name (left-aligned label)
 *  - Proportional bar with percentage
 *  - Count on the right
 *
 * Helps prioritise model improvement efforts.
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { ReviewTrigger } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface ReviewTriggersPieProps {
  data: ReviewTrigger[];
}

// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────

const ReviewTriggersPie: React.FC<ReviewTriggersPieProps> = ({ data }) => {
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

  // Sort data by count descending for visual hierarchy
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // Format trigger names for display (replace underscores, capitalize)
  const chartData = sortedData.map((d, idx) => ({
    ...d,
    displayName: d.trigger.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
    color: triggerColor(d.trigger, idx),
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
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
              <Cell key={`bar-${idx}`} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ReviewTriggersPie;
