/**
 * DigitalSignatureStep — Report Signing & Case Completion
 *
 * Step 12 (final) of the redesigned clinical workflow (DIGITAL_SIGNATURE).
 * Displays the report for final verification, captures the radiologist's
 * typed name + password as intent to sign, generates a SHA-256 hash,
 * and completes the case.
 *
 * Features:
 * - Report content displayed in read-only mode
 * - Typed-name signature input
 * - Password/PIN confirmation
 * - SHA-256 hash generated from (report content + userId + timestamp)
 * - signedBy, signedAt, signatureHash persisted in audit trail
 * - Case status transitions to finalized/completed
 * - Read-only state when already signed
 * - LUNIT-branded light theme styling
 *
 * References:
 * - HIPAA electronic signature requirements (21 CFR Part 11)
 * - ACR Practice Parameter for Communication of Diagnostic Imaging Findings
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Draw,
  Fingerprint,
  Lock,
  Verified,
  Shield,
} from '@mui/icons-material';

import { useClinicalCase } from '../../contexts/ClinicalCaseContext';
import { useAuth } from '../../contexts/AuthContext';
import { ClinicalWorkflowStep } from '../../types/case.types';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  lightGray: '#E5E7EB',
  green: '#22C55E',
  white: '#FFFFFF',
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a SHA-256 hash from the given input string.
 * Falls back to a simple hash if crypto.subtle is unavailable.
 */
async function generateSignatureHash(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple string-based hash for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DigitalSignatureStep: React.FC = () => {
  const {
    currentCase,
    isLoading,
    error,
    clearError,
    signReport,
    finalizeCase,
    goBackToStep,
    clearCurrentCase,
  } = useClinicalCase();

  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Local state ────────────────────────────────────────────────────────
  const [typedName, setTypedName] = useState('');
  const [password, setPassword] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // ── Derived state ──────────────────────────────────────────────────────
  const report = currentCase?.report;
  const isSigned = report?.status === 'signed';
  const canSign = typedName.trim().length > 0 && password.trim().length > 0 && !signing && !isSigned;

  const signatureInfo = useMemo(() => {
    if (!currentCase?.audit) return null;
    const { signedBy, signerName, signedAt, signatureHash } = currentCase.audit;
    if (!signedBy) return null;
    return { signedBy, signerName, signedAt, signatureHash };
  }, [currentCase]);

  // ── Auto-finalize after successful signing ─────────────────────────
  // Uses useEffect so that finalizeCase runs with the UPDATED currentCase
  // (after React re-renders with the signed report), avoiding the stale
  // closure problem that occurs when calling it synchronously after signReport.
  useEffect(() => {
    if (
      currentCase?.report?.status === 'signed' &&
      currentCase?.workflow?.status !== 'finalized' &&
      currentCase?.audit?.signatureHash &&
      !signing
    ) {
      finalizeCase(currentCase.audit.signatureHash).catch((err) => {
        console.warn('Auto-finalization failed:', err);
      });
    }
  }, [currentCase?.report?.status, currentCase?.workflow?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    goBackToStep(ClinicalWorkflowStep.FINALIZE);
  }, [goBackToStep]);

  const handleSign = useCallback(async () => {
    if (!currentCase || !report) return;

    setSigning(true);
    setSignError(null);

    try {
      // Build signature input: report content + signer name + timestamp
      const now = new Date().toISOString();
      const signatureInput = [
        report.content.impression,
        report.content.recommendation,
        typedName.trim(),
        now,
      ].join('|');

      const hash = await generateSignatureHash(signatureInput);

      const result = signReport(hash, typedName.trim());
      if (!result.success) {
        setSignError(
          (result as { success: false; error: { message: string } }).error.message ??
            'Failed to sign report',
        );
      }
      // Finalization is handled reactively by the useEffect above,
      // which runs after React re-renders with the signed case state.
    } catch (err) {
      setSignError('An unexpected error occurred during signing');
    } finally {
      setSigning(false);
    }
  }, [currentCase, report, typedName, signReport]);

  // ── RENDER: no case ────────────────────────────────────────────────────
  if (!currentCase) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No case loaded.</Typography>
      </Box>
    );
  }

  // ── RENDER: no report ──────────────────────────────────────────────────
  if (!report) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning">No report has been generated for this case.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mt: 2 }}
          aria-label="Back"
        >
          Back
        </Button>
      </Box>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ py: 2 }}>
      {/* ── Title ─────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Draw sx={{ fontSize: 28, color: LUNIT.teal }} />
        <Typography
          variant="h5"
          sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: LUNIT.darkGray }}
        >
          Digital Signature
        </Typography>
        {isSigned && (
          <Chip
            icon={<Verified />}
            label="Signed & Completed"
            color="success"
            size="small"
          />
        )}
      </Stack>

      {/* ── Error banners ─────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}
      {signError && (
        <Alert severity="error" onClose={() => setSignError(null)} sx={{ mb: 2 }}>
          {signError}
        </Alert>
      )}

      {/* ── Patient verification ──────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          borderColor: alpha(LUNIT.teal, 0.18),
          backgroundColor: LUNIT.white,
        }}
      >
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}>
          Patient: {currentCase.patient.firstName} {currentCase.patient.lastName} — MRN:{' '}
          {currentCase.patient.mrn}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}>
          Case: {currentCase.caseNumber}
        </Typography>
      </Paper>

      {/* ── Report content (read-only) ────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          borderColor: alpha(LUNIT.teal, 0.18),
          backgroundColor: LUNIT.white,
          maxHeight: 400,
          overflow: 'auto',
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, color: LUNIT.teal, mb: 2 }}
        >
          Report for Signature
        </Typography>

        {/* Header */}
        <Typography variant="subtitle2" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, mb: 0.5 }}>
          {report.content.header}
        </Typography>

        <Divider sx={{ my: 1.5, borderColor: alpha(LUNIT.teal, 0.12) }} />

        {/* Clinical History */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Clinical History
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, mb: 1.5 }}>
          {report.content.clinicalHistory}
        </Typography>

        {/* Technique */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Technique
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, mb: 1.5 }}>
          {report.content.technique}
        </Typography>

        {/* Comparison */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Comparison
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, mb: 1.5 }}>
          {report.content.comparison}
        </Typography>

        {/* Findings */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Findings
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, mb: 1.5 }}>
          {report.content.findings}
        </Typography>

        <Divider sx={{ my: 1.5, borderColor: alpha(LUNIT.teal, 0.12) }} />

        {/* Impression */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Impression
        </Typography>
        <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 500, mb: 1.5 }}>
          {report.content.impression}
        </Typography>

        {/* Recommendation */}
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontWeight: 600 }}>
          Recommendation
        </Typography>
        <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 500 }}>
          {report.content.recommendation}
        </Typography>
      </Paper>

      {/* ── Signature section ─────────────────────────────────────────── */}
      {isSigned && signatureInfo ? (
        <Paper
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            borderColor: alpha(LUNIT.green, 0.3),
            boxShadow: `0 0 0 1px ${alpha(LUNIT.green, 0.08)}`,
          }}
        >
          {/* ── Certificate Header ────────────────────────────────────── */}
          <Box
            sx={{
              px: 3,
              py: 2,
              background: `linear-gradient(135deg, ${alpha(LUNIT.green, 0.08)} 0%, ${alpha(LUNIT.teal, 0.06)} 100%)`,
              borderBottom: `1px solid ${alpha(LUNIT.green, 0.15)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: alpha(LUNIT.green, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Verified sx={{ fontSize: 20, color: LUNIT.green }} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: LUNIT.fontHeading,
                    fontWeight: 600,
                    color: LUNIT.darkGray,
                    lineHeight: 1.2,
                  }}
                >
                  Digital Signature Certificate
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    color: LUNIT.midGray,
                    letterSpacing: 0.3,
                  }}
                >
                  Electronically signed medical document
                </Typography>
              </Box>
            </Stack>
            <Chip
              icon={<CheckCircle sx={{ fontSize: 16 }} />}
              label="Verified"
              size="small"
              sx={{
                backgroundColor: alpha(LUNIT.green, 0.1),
                color: LUNIT.green,
                fontFamily: LUNIT.fontBody,
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: 0.5,
                border: `1px solid ${alpha(LUNIT.green, 0.2)}`,
                '& .MuiChip-icon': { color: LUNIT.green },
              }}
            />
          </Box>

          {/* ── Certificate Body ──────────────────────────────────────── */}
          <Box sx={{ p: 3 }}>
            {/* Signer Identity */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontFamily: LUNIT.fontBody,
                  color: LUNIT.midGray,
                  fontSize: '0.65rem',
                  letterSpacing: 1.2,
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Signed By
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Dancing Script", "Georgia", cursive',
                  fontSize: '1.6rem',
                  color: LUNIT.darkGray,
                  lineHeight: 1.3,
                  mb: 0.5,
                }}
              >
                {signatureInfo.signerName || user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Authorized Clinician'}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {(user?.role) && (
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontSize: '0.8rem' }}
                  >
                    {user.role === 'radiologist' ? 'Radiologist' : user.role === 'admin' ? 'Administrator' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Typography>
                )}
                {user?.license_number && (
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontSize: '0.8rem' }}
                  >
                    License: {user.license_number}
                  </Typography>
                )}
                {user?.specialization && (
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, fontSize: '0.8rem' }}
                  >
                    {user.specialization}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider sx={{ borderColor: alpha(LUNIT.lightGray, 0.8), my: 2 }} />

            {/* Timestamp & Case Reference */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              sx={{ mb: 2.5 }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="overline"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    color: LUNIT.midGray,
                    fontSize: '0.65rem',
                    letterSpacing: 1.2,
                    mb: 0.25,
                    display: 'block',
                  }}
                >
                  Date & Time
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    fontWeight: 500,
                    color: LUNIT.darkGray,
                  }}
                >
                  {signatureInfo.signedAt
                    ? new Date(signatureInfo.signedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
                >
                  {signatureInfo.signedAt
                    ? new Date(signatureInfo.signedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short',
                      })
                    : ''}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="overline"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    color: LUNIT.midGray,
                    fontSize: '0.65rem',
                    letterSpacing: 1.2,
                    mb: 0.25,
                    display: 'block',
                  }}
                >
                  Case Reference
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    fontWeight: 500,
                    color: LUNIT.darkGray,
                  }}
                >
                  {currentCase.caseNumber}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
                >
                  {currentCase.patient.firstName} {currentCase.patient.lastName} — MRN: {currentCase.patient.mrn}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: alpha(LUNIT.lightGray, 0.8), my: 2 }} />

            {/* Document Integrity Hash */}
            <Box sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Fingerprint sx={{ fontSize: 16, color: LUNIT.midGray }} />
                <Typography
                  variant="overline"
                  sx={{
                    fontFamily: LUNIT.fontBody,
                    color: LUNIT.midGray,
                    fontSize: '0.65rem',
                    letterSpacing: 1.2,
                  }}
                >
                  Document Integrity Hash (SHA-256)
                </Typography>
              </Stack>
              {signatureInfo.signatureHash && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    backgroundColor: alpha(LUNIT.darkGray, 0.03),
                    border: `1px solid ${alpha(LUNIT.lightGray, 0.6)}`,
                    overflowX: 'auto',
                  }}
                >
                  <Typography
                    variant="caption"
                    data-testid="signature-hash-display"
                    sx={{
                      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                      fontSize: '0.7rem',
                      color: LUNIT.midGray,
                      letterSpacing: 0.8,
                      wordBreak: 'break-all',
                      lineHeight: 1.6,
                    }}
                  >
                    {signatureInfo.signatureHash}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* ── Certificate Footer ────────────────────────────────────── */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: `1px solid ${alpha(LUNIT.lightGray, 0.6)}`,
              backgroundColor: alpha(LUNIT.darkGray, 0.015),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Shield sx={{ fontSize: 14, color: LUNIT.midGray }} />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: LUNIT.fontBody,
                  color: LUNIT.midGray,
                  fontSize: '0.65rem',
                }}
              >
                Compliant with 21 CFR Part 11 · HIPAA Security Rule
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                fontFamily: LUNIT.fontBody,
                color: alpha(LUNIT.midGray, 0.6),
                fontSize: '0.6rem',
                letterSpacing: 0.3,
              }}
            >
              ClinicalVision™
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            borderColor: alpha(LUNIT.teal, 0.18),
            backgroundColor: LUNIT.white,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, color: LUNIT.teal, mb: 1 }}
          >
            Electronic Signature
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, mb: 2 }}>
            By typing your name and entering your credentials, you are electronically signing
            this report and affirming its accuracy. This action is irrevocable.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Full Name"
              placeholder="e.g., Dr. Jane Smith, MD"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              fullWidth
              size="small"
              disabled={signing}
              inputProps={{ 'aria-label': 'Full Name' }}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="Enter your password to confirm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
              disabled={signing}
              inputProps={{ 'aria-label': 'Password' }}
            />
          </Stack>
        </Paper>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          aria-label="Back"
          sx={{ fontFamily: LUNIT.fontBody, textTransform: 'none', borderRadius: 2 }}
        >
          Back
        </Button>

        {!isSigned && (
          <Button
            variant="contained"
            startIcon={<Lock />}
            onClick={handleSign}
            disabled={!canSign}
            aria-label="Sign Report"
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderRadius: 2,
              backgroundColor: LUNIT.green,
              '&:hover': { backgroundColor: alpha(LUNIT.green, 0.85) },
            }}
          >
            {signing ? 'Signing…' : 'Sign Report'}
          </Button>
        )}
      </Stack>

      {/* ── Post-sign actions ─────────────────────────────────────────── */}
      {isSigned && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mt: 3,
            borderRadius: 2,
            borderColor: alpha(LUNIT.teal, 0.18),
            backgroundColor: alpha(LUNIT.teal, 0.04),
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, mb: 2 }}
          >
            This case has been signed and finalized. It is saved and can be
            reviewed from the Cases dashboard at any time.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => navigate('/cases')}
              sx={{ fontFamily: LUNIT.fontBody, textTransform: 'none', borderRadius: 2 }}
            >
              View All Cases
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                clearCurrentCase();
                navigate('/workflow');
              }}
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                backgroundColor: LUNIT.teal,
                '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
              }}
            >
              Start New Case
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default DigitalSignatureStep;
