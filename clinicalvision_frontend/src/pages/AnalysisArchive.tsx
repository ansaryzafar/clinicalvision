/**
 * Analysis Archive
 * View, search, and manage all saved analysis results
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  alpha,
  Card,
  CardContent,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  Container,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Delete,
  Visibility,
  Download,
  DeleteSweep,
  Assignment,
  Archive,
  Assessment,
  PriorityHigh,
  FilterList,
  TrendingUp,
  Person,
  CheckCircle,
  Warning,
  OpenInNew,
  Timer,
  VerifiedUser,
  Psychology,
} from '@mui/icons-material';
import {
  getAllAnalyses,
  getStorageStats,
  deleteAnalysis,
  clearAllAnalyses,
  exportAnalysisAsJson,
  exportAllAnalysesAsJson,
  formatTimestamp,
  SavedAnalysis,
} from '../services/analysisStorage';
import { professionalColors } from '../theme/professionalColors';
import { mapConfidenceToBiRads, formatBiRadsDisplay } from '../utils/clinicalMapping';
import { useTheme } from '@mui/material/styles';

export const AnalysisArchive: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  // Eager initialization — avoids flash-of-empty-state by loading synchronous
  // localStorage data before the first paint instead of waiting for useEffect.
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>(() => getAllAnalyses());
  const [filteredAnalyses, setFilteredAnalyses] = useState<SavedAnalysis[]>(() => getAllAnalyses());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<string | null>(null);
  const [predictionFilter, setPredictionFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');

  // Filter and sort analyses
  useEffect(() => {
    let result = [...analyses];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (analysis) =>
          analysis.patientId.toLowerCase().includes(query) ||
          analysis.imageFileName.toLowerCase().includes(query) ||
          analysis.analysisResults.prediction.toLowerCase().includes(query) ||
          analysis.id.toLowerCase().includes(query)
      );
    }
    
    // Apply prediction filter
    if (predictionFilter !== 'all') {
      result = result.filter((analysis) =>
        analysis.analysisResults.prediction.toLowerCase().includes(predictionFilter.toLowerCase())
      );
    }
    
    // Apply sort order
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortOrder === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortOrder === 'confidence-high') {
        return b.analysisResults.confidence - a.analysisResults.confidence;
      } else {
        return a.analysisResults.confidence - b.analysisResults.confidence;
      }
    });
    
    setFilteredAnalyses(result);
  }, [searchQuery, analyses, predictionFilter, sortOrder]);

  const loadAnalyses = () => {
    const loaded = getAllAnalyses();
    setAnalyses(loaded);
    setFilteredAnalyses(loaded);
  };

  const handleDeleteClick = (id: string) => {
    setAnalysisToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (analysisToDelete) {
      deleteAnalysis(analysisToDelete);
      loadAnalyses();
      setDeleteDialogOpen(false);
      setAnalysisToDelete(null);
    }
  };

  const handleClearAll = () => {
    clearAllAnalyses();
    loadAnalyses();
    setClearAllDialogOpen(false);
  };

  const handleViewDetails = (analysis: SavedAnalysis) => {
    setSelectedAnalysis(analysis);
  };

  const handleExport = (analysis: SavedAnalysis) => {
    exportAnalysisAsJson(analysis);
  };

  const handleExportAll = () => {
    exportAllAnalysesAsJson();
  };

  const getRiskColor = (confidence: number, prediction: string) => {
    if (prediction.toLowerCase().includes('malignant') || confidence > 0.8) {
      return professionalColors.clinical.abnormal.main;
    } else if (confidence > 0.5) {
      return professionalColors.clinical.uncertain.main;
    }
    return professionalColors.clinical.normal.main;
  };

  const stats = getStorageStats();
  
  // Compute clinically meaningful metrics (Article: "Report turnaround time... are metrics that already are utilized")
  const flaggedCases = analyses.filter(
    (a) => a.analysisResults.prediction.toLowerCase().includes('malignant')
  ).length;
  
  const benignCases = analyses.filter(
    (a) => a.analysisResults.prediction.toLowerCase().includes('benign')
  ).length;
  
  // Average Model Confidence - Key quality metric for AI reliability
  const avgConfidence = analyses.length > 0
    ? Math.round(
        analyses.reduce((sum, a) => sum + (a.analysisResults.confidence || 0), 0) / analyses.length * 100
      )
    : 0;

  // Handler to navigate to patient records or analysis workstation
  const handleViewInWorkstation = (analysis: SavedAnalysis) => {
    // Navigate to workflow with full archived analysis data pre-loaded
    navigate(ROUTES.WORKFLOW, { 
      state: { 
        patientId: analysis.patientId,
        imageFileName: analysis.imageFileName,
        fromArchive: true,
        archivedAnalysis: analysis,
      } 
    });
    setSelectedAnalysis(null);
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
              <Archive sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  Analysis Archive
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  View, search, and manage all saved analysis results
                </Typography>
              </Box>
            </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportAll}
              disabled={analyses.length === 0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' },
              }}
            >
              Export All
            </Button>
            <Button
              variant="contained"
              startIcon={<DeleteSweep />}
              onClick={() => setClearAllDialogOpen(true)}
              disabled={analyses.length === 0}
              sx={{
                bgcolor: alpha(professionalColors.clinical.abnormal.main, 0.8),
                color: 'white',
                fontWeight: 600,
                '&:hover': { bgcolor: professionalColors.clinical.abnormal.main },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' },
              }}
            >
              Clear All
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Enhanced Stats Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Records Card - Click to show all */}
        <Tooltip
          title={predictionFilter !== 'all' ? 'Click to show all records' : 'Showing all records'}
          placement="top"
          arrow
        >
          <Card
            elevation={0}
            onClick={() => {
              setPredictionFilter('all');
              setSearchQuery('');
            }}
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(theme.palette.primary.main, predictionFilter === 'all' ? 0.3 : 0.12)}`,
              borderRadius: 2.5,
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.4),
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Assessment sx={{ fontSize: 24, color: theme.palette.primary.main }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: 'text.primary',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {stats.totalAnalyses}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 500,
                      mt: 0.25,
                    }}
                  >
                    Total Records
                  </Typography>
                </Box>
                {predictionFilter !== 'all' && (
                  <FilterList sx={{ fontSize: 18, color: 'text.disabled', ml: 'auto' }} />
                )}
            </Stack>
          </CardContent>
        </Card>
        </Tooltip>

        {/* Flagged Cases Card - Clinically Meaningful */}
        <Tooltip
          title={flaggedCases > 0 ? 'Click to filter malignant cases' : 'No flagged cases'}
          placement="top"
          arrow
        >
          <Card
            elevation={0}
            onClick={() => {
              if (flaggedCases > 0) {
                setPredictionFilter('malignant');
              }
            }}
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(flaggedCases > 0 ? professionalColors.clinical.abnormal.main : theme.palette.divider, 0.2)}`,
              borderRadius: 2.5,
              transition: 'all 0.2s ease-in-out',
              cursor: flaggedCases > 0 ? 'pointer' : 'default',
              '&:hover': {
                borderColor: alpha(flaggedCases > 0 ? professionalColors.clinical.abnormal.main : theme.palette.divider, 0.4),
                boxShadow: flaggedCases > 0 ? `0 4px 20px ${alpha(professionalColors.clinical.abnormal.main, 0.15)}` : 'none',
                transform: flaggedCases > 0 ? 'translateY(-2px)' : 'none',
              },
            }}
          >
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(flaggedCases > 0 ? professionalColors.clinical.abnormal.main : theme.palette.text.disabled, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PriorityHigh sx={{ fontSize: 24, color: flaggedCases > 0 ? professionalColors.clinical.abnormal.main : theme.palette.text.disabled }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: flaggedCases > 0 ? professionalColors.clinical.abnormal.main : 'text.primary',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {flaggedCases}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 500,
                      mt: 0.25,
                    }}
                  >
                    Flagged Cases
                  </Typography>
                </Box>
                {flaggedCases > 0 && (
                  <FilterList sx={{ fontSize: 18, color: 'text.disabled', ml: 'auto' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* Avg. Confidence Card - Model Reliability Metric */}
        <Tooltip
          title={analyses.length > 0 ? `Based on ${analyses.length} analyses` : 'No analyses yet'}
          placement="top"
          arrow
        >
          <Card
            elevation={0}
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(
                avgConfidence >= 80 ? professionalColors.clinical.normal.main :
                avgConfidence >= 60 ? professionalColors.clinical.uncertain.main :
                theme.palette.text.disabled,
                0.12
              )}`,
              borderRadius: 2.5,
              transition: 'all 0.2s ease-in-out',
              cursor: 'default',
              '&:hover': {
                borderColor: alpha(
                  avgConfidence >= 80 ? professionalColors.clinical.normal.main :
                  avgConfidence >= 60 ? professionalColors.clinical.uncertain.main :
                  theme.palette.text.disabled,
                  0.3
                ),
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(
                      avgConfidence >= 80 ? professionalColors.clinical.normal.main :
                      avgConfidence >= 60 ? professionalColors.clinical.uncertain.main :
                      theme.palette.text.disabled,
                      0.1
                    ),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ 
                    fontSize: 24, 
                    color: avgConfidence >= 80 ? professionalColors.clinical.normal.main :
                           avgConfidence >= 60 ? professionalColors.clinical.uncertain.main :
                           theme.palette.text.disabled
                  }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: avgConfidence >= 80 ? professionalColors.clinical.normal.main :
                             avgConfidence >= 60 ? professionalColors.clinical.uncertain.main :
                             'text.primary',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {analyses.length > 0 ? `${avgConfidence}%` : '—'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 500,
                      mt: 0.25,
                    }}
                  >
                    Avg. Confidence
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>

        {/* Benign Cases Card - Click to filter */}
        <Tooltip
          title={benignCases > 0 ? 'Click to filter benign cases' : 'No benign cases'}
          placement="top"
          arrow
        >
          <Card
            elevation={0}
            onClick={() => {
              if (benignCases > 0) {
                setPredictionFilter('benign');
              }
            }}
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(benignCases > 0 ? professionalColors.clinical.normal.main : theme.palette.divider, predictionFilter === 'benign' ? 0.4 : 0.2)}`,
              borderRadius: 2.5,
              transition: 'all 0.2s ease-in-out',
              cursor: benignCases > 0 ? 'pointer' : 'default',
              '&:hover': benignCases > 0 ? {
                borderColor: alpha(professionalColors.clinical.normal.main, 0.5),
                boxShadow: `0 4px 20px ${alpha(professionalColors.clinical.normal.main, 0.15)}`,
                transform: 'translateY(-2px)',
              } : {},
            }}
          >
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(benignCases > 0 ? professionalColors.clinical.normal.main : theme.palette.text.disabled, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 24, color: benignCases > 0 ? professionalColors.clinical.normal.main : theme.palette.text.disabled }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: benignCases > 0 ? professionalColors.clinical.normal.main : 'text.primary',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {benignCases}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 500,
                      mt: 0.25,
                    }}
                  >
                    Benign Cases
                  </Typography>
                </Box>
                {predictionFilter === 'benign' && (
                  <FilterList sx={{ fontSize: 18, color: professionalColors.clinical.normal.main, ml: 'auto' }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Tooltip>
      </Stack>

          {/* Search & Filters */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                placeholder="Search by Patient ID, Image Name, Analysis ID..."
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
                  flex: 2,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.default',
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={predictionFilter}
                  onChange={(e: SelectChangeEvent) => setPredictionFilter(e.target.value)}
                  displayEmpty
                  startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />}
                  sx={{
                    bgcolor: 'background.default',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.divider,
                    },
                  }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="benign">Benign</MenuItem>
                  <MenuItem value="malignant">Malignant</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={sortOrder}
                  onChange={(e: SelectChangeEvent) => setSortOrder(e.target.value)}
                  sx={{
                    bgcolor: 'background.default',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.divider,
                    },
                  }}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="confidence-high">Confidence ↓</MenuItem>
                  <MenuItem value="confidence-low">Confidence ↑</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Results Table */}
          {filteredAnalyses.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 8,
                textAlign: 'center',
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                {searchQuery || predictionFilter !== 'all' ? 'No matching analyses found' : 'No saved analyses yet'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {searchQuery || predictionFilter !== 'all'
                  ? 'Try adjusting your search query or filters'
                  : 'Analyses will appear here after you save them from the Analysis Suite'}
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
              }}
            >
              <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Patient ID
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Result
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Risk Level
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      BI-RADS
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Confidence
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Findings
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Review
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAnalyses.map((analysis) => {
                    const riskColor = getRiskColor(
                      analysis.analysisResults.confidence,
                      analysis.analysisResults.prediction
                    );
                    const biRadsKey = mapConfidenceToBiRads(
                      analysis.analysisResults.confidence,
                      analysis.analysisResults.prediction
                    );
                    const findingsCount = analysis.analysisResults.explanation?.suspicious_regions?.length || 0;
                    const riskLevel = analysis.analysisResults.risk_level || 'low';
                    const needsReview = analysis.analysisResults.uncertainty?.requires_human_review;

                    // Risk level color mapping
                    const riskLevelColor = riskLevel === 'high' 
                      ? professionalColors.clinical.abnormal.main 
                      : riskLevel === 'moderate' 
                        ? professionalColors.clinical.uncertain.main 
                        : professionalColors.clinical.normal.main;

                    return (
                      <TableRow
                        key={analysis.id}
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          },
                          // Highlight rows that need review
                          ...(needsReview && {
                            borderLeft: `3px solid ${professionalColors.clinical.uncertain.main}`,
                          }),
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {analysis.patientId}
                              </Typography>
                              <Tooltip title={analysis.imageFileName}>
                                <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                                  {analysis.imageFileName}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(analysis.timestamp).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={analysis.analysisResults.prediction.charAt(0).toUpperCase() + analysis.analysisResults.prediction.slice(1)}
                            size="small"
                            sx={{
                              bgcolor: alpha(riskColor, 0.15),
                              color: riskColor,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                            size="small"
                            sx={{
                              bgcolor: alpha(riskLevelColor, 0.1),
                              color: riskLevelColor,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={formatBiRadsDisplay(biRadsKey)}
                            size="small"
                            sx={{
                              bgcolor: alpha(riskColor, 0.1),
                              color: riskColor,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={analysis.analysisResults.confidence * 100}
                              sx={{
                                width: 50,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha(riskColor, 0.15),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: riskColor,
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40 }}>
                              {(analysis.analysisResults.confidence * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={findingsCount}
                            size="small"
                            sx={{
                              minWidth: 28,
                              bgcolor: findingsCount > 0
                                ? alpha(professionalColors.clinical.abnormal.main, 0.1)
                                : alpha(theme.palette.text.secondary, 0.1),
                              color: findingsCount > 0
                                ? professionalColors.clinical.abnormal.main
                                : 'text.secondary',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {needsReview ? (
                            <Tooltip title="AI uncertainty requires human verification">
                              <Chip
                                icon={<Warning sx={{ fontSize: 14 }} />}
                                label="Required"
                                size="small"
                                sx={{
                                  bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.15),
                                  color: professionalColors.clinical.uncertain.main,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Tooltip title="AI confidence is high">
                              <Chip
                                icon={<VerifiedUser sx={{ fontSize: 14 }} />}
                                label="Complete"
                                size="small"
                                sx={{
                                  bgcolor: alpha(professionalColors.clinical.normal.main, 0.1),
                                  color: professionalColors.clinical.normal.main,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(analysis)}
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                }}
                              >
                                <Visibility sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export JSON">
                              <IconButton
                                size="small"
                                onClick={() => handleExport(analysis)}
                              >
                                <Download sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(analysis.id)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            </Paper>
          )}

      {/* Details Dialog */}
      <Dialog
        open={!!selectedAnalysis}
        onClose={() => setSelectedAnalysis(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {selectedAnalysis && (() => {
            const detailRiskColor = getRiskColor(
              selectedAnalysis.analysisResults.confidence,
              selectedAnalysis.analysisResults.prediction
            );
            const detailBiRads = mapConfidenceToBiRads(
              selectedAnalysis.analysisResults.confidence,
              selectedAnalysis.analysisResults.prediction
            );
            const detailRiskLevel = selectedAnalysis.analysisResults.risk_level || 'low';
            const detailNeedsReview = selectedAnalysis.analysisResults.uncertainty?.requires_human_review;
            
            return (
          <>
            <DialogTitle sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ color: theme.palette.primary.main }} />
              Patient {selectedAnalysis.patientId}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                {/* Clinical Summary - Most important info first */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: alpha(detailRiskColor, 0.05),
                    border: `1px solid ${alpha(detailRiskColor, 0.2)}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment sx={{ fontSize: 18 }} />
                    Clinical Summary
                  </Typography>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                      <Chip
                        label={selectedAnalysis.analysisResults.prediction.charAt(0).toUpperCase() + selectedAnalysis.analysisResults.prediction.slice(1)}
                        sx={{
                          bgcolor: alpha(detailRiskColor, 0.15),
                          color: detailRiskColor,
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          mb: 0.5,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">Result</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ color: detailRiskColor }}>
                        {(selectedAnalysis.analysisResults.confidence * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Confidence</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                      <Chip
                        label={formatBiRadsDisplay(detailBiRads)}
                        size="small"
                        sx={{
                          bgcolor: alpha(detailRiskColor, 0.1),
                          color: detailRiskColor,
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">BI-RADS</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                      <Chip
                        label={detailRiskLevel.charAt(0).toUpperCase() + detailRiskLevel.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: alpha(detailRiskColor, 0.1),
                          color: detailRiskColor,
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">Risk</Typography>
                    </Box>
                  </Stack>
                  
                  {/* Review Status Alert */}
                  {detailNeedsReview && (
                    <Alert 
                      severity="warning" 
                      icon={<Warning />}
                      sx={{ 
                        mt: 2, 
                        bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.1),
                        color: 'text.primary',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        Human Review Required
                      </Typography>
                      <Typography variant="caption">
                        Model uncertainty is elevated. Clinical verification recommended.
                      </Typography>
                    </Alert>
                  )}
                </Paper>

                {/* Findings */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PriorityHigh sx={{ fontSize: 18 }} />
                    Findings ({selectedAnalysis.analysisResults.explanation?.suspicious_regions?.length || 0})
                  </Typography>
                  {(selectedAnalysis.analysisResults.explanation?.suspicious_regions?.length || 0) > 0 ? (
                    <Stack spacing={1}>
                      {selectedAnalysis.analysisResults.explanation?.suspicious_regions?.map((region, idx) => (
                        <Box 
                          key={region.region_id || idx}
                          sx={{ 
                            p: 1.5, 
                            bgcolor: alpha(professionalColors.clinical.abnormal.main, 0.05),
                            borderRadius: 1,
                            border: `1px solid ${alpha(professionalColors.clinical.abnormal.main, 0.1)}`,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              Region {idx + 1}: {region.location || 'Unspecified'}
                            </Typography>
                            <Chip 
                              label={`${(region.attention_score * 100).toFixed(0)}% attention`}
                              size="small"
                              sx={{
                                bgcolor: alpha(professionalColors.clinical.abnormal.main, 0.1),
                                color: professionalColors.clinical.abnormal.main,
                                fontSize: '0.7rem',
                              }}
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No suspicious regions detected.
                    </Typography>
                  )}
                </Paper>

                {/* Uncertainty Metrics - Enhanced Clinical Display */}
                {selectedAnalysis.analysisResults.uncertainty && (() => {
                  const epistemicValue = selectedAnalysis.analysisResults.uncertainty.epistemic_uncertainty * 100;
                  const entropyValue = selectedAnalysis.analysisResults.uncertainty.predictive_entropy;
                  
                  // Color-coded uncertainty levels
                  const getUncertaintyColor = (value: number) => {
                    if (value < 15) return { main: '#10b981', bg: alpha('#10b981', 0.12), label: 'Low' };
                    if (value < 30) return { main: '#f59e0b', bg: alpha('#f59e0b', 0.12), label: 'Moderate' };
                    return { main: '#ef4444', bg: alpha('#ef4444', 0.12), label: 'High' };
                  };
                  
                  const epistemicLevel = getUncertaintyColor(epistemicValue);
                  
                  return (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        borderRadius: 2.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.primary', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            letterSpacing: '0.02em',
                          }}
                        >
                          <Psychology sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                          AI Uncertainty Metrics
                        </Typography>
                        <Tooltip title="MC Dropout uncertainty quantification" arrow>
                          <Chip
                            label="MC Dropout"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main,
                              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                            }}
                          />
                        </Tooltip>
                      </Box>
                      
                      <Stack spacing={2.5}>
                        {/* Epistemic Uncertainty with Progress Bar */}
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Tooltip 
                              title="Model uncertainty — reflects what the model doesn't know due to limited training data"
                              arrow
                              placement="top"
                            >
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'text.secondary',
                                  fontWeight: 500,
                                  cursor: 'help',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                Epistemic Uncertainty
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    fontSize: '0.65rem', 
                                    color: 'text.disabled',
                                    ml: 0.5,
                                  }}
                                >
                                  ⓘ
                                </Box>
                              </Typography>
                            </Tooltip>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={epistemicLevel.label}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  bgcolor: epistemicLevel.bg,
                                  color: epistemicLevel.main,
                                  border: `1px solid ${alpha(epistemicLevel.main, 0.4)}`,
                                }}
                              />
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: epistemicLevel.main,
                                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {epistemicValue.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.divider, 0.3) }}>
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                width: `${Math.min(epistemicValue, 100)}%`,
                                borderRadius: 4,
                                bgcolor: epistemicLevel.main,
                                transition: 'width 0.5s ease-out',
                                boxShadow: `0 0 8px ${alpha(epistemicLevel.main, 0.4)}`,
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Predictive Entropy */}
                        <Box 
                          sx={{ 
                            p: 1.5, 
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Tooltip 
                              title="Information-theoretic measure of prediction spread — lower values indicate more confident predictions"
                              arrow
                              placement="top"
                            >
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'text.secondary',
                                  fontWeight: 500,
                                  cursor: 'help',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                Predictive Entropy
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    fontSize: '0.65rem', 
                                    color: 'text.disabled',
                                    ml: 0.5,
                                  }}
                                >
                                  ⓘ
                                </Box>
                              </Typography>
                            </Tooltip>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 700,
                                color: 'text.primary',
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontSize: '0.9rem',
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                px: 1.5,
                                py: 0.3,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {entropyValue.toFixed(4)}
                              <Box 
                                component="span" 
                                sx={{ 
                                  fontSize: '0.7rem', 
                                  color: 'text.secondary',
                                  fontWeight: 500,
                                }}
                              >
                                nats
                              </Box>
                            </Typography>
                          </Box>
                        </Box>

                        {/* MC Samples Info - Shows real inference data */}
                        {selectedAnalysis.analysisResults.uncertainty.mc_samples && (
                          <Box 
                            sx={{ 
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              pt: 1.5,
                              borderTop: `1px dashed ${alpha(theme.palette.divider, 0.4)}`,
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                fontWeight: 500,
                              }}
                            >
                              MC Forward Passes
                            </Typography>
                            <Chip
                              label={`${selectedAnalysis.analysisResults.uncertainty.mc_samples} samples`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                color: theme.palette.secondary.main,
                              }}
                            />
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  );
                })()}

                {/* Technical Details - Enhanced Code-like Display */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: alpha('#1e293b', theme.palette.mode === 'dark' ? 0.4 : 0.03),
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    borderRadius: 2.5,
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: 'text.secondary', 
                      mb: 2, 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      fontSize: '0.7rem',
                    }}
                  >
                    <Timer sx={{ fontSize: 16, opacity: 0.7 }} />
                    Technical Details
                  </Typography>
                  
                  <Box 
                    sx={{ 
                      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                      fontSize: '0.78rem',
                      lineHeight: 1.9,
                    }}
                  >
                    {/* Analysis Timestamp */}
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.4)}` }}>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#93c5fd' : '#3b82f6',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          minWidth: 130,
                          fontWeight: 500,
                        }}
                      >
                        timestamp
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: 'text.disabled',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          mx: 1,
                        }}
                      >
                        :
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#a5f3fc' : '#0891b2',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {formatTimestamp(selectedAnalysis.timestamp)}
                      </Typography>
                    </Box>

                    {/* Image File */}
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.4)}` }}>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#93c5fd' : '#3b82f6',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          minWidth: 130,
                          fontWeight: 500,
                        }}
                      >
                        image_file
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: 'text.disabled',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          mx: 1,
                        }}
                      >
                        :
                      </Typography>
                      <Tooltip title={selectedAnalysis.imageFileName} arrow>
                        <Typography 
                          component="span"
                          sx={{ 
                            color: theme.palette.mode === 'dark' ? '#fde68a' : '#d97706',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 600,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          "{selectedAnalysis.imageFileName}"
                        </Typography>
                      </Tooltip>
                    </Box>

                    {/* Model Version */}
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.4)}` }}>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#93c5fd' : '#3b82f6',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          minWidth: 130,
                          fontWeight: 500,
                        }}
                      >
                        model_version
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: 'text.disabled',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          mx: 1,
                        }}
                      >
                        :
                      </Typography>
                      <Chip
                        label={selectedAnalysis.analysisResults.model_version || 'unknown'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          fontFamily: 'inherit',
                          bgcolor: selectedAnalysis.analysisResults.model_version 
                            ? alpha(theme.palette.success.main, 0.12)
                            : alpha(theme.palette.warning.main, 0.12),
                          color: selectedAnalysis.analysisResults.model_version 
                            ? theme.palette.success.main
                            : theme.palette.warning.main,
                          border: `1px solid ${alpha(
                            selectedAnalysis.analysisResults.model_version 
                              ? theme.palette.success.main 
                              : theme.palette.warning.main, 
                            0.3
                          )}`,
                        }}
                      />
                    </Box>

                    {/* Inference Time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75 }}>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#93c5fd' : '#3b82f6',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          minWidth: 130,
                          fontWeight: 500,
                        }}
                      >
                        inference_ms
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: 'text.disabled',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          mx: 1,
                        }}
                      >
                        :
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#c4b5fd' : '#7c3aed',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          fontWeight: 700,
                        }}
                      >
                        {selectedAnalysis.analysisResults.inference_time_ms 
                          ? Math.round(selectedAnalysis.analysisResults.inference_time_ms).toLocaleString()
                          : 'null'}
                      </Typography>
                      {selectedAnalysis.analysisResults.inference_time_ms && (
                        <Typography 
                          component="span"
                          sx={{ 
                            color: 'text.disabled',
                            fontFamily: 'inherit',
                            fontSize: '0.7rem',
                            ml: 0.5,
                          }}
                        >
                          ms
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button
                onClick={() => setSelectedAnalysis(null)}
                sx={{ color: 'text.secondary' }}
              >
                Close
              </Button>
              <Button
                onClick={() => handleViewInWorkstation(selectedAnalysis)}
                startIcon={<OpenInNew />}
                variant="outlined"
                color="primary"
              >
                Re-analyze
              </Button>
              <Button
                onClick={() => handleExport(selectedAnalysis)}
                startIcon={<Download />}
                variant="contained"
                color="primary"
              >
                Export
              </Button>
            </DialogActions>
          </>
            );
          })()}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          Delete Analysis?
        </DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            sx={{
              bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.1),
              color: 'text.primary',
            }}
          >
            This action cannot be undone. The analysis will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              bgcolor: professionalColors.clinical.abnormal.main,
              '&:hover': {
                bgcolor: professionalColors.clinical.abnormal.dark,
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          Clear All Analyses?
        </DialogTitle>
        <DialogContent>
          <Alert
            severity="error"
            sx={{
              bgcolor: alpha(professionalColors.clinical.abnormal.main, 0.1),
              color: 'text.primary',
            }}
          >
            This will permanently delete all {analyses.length} saved analyses. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setClearAllDialogOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearAll}
            variant="contained"
            startIcon={<DeleteSweep />}
            sx={{
              bgcolor: professionalColors.clinical.abnormal.main,
              '&:hover': {
                bgcolor: professionalColors.clinical.abnormal.dark,
              },
            }}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};
