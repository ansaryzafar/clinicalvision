/**
 * PatientRecords - Case History Page
 * 
 * Professional clinical workflow history with:
 * - Session timeline visualization
 * - Status filtering and search
 * - Quick actions for resuming sessions
 * - Export capabilities
 * 
 * Based on Nielsen's Heuristics:
 * - #1 Visibility: Clear session status indicators
 * - #7 Flexibility: Multiple ways to access sessions
 * - #8 Aesthetic: Clean, scannable list design
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  alpha,
  Tooltip,
  Grid,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Container,
} from '@mui/material';
import {
  History,
  Search,
  MoreVert,
  PlayCircleOutline,
  Delete,
  Download,
  Visibility,
  CheckCircle,
  HourglassTop,
  HourglassEmpty,
  PriorityHigh,
  CalendarToday,
  Person,
  Assignment,
  Biotech,
  FilterList,
  ImageSearch,
  MedicalServices,
  ContentCopy,
  OpenInNew,
  Close,
  Timeline,
  LocalHospital,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { clinicalSessionService } from '../services/clinicalSession.service';
import { AnalysisSession, WorkflowStep, WorkflowMode } from '../types/clinical.types';
import { useLegacyWorkflow } from '../workflow-v3';
import { professionalColors } from '../theme/professionalColors';
import { useTheme } from '@mui/material/styles';
import { Warning, Psychology, TrendingUp, Assessment as AssessmentIcon } from '@mui/icons-material';
import { getCompletionPercentage as getDerivedCompletionPercentage, getCompletedSteps } from '../utils/workflowUtils';

export const PatientRecords: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { loadSession } = useLegacyWorkflow();
  
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<AnalysisSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [findingsFilter, setFindingsFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<AnalysisSession | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Filter and sort sessions
  useEffect(() => {
    let result = [...sessions];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.patientInfo.patientId?.toLowerCase().includes(query) ||
          s.patientInfo.name?.toLowerCase().includes(query) ||
          s.studyInfo.studyId?.toLowerCase().includes(query) ||
          s.sessionId.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.workflow.status === statusFilter);
    }

    // Apply findings filter
    if (findingsFilter) {
      result = result.filter((s) => s.findings && s.findings.length > 0);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime();
      } else if (sortBy === 'patient') {
        return (a.patientInfo.patientId || '').localeCompare(b.patientInfo.patientId || '');
      } else if (sortBy === 'status') {
        return (a.workflow.status || '').localeCompare(b.workflow.status || '');
      }
      return 0;
    });

    setFilteredSessions(result);
  }, [sessions, searchQuery, statusFilter, findingsFilter, sortBy]);

  const loadSessions = () => {
    const allSessions = clinicalSessionService.getAllSessions();
    setSessions(allSessions);
  };

  const handleResumeSession = (sessionId: string) => {
    loadSession(sessionId);
    // Navigate based on session status - completed cases go to workflow, in-progress to workstation
    const session = sessions.find(s => s.sessionId === sessionId);
    // Use setTimeout to ensure state update is committed before navigation
    setTimeout(() => {
      if (session?.workflow.status === 'completed' || session?.workflow.status === 'finalized') {
        navigate(ROUTES.WORKFLOW); // Completed cases - view in clinical workflow
      } else {
        navigate(ROUTES.WORKFLOW); // In-progress - continue in workflow
      }
    }, 0);
  };

  const handleViewDetails = (session: AnalysisSession) => {
    // Open details dialog instead of navigating away
    setDetailsSession(session);
    setDetailsDialogOpen(true);
  };

  const handleOpenInWorkflow = (sessionId: string) => {
    loadSession(sessionId);
    // Use setTimeout to ensure state update is committed before navigation
    setTimeout(() => {
      navigate(ROUTES.WORKFLOW);
      setDetailsDialogOpen(false);
    }, 0);
  };

  const handleContinueAnalysis = (sessionId: string) => {
    loadSession(sessionId);
    // Use setTimeout to ensure state update is committed before navigation
    setTimeout(() => {
      navigate(ROUTES.WORKFLOW);
      setDetailsDialogOpen(false);
    }, 0);
  };

  const handleDuplicateSession = (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      // Export and re-import creates a duplicate
      const sessionData = JSON.parse(clinicalSessionService.exportSession(sessionId));
      // Remove old session ID to create new one
      delete sessionData.sessionId;
      sessionData.patientInfo = { ...sessionData.patientInfo, patientId: `${sessionData.patientInfo.patientId}_copy` };
      sessionData.metadata = { ...sessionData.metadata, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() };
      sessionData.workflow = { ...sessionData.workflow, status: 'in-progress' };
      clinicalSessionService.importSession(JSON.stringify(sessionData));
      loadSessions();
    }
    setAnchorEl(null);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      clinicalSessionService.deleteSession(sessionToDelete);
      loadSessions();
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleExportSession = (sessionId: string) => {
    const exportData = clinicalSessionService.exportSession(sessionId);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session_${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sessionId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(sessionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode; label: string }> = {
      completed: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Completed' },
      'in-progress': { color: 'warning', icon: <HourglassTop sx={{ fontSize: 16 }} />, label: 'In Progress' },
      pending: { color: 'default', icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Pending' },
      error: { color: 'error', icon: <PriorityHigh sx={{ fontSize: 16 }} />, label: 'Error' },
    };
    const config = configs[status] || configs.pending;
    return (
      <Chip
        icon={config.icon as React.ReactElement}
        label={config.label}
        size="small"
        color={config.color}
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString();
  };

  // Format patient demographics for display
  const formatPatientDemographics = (session: AnalysisSession): string => {
    const parts: string[] = [];
    const { patientInfo } = session;
    
    // Age or DOB
    if (patientInfo.age) {
      parts.push(`${patientInfo.age}yo`);
    } else if (patientInfo.dateOfBirth) {
      const dob = new Date(patientInfo.dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      parts.push(`${age}yo`);
    }
    
    // Gender
    if (patientInfo.gender) {
      parts.push(patientInfo.gender === 'M' ? 'Male' : patientInfo.gender === 'F' ? 'Female' : 'Other');
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Demographics not recorded';
  };

  // Get modality display name
  const getModalityDisplay = (modality: string): string => {
    const modalityMap: Record<string, string> = {
      MG: 'Mammography',
      DBT: 'Tomosynthesis',
      US: 'Ultrasound',
      MRI: 'MRI',
    };
    return modalityMap[modality] || modality;
  };

  // Get session summary for clinical context
  const getSessionSummary = (session: AnalysisSession): { images: number; findings: number; birads?: string } => {
    const imageCount = session.images?.length || 0;
    const findingCount = session.findings?.length || 0;
    const birads = session.assessment?.biradsCategory;
    
    return {
      images: imageCount,
      findings: findingCount,
      birads: birads ? `BI-RADS ${birads}` : undefined,
    };
  };

  // Check if case needs attention (for visual highlighting)
  const needsAttention = (session: AnalysisSession): { needs: boolean; reason: string } => {
    // Has findings but not completed
    if ((session.findings?.length || 0) > 0 && session.workflow.status === 'in-progress') {
      return { needs: true, reason: 'Findings need review' };
    }
    // No patient info but has analysis
    if (!session.patientInfo.patientId && (session.images?.length || 0) > 0) {
      return { needs: true, reason: 'Patient info missing' };
    }
    // Incomplete for more than 24 hours
    if (session.workflow.status === 'in-progress') {
      const lastModified = new Date(session.metadata.lastModified);
      const hoursSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60);
      if (hoursSinceModified > 24) {
        return { needs: true, reason: 'Stale - not updated in 24h+' };
      }
    }
    return { needs: false, reason: '' };
  };

  const getProgressPercentage = (session: AnalysisSession) => {
    // Use derived state from workflowUtils - single source of truth
    // Default to 'quick' mode (3 steps) if mode is not set - matches app default
    const mode: WorkflowMode = session.workflow?.mode || 'quick';
    return getDerivedCompletionPercentage(session, mode);
  };

  // Stats calculation
  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.workflow.status === 'completed' || s.workflow.status === 'finalized').length,
    inProgress: sessions.filter((s) => s.workflow.status === 'in-progress').length,
    withFindings: sessions.filter((s) => s.findings && s.findings.length > 0).length,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        {/* Professional Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <History sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  Case History
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  View and manage your clinical analysis sessions
                </Typography>
              </Box>
            </Box>
          <Button
            variant="contained"
            startIcon={<Biotech />}
            onClick={() => navigate(ROUTES.WORKFLOW)}
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              fontWeight: 600,
              px: 3,
              '&:hover': { bgcolor: alpha('#FFFFFF', 0.9) },
            }}
          >
            New Analysis
          </Button>
        </Box>
      </Paper>

      {/* Interactive Stats Cards - Click to filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Total Sessions - Click to reset all filters */}
        <Tooltip title={statusFilter !== 'all' || findingsFilter ? 'Click to show all sessions' : 'Showing all sessions'} arrow>
          <Card
            elevation={0}
            onClick={() => {
              setStatusFilter('all');
              setFindingsFilter(false);
              setSearchQuery('');
            }}
            sx={{
              flex: 1,
              bgcolor: alpha(theme.palette.primary.main, statusFilter === 'all' && !findingsFilter ? 0.12 : 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, statusFilter === 'all' && !findingsFilter ? 0.3 : 0.2)}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: theme.palette.primary.main, display: 'flex' }}><Assignment /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.primary.main }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Sessions
                  </Typography>
                </Box>
                {(statusFilter !== 'all' || findingsFilter) && (
                  <FilterList sx={{ fontSize: 18, color: 'text.disabled' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* Completed - Toggle filter (additive with findings) */}
        <Tooltip title={statusFilter === 'completed' ? 'Click to remove status filter' : 'Click to show completed sessions'} arrow>
          <Card
            elevation={0}
            onClick={() => {
              setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed');
              // Don't reset findingsFilter - allow combining filters
            }}
            sx={{
              flex: 1,
              bgcolor: alpha(professionalColors.clinical.normal.main, statusFilter === 'completed' ? 0.15 : 0.08),
              border: `1px solid ${alpha(professionalColors.clinical.normal.main, statusFilter === 'completed' ? 0.4 : 0.2)}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: alpha(professionalColors.clinical.normal.main, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(professionalColors.clinical.normal.main, 0.15)}`,
              },
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: professionalColors.clinical.normal.main, display: 'flex' }}><CheckCircle /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: professionalColors.clinical.normal.main }}>
                    {stats.completed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
                {statusFilter === 'completed' && (
                  <FilterList sx={{ fontSize: 18, color: professionalColors.clinical.normal.main }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* In Progress - Toggle filter (additive with findings) */}
        <Tooltip title={statusFilter === 'in-progress' ? 'Click to remove status filter' : 'Click to show in-progress sessions'} arrow>
          <Card
            elevation={0}
            onClick={() => {
              setStatusFilter(statusFilter === 'in-progress' ? 'all' : 'in-progress');
              // Don't reset findingsFilter - allow combining filters
            }}
            sx={{
              flex: 1,
              bgcolor: alpha(professionalColors.clinical.uncertain.main, statusFilter === 'in-progress' ? 0.15 : 0.08),
              border: `1px solid ${alpha(professionalColors.clinical.uncertain.main, statusFilter === 'in-progress' ? 0.4 : 0.2)}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: alpha(professionalColors.clinical.uncertain.main, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(professionalColors.clinical.uncertain.main, 0.15)}`,
              },
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: professionalColors.clinical.uncertain.main, display: 'flex' }}><HourglassTop /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: professionalColors.clinical.uncertain.main }}>
                    {stats.inProgress}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
                {statusFilter === 'in-progress' && (
                  <FilterList sx={{ fontSize: 18, color: professionalColors.clinical.uncertain.main }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* With Findings - Additive toggle filter (works with status filters) */}
        <Tooltip title={findingsFilter ? 'Click to remove findings filter' : stats.withFindings > 0 ? 'Click to show only sessions with findings' : 'No sessions with findings'} arrow>
          <Card
            elevation={0}
            onClick={() => {
              if (stats.withFindings > 0) {
                setFindingsFilter(!findingsFilter);
                // Don't reset statusFilter - allow combining filters
              }
            }}
            sx={{
              flex: 1,
              bgcolor: alpha(professionalColors.clinical.abnormal.main, findingsFilter ? 0.15 : 0.08),
              border: `1px solid ${alpha(professionalColors.clinical.abnormal.main, findingsFilter ? 0.4 : 0.2)}`,
              borderRadius: 2,
              cursor: stats.withFindings > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              '&:hover': stats.withFindings > 0 ? {
                borderColor: alpha(professionalColors.clinical.abnormal.main, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(professionalColors.clinical.abnormal.main, 0.15)}`,
              } : {},
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: stats.withFindings > 0 ? professionalColors.clinical.abnormal.main : 'text.disabled', display: 'flex' }}><PriorityHigh /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: stats.withFindings > 0 ? professionalColors.clinical.abnormal.main : 'text.primary' }}>
                    {stats.withFindings}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    With Findings
                  </Typography>
                </Box>
                {findingsFilter && (
                  <FilterList sx={{ fontSize: 18, color: professionalColors.clinical.abnormal.main }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>
      </Stack>

      {/* Filters & Search */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search by patient ID, name, or session ID..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e: SelectChangeEvent) => setSortBy(e.target.value)}
            >
              <MenuItem value="date">Most Recent</MenuItem>
              <MenuItem value="patient">Patient ID</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Alert
          severity="info"
          icon={<Assignment />}
          sx={{
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
            No Sessions Found
          </Typography>
          <Typography variant="body2">
            {sessions.length === 0
              ? "You haven't started any analysis sessions yet. Go to the Diagnostic Workstation to begin."
              : 'No sessions match your current filters. Try adjusting your search criteria.'}
          </Typography>
          {sessions.length === 0 && (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => navigate(ROUTES.WORKFLOW)}
            >
              Start New Analysis
            </Button>
          )}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {filteredSessions.map((session) => {
            const summary = getSessionSummary(session);
            const attention = needsAttention(session);
            return (
            <Card
              key={session.sessionId}
              elevation={0}
              sx={{
                bgcolor: 'background.paper',
                border: `1px solid ${attention.needs 
                  ? alpha(professionalColors.clinical.uncertain.main, 0.4) 
                  : theme.palette.divider}`,
                borderRadius: 2,
                borderLeft: attention.needs 
                  ? `4px solid ${professionalColors.clinical.uncertain.main}` 
                  : undefined,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Attention Alert */}
                {attention.needs && (
                  <Alert 
                    severity="warning" 
                    icon={<PriorityHigh sx={{ fontSize: 18 }} />}
                    sx={{ 
                      mb: 2, 
                      py: 0.5,
                      bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.08),
                      border: 'none',
                      '& .MuiAlert-message': { py: 0 },
                    }}
                  >
                    <Typography variant="caption" fontWeight={500}>
                      {attention.reason}
                    </Typography>
                  </Alert>
                )}
                <Grid container spacing={3} alignItems="center">
                  {/* Patient Info - Enhanced with demographics */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Person sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {session.patientInfo.patientId || 'No Patient ID'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {session.patientInfo.name || session.patientInfo.patientName || 'Unnamed Patient'}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatPatientDemographics(session)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Study Info - Modality and clinical data */}
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MedicalServices sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {getModalityDisplay(session.studyInfo.modality)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ImageSearch sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {summary.images} {summary.images === 1 ? 'image' : 'images'}
                        </Typography>
                      </Box>
                      {summary.findings > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PriorityHigh sx={{ fontSize: 14, color: professionalColors.clinical.abnormal.main }} />
                          <Typography variant="caption" sx={{ color: professionalColors.clinical.abnormal.main }}>
                            {summary.findings} {summary.findings === 1 ? 'finding' : 'findings'}
                          </Typography>
                        </Box>
                      )}
                      {summary.birads && (
                        <Chip 
                          label={summary.birads} 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            color: theme.palette.warning.dark,
                          }} 
                        />
                      )}
                    </Stack>
                  </Grid>

                  {/* Progress */}
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={getProgressPercentage(session)}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {getProgressPercentage(session)}%
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Status */}
                  <Grid size={{ xs: 6, md: 1.5 }}>
                    {getStatusChip(session.workflow.status)}
                  </Grid>

                  {/* Date */}
                  <Grid size={{ xs: 6, md: 1.5 }}>
                    <Tooltip title={`Study: ${session.studyInfo.studyDate}`} arrow placement="top">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(session.metadata.lastModified)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Grid>

                  {/* Actions */}
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {/* Primary action - context-aware */}
                      <Tooltip title={session.workflow.status === 'completed' || session.workflow.status === 'finalized' 
                        ? "View completed case in workflow" 
                        : "Continue analysis in workstation"}>
                        <IconButton
                          size="small"
                          onClick={() => handleResumeSession(session.sessionId)}
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                          }}
                        >
                          {session.workflow.status === 'completed' || session.workflow.status === 'finalized' 
                            ? <OpenInNew sx={{ color: theme.palette.primary.main }} />
                            : <PlayCircleOutline sx={{ color: theme.palette.primary.main }} />
                          }
                        </IconButton>
                      </Tooltip>
                      {/* Quick Details Preview */}
                      <Tooltip title="View case summary">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(session)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, session.sessionId)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            );
          })}
        </Stack>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200, borderRadius: 2 },
        }}
      >
        <MenuItem onClick={() => selectedSession && handleExportSession(selectedSession)}>
          <Download sx={{ mr: 1.5, fontSize: 18 }} />
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => selectedSession && handleDuplicateSession(selectedSession)}>
          <ContentCopy sx={{ mr: 1.5, fontSize: 18 }} />
          Duplicate Case
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedSession && handleDeleteClick(selectedSession)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1.5, fontSize: 18 }} />
          Delete Case
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <Typography>
            This action cannot be undone. All data associated with this session will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Case Details Dialog - Quick preview without navigation */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {detailsSession && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Person sx={{ color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {detailsSession.patientInfo.patientId || 'No Patient ID'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detailsSession.patientInfo.name || detailsSession.patientInfo.patientName || 'Unnamed Patient'} • {formatPatientDemographics(detailsSession)}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setDetailsDialogOpen(false)} size="small">
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Grid container spacing={3}>
                {/* Case Summary Card */}
                <Grid size={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                      {/* Status */}
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Status
                        </Typography>
                        {getStatusChip(detailsSession.workflow.status)}
                      </Box>
                      {/* Progress */}
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Progress
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {getProgressPercentage(detailsSession)}% Complete
                        </Typography>
                      </Box>
                      {/* Mode */}
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Workflow Mode
                        </Typography>
                        <Chip 
                          label={detailsSession.workflow.mode === 'quick' ? 'Quick Analysis' : 'Clinical'} 
                          size="small" 
                          color={detailsSession.workflow.mode === 'quick' ? 'warning' : 'primary'}
                          variant="outlined"
                        />
                      </Box>
                      {/* Last Modified */}
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Last Updated
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(detailsSession.metadata.lastModified)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Study Information */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LocalHospital sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                      Study Information
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Modality</Typography>
                        <Typography variant="body2" fontWeight={500}>{getModalityDisplay(detailsSession.studyInfo.modality)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Study Date</Typography>
                        <Typography variant="body2" fontWeight={500}>{detailsSession.studyInfo.studyDate || 'Not specified'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Description</Typography>
                        <Typography variant="body2" fontWeight={500}>{detailsSession.studyInfo.studyDescription || 'N/A'}</Typography>
                      </Box>
                      {detailsSession.studyInfo.institution && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Institution</Typography>
                          <Typography variant="body2" fontWeight={500}>{detailsSession.studyInfo.institution}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                {/* AI Analysis Results */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Psychology sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                      AI Analysis Results
                    </Typography>
                    {detailsSession.storedAnalysisResults ? (
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Classification</Typography>
                          <Chip 
                            label={detailsSession.storedAnalysisResults.prediction.toUpperCase()}
                            size="small"
                            sx={{ 
                              bgcolor: detailsSession.storedAnalysisResults.prediction === 'malignant' 
                                ? alpha(professionalColors.clinical.abnormal.main, 0.15)
                                : alpha(professionalColors.clinical.normal.main, 0.15),
                              color: detailsSession.storedAnalysisResults.prediction === 'malignant'
                                ? professionalColors.clinical.abnormal.dark
                                : professionalColors.clinical.normal.dark,
                              fontWeight: 600,
                            }} 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Confidence</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={detailsSession.storedAnalysisResults.confidence * 100}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                              {(detailsSession.storedAnalysisResults.confidence * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Risk Level</Typography>
                          <Chip 
                            icon={<Warning sx={{ fontSize: 14 }} />}
                            label={detailsSession.storedAnalysisResults.riskLevel?.toUpperCase() || 'N/A'}
                            size="small"
                            sx={{ 
                              bgcolor: detailsSession.storedAnalysisResults.riskLevel === 'high'
                                ? alpha(theme.palette.error.main, 0.15)
                                : detailsSession.storedAnalysisResults.riskLevel === 'moderate'
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(theme.palette.success.main, 0.15),
                              color: detailsSession.storedAnalysisResults.riskLevel === 'high'
                                ? theme.palette.error.dark
                                : detailsSession.storedAnalysisResults.riskLevel === 'moderate'
                                ? theme.palette.warning.dark
                                : theme.palette.success.dark,
                              fontWeight: 600,
                            }} 
                          />
                        </Box>
                        {detailsSession.storedAnalysisResults.explanation?.suspicious_regions?.length > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Suspicious Regions</Typography>
                            <Typography variant="body2" fontWeight={500} color="error.main">
                              {detailsSession.storedAnalysisResults.explanation.suspicious_regions.length} detected
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          AI analysis not performed or results not saved
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Clinical Assessment */}
                <Grid size={12}>
                  <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <AssessmentIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                      Clinical Assessment
                    </Typography>
                    <Grid container spacing={2}>
                      {/* BI-RADS - Most Important */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: detailsSession.assessment?.biradsCategory !== undefined 
                            ? alpha(theme.palette.primary.main, 0.08)
                            : alpha(theme.palette.grey[500], 0.08),
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>BI-RADS Category</Typography>
                          {detailsSession.assessment?.biradsCategory !== undefined ? (
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                              {detailsSession.assessment.biradsCategory}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Not assessed</Typography>
                          )}
                        </Box>
                      </Grid>
                      {/* Images & Findings */}
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.08), textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Images Analyzed</Typography>
                          <Typography variant="h5" fontWeight={600} color="info.main">
                            {detailsSession.images?.length || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: (detailsSession.findings?.length || 0) > 0 
                            ? alpha(professionalColors.clinical.abnormal.main, 0.1)
                            : alpha(theme.palette.success.main, 0.08), 
                          textAlign: 'center' 
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Findings</Typography>
                          <Typography variant="h5" fontWeight={600} sx={{ 
                            color: (detailsSession.findings?.length || 0) > 0 
                              ? professionalColors.clinical.abnormal.main 
                              : theme.palette.success.main 
                          }}>
                            {detailsSession.findings?.length || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      {/* Impression */}
                      {detailsSession.assessment?.impression && (
                        <Grid size={12}>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">Clinical Impression</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                              "{detailsSession.assessment.impression}"
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {/* Recommendation */}
                      {detailsSession.assessment?.recommendation && (
                        <Grid size={12}>
                          <Alert severity="info" icon={<TrendingUp />} sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              Recommendation: {detailsSession.assessment.recommendation}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Workflow Summary - Compact version */}
                {getCompletedSteps(detailsSession).length > 0 && (
                  <Grid size={12}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 18, color: theme.palette.success.main }} />
                        <Typography variant="body2" fontWeight={500}>
                          Workflow {detailsSession.workflow.status === 'completed' || detailsSession.workflow.status === 'finalized' ? 'Completed' : 'In Progress'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {/* Use derived state for completed steps - single source of truth */}
                        {getCompletedSteps(detailsSession)
                          .slice(0, 4) // Show max 4 steps to keep it compact
                          .map((step, index) => (
                          <Chip
                            key={index}
                            label={WorkflowStep[step]?.replace('_', ' ')}
                            size="small"
                            sx={{ 
                              textTransform: 'capitalize',
                              fontSize: '0.7rem',
                              height: 22,
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: theme.palette.success.dark
                            }}
                          />
                        ))}
                        {getCompletedSteps(detailsSession).length > 4 && (
                          <Typography variant="caption" color="text.secondary">
                            +{getCompletedSteps(detailsSession).length - 4} more
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button 
                onClick={() => handleExportSession(detailsSession.sessionId)}
                startIcon={<Download />}
              >
                Export JSON
              </Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
                {detailsSession.workflow.status !== 'completed' && detailsSession.workflow.status !== 'finalized' ? (
                  <Button
                    variant="contained"
                    onClick={() => handleContinueAnalysis(detailsSession.sessionId)}
                    startIcon={<PlayCircleOutline />}
                  >
                    Continue Analysis
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => handleOpenInWorkflow(detailsSession.sessionId)}
                    startIcon={<OpenInNew />}
                  >
                    Open in Workflow
                  </Button>
                )}
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>
      </Container>
    </Box>
  );
};

export default PatientRecords;
