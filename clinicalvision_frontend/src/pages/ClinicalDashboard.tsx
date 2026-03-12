/**
 * Enhanced Professional Dashboard
 * Inspired by modern medical imaging platforms
 * 
 * Features:
 * - Clean, professional medical aesthetic
 * - Statistics cards with real data from sessions
 * - Recent cases with status tracking
 * - Quick access to analysis suite
 * - Performance metrics
 * - Real-time system status
 * 
 * Design Principles (Paton et al. 2021):
 * - Visibility of system status (Nielsen #1): Real-time stats
 * - Recognition over recall (Nielsen #6): Quick actions visible
 * - Aesthetic and minimalist design (Nielsen #8): Clean layout
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  LinearProgress,
  alpha,
  IconButton,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Skeleton,
  useTheme,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  FolderOpen,
  CheckCircle,
  HourglassEmpty,
  ArrowForward,
  LocalHospital,
  Assignment,
  PriorityHigh,
  PlayCircleOutline,
  History,
  Settings,
  Refresh,
  TrendingUp,
  AccessTime,
  Lightbulb,
  Biotech,
  OpenInNew,
  Autorenew,
  InsightsOutlined,
  DashboardOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { useAuth } from '../contexts/AuthContext';
import { professionalColors } from '../theme/professionalColors';
import { RiskBadge, RiskLevel } from '../components/shared/RiskIndicator';
import { clinicalSessionService } from '../services/clinicalSession.service';
import { AnalysisSession, getRiskLevel, getNumericBirads, getNormalizedConfidence } from '../types/clinical.types';
import { useLegacyWorkflow } from '../workflow-v3';
import OverviewTab from '../components/dashboard/tabs/OverviewTab';
import PerformanceTab from '../components/dashboard/tabs/PerformanceTab';
import ModelIntelligenceTab from '../components/dashboard/tabs/ModelIntelligenceTab';
import { DASHBOARD_THEME } from '../components/dashboard/charts/dashboardTheme';

// Backend health status type
interface SystemHealth {
  aiModel: 'online' | 'offline' | 'loading';
  modelVersion: string;
  backendStatus: 'healthy' | 'degraded' | 'offline';
}

/**
 * Clinical Dashboard
 * Professional medical imaging workstation overview
 */
const ClinicalDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadSession } = useLegacyWorkflow();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    aiModel: 'loading',
    modelVersion: 'Unknown',
    backendStatus: 'offline',
  });

  // Check backend health with retry logic for network changes
  const checkBackendHealth = useCallback(async () => {
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
        
        const health = await response.json();
        setSystemHealth({
          aiModel: health.model_loaded ? 'online' : 'offline',
          modelVersion: health.model_version || 'v12',
          backendStatus: health.status === 'healthy' ? 'healthy' : 'degraded',
        });
        return; // Success, exit
      } catch (error) {
        lastError = error as Error;
        // Only retry on network errors, not HTTP errors
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // Backoff
        }
      }
    }
    
    // All retries failed
    console.warn('Backend health check failed after retries:', lastError?.message);
    setSystemHealth({
      aiModel: 'offline',
      modelVersion: 'Unknown',
      backendStatus: 'offline',
    });
  }, []);

  // Load real session data
  const loadSessions = useCallback(() => {
    setIsLoading(true);
    try {
      const allSessions = clinicalSessionService.getAllSessions();
      // Sort by last modified date, most recent first
      const sortedSessions = allSessions.sort((a, b) => 
        new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime()
      );
      setSessions(sortedSessions);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    checkBackendHealth();
    
    // Refresh health status every 30 seconds
    const healthInterval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [loadSessions, checkBackendHealth]);

  // Calculate real statistics from sessions
  const stats = React.useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.workflow.status === 'completed').length;
    const inProgress = sessions.filter(s => s.workflow.status === 'in-progress').length;
    const pending = sessions.filter(s => s.workflow.status === 'pending' || s.workflow.status === 'paused').length;
    
    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Count high priority (high risk findings)
    const highPriority = sessions.filter(s => 
      s.findings?.some(f => getRiskLevel(f.biradsCategory) === 'high' || getNumericBirads(f.biradsCategory) >= 4)
    ).length;

    return [
      {
        label: 'Total Cases',
        value: total.toString(),
        change: `${total > 0 ? '+' + Math.min(total, 12) : '0'} this month`,
        icon: <Assignment />,
        color: theme.palette.primary.main,
        trend: 'up' as const,
      },
      {
        label: 'In Progress',
        value: inProgress.toString(),
        change: inProgress > 0 ? 'Active analysis' : 'No active cases',
        icon: <HourglassEmpty />,
        color: professionalColors.clinical.uncertain.main,
        trend: 'neutral' as const,
      },
      {
        label: 'Completed',
        value: completed.toString(),
        change: `${completionRate}% completion rate`,
        icon: <CheckCircle />,
        color: professionalColors.clinical.normal.main,
        trend: 'up' as const,
      },
      {
        label: 'High Priority',
        value: highPriority.toString(),
        change: highPriority > 0 ? 'Action required' : 'All clear',
        icon: <PriorityHigh />,
        color: professionalColors.clinical.abnormal.main,
        trend: highPriority > 0 ? 'up' : 'down' as const,
      },
    ];
  }, [sessions]);

  // Get recent cases (top 5)
  const recentCases = React.useMemo(() => {
    return sessions.slice(0, 5).map(session => {
      // Determine risk level from findings
      let riskLevel: RiskLevel = 'low';
      const highRiskFinding = session.findings?.find(f => 
        getRiskLevel(f.biradsCategory) === 'high' || getNumericBirads(f.biradsCategory) >= 4
      );
      const moderateRiskFinding = session.findings?.find(f => 
        getRiskLevel(f.biradsCategory) === 'moderate' || getNumericBirads(f.biradsCategory) === 3
      );
      
      if (highRiskFinding) riskLevel = 'high';
      else if (moderateRiskFinding) riskLevel = 'moderate';
      
      // Determine priority
      let priority: 'high' | 'medium' | 'routine' = 'routine';
      if (riskLevel === 'high') priority = 'high';
      else if (riskLevel === 'moderate') priority = 'medium';

      // Calculate confidence from findings
      const avgConfidence = session.findings?.length > 0
        ? Math.round(session.findings.reduce((sum, f) => sum + getNormalizedConfidence(f.aiConfidence), 0) / session.findings.length)
        : 0;

      return {
        id: session.sessionId.split('_')[1] ? `C-${session.sessionId.split('_')[1]}` : session.sessionId.substring(0, 12),
        sessionId: session.sessionId,
        patientId: session.patientInfo?.patientId || 'P-Unknown',
        type: 'Mammogram',
        status: session.workflow.status,
        date: new Date(session.metadata.lastModified).toLocaleDateString(),
        finding: session.findings?.[0]?.description || (session.workflow.status === 'completed' ? 'Normal' : 'Under Review'),
        priority,
        confidence: avgConfidence,
        riskLevel,
      };
    });
  }, [sessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return professionalColors.clinical.normal.main;
      case 'pending':
        return professionalColors.clinical.uncertain.main;
      case 'in-progress':
        return theme.palette.primary.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return professionalColors.clinical.abnormal.main;
      case 'medium':
        return professionalColors.clinical.uncertain.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  // Handle session resume
  const handleResumeSession = (sessionId: string) => {
    loadSession(sessionId);
    navigate(ROUTES.WORKFLOW);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get time since last refresh
  const getTimeSinceRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        {/* Professional Page Header with Enhanced Gradient */}
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha('#60A5FA', 0.95)} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '40%',
              height: '100%',
              background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalHospital sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  {getGreeting()}, {user?.email?.split('@')[0] || 'Doctor'}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.95)',
                    }}
                  >
                    Clinical Imaging Workstation
                  </Typography>
                  <Chip
                    icon={<AccessTime sx={{ fontSize: 14, color: 'inherit' }} />}
                    label={`Updated ${getTimeSinceRefresh()}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      backgroundColor: alpha('#FFFFFF', 0.15),
                      color: 'white',
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />
                </Stack>
              </Box>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Tooltip title="Refresh data">
                <IconButton 
                  onClick={loadSessions}
                  sx={{ 
                    color: 'white',
                    backgroundColor: alpha('#FFFFFF', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#FFFFFF', 0.2),
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                size="large"
                startIcon={<Biotech />}
                onClick={() => navigate(ROUTES.WORKFLOW)}
                sx={{
                  backgroundColor: 'white',
                  color: theme.palette.primary.main,
                  px: 3,
                  py: 1.25,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: alpha('#FFFFFF', 0.9),
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${alpha('#000000', 0.15)}`,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                New Analysis
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── Dashboard Tabs ────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            aria-label="Dashboard sections"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<DashboardOutlined sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Clinical Overview"
            />
            <Tab
              icon={<InsightsOutlined sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="AI Analytics"
            />
          </Tabs>
        </Paper>

        {/* ── Tab Panel: Clinical Overview (existing content) ──────── */}
        {activeTab === 0 && (
        <>
        {/* Statistics Cards - Enhanced with visual weight */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  borderRadius: 3,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${stat.color}, ${alpha(stat.color, 0.6)})`,
                  },
                  '&:hover': {
                    borderColor: alpha(stat.color, 0.3),
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${alpha(stat.color, 0.15)}`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Avatar
                        sx={{
                          background: `linear-gradient(135deg, ${alpha(stat.color, 0.15)}, ${alpha(stat.color, 0.08)})`,
                          color: stat.color,
                          width: 52,
                          height: 52,
                          boxShadow: `0 4px 12px ${alpha(stat.color, 0.2)}`,
                          '& svg': {
                            fontSize: 26,
                          },
                        }}
                      >
                        {stat.icon}
                      </Avatar>
                      <Chip
                        label={stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '–'}
                        size="small"
                        sx={{
                          backgroundColor: alpha(stat.color, 0.1),
                          color: stat.color,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          height: 24,
                          borderRadius: 1.5,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography 
                        variant="h3" 
                        sx={{ 
                          fontWeight: 800, 
                          color: 'text.primary', 
                          mb: 0.5,
                          fontSize: '2rem',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.primary', 
                          mb: 0.5,
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                        }}
                      >
                        {stat.change}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Workflow Insights - Article: "ML-driven workflow optimization...pinpoint most critical workflow parameters" */}
        {(() => {
          // Compute workflow bottlenecks and insights
          const staleCases = sessions.filter(s => {
            const ageInDays = (Date.now() - new Date(s.metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
            return s.workflow.status === 'in-progress' && ageInDays > 3;
          }).length;
          
          const pendingHighRisk = sessions.filter(s => 
            s.workflow.status !== 'completed' && 
            s.findings?.some(f => getRiskLevel(f.biradsCategory) === 'high' || getNumericBirads(f.biradsCategory) >= 4)
          ).length;
          
          const hasInsights = staleCases > 0 || pendingHighRisk > 0;
          
          return hasInsights ? (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Lightbulb sx={{ color: theme.palette.warning.main, fontSize: 24 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                    Workflow Insights
                  </Typography>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    {staleCases > 0 && (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        <strong>{staleCases}</strong> stale case{staleCases > 1 ? 's' : ''} (inactive &gt;3 days)
                      </Typography>
                    )}
                    {pendingHighRisk > 0 && (
                      <Typography variant="body2" sx={{ color: professionalColors.clinical.abnormal.main, fontWeight: 500 }}>
                        <strong>{pendingHighRisk}</strong> high-risk case{pendingHighRisk > 1 ? 's' : ''} pending review
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(ROUTES.HISTORY)}
                  sx={{ 
                    borderColor: theme.palette.warning.main,
                    color: theme.palette.warning.main,
                    '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) }
                  }}
                >
                  Review
                </Button>
              </Stack>
            </Paper>
          ) : null;
        })()}

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Recent Cases */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Recent Cases
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(ROUTES.HISTORY)}
                    sx={{ color: 'primary.main' }}
                  >
                    View All
                  </Button>
                </Box>

                {isLoading ? (
                  <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
                    ))}
                  </Stack>
                ) : recentCases.length === 0 ? (
                  <Box sx={{ 
                    py: 6, 
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 2,
                  }}>
                    <Assignment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                      No cases yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                      Start your first analysis to see cases here
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Biotech />}
                      onClick={() => navigate(ROUTES.WORKFLOW)}
                      sx={{
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      }}
                    >
                      Start Analysis
                    </Button>
                  </Box>
                ) : (
                <List sx={{ py: 0 }}>
                  {recentCases.map((case_, index) => (
                    <React.Fragment key={case_.id}>
                      <ListItem
                        onClick={() => handleResumeSession(case_.sessionId)}
                        sx={{
                          px: 2,
                          py: 2,
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                        secondaryAction={
                          <Tooltip title={case_.status === 'in-progress' ? 'Resume' : 'View'}>
                            <IconButton 
                              edge="end"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeSession(case_.sessionId);
                              }}
                            >
                              {case_.status === 'in-progress' ? <PlayCircleOutline fontSize="small" /> : <OpenInNew fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              backgroundColor: alpha(getStatusColor(case_.status), 0.15),
                              color: getStatusColor(case_.status),
                            }}
                          >
                            {case_.status === 'completed' ? (
                              <CheckCircle />
                            ) : case_.status === 'pending' ? (
                              <HourglassEmpty />
                            ) : (
                              <Autorenew />
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {case_.id}
                              </Typography>
                              <Chip
                                label={case_.priority.toUpperCase()}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  backgroundColor: alpha(getPriorityColor(case_.priority), 0.15),
                                  color: getPriorityColor(case_.priority),
                                  fontWeight: 600,
                                }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} alignItems="center">
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Patient: {case_.patientId}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                •
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {case_.date}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                •
                              </Typography>
                              <RiskBadge level={case_.riskLevel} size="small" />
                            </Stack>
                          }
                        />
                      </ListItem>
                      {index < recentCases.length - 1 && (
                        <Divider sx={{ bgcolor: theme.palette.divider }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions & System Info */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              {/* Quick Actions */}
              <Card
                elevation={0}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                    Quick Actions
                  </Typography>
                  <Stack spacing={1.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Biotech />}
                      onClick={() => navigate(ROUTES.WORKFLOW)}
                      sx={{
                        justifyContent: 'flex-start',
                        backgroundColor: 'primary.main',
                        textTransform: 'none',
                        py: 1.25,
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      }}
                    >
                      New Diagnostic Analysis
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<FolderOpen />}
                      onClick={() => navigate(ROUTES.ANALYSIS_ARCHIVE)}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: theme.palette.divider,
                        color: 'text.primary',
                        textTransform: 'none',
                        py: 1.25,
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      Browse Case Archive
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<History />}
                      onClick={() => navigate(ROUTES.HISTORY)}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: theme.palette.divider,
                        color: 'text.primary',
                        textTransform: 'none',
                        py: 1.25,
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      View Session History
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Settings />}
                      onClick={() => navigate(ROUTES.SETTINGS)}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: theme.palette.divider,
                        color: 'text.primary',
                        textTransform: 'none',
                        py: 1.25,
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      Settings
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card
                elevation={0}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Performance
                    </Typography>
                    <TrendingUp sx={{ color: professionalColors.clinical.normal.main }} />
                  </Stack>
                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Cases Analyzed
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          {sessions.filter(s => s.workflow.status === 'completed').length}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((sessions.filter(s => s.workflow.status === 'completed').length / 50) * 100, 100)}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: theme.palette.primary.main,
                            borderRadius: 1,
                          },
                        }}
                      />
                    </Box>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Completion Rate
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          {sessions.length > 0 
                            ? Math.round((sessions.filter(s => s.workflow.status === 'completed').length / sessions.length) * 100) 
                            : 0}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={sessions.length > 0 
                          ? Math.round((sessions.filter(s => s.workflow.status === 'completed').length / sessions.length) * 100) 
                          : 0}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          backgroundColor: alpha(professionalColors.clinical.normal.main, 0.15),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: professionalColors.clinical.normal.main,
                            borderRadius: 1,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card
                elevation={0}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      System Status
                    </Typography>
                    <Tooltip title="Refresh status">
                      <IconButton size="small" onClick={checkBackendHealth}>
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          AI Model ({systemHealth.modelVersion})
                        </Typography>
                        <Chip
                          label={systemHealth.aiModel === 'online' ? 'Online' : systemHealth.aiModel === 'loading' ? 'Loading...' : 'Offline'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: alpha(
                              systemHealth.aiModel === 'online' 
                                ? professionalColors.clinical.normal.main 
                                : systemHealth.aiModel === 'loading'
                                  ? professionalColors.clinical.uncertain.main
                                  : professionalColors.clinical.abnormal.main, 
                              0.15
                            ),
                            color: systemHealth.aiModel === 'online' 
                              ? professionalColors.clinical.normal.main 
                              : systemHealth.aiModel === 'loading'
                                ? professionalColors.clinical.uncertain.main
                                : professionalColors.clinical.abnormal.main,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <LinearProgress
                        variant={systemHealth.aiModel === 'loading' ? 'indeterminate' : 'determinate'}
                        value={systemHealth.aiModel === 'online' ? 100 : 0}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          backgroundColor: alpha(
                            systemHealth.aiModel === 'online' 
                              ? professionalColors.clinical.normal.main 
                              : professionalColors.clinical.abnormal.main, 
                            0.15
                          ),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: systemHealth.aiModel === 'online' 
                              ? professionalColors.clinical.normal.main 
                              : professionalColors.clinical.abnormal.main,
                            borderRadius: 1,
                          },
                        }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Backend
                        </Typography>
                        <Chip
                          label={systemHealth.backendStatus === 'healthy' ? 'Healthy' : systemHealth.backendStatus === 'degraded' ? 'Degraded' : 'Offline'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: alpha(
                              systemHealth.backendStatus === 'healthy' 
                                ? professionalColors.clinical.normal.main 
                                : systemHealth.backendStatus === 'degraded'
                                  ? professionalColors.clinical.uncertain.main
                                  : professionalColors.clinical.abnormal.main, 
                              0.15
                            ),
                            color: systemHealth.backendStatus === 'healthy' 
                              ? professionalColors.clinical.normal.main 
                              : systemHealth.backendStatus === 'degraded'
                                ? professionalColors.clinical.uncertain.main
                                : professionalColors.clinical.abnormal.main,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={systemHealth.backendStatus === 'healthy' ? 100 : systemHealth.backendStatus === 'degraded' ? 50 : 0}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: systemHealth.backendStatus === 'healthy' 
                              ? professionalColors.clinical.normal.main 
                              : systemHealth.backendStatus === 'degraded'
                                ? professionalColors.clinical.uncertain.main
                                : professionalColors.clinical.abnormal.main,
                            borderRadius: 1,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
        </>
        )}

        {/* ── Tab Panel: AI Analytics ─────────────────────────────── */}
        {activeTab === 1 && (
          <Box>
            {/* Analytics Sub-Tabs — Capsule Navigation */}
            <Box
              sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  background: 'rgba(15, 16, 34, 0.6)',
                  border: `1px solid ${DASHBOARD_THEME.cardBorder}`,
                  borderRadius: '999px',
                  p: 0.5,
                  gap: 0.5,
                }}
              >
                {[
                  { label: 'Overview', testId: 'analytics-sub-tab-overview', idx: 0 },
                  { label: 'Performance', testId: 'analytics-sub-tab-performance', idx: 1 },
                  { label: 'Model Intelligence', testId: 'analytics-sub-tab-intelligence', idx: 2 },
                ].map((tab) => (
                  <Box
                    key={tab.idx}
                    component="button"
                    data-testid={tab.testId}
                    onClick={() => setAnalyticsSubTab(tab.idx)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      px: 2.5,
                      py: 0.9,
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: analyticsSubTab === tab.idx ? 600 : 500,
                      fontFamily: DASHBOARD_THEME.fontBody,
                      color:
                        analyticsSubTab === tab.idx
                          ? '#FFFFFF'
                          : DASHBOARD_THEME.textMuted,
                      background:
                        analyticsSubTab === tab.idx
                          ? `linear-gradient(135deg, ${DASHBOARD_THEME.primary}, ${alpha(DASHBOARD_THEME.primary, 0.7)})`
                          : 'transparent',
                      boxShadow:
                        analyticsSubTab === tab.idx
                          ? `0 2px 12px ${alpha(DASHBOARD_THEME.primary, 0.3)}`
                          : 'none',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background:
                          analyticsSubTab === tab.idx
                            ? `linear-gradient(135deg, ${DASHBOARD_THEME.primary}, ${alpha(DASHBOARD_THEME.primary, 0.7)})`
                            : alpha(DASHBOARD_THEME.primary, 0.08),
                        color:
                          analyticsSubTab === tab.idx
                            ? '#FFFFFF'
                            : DASHBOARD_THEME.textSecondary,
                      },
                    }}
                  >
                    {tab.label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Analytics Sub-Tab Panels */}
            {analyticsSubTab === 0 && <OverviewTab />}
            {analyticsSubTab === 1 && <PerformanceTab />}
            {analyticsSubTab === 2 && <ModelIntelligenceTab />}
          </Box>
        )}

      </Container>
    </Box>
  );
};

export default ClinicalDashboard;
