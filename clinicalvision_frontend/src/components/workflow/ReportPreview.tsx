/**
 * ReportPreview Component
 * 
 * Displays and manages the generated clinical report with editing,
 * finalization, signing, and PDF export capabilities.
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Link,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Create as SignIcon,
  Description as ReportIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import {
  ClinicalCase,
  GeneratedReport,
  ReportStatus,
} from '../../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ReportPreviewProps {
  /** The clinical case containing the report */
  clinicalCase: ClinicalCase;
  /** Callback when report content is changed */
  onReportChange: (report: GeneratedReport) => void;
  /** Callback when report is finalized */
  onFinalize: () => void;
  /** Callback when report is signed */
  onSign: (credentials?: SignatureCredentials) => void;
  /** Callback when PDF export is requested */
  onExportPdf: () => void | Promise<void>;
  /** Callback to go back to previous step */
  onBack?: () => void;
  /** Callback to generate a new report */
  onGenerate?: () => void;
  /** Callback to advance to the next workflow step (Finalize) */
  onContinue?: () => void;
  /** Whether the preview is read-only */
  isReadOnly?: boolean;
  /** Whether to require confirmation before finalizing */
  requireConfirmation?: boolean;
  /** Whether to require signature credentials */
  requireSignatureCredentials?: boolean;
}

export interface SignatureCredentials {
  userId: string;
  password: string;
}

interface EditableContent {
  clinicalHistory: string;
  technique: string;
  comparison: string;
  findings: string;
  impression: string;
  recommendation: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LUNIT = {
  teal: '#00C9EA',
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  reviewed: 'Reviewed',
  signed: 'Signed',
  amended: 'Amended',
};

const STATUS_COLORS: Record<ReportStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  pending_review: 'warning',
  reviewed: 'info',
  signed: 'success',
  amended: 'error',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ReportSectionProps {
  title: string;
  content: string;
  isEditing: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  fieldName?: string;
  /** data-testid for the section wrapper */
  testId?: string;
  /** Whether this section should have visual emphasis */
  emphasis?: boolean;
}

const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  content,
  isEditing,
  editValue,
  onEditChange,
  fieldName,
  testId,
  emphasis,
}) => {
  const theme = useTheme();
  return (
  <Box
    mb={3}
    data-testid={testId}
    {...(emphasis ? { 'data-emphasis': 'true' } : {})}
    sx={emphasis ? {
      backgroundColor: alpha(LUNIT.teal, 0.04),
      border: `1px solid ${alpha(LUNIT.teal, 0.15)}`,
      borderRadius: 2,
      p: 2,
    } : {}}
  >
    <Typography
      variant={emphasis ? 'h6' : 'subtitle1'}
      component="h2"
      gutterBottom
      sx={{
        fontWeight: emphasis ? 700 : 600,
        color: emphasis ? LUNIT.teal : theme.palette.text.primary,
        fontFamily: LUNIT.fontHeading,
        textTransform: 'none',
        letterSpacing: '0.05em',
        fontSize: emphasis ? '1.1rem' : '0.9rem',
      }}
    >
      {title}
    </Typography>
    {isEditing && onEditChange ? (
      <TextField
        fullWidth
        multiline
        minRows={3}
        label={title}
        value={editValue}
        onChange={(e) => onEditChange(e.target.value)}
        inputProps={{ 'aria-label': title }}
      />
    ) : (
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontFamily: LUNIT.fontBody }}>
        {content}
      </Typography>
    )}
  </Box>
  );
};

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onSign: (credentials: SignatureCredentials) => void;
}

const SignatureDialog: React.FC<SignatureDialogProps> = ({
  open,
  onClose,
  onSign,
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSign({ userId, password });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enter Credentials</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter your credentials to sign this report.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="User ID"
          type="text"
          fullWidth
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Sign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  clinicalCase,
  onReportChange,
  onFinalize,
  onSign,
  onExportPdf,
  onBack,
  onGenerate,
  onContinue,
  isReadOnly = false,
  requireConfirmation = false,
  requireSignatureCredentials = false,
}) => {
  const theme = useTheme();
  const report = clinicalCase.report;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<EditableContent | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleEditStart = useCallback(() => {
    if (report) {
      setEditContent({
        clinicalHistory: report.content.clinicalHistory,
        technique: report.content.technique,
        comparison: report.content.comparison,
        findings: report.content.findings,
        impression: report.content.impression,
        recommendation: report.content.recommendation,
      });
      setIsEditing(true);
    }
  }, [report]);

  const handleEditSave = useCallback(() => {
    if (report && editContent) {
      const updatedReport: GeneratedReport = {
        ...report,
        content: {
          ...report.content,
          ...editContent,
        },
        modifiedAt: new Date().toISOString(),
      };
      onReportChange(updatedReport);
      setIsEditing(false);
      setEditContent(null);
    }
  }, [report, editContent, onReportChange]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(null);
  }, []);

  const handleEditContentChange = useCallback((field: keyof EditableContent, value: string) => {
    setEditContent((prev) => (prev ? { ...prev, [field]: value } : null));
  }, []);

  const handleFinalize = useCallback(() => {
    if (requireConfirmation) {
      setShowFinalizeConfirm(true);
    } else {
      onFinalize();
    }
  }, [requireConfirmation, onFinalize]);

  const handleConfirmFinalize = useCallback(() => {
    setShowFinalizeConfirm(false);
    onFinalize();
  }, [onFinalize]);

  const handleSign = useCallback(() => {
    if (requireSignatureCredentials) {
      setShowSignatureDialog(true);
    } else {
      onSign();
    }
  }, [requireSignatureCredentials, onSign]);

  const handleSignWithCredentials = useCallback(
    (credentials: SignatureCredentials) => {
      onSign(credentials);
    },
    [onSign]
  );

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExportPdf();
    } finally {
      setIsExporting(false);
    }
  }, [onExportPdf]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const computeAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatGender = (g: string): string => {
    switch (g) {
      case 'F': return 'Female';
      case 'M': return 'Male';
      default: return 'Other';
    }
  };

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const canEdit = !isReadOnly && report?.status === 'draft';
  const canFinalize = !isReadOnly && report?.status === 'draft';
  const canSign = !isReadOnly && (report?.status === 'pending_review' || report?.status === 'reviewed');
  const showGenerateButton = !report && onGenerate;

  // ============================================================================
  // RENDER - NO REPORT STATE
  // ============================================================================

  if (!report) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center">
          <ReportIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h5" color="text.secondary">
            No report generated yet
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            A report will be generated based on the BI-RADS assessment and findings.
          </Typography>
          {showGenerateButton && (
            <Button
              variant="contained"
              color="primary"
              onClick={onGenerate}
              startIcon={<ReportIcon />}
            >
              Generate Report
            </Button>
          )}
          {onBack && (
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }

  // ============================================================================
  // RENDER - REPORT PREVIEW
  // ============================================================================

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      {/* Facility Header */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 3,
          pb: 2,
          borderBottom: `2px solid ${LUNIT.teal}`,
        }}
      >
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} mb={0.5}>
          <HospitalIcon sx={{ color: LUNIT.teal, fontSize: 28 }} />
          <Typography
            variant="h5"
            sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: theme.palette.text.primary }}
          >
            ClinicalVision Medical Imaging
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
          AI-Assisted Diagnostic Radiology
        </Typography>
      </Box>

      {/* Page Title & Status */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: theme.palette.text.primary }}
          >
            Report Preview
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" mt={0.5}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
              Case: {clinicalCase.caseNumber}
            </Typography>
            <Chip
              label={STATUS_LABELS[report.status]}
              color={STATUS_COLORS[report.status]}
              size="medium"
            />
          </Stack>
        </Box>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
          Report Date: {new Date(report.generatedAt).toLocaleString()}
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Patient Demographics */}
      <Box
        mb={3}
        sx={{
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: theme.palette.text.secondary,
            fontFamily: LUNIT.fontHeading,
            textTransform: 'none',
            letterSpacing: '0.05em',
            fontSize: '0.75rem',
            mb: 1,
          }}
        >
          Patient Information
        </Typography>
        <Typography variant="h6" sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: theme.palette.text.primary }}>
          {clinicalCase.patient.firstName} {clinicalCase.patient.lastName}
        </Typography>
        <Stack direction="row" spacing={3} mt={0.5} flexWrap="wrap">
          {clinicalCase.patient.dateOfBirth && (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
              DOB: {clinicalCase.patient.dateOfBirth}
              {' '}({computeAge(clinicalCase.patient.dateOfBirth)} yrs)
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
            Sex: {formatGender(clinicalCase.patient.gender)}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: LUNIT.fontBody }}>
            MRN: {clinicalCase.patient.mrn}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Report Content */}
      <Box className="report-content">
        {/* Report Document Title */}
        <Typography
          variant="h4"
          component="h2"
          align="center"
          gutterBottom
          sx={{
            fontWeight: 300,
            fontFamily: LUNIT.fontHeading,
            color: theme.palette.text.primary,
            mb: 3,
            letterSpacing: '0.08em',
            textTransform: 'none',
          }}
        >
          {report.content.header}
        </Typography>

        {/* Clinical History */}
        <ReportSection
          title="Clinical History"
          content={report.content.clinicalHistory}
          isEditing={isEditing}
          editValue={editContent?.clinicalHistory}
          onEditChange={(value) => handleEditContentChange('clinicalHistory', value)}
          testId="section-clinical-history"
        />

        {/* Technique */}
        <ReportSection
          title="Technique"
          content={report.content.technique}
          isEditing={isEditing}
          editValue={editContent?.technique}
          onEditChange={(value) => handleEditContentChange('technique', value)}
          testId="section-technique"
        />

        {/* Comparison */}
        <ReportSection
          title="Comparison"
          content={report.content.comparison}
          isEditing={isEditing}
          editValue={editContent?.comparison}
          onEditChange={(value) => handleEditContentChange('comparison', value)}
          testId="section-comparison"
        />

        {/* Findings */}
        <ReportSection
          title="Findings"
          content={report.content.findings}
          isEditing={isEditing}
          editValue={editContent?.findings}
          onEditChange={(value) => handleEditContentChange('findings', value)}
          testId="section-findings"
        />

        {/* BI-RADS Assessment Callout */}
        {clinicalCase.assessment?.overallCategory && (
          <Box
            data-testid="birads-callout"
            sx={{
              my: 3,
              p: 2.5,
              borderRadius: 2,
              backgroundColor: alpha(LUNIT.teal, 0.06),
              border: `2px solid ${LUNIT.teal}`,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="overline"
              sx={{
                fontFamily: LUNIT.fontHeading,
                color: theme.palette.text.secondary,
                letterSpacing: '0.1em',
              }}
            >
              Overall Assessment
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontFamily: LUNIT.fontHeading,
                fontWeight: 700,
                color: LUNIT.teal,
                mt: 0.5,
              }}
            >
              BI-RADS {clinicalCase.assessment.overallCategory}
            </Typography>
          </Box>
        )}

        {/* Impression */}
        <ReportSection
          title="Impression"
          content={report.content.impression}
          isEditing={isEditing}
          editValue={editContent?.impression}
          onEditChange={(value) => handleEditContentChange('impression', value)}
          testId="section-impression"
          emphasis
        />

        {/* Recommendation */}
        <ReportSection
          title="Recommendation"
          content={report.content.recommendation}
          isEditing={isEditing}
          editValue={editContent?.recommendation}
          onEditChange={(value) => handleEditContentChange('recommendation', value)}
          testId="section-recommendation"
          emphasis
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* PDF Link */}
      {report.pdfUrl && (
        <Box mb={2}>
          <Link href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
            Download PDF
          </Link>
        </Box>
      )}

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>
        )}

        {/* Print Button */}
        <Button
          variant="outlined"
          onClick={handlePrint}
          startIcon={<PrintIcon />}
        >
          Print
        </Button>

        {/* Export PDF Button */}
        <Button
          variant="outlined"
          onClick={handleExportPdf}
          startIcon={isExporting ? <CircularProgress size={20} /> : <PdfIcon />}
          disabled={isExporting}
        >
          Export PDF
        </Button>

        {/* Edit Mode Buttons */}
        {isEditing ? (
          <>
            <Button
              variant="outlined"
              onClick={handleEditCancel}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
          </>
        ) : (
          <>
            {/* Edit Button */}
            {canEdit && (
              <Button
                variant="outlined"
                onClick={handleEditStart}
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
            )}

            {/* Finalize Button */}
            {canFinalize && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleFinalize}
                startIcon={<CheckIcon />}
              >
                Finalize
              </Button>
            )}

            {/* Sign Button */}
            {canSign && (
              <Button
                variant="contained"
                color="success"
                onClick={handleSign}
                startIcon={<SignIcon />}
              >
                Sign
              </Button>
            )}

            {/* Continue to Final Review Button */}
            {onContinue && report && (
              <Button
                variant="contained"
                onClick={onContinue}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  fontFamily: LUNIT.fontBody,
                  textTransform: 'none',
                  borderRadius: 2,
                  backgroundColor: LUNIT.teal,
                  '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
                }}
              >
                Continue to Final Review
              </Button>
            )}
          </>
        )}
      </Stack>

      {/* Confirmation Dialog */}
      <Dialog open={showFinalizeConfirm} onClose={() => setShowFinalizeConfirm(false)}>
        <DialogTitle>Confirm Finalization</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to finalize this report? Once finalized, the report
            will be locked for editing and sent for review.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinalizeConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmFinalize} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSign={handleSignWithCredentials}
      />

      {/* Footer Disclaimer */}
      <Divider sx={{ mt: 4, mb: 2 }} />
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: theme.palette.text.secondary,
          fontFamily: LUNIT.fontBody,
          fontStyle: 'italic',
        }}
      >
        This report is confidential and intended solely for the referring physician and authorized personnel.
        All findings should be correlated with clinical information.
      </Typography>
    </Paper>
  );
};

export default ReportPreview;
