/**
 * SystemHealthBar — Full-width status bar for Overview Tab Row 4
 *
 * Displays system health indicators in a compact horizontal bar:
 *   - Model status (healthy/degraded/unhealthy)
 *   - Backend status
 *   - GPU availability
 *   - Uptime
 *   - Error count (24h)
 *   - Queue depth
 *
 * Uses colour-coded chips and icons for quick visual assessment.
 */

import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Tooltip,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import MemoryIcon from '@mui/icons-material/Memory';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BugReportIcon from '@mui/icons-material/BugReport';
import QueueIcon from '@mui/icons-material/Queue';
import { useDashboardTheme, type DashboardThemeTokens } from '../../../hooks/useDashboardTheme';
import type { SystemHealthStatus } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface SystemHealthBarProps {
  health: SystemHealthStatus;
}

// ────────────────────────────────────────────────────────────────────────────

/** Get colour + icon for a status string */
function statusIndicator(status: string, dt: DashboardThemeTokens): {
  color: string;
  icon: React.ReactElement;
  label: string;
} {
  switch (status) {
    case 'healthy':
      return {
        color: dt.success,
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        label: 'Healthy',
      };
    case 'degraded':
      return {
        color: dt.warning,
        icon: <WarningIcon sx={{ fontSize: 16 }} />,
        label: 'Degraded',
      };
    case 'unhealthy':
      return {
        color: dt.danger,
        icon: <ErrorIcon sx={{ fontSize: 16 }} />,
        label: 'Unhealthy',
      };
    default:
      return {
        color: dt.neutral,
        icon: <HelpIcon sx={{ fontSize: 16 }} />,
        label: 'Unknown',
      };
  }
}

/** Format seconds into human-readable uptime */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

// ────────────────────────────────────────────────────────────────────────────

const SystemHealthBar: React.FC<SystemHealthBarProps> = ({ health }) => {
  const dt = useDashboardTheme();
  const model = statusIndicator(health.modelStatus, dt);
  const backend = statusIndicator(health.backendStatus, dt);

  return (
    <Paper
      data-testid="system-health-bar"
      role="status"
      aria-label="System health status"
      sx={{
        background: dt.cardDiagonalGradient,
        border: `1px solid ${dt.cardBorder}`,
        borderRadius: `${dt.cardBorderRadius}px`,
        boxShadow: dt.cardShadow,
        px: 2.5,
        py: 1.5,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ rowGap: 1 }}
      >
        {/* Section title */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: dt.fontHeading,
            color: dt.neutral,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: '0.65rem',
          }}
        >
          System Health
        </Typography>

        {/* Model status */}
        <Tooltip title={`Model: ${model.label} — ${health.modelVersion}`}>
          <Chip
            icon={model.icon}
            label={`Model: ${model.label}`}
            size="small"
            data-testid="model-status-chip"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha(model.color, 0.12),
              color: model.color,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Tooltip>

        {/* Backend status */}
        <Tooltip title={`Backend: ${backend.label}`}>
          <Chip
            icon={backend.icon}
            label={`API: ${backend.label}`}
            size="small"
            data-testid="backend-status-chip"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha(backend.color, 0.12),
              color: backend.color,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Tooltip>

        {/* GPU */}
        <Tooltip title={health.gpuAvailable ? 'GPU acceleration active' : 'CPU mode'}>
          <Chip
            icon={<MemoryIcon sx={{ fontSize: 14 }} />}
            label={health.gpuAvailable ? 'GPU' : 'CPU'}
            size="small"
            data-testid="gpu-chip"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: alpha(
                health.gpuAvailable ? dt.success : dt.neutral,
                0.12,
              ),
              color: health.gpuAvailable ? dt.success : dt.neutral,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Tooltip>

        {/* Uptime */}
        <Tooltip title={`Uptime: ${formatUptime(health.uptimeSeconds)}`}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AccessTimeIcon sx={{ fontSize: 14, color: dt.neutral }} />
            <Typography
              variant="caption"
              sx={{ color: dt.textSecondary, fontSize: '0.7rem', fontFamily: dt.fontMono }}
              data-testid="uptime-value"
            >
              {formatUptime(health.uptimeSeconds)}
            </Typography>
          </Stack>
        </Tooltip>

        {/* Errors 24h */}
        <Tooltip title={`${health.errorCount24h} errors in last 24 hours`}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <BugReportIcon
              sx={{
                fontSize: 14,
                color: health.errorCount24h > 0 ? dt.danger : dt.neutral,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: health.errorCount24h > 0 ? dt.danger : dt.textSecondary,
                fontSize: '0.7rem',
                fontFamily: dt.fontMono,
              }}
              data-testid="error-count"
            >
              {health.errorCount24h} err
            </Typography>
          </Stack>
        </Tooltip>

        {/* Queue depth */}
        <Tooltip title={`${health.queueDepth} pending inference requests`}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <QueueIcon sx={{ fontSize: 14, color: dt.neutral }} />
            <Typography
              variant="caption"
              sx={{ color: dt.textSecondary, fontSize: '0.7rem', fontFamily: dt.fontMono }}
              data-testid="queue-depth"
            >
              {health.queueDepth} queued
            </Typography>
          </Stack>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

export default SystemHealthBar;
