/**
 * PredictionDonut — Donut chart showing benign/malignant ratio
 * with metallic gradient fills for a polished, clinical look.
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardTheme } from '../../../hooks/useDashboardTheme';

export interface PredictionDonutProps {
  benign: number;
  malignant: number;
}

const PredictionDonut: React.FC<PredictionDonutProps> = ({ benign, malignant }) => {
  const dt = useDashboardTheme();
  const total = benign + malignant;

  if (total === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
        <Typography variant="body2" sx={{ color: dt.neutral }}>
          No prediction data available yet.
        </Typography>
      </Box>
    );
  }

  const benignPct = Math.round((benign / total) * 100);
  const malignantPct = 100 - benignPct;

  const data = [
    { name: 'Benign', value: benign, gradId: 'donut-metallic-success' },
    { name: 'Malignant', value: malignant, gradId: 'donut-metallic-danger' },
  ];

  // Metallic gradient stops
  const [sLight, sMid, sDark] = dt.metallicGradient;
  const [dLight, dMid, dDark] = dt.metallicGradientDanger;

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <defs>
            <linearGradient id="donut-metallic-success" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={sLight} />
              <stop offset="50%" stopColor={sMid} />
              <stop offset="100%" stopColor={sDark} />
            </linearGradient>
            <linearGradient id="donut-metallic-danger" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={dLight} />
              <stop offset="50%" stopColor={dMid} />
              <stop offset="100%" stopColor={dDark} />
            </linearGradient>
          </defs>
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
              <Cell key={i} fill={`url(#${entry.gradId})`} />
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
          sx={{ fontFamily: dt.fontMono, color: dt.textPrimary, fontWeight: dt.cardValueWeight, lineHeight: 1 }}
        >
          {benignPct}%
        </Typography>
        <Typography variant="caption" sx={{ color: dt.neutral, fontSize: dt.cardCaptionSize }}>
          Benign
        </Typography>
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: -1 }}>
        {data.map((d, idx) => (
          <Stack key={d.name} direction="row" spacing={0.5} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: idx === 0 ? dt.logoGradient : `linear-gradient(135deg, ${dLight}, ${dDark})`,
              }}
            />
            <Typography variant="caption" sx={{ color: dt.textSecondary, fontSize: dt.cardCaptionSize }}>
              {d.name} ({d.name === 'Benign' ? benignPct : malignantPct}%)
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default PredictionDonut;
