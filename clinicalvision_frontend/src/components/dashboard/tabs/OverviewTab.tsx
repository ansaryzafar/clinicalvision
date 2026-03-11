/**
 * OverviewTab — AI Analytics Overview
 *
 * First tab of the AI Analytics section.  Displays KPI gauges
 * and chart placeholders wired to the local metrics aggregator.
 *
 * Layout (responsive):
 *  Row 1 — 4 radial KPI gauges (xs=6, md=3)
 *  Row 2 — 2 primary chart cards (xs=12, md=6)
 *  Row 3 — 3 secondary chart cards (xs=12, md=4)
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  alpha,
} from '@mui/material';
import GaugeCard from '../charts/GaugeCard';
import MetricCard from '../charts/MetricCard';
import ConfidenceTrendChart from '../charts/ConfidenceTrendChart';
import PredictionDonut from '../charts/PredictionDonut';
import BiRadsBarChart from '../charts/BiRadsBarChart';
import RiskDistributionChart from '../charts/RiskDistributionChart';
import LatencyPercentilesChart from '../charts/LatencyPercentilesChart';
import { DASHBOARD_THEME } from '../charts/dashboardTheme';
import { aggregateLocalMetrics } from '../../../services/localMetricsAggregator';
import { EMPTY_OVERVIEW_METRICS } from '../../../types/metrics.types';
import type { MetricsPeriod, OverviewMetrics } from '../../../types/metrics.types';

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

  // Aggregate metrics from local session store
  const metrics: OverviewMetrics = useMemo(() => {
    try {
      return aggregateLocalMetrics(period);
    } catch {
      return EMPTY_OVERVIEW_METRICS;
    }
  }, [period]);

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
      </Stack>

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
      </Grid>
    </Box>
  );
};

export default OverviewTab;
