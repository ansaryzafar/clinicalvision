/**
 * GaugeCard — Radial KPI gauge for the AI Analytics Dashboard
 *
 * Renders a single headline metric as a 270° radial arc using
 * recharts RadialBarChart. Designed for KPIs like:
 *  - Average AI Confidence (87%)
 *  - Model Accuracy (94.2%)
 *  - Cases Today (42)
 *  - Average Latency (320 ms)
 */

import React from 'react';
import { Paper, Box, Typography, Stack } from '@mui/material';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME } from './dashboardTheme';

// ────────────────────────────────────────────────────────────────────────────

export interface GaugeCardProps {
  /** Overline label above the gauge */
  label: string;
  /** Current value (0-maxValue or raw) */
  value: number;
  /** Maximum value on the gauge scale */
  maxValue: number;
  /** Unit suffix (e.g. '%', 'ms', '') */
  unit: string;
  /** Change from previous period — positive = up, negative = down */
  trend?: number;
  /** Arc fill colour */
  color: string;
}

// ────────────────────────────────────────────────────────────────────────────

const GaugeCard: React.FC<GaugeCardProps> = ({
  label,
  value,
  maxValue,
  unit,
  trend,
  color,
}) => {
  const data = [{ value, fill: color }];

  // Background track colour
  const trackColor = 'rgba(255, 255, 255, 0.06)';

  // Trend display
  const renderTrend = () => {
    if (trend === undefined) return null;

    const arrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '—';
    const trendColor =
      trend > 0
        ? DASHBOARD_THEME.success
        : trend < 0
          ? DASHBOARD_THEME.danger
          : DASHBOARD_THEME.neutral;

    return (
      <Typography
        variant="caption"
        sx={{ color: trendColor, fontWeight: 600, textAlign: 'center' }}
      >
        {arrow} {Math.abs(trend)}
        {unit}
      </Typography>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        background: DASHBOARD_THEME.cardGradient,
        border: `1px solid ${DASHBOARD_THEME.cardBorder}`,
        borderRadius: 2,
        textAlign: 'center',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: DASHBOARD_THEME.cardGradientHover,
          borderColor: 'rgba(0, 201, 234, 0.2)',
        },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: DASHBOARD_THEME.textMuted,
          fontFamily: DASHBOARD_THEME.fontBody,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </Typography>

      {/* Gauge */}
      <Box sx={{ position: 'relative', mx: 'auto', width: '100%' }}>
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="90%"
            data={data}
            startAngle={225}
            endAngle={-45}
            barSize={10}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, maxValue]}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: trackColor }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Centre value overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: DASHBOARD_THEME.fontMono,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1,
            }}
          >
            {value}
            {unit}
          </Typography>
        </Box>
      </Box>

      {/* Trend */}
      <Stack alignItems="center" sx={{ mt: 0.5 }}>
        {renderTrend()}
      </Stack>
    </Paper>
  );
};

export default GaugeCard;
