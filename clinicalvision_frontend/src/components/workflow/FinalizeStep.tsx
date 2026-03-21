/**
 * FinalizeStep — Case Finalization & Pre-flight Checklist
 *
 * Step 11 of the redesigned clinical workflow (FINALIZE).
 * Displays a comprehensive case summary, validates that all required steps
 * are completed, and provides a "Lock Case" action that prevents further edits.
 *
 * Features:
 * - Patient summary (MRN, name, DOB)
 * - Image count & views uploaded
 * - BI-RADS overall assessment display
 * - Report status indicator
 * - Pre-flight checklist of all required steps
 * - Confirmation dialog before locking
 * - Read-only state when case is already locked
 * - LUNIT-branded light theme styling
 *
 * References:
 * - ACR BI-RADS 5th Edition reporting workflow
 * - IHE Mammography Acquisition Workflow (MAWF)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Check,
  Close,
  Lock,
  LockOpen,
  TaskAlt,
  Warning,
} from '@mui/icons-material';

import { useClinicalCase } from '../../contexts/ClinicalCaseContext';
import {
  ClinicalWorkflowStep,
  WORKFLOW_STEP_CONFIG,
  BIRADS_CATEGORY_DESCRIPTIONS,
  type StepConfig,
} from '../../types/case.types';

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  green: '#22C55E',
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Steps that MUST be completed before the case can be locked */
const REQUIRED_STEPS: ClinicalWorkflowStep[] = [
  ClinicalWorkflowStep.PATIENT_REGISTRATION,
  ClinicalWorkflowStep.CLINICAL_HISTORY,
  ClinicalWorkflowStep.IMAGE_UPLOAD,
  ClinicalWorkflowStep.IMAGE_VERIFICATION,
  ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
  ClinicalWorkflowStep.FINDINGS_REVIEW,
  ClinicalWorkflowStep.BIRADS_ASSESSMENT,
  ClinicalWorkflowStep.REPORT_GENERATION,
];

const REPORT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  reviewed: 'Reviewed',
  signed: 'Signed',
  amended: 'Amended',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const FinalizeStep: React.FC = () => {
  const theme = useTheme();
  const {
    currentCase,
    isLoading,
    error,
    clearError,
    finalizeCase,
    advanceWorkflow,
    goBackToStep,
    isStepCompleted,
  } = useClinicalCase();

  // ── Local state ────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // ── Derived state ──────────────────────────────────────────────────────
  const isLocked = currentCase?.workflow.isLocked ?? false;

  /** Build checklist items with completion status */
  const checklist = useMemo(() => {
    if (!currentCase) return [];
    return REQUIRED_STEPS.map((step) => {
      const config = WORKFLOW_STEP_CONFIG.find((c) => c.step === step);
      const completed = isStepCompleted(step);
      return { step, label: config?.label ?? step, completed };
    });
  }, [currentCase, isStepCompleted]);

  /** Are ALL required steps completed? */
  const allRequiredComplete = useMemo(
    () => checklist.length > 0 && checklist.every((item) => item.completed),
    [checklist],
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    goBackToStep(ClinicalWorkflowStep.REPORT_GENERATION);
  }, [goBackToStep]);

  const handleRequestLock = useCallback(() => {
    setLockError(null);
    setConfirmOpen(true);
  }, []);

  const handleConfirmLock = useCallback(async () => {
    setConfirmOpen(false);
    const result = await finalizeCase('user-signature');
    if (!result.success) {
      const fail = result as { success: false; error: { message: string } };
      setLockError(fail.error.message ?? 'Failed to lock case');
    }
  }, [finalizeCase]);

  const handleCancelLock = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  // ── RENDER: no case ────────────────────────────────────────────────────
  if (!currentCase) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No case loaded.</Typography>
      </Box>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  const { patient, images, assessment, report, workflow } = currentCase;

  return (
    <Box sx={{ py: 2 }}>
      {/* ── Title ─────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <TaskAlt sx={{ fontSize: 28, color: LUNIT.teal }} />
        <Typography
          variant="h5"
          sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: theme.palette.text.primary }}
        >
          Final Review
        </Typography>
        {isLocked && (
          <Chip
            icon={<Lock />}
            label="Locked — Read Only"
            color="warning"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Stack>

      {/* ── Error banners ─────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}
      {lockError && (
        <Alert severity="error" onClose={() => setLockError(null)} sx={{ mb: 2 }}>
          {lockError}
        </Alert>
      )}

      {/* ── Case Summary ──────────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          borderColor: alpha(LUNIT.teal, 0.18),
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: LUNIT.fontBody,
            fontWeight: 600,
            color: LUNIT.teal,
            mb: 2,
          }}
        >
          Case Summary
        </Typography>

        <Stack spacing={1.5}>
          {/* Patient */}
          <Box>
            <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              Patient
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody }}>
              {patient.firstName} {patient.lastName} — MRN: {patient.mrn}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              DOB: {patient.dateOfBirth || 'N/A'} · Gender: {patient.gender}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Images */}
          <Box>
            <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              Images
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody }}>
              {images.length} image(s) uploaded
            </Typography>
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Assessment */}
          <Box>
            <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              BI-RADS Assessment
            </Typography>
            {assessment ? (
              <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody }}>
                BI-RADS {assessment.overallCategory}
                {' — '}
                {BIRADS_CATEGORY_DESCRIPTIONS[assessment.overallCategory] ?? 'N/A'}
              </Typography>
            ) : (
              <Typography variant="body1" color="warning.main" sx={{ fontFamily: LUNIT.fontBody }}>
                No assessment recorded
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Report */}
          <Box>
            <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              Report Status
            </Typography>
            {report ? (
              <Chip
                label={REPORT_STATUS_LABELS[report.status] ?? report.status}
                size="small"
                color={
                  report.status === 'signed'
                    ? 'success'
                    : report.status === 'pending_review'
                    ? 'warning'
                    : 'default'
                }
                variant="outlined"
              />
            ) : (
              <Typography variant="body1" color="warning.main" sx={{ fontFamily: LUNIT.fontBody }}>
                No report generated
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* ── Pre-flight Checklist ──────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          borderColor: alpha(LUNIT.teal, 0.18),
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, color: LUNIT.teal, mb: 1 }}
        >
          Pre-flight Checklist
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary, mb: 2 }}>
          All required steps must be completed before locking the case.
        </Typography>

        <List dense disablePadding>
          {checklist.map(({ step, label, completed }) => (
            <ListItem key={step} disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {completed ? (
                  <Check
                    data-testid="check-icon"
                    sx={{ color: 'success.main', fontSize: 20 }}
                  />
                ) : (
                  <Close
                    data-testid="missing-icon"
                    sx={{ color: 'error.main', fontSize: 20 }}
                  />
                )}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: completed ? 'text.primary' : 'error.main',
                  sx: { textDecoration: completed ? 'none' : undefined },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          aria-label="Back"
          sx={{
            fontFamily: LUNIT.fontBody,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          Back
        </Button>

        {!isLocked && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Lock />}
              onClick={handleRequestLock}
              disabled={!allRequiredComplete}
              aria-label="Lock Case"
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                backgroundColor: LUNIT.teal,
                '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
              }}
            >
              Lock Case
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => advanceWorkflow()}
              disabled={!allRequiredComplete}
              aria-label="Continue to Digital Signature"
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                backgroundColor: LUNIT.green,
                '&:hover': { backgroundColor: alpha(LUNIT.green, 0.85) },
              }}
            >
              Continue to Digital Signature
            </Button>
          </Stack>
        )}
      </Stack>

      {/* ── Confirmation Dialog ───────────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={handleCancelLock}>
        <DialogTitle>Confirm Case Lock</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to lock this case? Once locked, no further edits can be made
            to the patient information, images, findings, or assessment. The case will proceed
            to digital signature.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLock}>Cancel</Button>
          <Button onClick={handleConfirmLock} variant="contained" color="error" aria-label="Confirm">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinalizeStep;
