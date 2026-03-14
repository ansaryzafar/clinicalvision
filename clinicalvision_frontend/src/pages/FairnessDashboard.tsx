/**
 * ClinicalVision AI Fairness Dashboard
 * 
 * Displays AI fairness metrics, compliance status, and alerts.
 * Fast loading with pre-computed backend data.
 * Matches application theme and styling conventions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh,
  Security,
  Assessment,
  Groups,
  TrendingUp,
  Gavel,
} from '@mui/icons-material';
import { api, FairnessDashboardResponse } from '../services/api';
import DashboardStatCard from '../components/dashboard/cards/DashboardStatCard';

// Get status color based on theme
const getStatusColor = (status: string, theme: any): string => {
  switch (status) {
    case 'compliant':
      return theme.palette.success.main;
    case 'conditional':
      return theme.palette.warning.main;
    case 'non_compliant':
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
};

const getSeverityColor = (severity: string, theme: any): string => {
  switch (severity) {
    case 'info':
      return theme.palette.info.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'critical':
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

// Loading skeleton component for fast perceived loading
const DashboardSkeleton: React.FC = () => (
  <Container maxWidth="xl" sx={{ py: 3 }}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={300} height={20} />
        </Box>
      </Box>
    </Box>
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
    <Skeleton variant="rounded" height={100} sx={{ mb: 3, borderRadius: 2 }} />
    <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
  </Container>
);

const FairnessDashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<FairnessDashboardResponse | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('[Fairness] Fetching dashboard data...');
      
      // Use the authenticated API client (includes JWT token via interceptors)
      const data = await api.getFairnessDashboard();
      
      console.log('[Fairness] Data received:', data.overall_status);
      setDashboard(data);
    } catch (err: any) {
      console.error('[Fairness] Error details:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load fairness data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      if (mounted) {
        await fetchData();
      }
    };
    
    load();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Use the authenticated API client for alert acknowledgement
      await api.acknowledgeFairnessAlert(alertId);
      
      fetchData(true); // Refresh with indicator
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const getStatusIcon = (status: string) => {
    const color = getStatusColor(status, theme);
    switch (status) {
      case 'compliant':
        return <CheckCircle sx={{ color }} />;
      case 'conditional':
        return <Warning sx={{ color }} />;
      default:
        return <ErrorIcon sx={{ color }} />;
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Show skeleton during initial load
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.05),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Unable to Load Fairness Data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => fetchData(false)}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!dashboard) return null;

  const statusColor = getStatusColor(dashboard.overall_status, theme);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 1.5 }}>
      <Container maxWidth="xl">
      {/* Refresh indicator */}
      {refreshing && (
        <LinearProgress 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 9999 
          }} 
        />
      )}

      {/* F1: Demo Data Disclosure Banner */}
      {dashboard.metadata?.data_source === 'demo_fallback' && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 1, 
            borderRadius: 2,
            border: `1px solid ${theme.palette.warning.main}`,
            '& .MuiAlert-icon': { alignItems: 'center' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Demonstration Data</AlertTitle>
          The metrics below are pre-computed demonstration values and do NOT reflect
          actual model performance or real patient data. Real fairness metrics require
          sufficient prediction history with radiologist-confirmed ground truth labels.
          {dashboard.metadata?.reason && (
            <Box component="span" sx={{ display: 'block', mt: 1 }}>
              <strong>Reason:</strong> {dashboard.metadata.reason}
            </Box>
          )}
        </Alert>
      )}

      {/* Page Header — Unified gradient banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 1,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Security sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 0.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              >
                AI Fairness Monitor
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.95)',
                }}
              >
                Model: {dashboard.model_version} • Last evaluated: {dashboard.last_evaluation && dashboard.metadata?.data_source !== 'demo_fallback'
                  ? new Date(dashboard.last_evaluation).toLocaleString()
                  : dashboard.metadata?.data_source === 'demo_fallback'
                    ? 'N/A — Demo Data'
                    : dashboard.last_evaluation
                      ? new Date(dashboard.last_evaluation).toLocaleString()
                      : 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {/* Overall Status */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            value={dashboard.overall_status.replace('_', ' ').toUpperCase()}
            label="Overall Status"
            color={statusColor}
            icon={getStatusIcon(dashboard.overall_status)}
          />
        </Grid>

        {/* Compliance Score */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            value={`${dashboard.summary.compliance_score}%`}
            label="Compliance Score"
            color={theme.palette.primary.main}
            icon={<TrendingUp />}
            trend={dashboard.summary.compliance_score >= 80 ? 'up' : dashboard.summary.compliance_score >= 60 ? 'neutral' : 'down'}
          />
        </Grid>

        {/* Active Alerts */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            value={dashboard.summary.total_alerts}
            label="Active Alerts"
            color={theme.palette.warning.main}
            icon={<Warning />}
            subtitle={dashboard.summary.critical_alerts > 0 ? `${dashboard.summary.critical_alerts} Critical` : undefined}
            trend={dashboard.summary.total_alerts > 0 ? 'down' : 'up'}
          />
        </Grid>

        {/* Attributes Analyzed */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            value={dashboard.summary.attributes_analyzed}
            label="Attributes Analyzed"
            color={theme.palette.info.main}
            icon={<Groups />}
            subtitle="Protected groups"
          />
        </Grid>
      </Grid>

      {/* Compliance Breakdown */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 1.5, 
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Gavel sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Regulatory Compliance
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {[
            { label: 'FDA Guidance', status: dashboard.compliance.fda_status },
            { label: 'EU AI Act', status: dashboard.compliance.eu_ai_act_status },
            { label: 'NIST AI RMF', status: dashboard.compliance.nist_rmf_status },
          ].map(({ label, status }) => (
            <Grid size={{ xs: 12, sm: 4 }} key={label}>
              <Paper
                variant="outlined"
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  borderColor: alpha(getStatusColor(status, theme), 0.5),
                  bgcolor: alpha(getStatusColor(status, theme), 0.05),
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  {getStatusIcon(status)}
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {label}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={600}
                      sx={{ color: getStatusColor(status, theme), textTransform: 'capitalize' }}
                    >
                      {status.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper 
        sx={{ 
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{ 
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            px: 2,
          }}
        >
          <Tab 
            icon={<Warning />} 
            label="Alerts" 
            iconPosition="start" 
            sx={{ fontWeight: 500 }}
          />
          <Tab 
            icon={<Groups />} 
            label="Subgroups" 
            iconPosition="start"
            sx={{ fontWeight: 500 }}
          />
          <Tab 
            icon={<Assessment />} 
            label="Metrics" 
            iconPosition="start"
            sx={{ fontWeight: 500 }}
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Alerts Tab */}
          <TabPanel value={tabValue} index={0}>
            {dashboard.alerts.length === 0 ? (
              <Alert 
                severity="success" 
                icon={<CheckCircle />}
                sx={{ 
                  borderRadius: 2,
                  '& .MuiAlert-icon': { alignItems: 'center' },
                }}
              >
                <Typography fontWeight={500}>
                  No active alerts. All fairness metrics are within acceptable thresholds.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Attribute</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Disparity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.alerts.map((alert) => (
                      <TableRow 
                        key={alert.alert_id}
                        sx={{
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                          },
                        }}
                      >
                        <TableCell>
                          <Chip
                            label={alert.severity.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: getSeverityColor(alert.severity, theme),
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {alert.attribute.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography 
                              variant="body2" 
                              fontWeight={600}
                              color={alert.disparity > alert.threshold ? 'error.main' : 'text.primary'}
                            >
                              {formatPercent(alert.disparity)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              threshold: {formatPercent(alert.threshold)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAcknowledge(alert.alert_id)}
                            sx={{ textTransform: 'none' }}
                          >
                            Acknowledge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Subgroups Tab */}
          <TabPanel value={tabValue} index={1}>
            {dashboard.attributes.length === 0 ? (
              <Alert
                severity="info"
                icon={<Groups />}
                sx={{ borderRadius: 2 }}
              >
                <Typography fontWeight={500}>
                  No subgroup data available. Fairness subgroup analysis requires sufficient
                  prediction history with demographic metadata (age, breast density, imaging device).
                </Typography>
              </Alert>
            ) : dashboard.attributes.map((attr) => (
              <Box key={attr.attribute} mb={3}>
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  {getStatusIcon(attr.status)}
                  <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {attr.attribute.replace(/_/g, ' ')}
                  </Typography>
                  <Chip
                    label={`Max disparity: ${formatPercent(attr.max_disparity)}`}
                    size="small"
                    variant="outlined"
                    color={attr.max_disparity > 0.1 ? 'error' : 'success'}
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
                <TableContainer 
                  component={Paper} 
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Subgroup</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Samples</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Sensitivity</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Specificity</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>AUC</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attr.groups.map((group) => (
                        <TableRow 
                          key={group.group_name}
                          sx={{
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                            },
                          }}
                        >
                          <TableCell sx={{ textTransform: 'capitalize' }}>
                            {group.group_name.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {group.n_samples.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              color={group.sensitivity < 0.8 ? 'warning.main' : 'text.primary'}
                            >
                              {formatPercent(group.sensitivity)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              color={group.specificity < 0.8 ? 'warning.main' : 'text.primary'}
                            >
                              {formatPercent(group.specificity)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              color={group.auc < 0.85 ? 'warning.main' : 'success.main'}
                            >
                              {formatPercent(group.auc)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
            }
          </TabPanel>

          {/* Metrics Tab */}
          <TabPanel value={tabValue} index={2}>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Typography variant="body2">
                Fairness metrics are calculated using <strong>sensitivity parity</strong>, <strong>specificity parity</strong>, and <strong>AUC parity</strong> across protected attributes. 
                A disparity threshold of <strong>10%</strong> is used per FDA guidance for AI/ML medical devices.
              </Typography>
            </Alert>
            {dashboard.attributes.length === 0 ? (
              <Alert
                severity="info"
                icon={<Assessment />}
                sx={{ borderRadius: 2 }}
              >
                <Typography fontWeight={500}>
                  No attribute metrics available. Comprehensive fairness metrics require
                  predictions with demographic attributes and ground truth labels.
                </Typography>
              </Alert>
            ) : (
            <Grid container spacing={3}>
              {dashboard.attributes.map((attr) => (
                <Grid size={{ xs: 12, md: 4 }} key={attr.attribute}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4],
                      },
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {getStatusIcon(attr.status)}
                        <Typography variant="subtitle1" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {attr.attribute.replace(/_/g, ' ')}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">Status</Typography>
                          <Chip
                            label={attr.status.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: alpha(getStatusColor(attr.status, theme), 0.15),
                              color: getStatusColor(attr.status, theme),
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">Groups Analyzed</Typography>
                          <Typography variant="body2" fontWeight={600}>{attr.n_groups}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">Max Disparity</Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ 
                              color: attr.max_disparity > 0.1 
                                ? theme.palette.error.main 
                                : theme.palette.success.main 
                            }}
                          >
                            {formatPercent(attr.max_disparity)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Container>
    </Box>
  );
};

export default FairnessDashboard;
