/**
 * MetricCard — Standardised chart wrapper for the AI Analytics Dashboard
 *
 * Every chart or visualisation on the dashboard is contained inside a
 * MetricCard.  It provides:
 *  - A consistent header (title + optional headline value + trend)
 *  - Optional subtitle and time-range chip
 *  - Dark-surface card with LUNIT-branded border
 *  - A chart-content slot (children)
 */

import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useDashboardTheme } from '../../../hooks/useDashboardTheme';

// ────────────────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  /** Card title — always visible */
  title: string;
  /** Optional subtitle (e.g. "Prediction split across all analyses") */
  subtitle?: string;
  /** Optional headline value shown in the header row (e.g. "87.3%") */
  value?: string | number;
  /** Optional trend indicator next to the value */
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
  /** Optional time-range label (e.g. "Last 30 days") */
  timeRange?: string;
  /** Chart content rendered inside the card body */
  children: React.ReactNode;
  /** Optional fixed height for the chart area (px, default: auto) */
  height?: number;
}

// ────────────────────────────────────────────────────────────────────────────

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  value,
  trend,
  timeRange,
  children,
  height,
}) => {
  const dt = useDashboardTheme();

  const trendArrow =
    trend?.direction === 'up'
      ? '↑'
      : trend?.direction === 'down'
        ? '↓'
        : '—';

  const trendColor =
    trend?.direction === 'up'
      ? dt.success
      : trend?.direction === 'down'
        ? dt.danger
        : dt.neutral;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        background: dt.cardGradient,
        border: `1px solid ${dt.cardBorder}`,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: dt.cardGradientHover,
          borderColor: dt.cardBorder,
        },
      }}
    >
      {/* ── Header row ─────────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 0.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: dt.fontHeading,
              color: dt.textPrimary,
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              sx={{ color: dt.textMuted, display: 'block', mt: 0.25 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          {(value !== undefined && value !== null) && (
            <Typography
              variant="h6"
              sx={{
                fontFamily: dt.fontMono,
                color: dt.textPrimary,
                fontWeight: 700,
                fontSize: '1.05rem',
              }}
            >
              {value}
            </Typography>
          )}

          {trend && (
            <Typography
              variant="caption"
              sx={{ color: trendColor, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {trendArrow} {Math.abs(trend.value)}
            </Typography>
          )}
        </Stack>
      </Stack>

      {timeRange && (
        <Box sx={{ mb: 0.75 }}>
          <Chip
            label={timeRange}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              bgcolor: dt.cardBorder,
              color: dt.textMuted,
            }}
          />
        </Box>
      )}

      <Divider sx={{ borderColor: dt.cardBorder, mb: 1.5 }} />

      {/* ── Chart content slot ──────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          minHeight: height ?? 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default MetricCard;
