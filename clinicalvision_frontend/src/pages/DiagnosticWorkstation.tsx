import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Button, Tooltip, Alert, Collapse, alpha, Chip, Stack, useTheme, Container } from '@mui/material';
import { ArrowForward, MedicalServices, Info, Refresh, OpenInNew, CheckCircle, Speed, Restore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { ImageUpload } from '../components/upload/ImageUpload';
import { AnalysisResults } from '../components/results/AnalysisResults';
import { MedicalViewer } from '../components/viewer/MedicalViewer';
import { WorkflowStepper } from '../components/workflow/WorkflowStepper';
import { AutoSaveStatus } from '../components/workflow/AutoSaveStatus';
import { InferenceResponse, api } from '../services/api';
// V3 Workflow - Use legacy adapter for backward compatibility
import { useLegacyWorkflow } from '../workflow-v3';
import { WorkflowStep, WorkflowMode, StoredAnalysisResult } from '../types/clinical.types';
import { professionalColors } from '../theme/professionalColors';

/**
 * DiagnosticWorkstation - Main Analysis Page with Integrated Workflow
 * 
 * Design Principles (Paton et al. 2021):
 * - Flexibility and efficiency of use (Nielsen #7): Quick vs Clinical mode
 * - Visibility of system status (Nielsen #1): Clear progress indication
 * - Error prevention (Nielsen #5): Validate before advancing
 * - Recognition rather than recall (Nielsen #6): Clear mode descriptions
 * - User control and freedom (Nielsen #3): Session resume capability
 */

export const DiagnosticWorkstation: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { 
    currentSession, 
    updateSessionData, 
    advanceToStep, 
    createNewSession,
    workflowMode,
    setWorkflowMode,
    // markStepCompleted removed - completion is DERIVED from session data
    error,
    clearError,
  } = useLegacyWorkflow();
  
  const [analysisResults, setAnalysisResults] = useState<InferenceResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [restoredImagePreview, setRestoredImagePreview] = useState<string | null>(null);
  
  // Track which session we've already restored to prevent double-restore
  const restoredSessionIdRef = useRef<string | null>(null);
  
  // Track pending session data to save (avoids stale closure issues)
  const pendingSessionDataRef = useRef<{
    results: InferenceResponse;
    file: File;
    imageDataUrl?: string;
    thumbnail?: string;
  } | null>(null);

  // Track what has been synced to backend to avoid double-sync
  const backendSyncedRef = useRef<{
    analysisSessionId: string | null;
    imageSessionId: string | null;
    findingsSessionId: string | null;
  }>({ analysisSessionId: null, imageSessionId: null, findingsSessionId: null });

  /**
   * CRITICAL: Restore session state on mount and when session changes
   * This enables true "resume from where you left off" functionality
   * Implements "Recognition rather than recall" (Nielsen #6)
   */
  useEffect(() => {
    // Only restore if:
    // 1. We have a session with stored results
    // 2. We haven't already restored this specific session
    // 3. We don't already have analysis results displayed
    const sessionId = currentSession?.sessionId;
    const hasStoredResults = currentSession?.storedAnalysisResults;
    const alreadyRestored = restoredSessionIdRef.current === sessionId;
    
    console.log('🔍 Session restore check:', { 
      sessionId, 
      hasStoredResults: !!hasStoredResults, 
      alreadyRestored,
      hasAnalysisResults: !!analysisResults 
    });
    
    if (sessionId && hasStoredResults && !alreadyRestored && !analysisResults) {
      console.log('📥 Restoring session analysis results...');
      
      // Mark this session as restored to prevent double-restore
      restoredSessionIdRef.current = sessionId;
      
      // Convert stored results back to InferenceResponse format
      const storedExplanation = currentSession.storedAnalysisResults!.explanation;
      const restoredResults: InferenceResponse = {
        prediction: currentSession.storedAnalysisResults!.prediction,
        confidence: currentSession.storedAnalysisResults!.confidence,
        probabilities: currentSession.storedAnalysisResults!.probabilities,
        risk_level: currentSession.storedAnalysisResults!.riskLevel,
        inference_time_ms: currentSession.storedAnalysisResults!.processingTimeMs || 0,
        model_version: currentSession.storedAnalysisResults!.modelVersion || 'v12',
        explanation: {
          suspicious_regions: (storedExplanation?.suspicious_regions || []).map(r => ({
            ...r,
            bbox: r.bbox as [number, number, number, number],
          })),
          attention_summary: storedExplanation?.attention_summary,
          narrative: '',
          confidence_explanation: '',
        },
      } as unknown as InferenceResponse;
      
      setAnalysisResults(restoredResults);
      setIsRestoredSession(true);
      
      // Restore image preview if available
      const primaryImage = currentSession.images?.[0];
      if (primaryImage?.imageDataUrl) {
        setRestoredImagePreview(primaryImage.imageDataUrl);
        console.log('✅ Image data URL restored');
      } else if (primaryImage?.thumbnail) {
        setRestoredImagePreview(primaryImage.thumbnail);
        console.log('✅ Thumbnail restored');
      }
      
      console.log('✅ Session restored successfully:', sessionId);
    }
  }, [currentSession, analysisResults]); // Run when session changes OR when results are cleared

  /**
   * Process pending session data when session becomes available
   * This avoids stale closure issues with setTimeout
   */
  useEffect(() => {
    const pendingData = pendingSessionDataRef.current;
    
    // Only proceed if we have both a session and pending data
    if (!currentSession || !pendingData) return;
    
    console.log('📝 Processing pending session data for:', currentSession.sessionId);
    
    const { results, file, imageDataUrl, thumbnail } = pendingData;
    
    // Clear the pending data immediately to prevent double processing
    pendingSessionDataRef.current = null;
    
    // Store the analysis results for session resume
    const storedAnalysisResults: StoredAnalysisResult = {
      prediction: results.prediction as 'benign' | 'malignant',
      confidence: results.confidence,
      probabilities: results.probabilities,
      riskLevel: results.risk_level as 'low' | 'moderate' | 'high',
      processingTimeMs: results.inference_time_ms,
      modelVersion: results.model_version,
      explanation: results.explanation ? {
        suspicious_regions: results.explanation.suspicious_regions.map(r => ({
          bbox: r.bbox as [number, number, number, number],
          attention_score: r.attention_score,
          description: r.location,
        })),
        attention_summary: (results.explanation as any).attention_summary,
      } : undefined,
      analyzedAt: new Date().toISOString(),
    };

    updateSessionData({
      images: [
        {
          imageId: `img_${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          viewType: 'CC', // Default, should be detected or selected
          laterality: 'L', // Default, should be detected or selected
          analyzed: true,
          analysisDate: new Date().toISOString(),
          imageDataUrl: imageDataUrl, // Full image for persistence
          thumbnail: thumbnail, // Smaller thumbnail for quick preview
        },
      ],
      // Store analysis results for session resume capability
      storedAnalysisResults: storedAnalysisResults,
      findings: results.explanation?.suspicious_regions?.map((region: any, index: number) => ({
        findingId: `finding_${Date.now()}_${index}`,
        findingType: 'mass' as const,
        location: {
          clockPosition: 12,
          distanceFromNipple: 0,
        },
        coordinates: {
          x: region.bbox[0],
          y: region.bbox[1],
          width: region.bbox[2],
          height: region.bbox[3],
        },
        aiConfidence: region.attention_score,
        aiAttentionScore: region.attention_score,
        status: 'pending' as const,
      })) || [],
    });
    
    // NOTE: markStepCompleted() calls removed - completion is DERIVED from session data
    // UPLOAD is complete because session.images.length > 0
    // AI_ANALYSIS is complete because session.storedAnalysisResults exists
    
    // Just navigate to AI Analysis step
    advanceToStep(WorkflowStep.AI_ANALYSIS);
    
    console.log('✅ Session saved with analysis results and image data for resume capability');
  }, [currentSession]); // Only run when session changes

  /**
   * BACKEND SYNC: Persist analysis results, images, and findings to PostgreSQL
   * This runs after analysis results are stored in the local session.
   * It ensures data is durably stored in the backend database, not just localStorage.
   */
  useEffect(() => {
    if (!currentSession || !analysisResults) return;
    
    const sessionId = currentSession.sessionId;
    if (!sessionId) return;
    
    // Don't re-sync for the same session
    if (backendSyncedRef.current.analysisSessionId === sessionId) return;
    
    // Mark as synced immediately to prevent double-sync
    backendSyncedRef.current.analysisSessionId = sessionId;
    
    const syncToBackend = async () => {
      try {
        console.log('🔄 Syncing analysis data to backend database...');
        
        // 1. Create a case in the backend for this analysis session
        const caseResponse = await api.createCase({
          patient_mrn: currentSession.patientInfo?.patientId || undefined,
          patient_first_name: currentSession.patientInfo?.name?.split(' ')[0] || undefined,
          patient_last_name: currentSession.patientInfo?.name?.split(' ').slice(1).join(' ') || undefined,
          clinical_history: {
            workflow_session_id: sessionId,
            analysis_mode: workflowMode,
            created_from: 'diagnostic_workstation',
          },
        });
        
        const backendCaseId = caseResponse.id;
        console.log(`✅ Backend case created: ${caseResponse.case_number} (id: ${backendCaseId})`);
        
        // 2. Store analysis results on the case
        try {
          await api.storeAnalysisResults(backendCaseId, {
            prediction: analysisResults.prediction,
            confidence: analysisResults.confidence,
            probabilities: analysisResults.probabilities,
            risk_level: analysisResults.risk_level,
            processing_time_ms: analysisResults.inference_time_ms,
            model_version: analysisResults.model_version,
            explanation: analysisResults.explanation ? {
              suspicious_regions: analysisResults.explanation.suspicious_regions,
              narrative: analysisResults.explanation.narrative,
              confidence_explanation: analysisResults.explanation.confidence_explanation,
            } : undefined,
            uncertainty: analysisResults.uncertainty ? {
              epistemic_uncertainty: analysisResults.uncertainty.epistemic_uncertainty,
              predictive_entropy: analysisResults.uncertainty.predictive_entropy,
              requires_human_review: analysisResults.uncertainty.requires_human_review,
            } : undefined,
          });
          console.log('✅ Analysis results synced to backend');
        } catch (err) {
          console.warn('⚠️ Failed to sync analysis results:', err);
        }
        
        // 3. Add image record to the case
        const primaryImage = currentSession.images?.[0];
        if (primaryImage) {
          try {
            await api.addImageToCase(backendCaseId, {
              filename: primaryImage.fileName || 'mammogram.png',
              view_type: primaryImage.viewType || 'CC',
              laterality: primaryImage.laterality || 'L',
              upload_status: 'completed',
              file_size: primaryImage.fileSize || undefined,
              mime_type: 'image/png',
              analysis_result: currentSession.storedAnalysisResults ? {
                prediction: currentSession.storedAnalysisResults.prediction,
                confidence: currentSession.storedAnalysisResults.confidence,
                probabilities: currentSession.storedAnalysisResults.probabilities,
                riskLevel: currentSession.storedAnalysisResults.riskLevel,
                modelVersion: currentSession.storedAnalysisResults.modelVersion,
              } : undefined,
            });
            console.log('✅ Image record synced to backend');
          } catch (err) {
            console.warn('⚠️ Failed to sync image record:', err);
          }
        }
        
        // 4. Add findings to the case
        const findings = currentSession.findings || [];
        for (const finding of findings) {
          try {
            await api.addFindingToCase(backendCaseId, {
              finding_type: finding.findingType || 'mass',
              laterality: finding.location?.breast === 'right' ? 'R' : 'L',
              description: `AI-detected region (confidence: ${(finding.aiConfidence || 0).toFixed(2)})`,
              location: finding.location ? {
                clock_position: finding.location.clockPosition,
                distance_from_nipple: finding.location.distanceFromNipple,
              } : undefined,
              size: finding.coordinates ? {
                x: finding.coordinates.x,
                y: finding.coordinates.y,
                width: finding.coordinates.width,
                height: finding.coordinates.height,
              } : undefined,
              ai_confidence: finding.aiConfidence || finding.aiAttentionScore || 0,
              ai_generated: true,
            });
          } catch (err) {
            console.warn('⚠️ Failed to sync finding:', err);
          }
        }
        if (findings.length > 0) {
          console.log(`✅ ${findings.length} findings synced to backend`);
        }
        
        console.log('🎉 All analysis data successfully persisted to backend database');
        
      } catch (err) {
        console.error('❌ Backend sync failed (data still in localStorage):', err);
        // Reset sync flag so it can be retried
        backendSyncedRef.current.analysisSessionId = null;
      }
    };
    
    // Run sync after a brief delay to let the case creation settle
    const timer = setTimeout(syncToBackend, 1000);
    return () => clearTimeout(timer);
  }, [currentSession, analysisResults, workflowMode]);

  /**
   * Create session only when user takes first action (uploads image)
   * This prevents orphan sessions and follows "User control and freedom" (Nielsen #3)
   */
  const ensureSession = () => {
    if (!currentSession) {
      createNewSession({
        workflow: {
          mode: workflowMode,
          currentStep: WorkflowStep.UPLOAD,
          completedSteps: [],
          status: 'in-progress',
          startedAt: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * Handle workflow mode change
   * Implements "Flexibility and efficiency of use" (Nielsen #7)
   */
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: WorkflowMode | null) => {
    if (newMode) {
      setWorkflowMode(newMode);
      // If session exists, update its mode
      if (currentSession) {
        updateSessionData({
          workflow: {
            ...currentSession.workflow,
            mode: newMode,
          },
        });
      }
    }
  };

  /**
   * Convert File to Base64 data URL for persistence
   */
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Generate thumbnail from image (smaller for quick loading)
   */
  const generateThumbnail = (dataUrl: string, maxSize: number = 200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  };

  /**
   * Handle successful upload and analysis
   * Creates session on first upload (lazy initialization)
   * NOW STORES image data and analysis results for session persistence
   */
  const handleUploadComplete = async (results: InferenceResponse, file: File) => {
    // Ensure session exists before storing results
    ensureSession();
    
    setAnalysisResults(results);
    setUploadedFile(file);
    setIsRestoredSession(false); // This is a new analysis, not restored

    // Convert file to data URL for persistence
    let imageDataUrl: string | undefined;
    let thumbnail: string | undefined;
    
    try {
      imageDataUrl = await fileToDataUrl(file);
      thumbnail = await generateThumbnail(imageDataUrl);
    } catch (err) {
      console.warn('Could not persist image data:', err);
    }

    // Store pending data in ref - will be processed by useEffect when session is available
    // This avoids stale closure issues with setTimeout
    pendingSessionDataRef.current = {
      results,
      file,
      imageDataUrl,
      thumbnail,
    };
    
    // If session already exists (wasn't just created), process immediately
    if (currentSession) {
      console.log('📝 Session already exists, triggering immediate save');
      // Force a re-render to trigger the useEffect
      // The useEffect will detect pendingData and process it
    }
  };

  /**
   * Handle upload error
   */
  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setAnalysisResults(null);
  };

  /**
   * Reset analysis and workflow to initial state
   */
  const handleReset = () => {
    // Clear current analysis state first
    setAnalysisResults(null);
    setUploadedFile(null);
    setIsRestoredSession(false);
    setRestoredImagePreview(null);
    restoredSessionIdRef.current = null; // Allow restoration of a different session
    backendSyncedRef.current = { analysisSessionId: null, imageSessionId: null, findingsSessionId: null }; // Reset sync tracker
    clearError();
    
    // Create a fresh session with reset workflow state
    createNewSession({
      workflow: {
        mode: workflowMode,
        currentStep: WorkflowStep.UPLOAD,
        completedSteps: [],
        status: 'in-progress',
        startedAt: new Date().toISOString(),
      },
    });
  };

  /**
   * Continue to next workflow step based on mode
   * After AI Analysis, the natural next step is Patient Info
   * (User can still navigate directly to Measurements/Assessment via tabs)
   */
  const handleContinueWorkflow = () => {
    // Check if Patient Info is already filled
    const hasPatientInfo = currentSession?.patientInfo?.patientId?.trim();
    
    if (hasPatientInfo) {
      // Patient Info already done - go to next step based on mode
      if (workflowMode === 'quick') {
        advanceToStep(WorkflowStep.ASSESSMENT);
      } else {
        advanceToStep(WorkflowStep.MEASUREMENTS);
      }
    } else {
      // Patient Info not filled - guide user there first
      advanceToStep(WorkflowStep.PATIENT_INFO);
    }
    navigate(ROUTES.WORKFLOW);
  };

  /**
   * Get the correct button label based on workflow state
   */
  const getContinueButtonLabel = () => {
    const hasPatientInfo = currentSession?.patientInfo?.patientId?.trim();
    if (!hasPatientInfo) {
      return 'Continue to Patient Info';
    }
    return workflowMode === 'quick' ? 'Continue to Assessment' : 'Continue to Measurements';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Restored Session Alert - Show when resuming a previous session */}
        {isRestoredSession && (
          <Alert 
            severity="info" 
            icon={<Restore />}
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleReset}>
                Start Fresh
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={500}>
              Session restored from your previous analysis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentSession?.images?.[0]?.fileName} • Analyzed {currentSession?.storedAnalysisResults?.analyzedAt 
                ? new Date(currentSession.storedAnalysisResults.analyzedAt).toLocaleString() 
                : 'previously'}
            </Typography>
          </Alert>
        )}

        {/* Error Alert - Implements "Help users recover from errors" (Nielsen #9) */}
      <Collapse in={!!error}>
        <Alert 
          severity="warning" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      </Collapse>

      {/* Auto-save status */}
      {currentSession && analysisResults && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <AutoSaveStatus />
        </Box>
      )}

      {/* Workflow stepper - show when session exists and analysis is complete */}
      {currentSession && analysisResults && <WorkflowStepper />}

      {/* Page Header with Enhanced Mode Selector */}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                textShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              Mammogram Analysis
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500,
                color: 'rgba(255,255,255,0.95)',
                maxWidth: 500,
              }}
            >
              Upload a mammogram image for AI-powered breast cancer detection analysis
            </Typography>
          </Box>
          
          {/* Enhanced Workflow Mode Selector */}
          {!analysisResults && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5 }}>
              {/* Mode Label */}
              <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                Analysis Mode
              </Typography>
              
              {/* Enhanced Toggle Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Quick Mode Button */}
                <Paper
                  elevation={0}
                  onClick={() => handleModeChange(null as any, 'quick')}
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    bgcolor: workflowMode === 'quick' 
                      ? 'rgba(255,255,255,0.25)' 
                      : 'rgba(255,255,255,0.08)',
                    border: workflowMode === 'quick'
                      ? '2px solid rgba(255,255,255,0.5)'
                      : '2px solid transparent',
                    '&:hover': {
                      bgcolor: workflowMode === 'quick' 
                        ? 'rgba(255,255,255,0.3)' 
                        : 'rgba(255,255,255,0.15)',
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Speed sx={{ fontSize: 22, color: workflowMode === 'quick' ? '#FFD700' : 'rgba(255,255,255,0.8)' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                        Quick
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
                        ~2 min
                      </Typography>
                    </Box>
                    {workflowMode === 'quick' && (
                      <CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />
                    )}
                  </Stack>
                </Paper>
                
                {/* Clinical Mode Button */}
                <Paper
                  elevation={0}
                  onClick={() => handleModeChange(null as any, 'clinical')}
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    bgcolor: workflowMode === 'clinical' 
                      ? 'rgba(255,255,255,0.25)' 
                      : 'rgba(255,255,255,0.08)',
                    border: workflowMode === 'clinical'
                      ? '2px solid rgba(255,255,255,0.5)'
                      : '2px solid transparent',
                    '&:hover': {
                      bgcolor: workflowMode === 'clinical' 
                        ? 'rgba(255,255,255,0.3)' 
                        : 'rgba(255,255,255,0.15)',
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <MedicalServices sx={{ fontSize: 22, color: workflowMode === 'clinical' ? '#4FC3F7' : 'rgba(255,255,255,0.8)' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                        Clinical
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
                        Full workflow
                      </Typography>
                    </Box>
                    {workflowMode === 'clinical' && (
                      <CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />
                    )}
                  </Stack>
                </Paper>
              </Box>

              {/* Info Toggle */}
              <Button
                size="small"
                startIcon={<Info sx={{ fontSize: 16 }} />}
                onClick={() => setShowModeInfo(!showModeInfo)}
                sx={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                {showModeInfo ? 'Hide details' : 'Compare modes'}
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Enhanced Mode Information Panel */}
        <Collapse in={showModeInfo && !analysisResults}>
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {/* Quick Mode Card */}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: workflowMode === 'quick' ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.15)',
                  border: workflowMode === 'quick' ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Speed sx={{ color: '#FFD700', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>
                    Quick Analysis
                  </Typography>
                  {workflowMode === 'quick' && (
                    <Chip label="Selected" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', height: 20, fontSize: '0.65rem' }} />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2, lineHeight: 1.5 }}>
                  Fast screening for immediate results. Perfect for initial assessments and urgent reviews.
                </Typography>
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Upload & AI Analysis</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Instant predictions</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>Optional patient info</Typography>
                  </Stack>
                </Stack>
              </Paper>

              {/* Clinical Mode Card */}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: workflowMode === 'clinical' ? 'rgba(79,195,247,0.15)' : 'rgba(0,0,0,0.15)',
                  border: workflowMode === 'clinical' ? '1px solid rgba(79,195,247,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <MedicalServices sx={{ color: '#4FC3F7', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>
                    Clinical Workflow
                  </Typography>
                  {workflowMode === 'clinical' && (
                    <Chip label="Selected" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', height: 20, fontSize: '0.65rem' }} />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2, lineHeight: 1.5 }}>
                  Complete diagnostic workflow with full documentation, BI-RADS assessment, and report generation.
                </Typography>
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Patient information</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Full AI analysis + measurements</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckCircle sx={{ fontSize: 14, color: '#4CAF50' }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>BI-RADS & clinical report</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>

            {/* Pro Tip */}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                <strong>💡 Tip:</strong> Start with Quick mode for rapid screening. You can always switch to Clinical workflow later to add detailed documentation.
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Upload Section */}
      {!analysisResults && (
        <Box sx={{ mb: 4 }}>
          <ImageUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </Box>
      )}

      {/* Results Section */}
      {analysisResults && (
        <>
          {/* Professional Analysis Suite Option */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
                  Professional Analysis Suite
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  Open in a dedicated full-screen medical imaging workstation
                </Typography>
              </Box>
              <Button
                variant="contained"
                endIcon={<OpenInNew sx={{ fontSize: 18 }} />}
                onClick={() => navigate(ROUTES.ANALYSIS_SUITE, { 
                  state: { 
                    imageFile: uploadedFile, 
                    analysisResults 
                  } 
                })}
                sx={{
                  backgroundColor: 'white',
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: alpha('#FFFFFF', 0.9),
                  },
                }}
              >
                Open Suite
              </Button>
            </Box>
          </Paper>

          {/* Analysis Results */}
          <Box sx={{ mb: 4 }}>
            <AnalysisResults results={analysisResults} />
          </Box>

          {/* Professional Medical Viewer */}
          <Box sx={{ mb: 4 }}>
            <MedicalViewer
              imageFile={uploadedFile}
              imageUrl={restoredImagePreview}
              attentionMap={analysisResults.explanation?.attention_map}
              suspiciousRegions={analysisResults.explanation?.suspicious_regions}
            />
          </Box>

          {/* Action Buttons */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReset}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  borderWidth: 2,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  '&:hover': {
                    borderWidth: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                Analyze Another Image
              </Button>
              
              {/* Continue to Workflow */}
              {currentSession && (
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={handleContinueWorkflow}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textTransform: 'none',
                  }}
                >
                  {getContinueButtonLabel()}
                </Button>
              )}
            </Box>
          </Paper>
        </>
      )}
      </Box>
    </Container>
  );
};

export default DiagnosticWorkstation;
