/**
 * DemoCasePicker — Displays available demo cases as selectable cards
 *
 * Used in:
 *  - LandingPage demo section
 *  - Upload empty-state "Try sample data" prompt
 *
 * Props:
 *  - cases: DemoCaseSummary[] — list of available demo cases
 *  - onSelect: (caseId: string) => void — called when user picks a case
 *  - loading?: boolean — shows skeleton/progress when true
 *  - compact?: boolean — uses smaller card layout for inline use
 */

import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as EasyIcon,
  TrendingUp as IntermediateIcon,
  WarningAmber as AdvancedIcon,
  Visibility as ViewsIcon,
} from '@mui/icons-material';

import { DemoCaseSummary } from '../../services/demoDataService';

// ============================================================================
// Constants — LUNIT design tokens
// ============================================================================

const DIFFICULTY_CONFIG = {
  Easy: { color: '#4caf50', icon: <EasyIcon fontSize="small" />, bgColor: '#e8f5e9' },
  Intermediate: { color: '#ff9800', icon: <IntermediateIcon fontSize="small" />, bgColor: '#fff3e0' },
  Advanced: { color: '#f44336', icon: <AdvancedIcon fontSize="small" />, bgColor: '#ffebee' },
} as const;

// ============================================================================
// Props
// ============================================================================

export interface DemoCasePickerProps {
  cases: DemoCaseSummary[];
  onSelect: (caseId: string) => void;
  loading?: boolean;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const DemoCasePicker: React.FC<DemoCasePickerProps> = ({
  cases,
  onSelect,
  loading = false,
  compact = false,
}) => {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          py: compact ? 2 : 4,
        }}
      >
        <CircularProgress size={compact ? 24 : 40} />
        <Typography variant="body2" color="text.secondary">
          Loading demo cases...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{
          fontWeight: 600,
          mb: compact ? 1.5 : 2,
          fontFamily: '"Inter", "Pretendard", sans-serif',
        }}
      >
        Try with Sample Cases
      </Typography>

      {cases.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No demo cases available.
        </Typography>
      ) : (
        <Grid container spacing={compact ? 1 : 2}>
          {cases.map((demoCase) => {
            const diffConfig = DIFFICULTY_CONFIG[demoCase.difficulty] || DIFFICULTY_CONFIG.Easy;

            return (
              <Grid item size={{ xs: 12, sm: compact ? 12 : 4 }} key={demoCase.id}>
                <Card
                  elevation={compact ? 0 : 1}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: compact ? 1 : 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: compact ? 1 : 3,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => onSelect(demoCase.id)}
                    sx={{ p: compact ? 1 : 0 }}
                  >
                    <CardContent sx={{ p: compact ? 1 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
                      {/* Case Label */}
                      <Typography
                        variant={compact ? 'body2' : 'subtitle1'}
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          fontFamily: '"Inter", "Pretendard", sans-serif',
                          lineHeight: 1.3,
                        }}
                      >
                        {demoCase.label}
                      </Typography>

                      {/* Difficulty + Views Row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Difficulty Chip */}
                        <Chip
                          icon={diffConfig.icon}
                          label={demoCase.difficulty}
                          size="small"
                          sx={{
                            backgroundColor: diffConfig.bgColor,
                            color: diffConfig.color,
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            height: compact ? 22 : 26,
                          }}
                        />

                        {/* Views Count */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: 'text.secondary',
                          }}
                        >
                          <ViewsIcon sx={{ fontSize: '1rem' }} />
                          <Typography variant="caption">
                            {demoCase.views} views
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default DemoCasePicker;
