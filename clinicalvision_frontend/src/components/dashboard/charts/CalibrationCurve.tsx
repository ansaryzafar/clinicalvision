/**
 * CalibrationCurve — Line chart showing predicted vs observed probabilities
 *
 * Plots calibration points with a perfect-calibration diagonal reference line.
 * A well-calibrated model should track close to the y = x diagonal.
 *
 * Points above the diagonal → model under-predicts (actual > predicted)
 * Points below the diagonal → model over-predicts (actual < predicted)
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME, CHART_TOOLTIP_STYLE } from './dashboardTheme';
import type { CalibrationPoint } from '../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────

export interface CalibrationCurveProps {
  data: CalibrationPoint[];
}

// ────────────────────────────────────────────────────────────────────────────

const CalibrationCurve: React.FC<CalibrationCurveProps> = ({ data }) => {
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
          No calibration data available. Requires radiologist feedback.
        </Typography>
      </Box>
    );
  }

  // Build diagonal reference points (perfect calibration line y=x)
  const diagonalData = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        role="img"
        aria-label="Calibration curve: predicted probability vs observed frequency"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_THEME.gridStroke} />
        <XAxis
          dataKey="predictedProbability"
          type="number"
          domain={[0, 1]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          label={{
            value: 'Predicted Probability',
            position: 'insideBottom',
            offset: -2,
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <YAxis
          dataKey="observedFrequency"
          type="number"
          domain={[0, 1]}
          stroke={DASHBOARD_THEME.axisStroke}
          fontSize={DASHBOARD_THEME.axisFontSize}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          label={{
            value: 'Observed Frequency',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            fill: DASHBOARD_THEME.neutral,
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number, name: string) => {
            const label = name === 'observedFrequency' ? 'Observed' : name;
            return [`${(value * 100).toFixed(1)}%`, label];
          }}
          labelFormatter={(label: number) => `Predicted: ${(label * 100).toFixed(1)}%`}
        />

        {/* Perfect calibration diagonal (y = x) */}
        <ReferenceLine
          segment={diagonalData}
          stroke={DASHBOARD_THEME.neutral}
          strokeDasharray="5 5"
          strokeWidth={1.5}
        />

        {/* Actual calibration curve */}
        <Line
          type="monotone"
          dataKey="observedFrequency"
          stroke={DASHBOARD_THEME.primary}
          strokeWidth={2.5}
          dot={{
            r: 4,
            fill: DASHBOARD_THEME.primary,
            stroke: DASHBOARD_THEME.cardBackground,
            strokeWidth: 2,
          }}
          activeDot={{ r: 6 }}
          name="observedFrequency"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CalibrationCurve;
