/**
 * DashboardStatCard — Shared stat card with unified gradient + shadow design.
 *
 * Use this component on EVERY page that shows stat summary cards so that
 * the visual language (diagonal gradient, top-accent bar, metallic shadow,
 * hover lift) is consistent project-wide.
 *
 * Props:
 *  - value    : headline number / string
 *  - label    : short title text below the value
 *  - color    : accent colour (used for icon bg, trend chip, top bar)
 *  - icon     : MUI icon element
 *  - subtitle?: change / secondary text under the label
 *  - trend?   : 'up' | 'down' | 'neutral'
 *  - onClick? : makes the card clickable (cursor + extra hover feedback)
 */

import React from 'react';
import { Card, CardContent, Stack, Box, Avatar, Chip, Typography, alpha } from '@mui/material';
import { useDashboardTheme } from '../../../hooks/useDashboardTheme';

export interface DashboardStatCardProps {
  value: string | number;
  label: string;
  color: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const TREND_LABEL: Record<string, string> = { up: '↑', down: '↓', neutral: '–' };

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  value,
  label,
  color,
  icon,
  subtitle,
  trend,
  onClick,
}) => {
  const dt = useDashboardTheme();

  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        background: dt.cardDiagonalGradient,
        border: `1px solid ${dt.cardBorder}`,
        borderRadius: `${dt.cardBorderRadius}px`,
        boxShadow: dt.cardShadow,
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
        },
        '&:hover': {
          borderColor: alpha(color, 0.3),
          transform: 'translateY(-3px)',
          boxShadow: dt.cardShadowHover,
          background: dt.cardDiagonalGradientHover,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Avatar
              sx={{
                background: `linear-gradient(135deg, ${alpha(color, 0.15)}, ${alpha(color, 0.08)})`,
                color,
                width: 44,
                height: 44,
                boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
                '& svg': { fontSize: 22 },
              }}
            >
              {icon}
            </Avatar>
            {trend && (
              <Chip
                label={TREND_LABEL[trend]}
                size="small"
                sx={{
                  backgroundColor: alpha(color, 0.1),
                  color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  height: 24,
                  borderRadius: 1.5,
                }}
              />
            )}
          </Box>

          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: dt.cardValueWeight,
                color: dt.textPrimary,
                mb: 0.25,
                fontSize: '1.75rem',
                fontFamily: dt.fontMono,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: dt.textPrimary,
                mb: subtitle ? 0.25 : 0,
                fontWeight: dt.cardTitleWeight,
                fontFamily: dt.fontBody,
                fontSize: dt.cardTitleSize,
              }}
            >
              {label}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: dt.textMuted,
                  fontFamily: dt.fontBody,
                  fontSize: dt.cardCaptionSize,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DashboardStatCard;
