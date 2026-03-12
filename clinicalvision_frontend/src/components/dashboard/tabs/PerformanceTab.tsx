/**
 * PerformanceTab — Performance Deep-Dive Analytics
 *
 * Second sub-tab of AI Analytics. Provides detailed model
 * performance visualisations:
 *
 *  Row 1 — 4 performance KPI gauges (sensitivity, specificity, AUC-ROC, PPV)
 *  Row 2 — 2 primary charts (confidence histogram + uncertainty scatter)
 *  Row 3 — 1 full-width temporal confidence chart
 *  Row 4 — 1 full-width concordance chart
 *
 * Data flow: usePerformanceMetrics → API → charts
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
import ConfidenceHistogram from '../charts/ConfidenceHistogram';
import UncertaintyScatter from '../charts/UncertaintyScatter';
import TemporalConfidenceChart from '../charts/TemporalConfidenceChart';
import ConcordanceChart from '../charts/ConcordanceChart';
import CalibrationCurve from '../charts/CalibrationCurve';
import ChartSkeleton from '../charts/ChartSkeleton';
import ErrorAlert from '../charts/ErrorAlert';
import { DASHBOARD_THEME } from '../charts/dashboardTheme';
import { usePerformanceMetrics } from '../../../hooks/useMetrics';
import { EMPTY_PERFORMANCE_METRICS } from '../../../types/metrics.types';
import type { MetricsPeriod } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Period selector labels (shared across tabs)
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

const PerformanceTab: React.FC = () => {
  const [period, setPeriod] = useState<MetricsPeriod>('30d');

  const { data: metrics, isLoading, dataSource, refresh, error } =
    usePerformanceMetrics({ period });

  const kpis = metrics?.kpis ?? EMPTY_PERFORMANCE_METRICS.kpis;
  const trends = metrics?.kpiTrends ?? EMPTY_PERFORMANCE_METRICS.kpiTrends;
  const safeMetrics = { ...EMPTY_PERFORMANCE_METRICS, ...metrics };

  // Format for gauges (0-1 → percentage)
  const sensitivityPct = Math.round(kpis.sensitivity * 100);
  const specificityPct = Math.round(kpis.specificity * 100);
  const aucPct = Math.round(kpis.aucRoc * 100);
  const ppvPct = Math.round(kpis.ppv * 100);

  return (
    <Box data-testid="performance-tab">
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
          Performance Deep Dive
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
            <CircularProgress
              size={16}
              sx={{ color: DASHBOARD_THEME.primary }}
              data-testid="perf-metrics-loading"
            />
          )}
          {dataSource && (
            <Tooltip title={dataSource === 'api' ? 'Live data from server' : 'Local session data'}>
              <Chip
                icon={
                  dataSource === 'api'
                    ? <CloudIcon sx={{ fontSize: 14 }} />
                    : <StorageIcon sx={{ fontSize: 14 }} />
                }
                label={dataSource === 'api' ? 'Live' : 'Local'}
                size="small"
                data-testid="perf-data-source-chip"
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
              data-testid="perf-refresh-metrics"
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
            <ChartSkeleton height={290} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartSkeleton height={290} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ChartSkeleton height={330} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartSkeleton height={290} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartSkeleton height={290} />
          </Grid>
        </Grid>
      ) : (
      <Grid container spacing={2.5}>
        {/* ── Row 1: Performance KPI Gauges ──────────────────────── */}
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Sensitivity"
            value={sensitivityPct}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.success}
            trend={trends.sensitivityChange !== 0 ? Math.round(trends.sensitivityChange * 100) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Specificity"
            value={specificityPct}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.primary}
            trend={trends.specificityChange !== 0 ? Math.round(trends.specificityChange * 100) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="AUC-ROC"
            value={aucPct}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.secondary}
            trend={trends.aucRocChange !== 0 ? Math.round(trends.aucRocChange * 100) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="PPV"
            value={ppvPct}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.quaternary}
            trend={trends.ppvChange !== 0 ? Math.round(trends.ppvChange * 100) : undefined}
          />
        </Grid>

        {/* ── Row 2: Confidence analysis ─────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Confidence Distribution"
            subtitle="Score histogram across all analyses"
            height={290}
            timeRange={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          >
            {safeMetrics.confidenceHistogram.length > 0 ? (
              <ConfidenceHistogram data={safeMetrics.confidenceHistogram} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-histogram"
              >
                No confidence histogram data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Uncertainty vs Confidence"
            subtitle="Each dot = one analysis"
            height={290}
          >
            {safeMetrics.uncertaintyScatter.length > 0 ? (
              <UncertaintyScatter data={safeMetrics.uncertaintyScatter} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-scatter"
              >
                No uncertainty scatter data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 3: Temporal analysis (full width) ──────────────── */}
        <Grid size={{ xs: 12 }}>
          <MetricCard
            title="Confidence & Uncertainty Over Time"
            subtitle="Daily aggregates with high-uncertainty flagged cases"
            height={330}
            timeRange={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          >
            {safeMetrics.temporalConfidence.length > 0 ? (
              <TemporalConfidenceChart data={safeMetrics.temporalConfidence} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-temporal"
              >
                No temporal confidence data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 4: Concordance (full width) ────────────────────── */}
        <Grid size={{ xs: 12 }}>
          <MetricCard
            title="AI vs Radiologist Agreement"
            subtitle="Concordance rates by prediction category"
            height={290}
          >
            {safeMetrics.concordanceData.length > 0 ? (
              <ConcordanceChart data={safeMetrics.concordanceData} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-concordance"
              >
                No concordance data yet. Radiologist feedback is needed.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 5: Calibration Curve ───────────────────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Calibration Curve"
            subtitle="Predicted probability vs observed frequency"
            height={290}
          >
            {safeMetrics.calibrationCurve.length > 0 ? (
              <CalibrationCurve data={safeMetrics.calibrationCurve} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-calibration"
              >
                No calibration data yet. Requires radiologist feedback.
              </Typography>
            )}
          </MetricCard>
        </Grid>
      </Grid>
      )}
    </Box>
  );
};

export default PerformanceTab;
