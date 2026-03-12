/**
 * ChartSkeleton — Shimmer loading placeholder for chart cards
 *
 * Provides visual feedback during data loading with animated
 * shimmer gradients matching the dashboard theme.
 *
 * Props:
 *   - height: Skeleton height (matches the chart card height)
 *   - variant: 'gauge' | 'chart' | 'bar' for different skeleton shapes
 */

import React from 'react';
import { Box, Skeleton, Paper, Stack } from '@mui/material';
import { DASHBOARD_THEME } from './dashboardTheme';

// ────────────────────────────────────────────────────────────────────────────

export type SkeletonVariant = 'gauge' | 'chart' | 'bar';

export interface ChartSkeletonProps {
  height?: number;
  variant?: SkeletonVariant;
}

// ────────────────────────────────────────────────────────────────────────────

const skeletonSx = {
  bgcolor: 'rgba(255, 255, 255, 0.04)',
  '&::after': {
    background:
      'linear-gradient(90deg, transparent, rgba(0, 201, 234, 0.06), transparent)',
  },
};

// ────────────────────────────────────────────────────────────────────────────

const GaugeSkeleton: React.FC = () => (
  <Paper
    data-testid="skeleton-gauge"
    sx={{
      background: DASHBOARD_THEME.cardGradient,
      border: `1px solid ${DASHBOARD_THEME.cardBorder}`,
      borderRadius: 2,
      p: 2,
      height: 140,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Skeleton variant="circular" width={70} height={70} animation="wave" sx={skeletonSx} />
    <Skeleton variant="text" width={80} height={18} animation="wave" sx={{ ...skeletonSx, mt: 1 }} />
    <Skeleton variant="text" width={50} height={14} animation="wave" sx={skeletonSx} />
  </Paper>
);

const ChartCardSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <Paper
    data-testid="skeleton-chart"
    sx={{
      background: DASHBOARD_THEME.cardGradient,
      border: `1px solid ${DASHBOARD_THEME.cardBorder}`,
      borderRadius: 2,
      p: 2,
      height,
    }}
  >
    <Skeleton variant="text" width={120} height={18} animation="wave" sx={skeletonSx} />
    <Skeleton variant="text" width={80} height={14} animation="wave" sx={{ ...skeletonSx, mb: 1 }} />
    <Skeleton
      variant="rectangular"
      width="100%"
      height={height - 80}
      animation="wave"
      sx={{ ...skeletonSx, borderRadius: 1 }}
    />
  </Paper>
);

const BarSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <Paper
    data-testid="skeleton-bar"
    sx={{
      background: DASHBOARD_THEME.cardGradient,
      border: `1px solid ${DASHBOARD_THEME.cardBorder}`,
      borderRadius: 2,
      px: 2.5,
      py: 1.5,
      height,
    }}
  >
    <Stack direction="row" spacing={2} alignItems="center" sx={{ height: '100%' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          width={80}
          height={24}
          animation="wave"
          sx={skeletonSx}
        />
      ))}
    </Stack>
  </Paper>
);

// ────────────────────────────────────────────────────────────────────────────

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 260,
  variant = 'chart',
}) => {
  switch (variant) {
    case 'gauge':
      return <GaugeSkeleton />;
    case 'bar':
      return <BarSkeleton height={height} />;
    case 'chart':
    default:
      return <ChartCardSkeleton height={height} />;
  }
};

export default ChartSkeleton;
