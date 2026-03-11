/**
 * ModelIntelligenceTab — Model Intelligence Analytics
 *
 * Third sub-tab of AI Analytics. Provides deep model
 * internals visualisations:
 *
 *  Row 1 — 4 MetricCards (total versions, active model, avg review rate, top trigger)
 *  Row 2 — UncertaintyDecompositionChart (full width)
 *  Row 3 — ModelVersionComparison (full width)
 *  Row 4 — HumanReviewRateChart + ReviewTriggersPie
 *
 * Data flow: useModelIntelligenceMetrics → API → charts
 */

import React, { useState, useMemo } from 'react';
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
import MetricCard from '../charts/MetricCard';
import GaugeCard from '../charts/GaugeCard';
import UncertaintyDecompositionChart from '../charts/UncertaintyDecompositionChart';
import ModelVersionComparison from '../charts/ModelVersionComparison';
import HumanReviewRateChart from '../charts/HumanReviewRateChart';
import ReviewTriggersPie from '../charts/ReviewTriggersPie';
import { DASHBOARD_THEME } from '../charts/dashboardTheme';
import { useModelIntelligenceMetrics } from '../../../hooks/useMetrics';
import { EMPTY_MODEL_INTELLIGENCE_METRICS } from '../../../types/metrics.types';
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

const ModelIntelligenceTab: React.FC = () => {
  const [period, setPeriod] = useState<MetricsPeriod>('30d');

  const { data: metrics, isLoading, dataSource, refresh } =
    useModelIntelligenceMetrics({ period });

  const safeMetrics = { ...EMPTY_MODEL_INTELLIGENCE_METRICS, ...metrics };

  // ── Derived summary metrics ──────────────────────────────────────────────
  const summaryMetrics = useMemo(() => {
    const versions = safeMetrics.modelVersionComparison;
    const reviewRateData = safeMetrics.humanReviewRate;
    const triggers = safeMetrics.reviewTriggers;

    const totalVersions = versions.length;
    const activeVersion =
      versions.length > 0 ? versions[versions.length - 1].versionLabel : '—';

    // Latest review rate
    const latestRate =
      reviewRateData.length > 0
        ? reviewRateData[reviewRateData.length - 1].reviewRate
        : 0;

    // Top trigger
    const topTrigger =
      triggers.length > 0
        ? triggers.reduce((a, b) => (b.count > a.count ? b : a)).trigger
        : '—';

    return { totalVersions, activeVersion, latestRate, topTrigger };
  }, [safeMetrics]);

  return (
    <Box data-testid="model-intelligence-tab">
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
          Model Intelligence
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
              data-testid="intel-metrics-loading"
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
                data-testid="intel-data-source-chip"
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
              data-testid="intel-refresh-metrics"
              sx={{ color: DASHBOARD_THEME.neutral, '&:hover': { color: DASHBOARD_THEME.primary } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        {/* ── Row 1: Summary KPI cards ───────────────────────────── */}
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Model Versions"
            value={summaryMetrics.totalVersions}
            maxValue={Math.max(summaryMetrics.totalVersions, 10)}
            unit=""
            color={DASHBOARD_THEME.primary}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricCard title="Active Model" height={140}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: DASHBOARD_THEME.fontHeading,
                color: '#E5E7EB',
                fontWeight: 700,
                textAlign: 'center',
                mt: 2,
              }}
              data-testid="active-model-version"
            >
              {summaryMetrics.activeVersion}
            </Typography>
          </MetricCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GaugeCard
            label="Human Review Rate"
            value={Math.round(summaryMetrics.latestRate * 100)}
            maxValue={100}
            unit="%"
            color={DASHBOARD_THEME.warning}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricCard title="Top Review Trigger" height={140}>
            <Typography
              variant="body1"
              sx={{
                fontFamily: DASHBOARD_THEME.fontHeading,
                color: DASHBOARD_THEME.tertiary,
                fontWeight: 600,
                textAlign: 'center',
                mt: 2,
                textTransform: 'capitalize',
              }}
              data-testid="top-review-trigger"
            >
              {summaryMetrics.topTrigger.replace(/_/g, ' ')}
            </Typography>
          </MetricCard>
        </Grid>

        {/* ── Row 2: Uncertainty decomposition (full width) ──────── */}
        <Grid size={{ xs: 12 }}>
          <MetricCard
            title="Uncertainty Decomposition Over Time"
            subtitle="Stacked epistemic & aleatoric uncertainty trends"
            height={330}
            timeRange={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          >
            {safeMetrics.uncertaintyDecomposition.length > 0 ? (
              <UncertaintyDecompositionChart data={safeMetrics.uncertaintyDecomposition} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-decomposition"
              >
                No uncertainty decomposition data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 3: Model version comparison (full width) ───────── */}
        <Grid size={{ xs: 12 }}>
          <MetricCard
            title="Model Version Comparison"
            subtitle="Performance metrics across deployed versions"
            height={330}
          >
            {safeMetrics.modelVersionComparison.length > 0 ? (
              <ModelVersionComparison data={safeMetrics.modelVersionComparison} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-version-comparison"
              >
                No model version data available.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        {/* ── Row 4: Review rate + trigger breakdown ─────────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Human Review Rate Over Time"
            subtitle="Proportion of cases flagged for expert review"
            height={290}
            timeRange={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          >
            {safeMetrics.humanReviewRate.length > 0 ? (
              <HumanReviewRateChart data={safeMetrics.humanReviewRate} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-review-rate"
              >
                No review rate data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <MetricCard
            title="Review Trigger Breakdown"
            subtitle="Why cases are flagged for human review"
            height={290}
          >
            {safeMetrics.reviewTriggers.length > 0 ? (
              <ReviewTriggersPie data={safeMetrics.reviewTriggers} />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: DASHBOARD_THEME.neutral, textAlign: 'center' }}
                data-testid="empty-triggers"
              >
                No review trigger data yet.
              </Typography>
            )}
          </MetricCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelIntelligenceTab;
