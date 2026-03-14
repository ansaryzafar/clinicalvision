/**
 * GaugeCard — Radial KPI gauge for the AI Analytics Dashboard
 *
 * Renders a single headline metric as a 270° radial arc using
 * recharts RadialBarChart. Designed for KPIs like:
 *  - Average AI Confidence (87%)
 *  - Model Accuracy (94.2%)
 *  - Cases Today (42)
 *  - Average Latency (320 ms)
 *
 * Visual: light blue diagonal gradient card, metallic arc fill,
 * rounded border, subtle shadow — matches the unified design system.
 */

import React from 'react';
import { Paper, Box, Typography, Stack } from '@mui/material';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardTheme } from '../../../hooks/useDashboardTheme';

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

/** Unique SVG gradient id per card instance */
let gaugeIdCounter = 0;

const GaugeCard: React.FC<GaugeCardProps> = ({
  label,
  value,
  maxValue,
  unit,
  trend,
  color,
}) => {
  const dt = useDashboardTheme();
  const [gradId] = React.useState(() => `gauge-metallic-${++gaugeIdCounter}`);

  // Decide which metallic stops to use based on whether the colour is a danger colour
  const isDanger = color === dt.danger;
  const [mLight, mMid, mDark] = isDanger
    ? dt.metallicGradientDanger
    : dt.metallicGradient;

  const data = [{ value, fill: `url(#${gradId})` }];

  // Background track colour
  const trackColor = 'rgba(255, 255, 255, 0.06)';

  // Trend display
  const renderTrend = () => {
    if (trend === undefined) return null;

    const arrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '—';
    const trendColor =
      trend > 0
        ? dt.success
        : trend < 0
          ? dt.danger
          : dt.neutral;

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
        background: dt.cardDiagonalGradient,
        border: `1px solid ${dt.cardBorder}`,
        borderRadius: `${dt.cardBorderRadius}px`,
        boxShadow: dt.cardShadow,
        textAlign: 'center',
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: dt.cardDiagonalGradientHover,
          borderColor: dt.cardBorder,
          boxShadow: dt.cardShadowHover,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: dt.textMuted,
          fontFamily: dt.fontBody,
          fontSize: dt.cardCaptionSize,
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
            {/* Metallic gradient definition */}
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={mLight} />
                <stop offset="50%" stopColor={mMid} />
                <stop offset="100%" stopColor={mDark} />
              </linearGradient>
            </defs>
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
              fontFamily: dt.fontMono,
              fontWeight: dt.cardValueWeight,
              color: dt.textPrimary,
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
