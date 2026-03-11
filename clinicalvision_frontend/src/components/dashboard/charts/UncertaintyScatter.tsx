/**
 * UncertaintyScatter — Scatter chart: confidence vs epistemic uncertainty
 *
 * Each dot represents one analysis. Position reveals model behaviour:
 *  - Top-left quadrant (low confidence, high uncertainty) = needs review
 *  - Bottom-right (high confidence, low uncertainty) = reliable
 *
 * Dot colour encodes risk level; dot size encodes processing time.
 * Capped at 200 points for performance.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DASHBOARD_THEME, RISK_COLORS, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { UncertaintyScatterPoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface UncertaintyScatterProps {
  data: UncertaintyScatterPoint[];
}

// ────────────────────────────────────────────────────────────────────────────

/** Group points by risk level for colour-coded scatter series. */
function groupByRisk(data: UncertaintyScatterPoint[]) {
  const groups: Record<string, UncertaintyScatterPoint[]> = {
    low: [],
    moderate: [],
    high: [],
  };
  for (const pt of data) {
    const key = pt.riskLevel in groups ? pt.riskLevel : 'low';
    groups[key].push(pt);
  }
  return groups;
}

// ────────────────────────────────────────────────────────────────────────────

const UncertaintyScatter: React.FC<UncertaintyScatterProps> = ({ data }) => {
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
          No uncertainty data available.
        </Typography>
      </Box>
    );
  }

  const groups = groupByRisk(data);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          type="number"
          dataKey="confidence"
          name="Confidence"
          domain={[0, 1]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          label={{
            value: 'Confidence',
            position: 'insideBottom',
            offset: -2,
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <YAxis
          type="number"
          dataKey="uncertainty"
          name="Uncertainty"
          domain={[0, 'auto']}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          label={{
            value: 'Uncertainty',
            angle: -90,
            position: 'insideLeft',
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <ZAxis
          type="number"
          dataKey="processingTimeMs"
          range={[20, 120]}
          name="Latency"
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'Confidence') return [`${(value * 100).toFixed(1)}%`, name];
            if (name === 'Uncertainty') return [value.toFixed(3), name];
            if (name === 'Latency') return [`${value.toFixed(0)} ms`, name];
            return [value, name];
          }}
        />

        {/* Threshold reference lines */}
        <ReferenceLine
          x={0.5}
          stroke={DASHBOARD_THEME.warning}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />
        <ReferenceLine
          y={0.3}
          stroke={DASHBOARD_THEME.danger}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />

        {/* Risk-grouped scatter series */}
        {groups.low.length > 0 && (
          <Scatter
            name="Low Risk"
            data={groups.low}
            fill={RISK_COLORS.low}
            fillOpacity={0.7}
          />
        )}
        {groups.moderate.length > 0 && (
          <Scatter
            name="Moderate Risk"
            data={groups.moderate}
            fill={RISK_COLORS.moderate}
            fillOpacity={0.7}
          />
        )}
        {groups.high.length > 0 && (
          <Scatter
            name="High Risk"
            data={groups.high}
            fill={RISK_COLORS.high}
            fillOpacity={0.7}
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default UncertaintyScatter;
