/**
 * OverviewTab — AI Analytics Overview
 *
 * First tab of the AI Analytics section.  Displays KPI gauges
 * and charts powered by the useOverviewMetrics hook:
 *   1. Tries the backend API (GET /api/v1/analytics/overview)
 *   2. Falls back to localMetricsAggregator for demo/offline mode
 *
 * Layout (responsive):
 *  Row 1 — 4 radial KPI gauges (xs=6, md=3)
 *  Row 2 — 2 primary chart cards (xs=12, md=6)
 *  Row 3 — 3 secondary chart cards (xs=12, md=4)
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import GaugeCard from '../charts/GaugeCard';
import MetricCard from '../charts/MetricCard';
import ConfidenceTrendChart from '../charts/ConfidenceTrendChart';
import PredictionDonut from '../charts/PredictionDonut';
import BiRadsBarChart from '../charts/BiRadsBarChart';
import RiskDistributionChart from '../charts/RiskDistributionChart';
import LatencyPercentilesChart from '../charts/LatencyPercentilesChart';
import SystemHealthBar from '../charts/SystemHealthBar';
import ChartSkeleton from '../charts/ChartSkeleton';
import ErrorAlert from '../charts/ErrorAlert';
import { DASHBOARD_THEME } from '../charts/dashboardTheme';
import { useOverviewMetrics, useSystemHealth } from '../../../hooks/useMetrics';
import { EMPTY_OVERVIEW_METRICS } from '../../../types/metrics.types';
import type { MetricsPeriod } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Period selector labels
// ────────────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: MetricsPeriod; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const OverviewTab: React.FC = () => {
  const [period, setPeriod] = useState<MetricsPeriod>('30d');

  // Fetch from API with local-aggregator fallback
  const { data: metrics, isLoading, dataSource, refresh, error } =
    useOverviewMetrics({ period });

  // Fetch system health (separate, faster refresh)
  const { data: systemHealth } = useSystemHealth();

  const kpis = metrics?.kpis ?? EMPTY_OVERVIEW_METRICS.kpis;
  const kpiTrends = metrics?.kpiTrends ?? EMPTY_OVERVIEW_METRICS.kpiTrends;
  const safeMetrics = { ...EMPTY_OVERVIEW_METRICS, ...metrics };

  // Format confidence as percentage (model outputs 0-1)
  const confidencePct = Math.round(kpis.averageConfidence * 100);
  const uncertaintyPct = Math.round(kpis.highUncertaintyRate * 100);
  const latencyMs = Math.round(kpis.averageInferenceTimeMs);

  return (
    <Box data-testid="overview-tab">
      {/* ── Period selector ─────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: DASHBOARD_THEME.fontHeading,
            color: '#E5E7EB',
            fontWeight: 600,
          }}
        >
          AI Performance Overview
        </Typography>

        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v as MetricsPeriod)}
          size="small"
          aria-label="Time period"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                px: 1.5,
                color: DASHBOARD_THEME.neutral,
                borderColor: DASHBOARD_THEME.cardBorder,
                '&.Mui-selected': {
                  bgcolor: alpha(DASHBOARD_THEME.primary, 0.15),
                  color: DASHBOARD_THEME.primary,
                  borderColor: alpha(DASHBOARD_THEME.primary, 0.3),
                },
              }}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Stack direction="row" spacing={1} alignItems="center">
          {isLoading && (
            <CircularProgress size={16} sx={{ color: DASHBOARD_THEME.primary }} data-testid="metrics-loading" />
          )}
          {dataSource && (
            <Tooltip title={dataSource === 'api' ? 'Live data from server' : 'Local session data'}>
              <Chip
                icon={dataSource === 'api' ? <CloudIcon sx={{ fontSize: 14 }} /> : <StorageIcon sx={{ fontSize: 14 }} />}
                label={dataSource === 'api' ? 'Live' : 'Local'}
                size="small"
                data-testid="data-source-chip"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  bgcolor: alpha(
                    dataSource === 'api' ? DASHBOARD_THEME.success : DASHBOARD_THEME.warning,
                    0.15,
                  ),
                  color: dataSource === 'api' ? DASHBOARD_THEME.success : DASHBOARD_THEME.warning,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Refresh metrics">
            <IconButton
              size="small"
              onClick={refresh}
              disabled={isLoading}
              data-testid="refresh-metrics"
              sx={{ color: DASHBOARD_THEME.neutral, '&:hover': { color: DASHBOARD_THEME.primary } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={refresh} />}

      {/* Loading skeletons */}
      {isLoading && !metrics ? (
        <Grid container spacing={2.5}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <ChartSkeleton variant="gauge" />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartSkeleton height={260} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartSkeleton height={260} />
          </Grid>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <ChartSkeleton height={200} />
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <ChartSkeleton variant="bar" height={50} />
          </Grid>
        </Grid>
      ) : (
      <Grid container spacing={2.5}>
        {/* ── Row 1: KPI Gauges ──────────────────────────────────── */}
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Avg AI Confidence"
            value={confidencePct}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.primary}
            trend={kpiTrends.confidenceChange !== 0 ? Math.round(kpiTrends.confidenceChange * 100) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="High Uncertainty Rate"
            value={uncertaintyPct}
            maxValue={100}
            unit="%"
            color={uncertaintyPct > 15 ? DASHBOARD_THEME.danger : DASHBOARD_THEME.success}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Cases Analyzed"
            value={kpis.totalAnalyses}
            maxValue={Math.max(kpis.totalAnalyses, 50)}
            unit=""
            color={DASHBOARD_THEME.secondary}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Avg Latency"
            value={latencyMs}
            maxValue={Math.max(latencyMs, 1000)}
            unit="ms"
            color={latencyMs > 500 ? DASHBOARD_THEME.warning : DASHBOARD_THEME.primary}
            trend={kpiTrends.latencyChange !== 0 ? Math.round(kpiTrends.latencyChange) : undefined}
          />
        </Grid>

        {/* ── Row 2: Primary chart placeholders ──────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Confidence Trend"
            subtitle="Average confidence over time"
            value={`${confidencePct}%`}
            timeRange={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
            height={260}
          >
            {safeMetrics.confidenceTrend.length > 0 ? (
              <ConfidenceTrendChart data={safeMetrics.confidenceTrend} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-confidence-trend"
              >
                No trend data available yet. Run analyses to populate.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Prediction Distribution"
            subtitle="Benign vs malignant ratio"
            height={260}
          >
            {kpis.totalAnalyses > 0 ? (
              <PredictionDonut
                benign={safeMetrics.predictionDistribution.benign}
                malignant={safeMetrics.predictionDistribution.malignant}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-predictions"
              >
                No predictions available yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 3: Secondary chart placeholders ────────────────── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard title="BI-RADS Distribution" height={200}>
            {Object.keys(safeMetrics.biradsDistribution).length > 0 ? (
              <BiRadsBarChart distribution={safeMetrics.biradsDistribution} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-birads"
              >
                No BI-RADS data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard title="Risk Distribution" height={200}>
            {kpis.totalAnalyses > 0 ? (
              <RiskDistributionChart
                low={safeMetrics.riskDistribution.low}
                moderate={safeMetrics.riskDistribution.moderate}
                high={safeMetrics.riskDistribution.high}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-risk"
              >
                No risk data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard title="Inference Latency" height={200}>
            {safeMetrics.latencyPercentiles.length > 0 ? (
              <LatencyPercentilesChart data={safeMetrics.latencyPercentiles} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-latency"
              >
                No latency data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 4: System Health Status Bar ────────────────────── */}
        <Grid size={{ xs: 12 }}>
          <SystemHealthBar health={systemHealth} />
        </Grid>
      </Grid>
      )}
    </Box>
  );
};

export default OverviewTab;
