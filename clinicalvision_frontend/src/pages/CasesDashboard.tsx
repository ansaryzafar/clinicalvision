/**
 * Cases Dashboard
 * View, manage, and search all clinical analysis sessions
 * 
 * Design Principles (Paton et al. 2021 + Nielsen Heuristics):
 * - #1 Visibility: Clear session status and progress indicators
 * - #4 Consistency: Matches professional theme styling
 * - #7 Flexibility: Multiple views and filtering options
 * - #8 Aesthetic: Clean, scannable design with proper spacing
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Alert,
  Stack,
  Card,
  CardContent,
  Tooltip,
  LinearProgress,
  alpha,
  Container,
} from '@mui/material';
import {
  Search,
  Delete,
  Download,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  FolderOpen,
  HourglassTop,
  PlayCircleOutline,
  Refresh,
  Sort,
  PriorityHigh,
  Person,
  Assignment,
  Biotech,
  FilterList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { useLegacyWorkflow } from '../workflow-v3';
import { clinicalSessionService } from '../services/clinicalSession.service';
import { AnalysisSession, WorkflowMode, getRiskLevel, getNumericBirads } from '../types/clinical.types';
import { getCompletionPercentage as getDerivedCompletionPercentage } from '../utils/workflowUtils';
import { professionalColors } from '../theme/professionalColors';
import { useTheme } from '@mui/material/styles';

export const CasesDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { loadSession, createNewSession } = useLegacyWorkflow();
  
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<AnalysisSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'priority'>('recent');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load all sessions on mount
  useEffect(() => {
    refreshSessions();
  }, []);

  // Helper: Calculate priority score for AI-based worklist sorting
  // Article: "ML-based worklist prioritization by identifying key factors responsible for workflow outcomes"
  const getPriorityScore = (session: AnalysisSession): number => {
    let score = 0;
    
    // High risk findings = highest priority
    const hasHighRisk = session.findings?.some(f => 
      getRiskLevel(f.biradsCategory) === 'high' || getNumericBirads(f.biradsCategory) >= 4
    );
    if (hasHighRisk) score += 100;
    
    // Moderate risk = medium priority
    const hasModerateRisk = session.findings?.some(f => 
      getRiskLevel(f.biradsCategory) === 'moderate' || getNumericBirads(f.biradsCategory) === 3
    );
    if (hasModerateRisk) score += 50;
    
    // In-progress cases need attention
    if (session.workflow.status === 'in-progress') score += 30;
    
    // Pending cases waiting
    if (session.workflow.status === 'pending') score += 20;
    
    // Older cases get slight priority boost (avoid stale cases)
    const ageInDays = (Date.now() - new Date(session.metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 7) score += 15;
    if (ageInDays > 3) score += 10;
    
    return score;
  };

  // Filter and sort sessions based on search query and sort mode
  useEffect(() => {
    let result = [...sessions];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (session) =>
          session.patientInfo.patientId?.toLowerCase().includes(query) ||
          session.patientInfo.name?.toLowerCase().includes(query) ||
          session.studyInfo.studyId?.toLowerCase().includes(query) ||
          session.studyInfo.studyDate?.includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        result = result.filter((s) => s.workflow.status === 'completed' || s.workflow.status === 'finalized');
      } else {
        result = result.filter((s) => s.workflow.status === statusFilter);
      }
    }
    
    // Apply sort mode
    if (sortMode === 'priority') {
      // AI Priority Queue: Sort by risk + status + age
      result.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    } else {
      // Recent: Sort by last modified
      result.sort((a, b) => 
        new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime()
      );
    }
    
    setFilteredSessions(result);
  }, [searchQuery, sessions, statusFilter, sortMode]);

  const refreshSessions = () => {
    const allSessions = clinicalSessionService.getAllSessions();
    // Initial sort by last modified (most recent first)
    allSessions.sort(
      (a: AnalysisSession, b: AnalysisSession) =>
        new Date(b.metadata.lastModified).getTime() -
        new Date(a.metadata.lastModified).getTime()
    );
    setSessions(allSessions);
  };

  const handleCreateNew = () => {
    createNewSession();
    navigate(ROUTES.WORKFLOW);
  };

  const handleViewSession = (sessionId: string) => {
    loadSession(sessionId);
    navigate(ROUTES.WORKFLOW);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      clinicalSessionService.deleteSession(sessionToDelete);
      refreshSessions();
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
  };

  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'error' | 'default' | 'info'; icon: React.ReactNode; label: string }> = {
      completed: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Completed' },
      'in-progress': { color: 'warning', icon: <HourglassTop sx={{ fontSize: 16 }} />, label: 'In Progress' },
      pending: { color: 'default', icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Pending' },
      finalized: { color: 'info', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Finalized' },
    };
    const config = configs[status] || { color: 'default', icon: <ErrorIcon sx={{ fontSize: 16 }} />, label: status };
    return (
      <Chip
        icon={config.icon as React.ReactElement}
        label={config.label}
        size="small"
        color={config.color}
        variant="outlined"
        sx={{ fontWeight: 500 }}
      />
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString();
  };

  const getCompletionPercentage = (session: AnalysisSession): number => {
    // Use derived state from workflowUtils - single source of truth
    // Default to 'quick' mode (3 steps) if mode is not set - matches app default
    const mode: WorkflowMode = session.workflow?.mode || 'quick';
    return getDerivedCompletionPercentage(session, mode);
  };

  // Calculate stats
  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.workflow.status === 'completed' || s.workflow.status === 'finalized').length,
    inProgress: sessions.filter((s) => s.workflow.status === 'in-progress').length,
    pending: sessions.filter((s) => s.workflow.status === 'pending').length,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        {/* Page Header */}
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
              <FolderOpen sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  Cases Dashboard
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  Manage and track all clinical analysis sessions
                </Typography>
              </Box>
            </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title={sortMode === 'priority' ? 'Sorted by AI Priority' : 'Sort by AI Priority'}>
              <IconButton 
                onClick={() => setSortMode(sortMode === 'priority' ? 'recent' : 'priority')}
                sx={{ 
                  color: 'white', 
                  bgcolor: sortMode === 'priority' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                {sortMode === 'priority' ? <PriorityHigh /> : <Sort />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh list">
              <IconButton 
                onClick={refreshSessions}
                sx={{ 
                  color: 'white', 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button 
              variant="contained" 
              startIcon={<Biotech />} 
              onClick={handleCreateNew}
              sx={{
                bgcolor: 'white',
                color: theme.palette.primary.main,
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: alpha('#FFFFFF', 0.9) },
              }}
            >
              New Case
            </Button>
          </Stack>
        </Box>
        {/* Priority Mode Indicator */}
        {sortMode === 'priority' && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PriorityHigh sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              AI Priority Queue Active — High-risk and pending cases shown first
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Interactive Stats Cards - Click to filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Total Cases - Click to reset filters */}
        <Tooltip title={statusFilter !== 'all' ? 'Click to show all cases' : 'Showing all cases'} arrow>
          <Card
            elevation={0}
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            sx={{
              flex: 1,
              bgcolor: alpha(theme.palette.primary.main, statusFilter === 'all' ? 0.12 : 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, statusFilter === 'all' ? 0.3 : 0.2)}`,
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
                    Total Cases
                  </Typography>
                </Box>
                {statusFilter !== 'all' && (
                  <FilterList sx={{ fontSize: 18, color: 'text.disabled' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* Completed - Click to filter */}
        <Tooltip title={statusFilter === 'completed' ? 'Showing completed cases' : 'Click to filter completed'} arrow>
          <Card
            elevation={0}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
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

        {/* In Progress - Click to filter */}
        <Tooltip title={statusFilter === 'in-progress' ? 'Showing in-progress cases' : 'Click to filter in-progress'} arrow>
          <Card
            elevation={0}
            onClick={() => setStatusFilter(statusFilter === 'in-progress' ? 'all' : 'in-progress')}
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

        {/* Pending - Click to filter */}
        <Tooltip title={statusFilter === 'pending' ? 'Showing pending cases' : stats.pending > 0 ? 'Click to filter pending' : 'No pending cases'} arrow>
          <Card
            elevation={0}
            onClick={() => stats.pending > 0 && setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            sx={{
              flex: 1,
              bgcolor: alpha(theme.palette.text.secondary, statusFilter === 'pending' ? 0.15 : 0.08),
              border: `1px solid ${alpha(theme.palette.text.secondary, statusFilter === 'pending' ? 0.4 : 0.2)}`,
              borderRadius: 2,
              cursor: stats.pending > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              '&:hover': stats.pending > 0 ? {
                borderColor: alpha(theme.palette.text.secondary, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.text.secondary, 0.15)}`,
              } : {},
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: theme.palette.text.secondary, display: 'flex' }}><HourglassEmpty /></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.text.secondary }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
                {statusFilter === 'pending' && (
                  <FilterList sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>
      </Stack>

      {/* Search Bar */}
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
        <TextField
          fullWidth
          placeholder="Search by Patient ID, Name, Study ID, or Date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default',
            },
          }}
        />
      </Paper>

      {/* Cases Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        }}
      >
        {filteredSessions.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                {searchQuery ? 'No Matching Cases' : 'No Cases Yet'}
              </Typography>
              <Typography variant="body2">
                {searchQuery
                  ? 'Try adjusting your search criteria.'
                  : 'Create a new case to get started with your analysis.'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Biotech />}
                  onClick={handleCreateNew}
                  sx={{ mt: 2 }}
                >
                  Create First Case
                </Button>
              )}
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.paper' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Study Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Modality</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Findings</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Last Modified</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow 
                    key={session.sessionId} 
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {session.patientInfo.patientId || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.patientInfo.name || 'No name'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {session.studyInfo.studyDate || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={session.studyInfo.modality || 'MG'} 
                        size="small" 
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 500,
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.findings.length}
                        size="small"
                        sx={{
                          minWidth: 32,
                          bgcolor: session.findings.length > 0 
                            ? alpha(professionalColors.clinical.abnormal.main, 0.1)
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: session.findings.length > 0
                            ? professionalColors.clinical.abnormal.main
                            : theme.palette.text.secondary,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>{getStatusChip(session.workflow.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={getCompletionPercentage(session)}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: session.workflow.status === 'completed' 
                                ? professionalColors.clinical.normal.main 
                                : theme.palette.primary.main,
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={600} sx={{ minWidth: 32 }}>
                          {getCompletionPercentage(session)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(session.metadata.lastModified)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Continue Session">
                          <IconButton
                            size="small"
                            onClick={() => handleViewSession(session.sessionId)}
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                            }}
                          >
                            <PlayCircleOutline sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Export">
                          <IconButton
                            size="small"
                            onClick={() => handleExportSession(session.sessionId)}
                          >
                            <Download sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(session.sessionId)}
                            sx={{
                              '&:hover': { bgcolor: alpha(professionalColors.clinical.abnormal.main, 0.1) },
                            }}
                          >
                            <Delete sx={{ fontSize: 18, color: professionalColors.clinical.abnormal.main }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Case?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This action cannot be undone. All data associated with this case will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};
