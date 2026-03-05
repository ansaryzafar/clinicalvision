/**
 * ClinicalWorkflowPageV2 — Redesigned Clinical Workflow Page
 *
 * This page replaces ClinicalWorkflowPage by using the ClinicalCaseContext
 * (10‑step, patient‑first workflow) instead of the legacy workflow‑v3 system.
 *
 * Design:
 *  - 10 steps organized into 5 visual phases
 *  - Lunit design system: ClashGrotesk headings (wt 300), Lexend body, teal accent
 *  - Phase-grouped stepper with progressive disclosure (Hick-Hyman optimization)
 *  - Uses `useClinicalCase()` for state & navigation
 *
 * References:
 *  - ACR BI‑RADS 5th Edition step order
 *  - Paton et al. 2021 (progressive disclosure, Hick-Hyman Law)
 *  - Nielsen heuristics #1 (visibility), #3 (user control), #4 (consistency)
 *  - Lunit.io typography: ClashGrotesk Light (300) headings, Lexend body
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Alert,
  alpha,
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  ArrowForward,
  Check,
  Lock,
  PersonAdd,
  HistoryEdu,
  CloudUpload,
  VerifiedUser,
  Psychology,
  FindInPage,
  Straighten,
  EditNote,
  Assessment,
  Description,
  TaskAlt,
  Draw,
  Biotech,
} from '@mui/icons-material';

// Types
import {
  ClinicalWorkflowStep,
  STEP_INDEX,
  WORKFLOW_STEP_CONFIG,
  TOTAL_WORKFLOW_STEPS,
  type StepConfig,
  type BiRadsAssessment,
  type GeneratedReport,
  type BatchAnalysisResult,
  EMPTY_CLINICAL_HISTORY,
} from '../types/case.types';

// Context
import { useClinicalCase } from '../contexts/ClinicalCaseContext';

// Step Components — already designed for ClinicalCaseContext
import { PatientInfoStep } from '../components/workflow/PatientInfoStep';
import { ClinicalHistoryStep } from '../components/workflow/ClinicalHistoryStep';
import { MultiImageUpload } from '../components/upload/MultiImageUpload';
import { BatchAnalysisRunner } from '../components/BatchAnalysisRunner';
import { BiRadsAssessmentStep } from '../components/workflow/BiRadsAssessmentStep';
import { ReportPreview, type SignatureCredentials } from '../components/workflow/ReportPreview';
import { FinalizeStep } from '../components/workflow/FinalizeStep';
import { DigitalSignatureStep } from '../components/workflow/DigitalSignatureStep';
import { WorkflowAnalysisSuite } from '../components/workflow/WorkflowAnalysisSuite';
import { ImageVerificationStep } from '../components/workflow/ImageVerificationStep';
import { useDemoData } from '../hooks/useDemoData';
import { useLoadDemoCase } from '../hooks/useLoadDemoCase';
import DemoCasePicker from '../components/demo/DemoCasePicker';

// ============================================================================
// LUNIT DESIGN TOKENS — Inline for self-contained page styling
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", system-ui, sans-serif',
  fontBody: '"Lexend", system-ui, sans-serif',
  teal: '#00C9EA',
  tealDark: '#0F95AB',
  black: '#151515',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  disabledGray: '#9CA3AF',
  lightest: '#EFF0F4',
  white: '#FFFFFF',
  green: '#22C55E',
  orange: '#FF5321',
  red: '#FF4444',
};

// ============================================================================
// PHASE CONFIGURATION — 5 workflow phases, each with steps
// With MEASUREMENTS and ANNOTATIONS removed, the phases are consolidated:
// Setup(0,1), Imaging(2,3), Analysis(4,5), Reporting(6,7), Completion(8,9)
// ============================================================================

interface PhaseConfig {
  id: string;
  label: string;
  color: string;
  stepIndices: number[];  // which step config indices belong to this phase
}

const PHASES: PhaseConfig[] = [
  { id: 'setup',      label: 'Setup',      color: LUNIT.teal,     stepIndices: [0, 1] },
  { id: 'imaging',    label: 'Imaging',    color: '#7B61FF',      stepIndices: [2, 3] },
  { id: 'analysis',   label: 'Analysis',   color: '#0088CC',      stepIndices: [4, 5] },
  { id: 'reporting',  label: 'Reporting',  color: '#F59E0B',      stepIndices: [6, 7] },
  { id: 'completion', label: 'Completion', color: LUNIT.tealDark, stepIndices: [8, 9] },
];

// Map step icon names to MUI icon components
const STEP_ICONS: Record<string, React.ReactElement> = {
  person_add: <PersonAdd fontSize="small" />,
  history: <HistoryEdu fontSize="small" />,
  upload_file: <CloudUpload fontSize="small" />,
  verified: <VerifiedUser fontSize="small" />,
  psychology: <Psychology fontSize="small" />,
  preview: <FindInPage fontSize="small" />,
  straighten: <Straighten fontSize="small" />,
  edit_note: <EditNote fontSize="small" />,
  assessment: <Assessment fontSize="small" />,
  description: <Description fontSize="small" />,
  task_alt: <TaskAlt fontSize="small" />,
  draw: <Draw fontSize="small" />,
};

// ============================================================================
// STEP NAV ITEM — Individual step button in the phase stepper
// ============================================================================

interface StepNavItemProps {
  index: number;
  label: string;
  icon: string;
  completed: boolean;
  isCurrent: boolean;
  accessible: boolean;
  phaseColor: string;
  onClick: () => void;
}

const StepNavItem: React.FC<StepNavItemProps> = ({
  index, label, icon, completed, isCurrent, accessible, phaseColor, onClick,
}) => {
  return (
    <Tooltip title={!accessible ? 'Complete previous steps first' : label} arrow placement="bottom">
      <Box
        component="button"
        onClick={accessible ? onClick : undefined}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: accessible ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '5px 6px',
          borderRadius: '100px',
          fontFamily: LUNIT.fontBody,
          fontSize: '0.74rem',
          fontWeight: isCurrent ? 500 : 400,
          color: !accessible
            ? LUNIT.disabledGray
            : isCurrent
            ? phaseColor
            : completed
            ? LUNIT.green
            : LUNIT.midGray,
          background: isCurrent
            ? alpha(phaseColor, 0.08)
            : 'transparent',
          border: isCurrent
            ? `1.5px solid ${alpha(phaseColor, 0.3)}`
            : '1.5px solid transparent',
          transition: 'all 0.25s ease',
          opacity: accessible ? 1 : 0.65,
          '&:hover': accessible ? {
            background: alpha(phaseColor, 0.06),
            border: `1.5px solid ${alpha(phaseColor, 0.2)}`,
          } : {},
          '&:focus-visible': {
            outline: `2px solid ${LUNIT.teal}`,
            outlineOffset: '2px',
          },
        }}
      >
        {/* Status circle */}
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            ...(completed
              ? {
                  background: LUNIT.green,
                  color: LUNIT.white,
                }
              : isCurrent
              ? {
                  background: phaseColor,
                  color: LUNIT.white,
                }
              : {
                  background: 'transparent',
                  border: `1.5px solid ${accessible ? LUNIT.gray : LUNIT.disabledGray}`,
                  color: accessible ? LUNIT.gray : LUNIT.disabledGray,
                }),
          }}
        >
          {completed ? <Check sx={{ fontSize: 14 }} /> : index + 1}
        </Box>

        {/* Label — show on current or wider screens; hidden on narrow for non-current */}
        <Box
          component="span"
          sx={{
            display: { xs: isCurrent ? 'inline' : 'none', md: 'inline' },
          }}
        >
          {label}
        </Box>
      </Box>
    </Tooltip>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ClinicalWorkflowPageV2: React.FC = () => {
  const theme = useTheme();

  // ── Context ──────────────────────────────────────────────────────────
  const {
    currentCase,
    isLoading,
    error,
    clearError,
    createCase,
    advanceWorkflow,
    goBackToStep,
    updateAssessment,
    updateReport,
    generateReport,
    finalizeReport,
    signReport,
    updateAnalysisResults,
    getWorkflowProgress,
    isStepCompleted,
    clearCurrentCase,
  } = useClinicalCase();

  // ── Local UI state ───────────────────────────────────────────────────
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const prevStepRef = useRef<ClinicalWorkflowStep | null>(null);
  const location = useLocation();

  // ── Demo data hooks ──────────────────────────────────────────────────
  const { cases: demoCases, isLoading: demoLoading } = useDemoData();
  const { loadDemoCase, isLoading: demoLoadingCase, error: demoError } = useLoadDemoCase();

  const handleLoadDemoCase = useCallback(async (caseId: string) => {
    await loadDemoCase(caseId);
  }, [loadDemoCase]);

  // ── Load archived analysis data or clear stale case ────────────────
  useEffect(() => {
    if (location.state?.fromArchive) {
      clearCurrentCase();

      // If archived analysis data was passed, create a case pre-populated with it
      const archived = location.state?.archivedAnalysis;
      if (archived) {
        (async () => {
          const caseResult = await createCase(
            {
              mrn: archived.patientId || '',
              firstName: '',
              lastName: '',
              dateOfBirth: '',
              gender: 'F',
            },
            { ...EMPTY_CLINICAL_HISTORY, clinicalIndication: 'Re-analysis from archive' },
            { skipValidation: true },
          );
          if (caseResult.success) {
            // Pre-load the archived analysis results into the new case
            const analysisResult = archived.analysisResults;
            if (analysisResult) {
              updateAnalysisResults(
                [analysisResult],
                analysisResult.findings || [],
                analysisResult.birads_category,
              );
            }
            // Advance to analysis review so user can review archived results
            advanceWorkflow(); // → CLINICAL_HISTORY
            advanceWorkflow(); // → IMAGE_UPLOAD
            advanceWorkflow(); // → IMAGE_VERIFICATION
            advanceWorkflow(); // → BATCH_AI_ANALYSIS
            advanceWorkflow(); // → FINDINGS_REVIEW
          }
        })();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount — prevent stale case persisting ─────────────
  useEffect(() => {
    return () => {
      clearCurrentCase();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ────────────────────────────────────────────────────
  const currentStep = currentCase?.workflow.currentStep ?? ClinicalWorkflowStep.PATIENT_REGISTRATION;
  const currentStepIndex = STEP_INDEX[currentStep];
  const progress = currentCase ? getWorkflowProgress() : 0;
  const locked = currentCase?.workflow.isLocked ?? false;

  // Sync tab to context's current step when it changes
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      setActiveTabIndex(STEP_INDEX[currentStep]);
    }
  }, [currentStep]);

  // ── Navigation helpers ───────────────────────────────────────────────
  const handleAdvance = useCallback(() => {
    advanceWorkflow();
  }, [advanceWorkflow]);

  const handleGoBackOneStep = useCallback(() => {
    const idx = STEP_INDEX[currentStep];
    if (idx > 0) {
      const prevStep = WORKFLOW_STEP_CONFIG[idx - 1].step;
      goBackToStep(prevStep);
    }
  }, [currentStep, goBackToStep]);

  // ── Component callbacks ──────────────────────────────────────────────
  const handleAssessmentChange = useCallback(
    (assessment: BiRadsAssessment) => {
      updateAssessment(assessment);
    },
    [updateAssessment],
  );

  const handleReportChange = useCallback(
    (report: GeneratedReport) => {
      updateReport(report);
    },
    [updateReport],
  );

  const handleAnalysisComplete = useCallback(
    (result: BatchAnalysisResult) => {
      updateAnalysisResults(
        result.results,
        result.consolidatedFindings,
        result.suggestedBiRads,
      );
      // User will click "Proceed to Review Findings" CTA — no auto-advance
    },
    [updateAnalysisResults],
  );

  const handleAnalysisError = useCallback(
    (_err: Error) => {
      // Error is displayed by BatchAnalysisRunner internally.
      // We could surface it to ClinicalCaseContext if needed.
    },
    [],
  );

  const handleFinalize = useCallback(() => {
    finalizeReport();
  }, [finalizeReport]);

  const handleSign = useCallback(
    (credentials?: SignatureCredentials) => {
      // SignatureCredentials → hash for signReport
      const hash = credentials ? `${credentials.userId}:${credentials.password}` : 'unsigned';
      signReport(hash);
    },
    [signReport],
  );

  const handleGenerate = useCallback(() => {
    generateReport();
  }, [generateReport]);

  const handleExportPdf = useCallback(() => {
    // Add print-mode class for targeted @media print CSS rules
    document.body.classList.add('printing-report');
    window.print();
    // Clean up after print dialog closes
    document.body.classList.remove('printing-report');
  }, []);

  // ── Quick-create for empty state ─────────────────────────────────────
  const handleCreateNewCase = useCallback(async () => {
    await createCase(
      { mrn: '', firstName: '', lastName: '', dateOfBirth: '', gender: 'F' },
      { ...EMPTY_CLINICAL_HISTORY, clinicalIndication: 'Screening mammogram' },
      { skipValidation: true },
    );
  }, [createCase]);

  // ── Step → Component mapping ─────────────────────────────────────────
  const getStepComponent = useCallback(
    (step: ClinicalWorkflowStep): React.ReactNode => {
      if (!currentCase) return null;

      const stepIdx = STEP_INDEX[step];
      const config = WORKFLOW_STEP_CONFIG[stepIdx];
      const goBackPrev = stepIdx > 0 ? handleGoBackOneStep : undefined;

      switch (step) {
        // Phase 1: Setup
        case ClinicalWorkflowStep.PATIENT_REGISTRATION:
          return <PatientInfoStep />;

        case ClinicalWorkflowStep.CLINICAL_HISTORY:
          return <ClinicalHistoryStep />;

        // Phase 2: Imaging
        case ClinicalWorkflowStep.IMAGE_UPLOAD:
          return <MultiImageUpload onUploadComplete={handleAdvance} />;

        case ClinicalWorkflowStep.IMAGE_VERIFICATION:
          return (
            <ImageVerificationStep
              onBack={goBackPrev}
              onContinue={handleAdvance}
            />
          );

        // Phase 3: AI Analysis
        case ClinicalWorkflowStep.BATCH_AI_ANALYSIS:
          return (
            <BatchAnalysisRunner
              case={currentCase}
              onAnalysisComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
              onContinue={handleAdvance}
            />
          );

        case ClinicalWorkflowStep.FINDINGS_REVIEW:
          return (
            <WorkflowAnalysisSuite
              clinicalCase={currentCase}
              onBack={goBackPrev}
              onContinue={handleAdvance}
            />
          );

        // Phase 4: Reporting
        case ClinicalWorkflowStep.BIRADS_ASSESSMENT:
          return (
            <BiRadsAssessmentStep
              clinicalCase={currentCase}
              suggestedBiRads={currentCase.assessment?.overallCategory}
              onAssessmentChange={handleAssessmentChange}
              onComplete={handleAdvance}
              onBack={goBackPrev}
              isReadOnly={locked}
            />
          );

        case ClinicalWorkflowStep.REPORT_GENERATION:
          return (
            <ReportPreview
              clinicalCase={currentCase}
              onReportChange={handleReportChange}
              onFinalize={handleFinalize}
              onSign={handleSign}
              onExportPdf={handleExportPdf}
              onBack={goBackPrev}
              onGenerate={handleGenerate}
              onContinue={handleAdvance}
              isReadOnly={locked}
            />
          );

        // Phase 6: Completion
        case ClinicalWorkflowStep.FINALIZE:
          return <FinalizeStep />;

        case ClinicalWorkflowStep.DIGITAL_SIGNATURE:
          return <DigitalSignatureStep />;

        default:
          return null;
      }
    },
    [
      currentCase,
      locked,
      handleAdvance,
      handleGoBackOneStep,
      handleAssessmentChange,
      handleReportChange,
      handleFinalize,
      handleSign,
      handleExportPdf,
      handleGenerate,
      handleAnalysisComplete,
      handleAnalysisError,
    ],
  );

  // ── Build step descriptors ────────────────────────────────────────
  const steps = useMemo(
    () =>
      WORKFLOW_STEP_CONFIG.map((cfg, idx) => {
        const completed = currentCase ? isStepCompleted(cfg.step) : false;
        const isCurrent = idx === currentStepIndex;
        const previousCompleted =
          idx === 0 || (currentCase ? isStepCompleted(WORKFLOW_STEP_CONFIG[idx - 1].step) : false);
        const accessible = isCurrent || completed || previousCompleted;

        return {
          ...cfg,
          index: idx,
          completed,
          isCurrent,
          accessible,
        };
      }),
    [currentCase, currentStepIndex, isStepCompleted],
  );

  // ── Step navigation handler ──────────────────────────────────────────
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      if (!step || !step.accessible) return;
      setActiveTabIndex(stepIndex);
      if (stepIndex < currentStepIndex) {
        goBackToStep(step.step);
      }
    },
    [steps, currentStepIndex, goBackToStep],
  );

  // ── Computed phase info ──────────────────────────────────────────────
  const currentPhase = useMemo(() => {
    return PHASES.find(p => p.stepIndices.includes(currentStepIndex)) ?? PHASES[0];
  }, [currentStepIndex]);

  const currentStepConfig = WORKFLOW_STEP_CONFIG[currentStepIndex];

  // ── Auto-scroll stepper to show current phase ────────────────────────
  const stepperRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = stepperRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 10);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // Scroll listeners for fade indicators
  useEffect(() => {
    const el = stepperRef.current;
    if (!el) return;
    // Initial check after layout
    const timer = setTimeout(updateScrollIndicators, 100);
    el.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  useEffect(() => {
    if (!stepperRef.current) return;
    const phaseIdx = PHASES.indexOf(currentPhase);
    const phaseEls = stepperRef.current.querySelectorAll('[data-phase-group]');
    const el = phaseEls[phaseIdx] as HTMLElement | undefined;
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    // Update fade indicators after scroll settles
    setTimeout(updateScrollIndicators, 350);
  }, [currentPhase, updateScrollIndicators]);

  // ── RENDER: Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress
            sx={{
              height: 3,
              borderRadius: 2,
              mb: 3,
              backgroundColor: LUNIT.lightest,
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${LUNIT.teal}, ${LUNIT.tealDark})`,
              },
            }}
          />
          <Typography
            sx={{ fontFamily: LUNIT.fontBody, fontSize: '0.95rem', color: LUNIT.midGray }}
          >
            Loading clinical case…
          </Typography>
        </Box>
      </Container>
    );
  }

  // ── RENDER: Empty state (no case) ────────────────────────────────────
  if (!currentCase) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
        <Container maxWidth="xl">
          {/* ── Gradient Page Banner ──────────────────────────────── */}
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
                <Biotech sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                  >
                    New Analysis
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.95)',
                    }}
                  >
                    10‑step clinical mammogram analysis workflow
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {error && (
            <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
              {error.message}
            </Alert>
          )}

          {/* ── Empty state card ──────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Paper
              elevation={0}
              sx={{
                textAlign: 'center',
                p: 6,
                maxWidth: 520,
                width: '100%',
                borderRadius: '20px',
                border: `1px solid ${LUNIT.lightest}`,
                background: LUNIT.white,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: alpha(LUNIT.teal, 0.08),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Add sx={{ fontSize: 36, color: LUNIT.teal }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: LUNIT.fontHeading,
                  fontWeight: 300,
                  fontSize: '1.75rem',
                  color: LUNIT.darkGray,
                  mb: 1,
                }}
              >
                Begin a New Case
              </Typography>
              <Typography
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontSize: '0.95rem',
                  color: LUNIT.midGray,
                  mb: 4,
                  lineHeight: 1.7,
                }}
              >
                Start a new clinical case to begin the 10‑step mammogram analysis workflow.
              </Typography>
              <Button
                onClick={handleCreateNewCase}
                startIcon={<ArrowForward />}
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 500,
                  fontSize: '1rem',
                  borderRadius: '100px',
                  backgroundColor: LUNIT.black,
                  color: LUNIT.white,
                  textTransform: 'none',
                  px: 4,
                  py: 1.25,
                  '&:hover': {
                    backgroundColor: LUNIT.teal,
                    color: LUNIT.black,
                  },
                }}
              >
                Begin New Case
              </Button>

              {/* Demo Data — Load real CBIS-DDSM cases directly into workflow */}
              <Box
                sx={{
                  mt: 4,
                  pt: 3,
                  borderTop: `1px solid ${alpha(LUNIT.lightest, 0.8)}`,
                }}
              >
                {demoError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {demoError}
                  </Alert>
                )}
                {demoLoadingCase ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <LinearProgress
                      sx={{
                        height: 3,
                        borderRadius: 2,
                        mb: 2,
                        backgroundColor: LUNIT.lightest,
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${LUNIT.teal}, ${LUNIT.tealDark})`,
                        },
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: LUNIT.fontBody,
                        fontSize: '0.85rem',
                        color: LUNIT.midGray,
                      }}
                    >
                      Loading demo case — populating patient info, clinical history, and images…
                    </Typography>
                  </Box>
                ) : (
                  <DemoCasePicker
                    cases={demoCases}
                    onSelect={handleLoadDemoCase}
                    loading={demoLoading}
                    compact
                  />
                )}
                <Typography
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    fontSize: '0.72rem',
                    color: alpha(LUNIT.midGray, 0.6),
                    mt: 1.5,
                    fontStyle: 'italic',
                  }}
                >
                  Real CBIS-DDSM mammogram images · TCIA open-access data
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>
    );

  }

  // ── RENDER: Active case ──────────────────────────────────────────────
  const safeTab = Math.min(Math.max(0, activeTabIndex), TOTAL_WORKFLOW_STEPS - 1);
  const activeStep = WORKFLOW_STEP_CONFIG[safeTab].step;
  const completedCount = steps.filter((t) => t.completed).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <Container maxWidth="xl">
        {/* ── Gradient Page Banner ──────────────────────────────── */}
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
              <Biotech sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  New Analysis
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  10‑step clinical mammogram analysis workflow
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* ── Error banner ─────────────────────────────────────────── */}
        {error && (
          <Alert
            severity="error"
            onClose={clearError}
            sx={{ mb: 2, borderRadius: '12px' }}
          >
            {error.message}
          </Alert>
        )}

        {/* ══════════════════════════════════════════════════════════════
            HEADER — Patient info + progress summary
            ══════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          {/* Left: Phase label + step title */}
          <Box>
            <Typography
              sx={{
                fontFamily: LUNIT.fontBody,
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'none',
                color: currentPhase.color,
                mb: 0.25,
              }}
            >
              Phase {PHASES.indexOf(currentPhase) + 1}: {currentPhase.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: LUNIT.fontHeading,
                fontWeight: 300,
                fontSize: '1.5rem',
                color: LUNIT.darkGray,
                lineHeight: 1.2,
              }}
            >
              {currentStepConfig.label}
            </Typography>
          </Box>

          {/* Right: Patient + completion badge */}
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            {currentCase.patient.mrn && (
              <Typography
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontSize: '0.82rem',
                  color: LUNIT.midGray,
                  mb: 0.25,
                }}
              >
                MRN: {currentCase.patient.mrn}
                {currentCase.patient.firstName && (
                  <> — {currentCase.patient.firstName} {currentCase.patient.lastName}</>
                )}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              <Box
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: completedCount === TOTAL_WORKFLOW_STEPS ? LUNIT.green : LUNIT.midGray,
                  background: completedCount === TOTAL_WORKFLOW_STEPS
                    ? alpha(LUNIT.green, 0.08)
                    : alpha(LUNIT.gray, 0.08),
                  borderRadius: '100px',
                  px: 1.5,
                  py: 0.35,
                }}
              >
                {completedCount}/{TOTAL_WORKFLOW_STEPS} completed
              </Box>
              {locked && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontFamily: LUNIT.fontBody,
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    color: LUNIT.orange,
                    background: alpha(LUNIT.orange, 0.08),
                    borderRadius: '100px',
                    px: 1.5,
                    py: 0.35,
                  }}
                >
                  <Lock sx={{ fontSize: 12 }} /> Finalized
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* ══════════════════════════════════════════════════════════════
            PROGRESS BAR — Branded gradient
            ══════════════════════════════════════════════════════════════ */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            mb: 2.5,
            backgroundColor: LUNIT.lightest,
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              background: `linear-gradient(90deg, ${LUNIT.teal} 0%, ${LUNIT.tealDark} 100%)`,
            },
          }}
        />

        {/* ══════════════════════════════════════════════════════════════
            PHASE STEPPER — Grouped step navigation
            ══════════════════════════════════════════════════════════════ */}
        <Paper
          elevation={0}
          data-no-print
          sx={{
            mb: 3,
            borderRadius: '16px',
            border: `1px solid ${LUNIT.lightest}`,
            background: LUNIT.white,
            position: 'relative',
          }}
        >
          {/* Left scroll fade indicator */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '32px',
              background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
              borderRadius: '16px 0 0 16px',
              opacity: showLeftFade ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
          {/* Right scroll fade indicator */}
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '40px',
              background: 'linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
              borderRadius: '0 16px 16px 0',
              opacity: showRightFade ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
          <Box
            ref={stepperRef}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${TOTAL_WORKFLOW_STEPS}, 1fr)`,
              gridTemplateRows: 'auto auto',
              overflowX: 'auto',
              py: 0.75,
              '&::-webkit-scrollbar': { height: '3px' },
              '&::-webkit-scrollbar-thumb': {
                background: alpha(LUNIT.midGray, 0.2),
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
            }}
          >
            {/* Row 1: Phase labels — each spans its step columns */}
            {PHASES.map((phase, phaseIdx) => {
              const phaseSteps = phase.stepIndices.map(i => steps[i]);
              const phaseCompleted = phaseSteps.every(s => s.completed);
              const phaseActive = phaseSteps.some(s => s.isCurrent);
              const startCol = phase.stepIndices[0] + 1; // CSS grid is 1-indexed
              const spanCount = phase.stepIndices.length;
              const isLastPhase = phaseIdx === PHASES.length - 1;

              return (
                <Box
                  key={`label-${phase.id}`}
                  data-phase-group
                  sx={{
                    gridColumn: `${startCol} / span ${spanCount}`,
                    gridRow: 1,
                    textAlign: 'center',
                    px: 1,
                    pb: 0.25,
                    borderRight: isLastPhase ? 'none' : `1px solid ${LUNIT.lightest}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: LUNIT.fontBody,
                      fontSize: '0.58rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'none',
                      color: phaseActive
                        ? phase.color
                        : phaseCompleted
                        ? LUNIT.green
                        : LUNIT.gray,
                    }}
                  >
                    {phase.label}
                  </Typography>
                </Box>
              );
            })}

            {/* Row 2: Step buttons — one per grid column */}
            {steps.map((step, idx) => {
              const phase = PHASES.find(p => p.stepIndices.includes(idx))!;
              const isLastInPhase = phase.stepIndices[phase.stepIndices.length - 1] === idx;
              const isLastPhase = PHASES.indexOf(phase) === PHASES.length - 1;

              return (
                <Box
                  key={step.step}
                  sx={{
                    gridColumn: idx + 1,
                    gridRow: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    px: 0.25,
                    borderRight: (isLastInPhase && !isLastPhase)
                      ? `1px solid ${LUNIT.lightest}`
                      : 'none',
                  }}
                >
                  <StepNavItem
                    index={step.index}
                    label={step.label}
                    icon={step.icon}
                    completed={step.completed}
                    isCurrent={step.isCurrent}
                    accessible={step.accessible}
                    phaseColor={phase.color}
                    onClick={() => handleStepClick(step.index)}
                  />
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* ══════════════════════════════════════════════════════════════
            STEP CONTENT
            ══════════════════════════════════════════════════════════════ */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: `1px solid ${LUNIT.lightest}`,
            background: LUNIT.white,
            minHeight: 420,
            p: { xs: 2, md: 3 },
          }}
        >
          {getStepComponent(activeStep)}
        </Paper>
      </Container>
    </Box>
  );
};

export default ClinicalWorkflowPageV2;
