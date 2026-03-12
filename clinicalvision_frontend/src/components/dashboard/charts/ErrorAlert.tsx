/**
 * ErrorAlert — Dismissible error banner for dashboard tabs
 *
 * Displays API errors to the user with a retry action.
 * Integrates with the dashboard theme for consistent styling.
 */

import React from 'react';
import { Alert, AlertTitle, Button, alpha } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDashboardTheme } from '../../../hooks/useDashboardTheme';

// ────────────────────────────────────────────────────────────────────────────

export interface ErrorAlertProps {
  /** Error message to display */
  message: string;
  /** Optional retry callback */
  onRetry?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry }) => {
  const dt = useDashboardTheme();

  return (
    <Alert
      severity="error"
      data-testid="error-alert"
      role="alert"
      action={
        onRetry ? (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            startIcon={<RefreshIcon />}
            data-testid="error-retry"
          >
            Retry
          </Button>
        ) : undefined
      }
      sx={{
        mb: 2,
        bgcolor: alpha(dt.danger, 0.1),
        color: dt.textPrimary,
        borderColor: alpha(dt.danger, 0.3),
        border: '1px solid',
        '& .MuiAlert-icon': { color: dt.danger },
        '& .MuiAlert-action': { alignItems: 'center' },
      }}
    >
      <AlertTitle sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
        Data Loading Error
      </AlertTitle>
      {message}
    </Alert>
  );
};

export default ErrorAlert;
