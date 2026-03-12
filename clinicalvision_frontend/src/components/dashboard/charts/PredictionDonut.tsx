/**
 * PredictionDonut — Donut chart showing benign/malignant ratio
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { DASHBOARD_THEME } from './dashboardTheme';

export interface PredictionDonutProps {
  benign: number;
  malignant: number;
}

const PredictionDonut: React.FC<PredictionDonutProps> = ({ benign, malignant }) => {
  const total = benign + malignant;

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.neutral }}>
          No prediction data available yet.
        </Typography>
      </Box>
    );
  }

  const benignPct = Math.round((benign / total) * 100);
  const malignantPct = 100 - benignPct;

  const data = [
    { name: 'Benign', value: benign, color: DASHBOARD_THEME.success },
    { name: 'Malignant', value: malignant, color: DASHBOARD_THEME.danger },
  ];

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label */}
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontFamily: DASHBOARD_THEME.fontMono, color: DASHBOARD_THEME.textPrimary, fontWeight: 700, lineHeight: 1 }}
        >
          {benignPct}%
        </Typography>
        <Typography variant="caption" sx={{ color: DASHBOARD_THEME.neutral, fontSize: '0.65rem' }}>
          Benign
        </Typography>
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: -1 }}>
        {data.map((d) => (
          <Stack key={d.name} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
            <Typography variant="caption" sx={{ color: DASHBOARD_THEME.textSecondary, fontSize: '0.7rem' }}>
              {d.name} ({d.name === 'Benign' ? benignPct : malignantPct}%)
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default PredictionDonut;
