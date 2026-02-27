/**
 * Report Generation Component
 * Step 7: Generate and download clinical report
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  CheckCircle,
  ArrowForward,
} from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { reportGenerator } from '../../services/reportGenerator.service';
import { WorkflowStep, BIRADS_DESCRIPTIONS, getBIRADSColor, requiresBiopsy } from '../../types/clinical.types';

export const ReportGenerator: React.FC = () => {
  const { currentSession, advanceToStep, completeWorkflow } = useLegacyWorkflow();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGeneratePDF = () => {
    if (!currentSession) return;

    setGenerating(true);
    try {
      reportGenerator.generatePDF(currentSession);
      setGenerated(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJSON = () => {
    if (!currentSession) return;
    reportGenerator.exportJSON(currentSession);
  };

  const handleFinalize = () => {
    advanceToStep(WorkflowStep.FINALIZE);
    completeWorkflow();
  };

  if (!currentSession) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No active session found.
        </Typography>
      </Paper>
    );
  }

  // Check if all required data is present
  const hasAssessment = currentSession.assessment.biradsCategory !== undefined;
  const hasImpression = currentSession.assessment.impression !== '';
  const isComplete = hasAssessment && hasImpression;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Generate Clinical Report
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review the complete analysis and generate professional report
      </Typography>

      {/* Validation Alert */}
      {!isComplete && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please complete the BI-RADS assessment and clinical impression before generating the
          report.
        </Alert>
      )}

      {/* Report Preview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Report Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Patient Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Patient Information
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {currentSession.patientInfo.name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Patient ID:</strong> {currentSession.patientInfo.patientId}
            </Typography>
            <Typography variant="body2">
              <strong>DOB:</strong> {currentSession.patientInfo.dateOfBirth || 'N/A'} (Age:{' '}
              {currentSession.patientInfo.age || 'N/A'})
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Study Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Study Information
            </Typography>
            <Typography variant="body2">
              <strong>Study ID:</strong> {currentSession.studyInfo.studyId}
            </Typography>
            <Typography variant="body2">
              <strong>Date:</strong> {currentSession.studyInfo.studyDate}
            </Typography>
            <Typography variant="body2">
              <strong>Modality:</strong> {currentSession.studyInfo.modality}
            </Typography>
            <Typography variant="body2">
              <strong>Images:</strong> {currentSession.images.length}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Findings Summary */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Findings
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip
                label={`${currentSession.findings.length} Total`}
                size="small"
                color="default"
              />
              <Chip
                label={`${currentSession.findings.filter((f) => f.status === 'confirmed').length} Confirmed`}
                size="small"
                color="success"
              />
              <Chip
                label={`${currentSession.measurements?.length || 0} Measurements`}
                size="small"
                color="primary"
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Assessment */}
          <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Assessment
            </Typography>
            {currentSession.assessment.biradsCategory !== undefined ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2">
                    <strong>BI-RADS Category:</strong>
                  </Typography>
                  <Chip
                    label={`BI-RADS ${currentSession.assessment.biradsCategory}`}
                    sx={{
                      backgroundColor: getBIRADSColor(currentSession.assessment.biradsCategory),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Classification:</strong>{' '}
                  {BIRADS_DESCRIPTIONS[currentSession.assessment.biradsCategory] || 'Unknown'}
                </Typography>
                {requiresBiopsy(currentSession.assessment.biradsCategory) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> This BI-RADS category indicates biopsy should be considered.
                    </Typography>
                  </Alert>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No assessment completed
              </Typography>
            )}
            {currentSession.assessment.impression && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Impression:
                </Typography>
                <Typography variant="body2">{currentSession.assessment.impression}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Success Message */}
      {generated && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
          Report generated successfully and downloaded to your device.
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<PictureAsPdf />}
          onClick={handleGeneratePDF}
          disabled={!isComplete || generating}
          color="primary"
        >
          {generating ? 'Generating...' : 'Generate PDF Report'}
        </Button>
        <Button variant="outlined" startIcon={<Download />} onClick={handleExportJSON}>
          Export Session (JSON)
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleFinalize}
          disabled={!generated}
          color="success"
        >
          Finalize & Complete
        </Button>
      </Box>
    </Paper>
  );
};
