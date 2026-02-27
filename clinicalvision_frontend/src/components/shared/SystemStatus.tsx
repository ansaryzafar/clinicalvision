/**
 * SystemStatus Component
 * 
 * Real-time system status indicator following HCI best practices:
 * - Nielsen Heuristic #1: Visibility of system status
 * - Shows backend health, model status, processing queue
 * - Reduces user anxiety during long operations
 * - Provides transparency about system state
 * 
 * Based on research from:
 * - VoxLogicA UI (Medical Image Analysis Interface)
 * - Predictive HCI Modeling for Digital Health Systems
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Popover,
  Stack,
  Chip,
  Divider,
  alpha,
  styled,
  CircularProgress,
} from '@mui/material';
import {
  FiberManualRecord,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  Cloud,
  Memory,
  Psychology,
  Speed,
  ExpandMore,
} from '@mui/icons-material';

// Status types
type StatusType = 'healthy' | 'degraded' | 'offline' | 'checking';

interface SystemStatusData {
  backend: StatusType;
  model: StatusType;
  database: StatusType;
  latency: number | null;
  modelVersion: string | null;
  lastChecked: Date | null;
}

// Status configuration
const statusConfig: Record<StatusType, {
  color: string;
  bgColor: string;
  label: string;
  icon: React.ReactElement;
}> = {
  healthy: {
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.12)',
    label: 'Operational',
    icon: <CheckCircle sx={{ fontSize: 16 }} />,
  },
  degraded: {
    color: '#FFA726',
    bgColor: 'rgba(255, 167, 38, 0.12)',
    label: 'Degraded',
    icon: <Warning sx={{ fontSize: 16 }} />,
  },
  offline: {
    color: '#EF5350',
    bgColor: 'rgba(239, 83, 80, 0.12)',
    label: 'Offline',
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
  },
  checking: {
    color: '#9E9E9E',
    bgColor: 'rgba(158, 158, 158, 0.12)',
    label: 'Checking...',
    icon: <CircularProgress size={14} sx={{ color: '#9E9E9E' }} />,
  },
};

// Styled components
const StatusDot = styled(FiberManualRecord, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: StatusType }>(({ status }) => ({
  fontSize: 12,
  color: statusConfig[status].color,
  animation: status === 'healthy' ? 'pulse 2s infinite' : 'none',
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
}));

const StatusRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5),
  borderRadius: 8,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

interface SystemStatusProps {
  /** Variant: minimal shows just a dot, full shows expandable panel */
  variant?: 'minimal' | 'compact' | 'full';
  /** Polling interval in ms (0 to disable) */
  pollingInterval?: number;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Callback when status changes */
  onStatusChange?: (status: SystemStatusData) => void;
}

/**
 * SystemStatus Component
 * 
 * Displays real-time system health status with expandable details
 */
export const SystemStatus: React.FC<SystemStatusProps> = ({
  variant = 'compact',
  pollingInterval = 30000, // 30 seconds
  showRefresh = true,
  onStatusChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState<SystemStatusData>({
    backend: 'checking',
    model: 'checking',
    database: 'checking',
    latency: null,
    modelVersion: null,
    lastChecked: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsRefreshing(true);
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('/health/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const healthResponse = await response.json();
        const latency = Date.now() - startTime;
      
        const newStatus: SystemStatusData = {
          backend: healthResponse.status === 'healthy' ? 'healthy' : 'degraded',
          model: healthResponse.model_loaded ? 'healthy' : 'offline',
          database: 'healthy', // Assume healthy if backend responds
          latency,
          modelVersion: healthResponse.version || null,
          lastChecked: new Date(),
        };
        
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        setIsRefreshing(false);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        // Retry on network errors with backoff
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    
    // All retries failed
    console.warn('Health check failed after retries:', lastError?.message);
    const offlineStatus: SystemStatusData = {
      backend: 'offline',
      model: 'offline',
      database: 'offline',
      latency: null,
      modelVersion: null,
      lastChecked: new Date(),
    };
    setStatus(offlineStatus);
    if (onStatusChange) {
      onStatusChange(offlineStatus);
    }
    setIsRefreshing(false);
  }, [onStatusChange]);

  // Initial check and polling
  useEffect(() => {
    checkStatus();
    
    if (pollingInterval > 0) {
      const interval = setInterval(checkStatus, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [checkStatus, pollingInterval]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (variant === 'minimal') return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getOverallStatus = (): StatusType => {
    if (status.backend === 'checking') return 'checking';
    if (status.backend === 'offline' || status.model === 'offline') return 'offline';
    if (status.backend === 'degraded' || status.model === 'degraded') return 'degraded';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();
  const config = statusConfig[overallStatus];
  const open = Boolean(anchorEl);

  // Minimal variant - just a colored dot
  if (variant === 'minimal') {
    return (
      <Tooltip title={`System: ${config.label}`} arrow>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StatusDot status={overallStatus} />
        </Box>
      </Tooltip>
    );
  }

  // Compact variant - dot with label, clickable
  const compactContent = (
    <Tooltip title="Click for details" arrow>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          backgroundColor: config.bgColor,
          border: `1px solid ${alpha(config.color, 0.3)}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: alpha(config.color, 0.15),
            transform: 'translateY(-1px)',
          },
        }}
      >
        <StatusDot status={overallStatus} />
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: config.color }}
        >
          {config.label}
        </Typography>
        <ExpandMore 
          sx={{ 
            fontSize: 16, 
            color: config.color,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }} 
        />
      </Box>
    </Tooltip>
  );

  // Status details popover
  const detailsContent = (
    <Box sx={{ p: 2, width: 300 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          System Status
        </Typography>
        {showRefresh && (
          <IconButton 
            size="small" 
            onClick={checkStatus}
            disabled={isRefreshing}
          >
            <Refresh 
              sx={{ 
                fontSize: 18,
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
              }} 
            />
          </IconButton>
        )}
      </Stack>

      <Stack spacing={1}>
        {/* Backend Status */}
        <StatusRow>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Cloud sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2">API Server</Typography>
          </Stack>
          <Chip
            icon={statusConfig[status.backend].icon}
            label={statusConfig[status.backend].label}
            size="small"
            sx={{
              backgroundColor: statusConfig[status.backend].bgColor,
              color: statusConfig[status.backend].color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
            }}
          />
        </StatusRow>

        {/* Model Status */}
        <StatusRow>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Psychology sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2">AI Model</Typography>
          </Stack>
          <Chip
            icon={statusConfig[status.model].icon}
            label={statusConfig[status.model].label}
            size="small"
            sx={{
              backgroundColor: statusConfig[status.model].bgColor,
              color: statusConfig[status.model].color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
            }}
          />
        </StatusRow>

        {/* Latency */}
        {status.latency !== null && (
          <StatusRow>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Speed sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2">Response Time</Typography>
            </Stack>
            <Typography 
              variant="caption" 
              fontWeight={600}
              sx={{ 
                color: status.latency < 200 ? '#4CAF50' : status.latency < 500 ? '#FFA726' : '#EF5350' 
              }}
            >
              {status.latency}ms
            </Typography>
          </StatusRow>
        )}

        {/* Model Version */}
        {status.modelVersion && (
          <StatusRow>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Memory sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2">Model Version</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {status.modelVersion}
            </Typography>
          </StatusRow>
        )}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Last Updated */}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Last checked: {status.lastChecked?.toLocaleTimeString() || 'Never'}
      </Typography>
    </Box>
  );

  return (
    <>
      {compactContent}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {detailsContent}
      </Popover>
    </>
  );
};

/**
 * Simple status indicator for inline use
 */
export const StatusIndicator: React.FC<{
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium';
}> = ({ status, label, size = 'small' }) => {
  const config = statusConfig[status];
  
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <StatusDot status={status} sx={{ fontSize: size === 'small' ? 10 : 14 }} />
      {label && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: config.color,
            fontWeight: 500,
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
          }}
        >
          {label || config.label}
        </Typography>
      )}
    </Stack>
  );
};

export default SystemStatus;
