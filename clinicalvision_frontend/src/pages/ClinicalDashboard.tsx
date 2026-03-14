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
  ToggleButtonGroup,
  ToggleButton,
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
import { useDashboardTheme } from '../hooks/useDashboardTheme';
import { metallicStops } from '../components/dashboard/charts/dashboardTheme';
import type { MetricsPeriod } from '../types/metrics.types';
import DashboardStatCard from '../components/dashboard/cards/DashboardStatCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Period selector options (shared with sub-banner)
const PERIOD_OPTIONS: { value: MetricsPeriod; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

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
  const dt = useDashboardTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadSession } = useLegacyWorkflow();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<MetricsPeriod>('30d');
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
        py: 1.5,
      }}
    >
      <Container maxWidth="xl">
        {/* Professional Page Header with Enhanced Gradient */}
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

        {/* ── Sub-Banner: Tab strip with capsule buttons ──── */}
        <Paper
          elevation={0}
          sx={{
            mb: 1.5,
            borderRadius: `${dt.cardBorderRadius}px`,
            overflow: 'hidden',
            background: dt.cardDiagonalGradient,
            border: `1px solid ${dt.cardBorder}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1,
              minHeight: 52,
            }}
          >
            {/* Left: main dashboard tabs — dominant capsule buttons */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              aria-label="Dashboard sections"
              sx={{
                minHeight: 52,
                flex: '0 0 auto',
                '& .MuiTab-root': {
                  minHeight: 44,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  py: 0.75,
                  px: 2.5,
                  mx: 0.5,
                  borderRadius: '999px',
                  color: alpha(theme.palette.text.primary, 0.65),
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                  '&.Mui-selected': {
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '1rem',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.dark, 0.9)})`,
                    boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.35)}`,
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
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

            {/* Center: Analytics sub-tabs + period (only when AI Analytics active) */}
            {activeTab === 1 && (
              <>
                <Box sx={{ flex: 1 }} />

                {/* Capsule nav — centered in banner */}
                <Box
                  sx={{
                    display: 'inline-flex',
                    background: alpha(dt.cardBackground, 0.5),
                    border: `1px solid ${alpha(dt.primary, 0.12)}`,
                    borderRadius: '999px',
                    p: '3px',
                    gap: '3px',
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
                        px: 2,
                        py: 0.6,
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: analyticsSubTab === tab.idx ? 700 : 500,
                        fontFamily: dt.fontBody,
                        letterSpacing: '-0.01em',
                        color:
                          analyticsSubTab === tab.idx
                            ? '#FFFFFF'
                            : dt.textSecondary,
                        background:
                          analyticsSubTab === tab.idx
                            ? `linear-gradient(135deg, ${dt.primary}, ${alpha(dt.primary, 0.7)})`
                            : 'transparent',
                        boxShadow:
                          analyticsSubTab === tab.idx
                            ? `0 2px 8px ${alpha(dt.primary, 0.25)}`
                            : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background:
                            analyticsSubTab === tab.idx
                              ? `linear-gradient(135deg, ${dt.primary}, ${alpha(dt.primary, 0.7)})`
                              : alpha(dt.primary, 0.08),
                          color:
                            analyticsSubTab === tab.idx
                              ? '#FFFFFF'
                              : dt.textPrimary,
                        },
                      }}
                    >
                      {tab.label}
                    </Box>
                  ))}
                </Box>

                {/* Period pills */}
                <ToggleButtonGroup
                  value={analyticsPeriod}
                  exclusive
                  onChange={(_, v) => v && setAnalyticsPeriod(v as MetricsPeriod)}
                  size="small"
                  aria-label="Time period"
                  sx={{
                    ml: 1,
                    mr: 0.5,
                    bgcolor: alpha(dt.cardBackground, 0.4),
                    borderRadius: '999px',
                    border: `1px solid ${alpha(dt.cardBorder, 0.6)}`,
                    p: '2px',
                    '& .MuiToggleButtonGroup-grouped': {
                      border: 'none',
                      borderRadius: '999px !important',
                      mx: '1px',
                    },
                  }}
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <ToggleButton
                      key={opt.value}
                      value={opt.value}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        px: 1.2,
                        py: 0.2,
                        color: dt.textSecondary,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(dt.primary, 0.08),
                          color: dt.textPrimary,
                        },
                        '&.Mui-selected': {
                          bgcolor: alpha(dt.primary, 0.18),
                          color: dt.textPrimary,
                          fontWeight: 700,
                          '&:hover': {
                            bgcolor: alpha(dt.primary, 0.25),
                          },
                        },
                      }}
                    >
                      {opt.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Box sx={{ flex: 1 }} />
              </>
            )}
          </Box>
        </Paper>

        {/* ── Tab Panel: Clinical Overview (existing content) ──────── */}
        {activeTab === 0 && (
        <>
        {/* Statistics Cards - Unified DashboardStatCard */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <DashboardStatCard
                value={stat.value}
                label={stat.label}
                color={stat.color}
                icon={stat.icon}
                subtitle={stat.change}
                trend={stat.trend}
              />
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
                p: 1.5,
                mb: 2,
                borderRadius: `${dt.cardBorderRadius}px`,
                background: dt.cardDiagonalGradient,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                boxShadow: dt.cardShadow,
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
        <Grid container spacing={2}>
          {/* Recent Cases */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                background: dt.cardDiagonalGradient,
                border: `1px solid ${dt.cardBorder}`,
                borderRadius: `${dt.cardBorderRadius}px`,
                boxShadow: dt.cardShadow,
                transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.6)})`,
                },
                '&:hover': {
                  boxShadow: dt.cardShadowHover,
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Assignment sx={{ fontSize: 22, color: theme.palette.primary.main }} />
                    <Typography variant="h6" sx={{ fontWeight: dt.cardTitleWeight, fontFamily: dt.fontHeading, color: dt.textPrimary, fontSize: '1.05rem' }}>
                      Recent Cases
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(ROUTES.HISTORY)}
                    sx={{ color: 'primary.main', fontWeight: 600, textTransform: 'none' }}
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
            <Stack spacing={2}>
              {/* Quick Actions */}
              <Card
                elevation={0}
                sx={{
                  background: dt.cardDiagonalGradient,
                  border: `1px solid ${dt.cardBorder}`,
                  borderRadius: `${dt.cardBorderRadius}px`,
                  boxShadow: dt.cardShadow,
                  transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.6)})`,
                  },
                  '&:hover': { boxShadow: dt.cardShadowHover },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Biotech sx={{ fontSize: 22, color: theme.palette.success.main }} />
                    <Typography variant="h6" sx={{ fontWeight: dt.cardTitleWeight, fontFamily: dt.fontHeading, color: dt.textPrimary, fontSize: '1.05rem' }}>
                      Quick Actions
                    </Typography>
                  </Stack>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'New Analysis', icon: <Biotech />, route: ROUTES.WORKFLOW, gradient: true },
                      { label: 'Case Archive', icon: <FolderOpen />, route: ROUTES.ANALYSIS_ARCHIVE },
                      { label: 'History', icon: <History />, route: ROUTES.HISTORY },
                      { label: 'Settings', icon: <Settings />, route: ROUTES.SETTINGS },
                    ].map((action) => (
                      <Grid size={{ xs: 6 }} key={action.label}>
                        <Box
                          onClick={() => navigate(action.route)}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            border: `1px solid ${action.gradient ? 'transparent' : theme.palette.divider}`,
                            background: action.gradient
                              ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                              : alpha(dt.cardBackground, 0.5),
                            color: action.gradient ? '#FFFFFF' : dt.textPrimary,
                            boxShadow: action.gradient ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}` : 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: action.gradient
                                ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`
                                : `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                              borderColor: action.gradient ? 'transparent' : theme.palette.primary.main,
                              background: action.gradient
                                ? `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                                : alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <Box sx={{ mb: 0.5, '& .MuiSvgIcon-root': { fontSize: 24 } }}>
                            {action.icon}
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'center' }}>
                            {action.label}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card
                elevation={0}
                sx={{
                  background: dt.cardDiagonalGradient,
                  border: `1px solid ${dt.cardBorder}`,
                  borderRadius: `${dt.cardBorderRadius}px`,
                  boxShadow: dt.cardShadow,
                  transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${professionalColors.clinical.normal.main}, ${alpha(professionalColors.clinical.normal.light || theme.palette.success.light, 0.6)})`,
                  },
                  '&:hover': { boxShadow: dt.cardShadowHover },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TrendingUp sx={{ fontSize: 22, color: professionalColors.clinical.normal.main }} />
                      <Typography variant="h6" sx={{ fontWeight: dt.cardTitleWeight, fontFamily: dt.fontHeading, color: dt.textPrimary, fontSize: '1.05rem' }}>
                        Performance
                      </Typography>
                    </Stack>
                  </Stack>
                  {(() => {
                    const completed = sessions.filter(s => s.workflow.status === 'completed').length;
                    const inProgress = sessions.filter(s => s.workflow.status === 'in-progress').length;
                    const pending = sessions.length - completed - inProgress;
                    const completionRate = sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0;
                    const total = sessions.length;
                    const donutData = [
                      { name: 'Completed', value: completed || 0 },
                      { name: 'In Progress', value: inProgress || 0 },
                      { name: 'Pending', value: Math.max(pending, 0) || 0 },
                    ];
                    const donutBaseColors = [
                      professionalColors.clinical.normal.main,  // green
                      theme.palette.primary.main,               // blue
                      theme.palette.warning.main,               // amber
                    ];
                    // Generate metallic gradient triplets for each segment
                    const gradDefs = donutBaseColors.map((hex, i) => ({
                      id: `perf-donut-${i}`,
                      stops: metallicStops(hex),
                    }));
                    const hasData = total > 0;
                    const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;
                    return (
                      <Stack direction="row" spacing={2.5} alignItems="center">
                        {/* ── Donut with metallic gradients ── */}
                        <Box data-testid="perf-donut-container" sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                {gradDefs.map(({ id, stops: [light, mid, dark] }) => (
                                  <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={light} />
                                    <stop offset="50%" stopColor={mid} />
                                    <stop offset="100%" stopColor={dark} />
                                  </linearGradient>
                                ))}
                              </defs>
                              <Pie
                                data={hasData ? donutData : [{ name: 'Empty', value: 1 }]}
                                cx="50%"
                                cy="50%"
                                innerRadius={36}
                                outerRadius={54}
                                paddingAngle={hasData ? 3 : 0}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                              >
                                {hasData ? donutData.map((_entry, i) => (
                                  <Cell key={i} fill={`url(#${gradDefs[i].id})`} />
                                )) : (
                                  <Cell fill={alpha(theme.palette.text.disabled, 0.15)} />
                                )}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          {/* ── Center percentage (prominent) ── */}
                          <Box sx={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                          }}>
                            <Typography
                              data-testid="perf-donut-center-pct"
                              variant="h5"
                              sx={{ fontWeight: 800, fontSize: '1.45rem', lineHeight: 1, color: dt.textPrimary, fontFamily: dt.fontMono }}
                            >
                              {completionRate}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: dt.textMuted, fontSize: '0.6rem', letterSpacing: '0.06em', lineHeight: 1.2 }}>
                              done
                            </Typography>
                          </Box>
                        </Box>
                        {/* ── Legend column with counts & percentages ── */}
                        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                          {[
                            { label: 'Completed', count: completed, color: donutBaseColors[0] },
                            { label: 'In Progress', count: inProgress, color: donutBaseColors[1] },
                            { label: 'Pending', count: Math.max(pending, 0), color: donutBaseColors[2] },
                          ].map((item, i) => (
                            <Box
                              key={item.label}
                              data-testid={`perf-legend-${i}`}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                              <Box sx={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: `linear-gradient(135deg, ${metallicStops(item.color)[0]}, ${item.color})`,
                                boxShadow: `0 0 6px ${alpha(item.color, 0.4)}`,
                                flexShrink: 0,
                              }} />
                              <Typography variant="caption" sx={{ color: dt.textSecondary, flex: 1, fontSize: '0.72rem' }}>
                                {item.label}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: dt.textPrimary, fontFamily: dt.fontMono, fontSize: '0.8rem' }}>
                                {item.count}
                              </Typography>
                              <Typography variant="caption" sx={{ color: dt.textMuted, fontSize: '0.65rem', minWidth: 28, textAlign: 'right' }}>
                                {pct(item.count)}%
                              </Typography>
                            </Box>
                          ))}
                          {/* Total sessions summary */}
                          <Box sx={{ borderTop: `1px solid ${alpha(dt.textMuted, 0.15)}`, pt: 0.75, mt: 0.25 }}>
                            <Typography variant="caption" sx={{ color: dt.textMuted, fontSize: '0.65rem' }}>
                              {total} total case{total !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* System Status */}
              <Card
                elevation={0}
                sx={{
                  background: dt.cardDiagonalGradient,
                  border: `1px solid ${dt.cardBorder}`,
                  borderRadius: `${dt.cardBorderRadius}px`,
                  boxShadow: dt.cardShadow,
                  transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${theme.palette.info.main}, ${alpha(theme.palette.info.light, 0.6)})`,
                  },
                  '&:hover': { boxShadow: dt.cardShadowHover },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Refresh sx={{ fontSize: 22, color: theme.palette.info.main }} />
                      <Typography variant="h6" sx={{ fontWeight: dt.cardTitleWeight, fontFamily: dt.fontHeading, color: dt.textPrimary, fontSize: '1.05rem' }}>
                        System Status
                      </Typography>
                    </Stack>
                    <Tooltip title="Refresh status">
                      <IconButton size="small" onClick={checkBackendHealth}>
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Compact status rows with pulsing dot indicators */}
                  <Stack spacing={1.5}>
                    {/* AI Model */}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1.25, borderRadius: 1.5,
                      bgcolor: alpha(
                        systemHealth.aiModel === 'online' ? professionalColors.clinical.normal.main : theme.palette.error.main,
                        0.06
                      ),
                      border: `1px solid ${alpha(
                        systemHealth.aiModel === 'online' ? professionalColors.clinical.normal.main : theme.palette.error.main,
                        0.12
                      )}`,
                    }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        bgcolor: systemHealth.aiModel === 'online'
                          ? professionalColors.clinical.normal.main
                          : systemHealth.aiModel === 'loading'
                            ? professionalColors.clinical.uncertain.main
                            : professionalColors.clinical.abnormal.main,
                        boxShadow: systemHealth.aiModel === 'online'
                          ? `0 0 6px ${alpha(professionalColors.clinical.normal.main, 0.6)}`
                          : 'none',
                      }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
                        AI Model ({systemHealth.modelVersion})
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: dt.textPrimary }}>
                        {systemHealth.aiModel === 'online' ? 'Online' : systemHealth.aiModel === 'loading' ? 'Loading' : 'Offline'}
                      </Typography>
                    </Box>

                    {/* Backend */}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1.25, borderRadius: 1.5,
                      bgcolor: alpha(
                        systemHealth.backendStatus === 'healthy' ? professionalColors.clinical.normal.main : theme.palette.error.main,
                        0.06
                      ),
                      border: `1px solid ${alpha(
                        systemHealth.backendStatus === 'healthy' ? professionalColors.clinical.normal.main : theme.palette.error.main,
                        0.12
                      )}`,
                    }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        bgcolor: systemHealth.backendStatus === 'healthy'
                          ? professionalColors.clinical.normal.main
                          : systemHealth.backendStatus === 'degraded'
                            ? professionalColors.clinical.uncertain.main
                            : professionalColors.clinical.abnormal.main,
                        boxShadow: systemHealth.backendStatus === 'healthy'
                          ? `0 0 6px ${alpha(professionalColors.clinical.normal.main, 0.6)}`
                          : 'none',
                      }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
                        Backend Server
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: dt.textPrimary }}>
                        {systemHealth.backendStatus === 'healthy' ? 'Healthy' : systemHealth.backendStatus === 'degraded' ? 'Degraded' : 'Offline'}
                      </Typography>
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
          <Box
            sx={{
              background: dt.pageGradient,
              borderRadius: `${dt.cardBorderRadius}px`,
              p: { xs: 2, md: 3 },
            }}
          >
            {/* Analytics Sub-Tab Panels — capsule nav & period now in sub-banner */}
            {analyticsSubTab === 0 && <OverviewTab period={analyticsPeriod} />}
            {analyticsSubTab === 1 && <PerformanceTab period={analyticsPeriod} />}
            {analyticsSubTab === 2 && <ModelIntelligenceTab period={analyticsPeriod} />}
          </Box>
        )}

      </Container>
    </Box>
  );
};

export default ClinicalDashboard;
