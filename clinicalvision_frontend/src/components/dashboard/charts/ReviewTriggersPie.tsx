/**
 * ReviewTriggersPie — Pie chart showing why cases get flagged
 *
 * Displays a donut chart breaking down the reasons analyses were
 * flagged for human review:
 *  - High epistemic uncertainty
 *  - High aleatoric uncertainty
 *  - Low confidence
 *  - Borderline confidence
 *  - High predictive entropy
 *
 * Helps prioritise model improvement efforts.
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="trigger"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`trigger-${idx}`}
                fill={triggerColor(entry.trigger, idx)}
                fillOpacity={0.85}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [
              `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <Stack spacing={0.5} sx={{ width: '100%', px: 1 }}>
        {data.map((entry, idx) => (
          <Stack
            key={entry.trigger}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ fontSize: '0.7rem', color: DASHBOARD_THEME.textSecondary }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: triggerColor(entry.trigger, idx),
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: DASHBOARD_THEME.textSecondary, flex: 1, fontSize: '0.65rem' }}
              noWrap
            >
              {entry.trigger}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: DASHBOARD_THEME.neutral, fontSize: '0.65rem' }}
            >
              {entry.percentage.toFixed(0)}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default ReviewTriggersPie;
