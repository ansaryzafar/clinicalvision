/**
 * BI-RADS Assessment Component
 * Step 6: Assign BI-RADS category and clinical impression
 * 
 * Updated to support string-based BI-RADS with 4A/4B/4C subdivisions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { ArrowForward, Info, CheckCircle } from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import {
  BIRADS,
  BIRADS_DESCRIPTIONS,
  BIRADS_RECOMMENDATIONS,
  getBIRADSColor,
  WorkflowStep,
} from '../../types/clinical.types';

// Define the order for displaying BI-RADS categories
const BIRADS_DISPLAY_ORDER: BIRADS[] = [
  BIRADS.INCOMPLETE,
  BIRADS.NEGATIVE,
  BIRADS.BENIGN,
  BIRADS.PROBABLY_BENIGN,
  BIRADS.SUSPICIOUS_LOW,
  BIRADS.SUSPICIOUS_MODERATE,
  BIRADS.SUSPICIOUS_HIGH,
  BIRADS.HIGHLY_SUGGESTIVE,
  BIRADS.KNOWN_BIOPSY_PROVEN,
];

export const AssessmentForm: React.FC = () => {
  const { currentSession, updateSessionData, advanceToStep, completeWorkflow, workflowMode } = useLegacyWorkflow();

  const [biradsCategory, setBiradsCategory] = useState<BIRADS | undefined>(undefined);
  const [impression, setImpression] = useState('');
  const [recommendation, setRecommendation] = useState('');
  
  // Get workflow mode from session or context
  const mode = currentSession?.workflow?.mode || workflowMode;

  // Load existing assessment from session
  useEffect(() => {
    if (currentSession?.assessment) {
      setBiradsCategory(currentSession.assessment.biradsCategory);
      setImpression(currentSession.assessment.impression || '');
      setRecommendation(currentSession.assessment.recommendation || '');
    }
  }, [currentSession]);

  // Auto-populate recommendation when BI-RADS category changes
  useEffect(() => {
    if (biradsCategory !== undefined) {
      setRecommendation(BIRADS_RECOMMENDATIONS[biradsCategory] || '');
    }
  }, [biradsCategory]);

  const handleSave = () => {
    updateSessionData({
      assessment: {
        biradsCategory,
        impression,
        recommendation,
      },
    });
    // NOTE: markStepCompleted() removed - ASSESSMENT is automatically complete
    // when session.assessment.biradsCategory is set (derived state)
  };

  const handleContinue = () => {
    if (biradsCategory === undefined || !impression) {
      alert('Please complete BI-RADS assessment and impression before continuing.');
      return;
    }

    // Save the assessment data
    updateSessionData({
      assessment: {
        biradsCategory,
        impression,
        recommendation,
      },
    });

    // NOTE: markStepCompleted() removed - derived from session.assessment.biradsCategory

    // In quick mode, assessment is the final step - complete the workflow
    if (mode === 'quick') {
      completeWorkflow();
      console.log('✅ Quick analysis complete! Assessment saved.');
      alert('Quick analysis complete! Assessment has been saved.');
      return;
    }

    // In clinical mode, continue to full report
    advanceToStep(WorkflowStep.REPORT);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        BI-RADS Assessment
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Assign BI-RADS category and provide clinical impression (includes 4A/4B/4C subdivisions)
      </Typography>

      {/* BI-RADS Category Selection */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          select
          label="BI-RADS Category"
          value={biradsCategory !== undefined ? biradsCategory : ''}
          onChange={(e) => setBiradsCategory(e.target.value as BIRADS)}
          required
        >
          {BIRADS_DISPLAY_ORDER.map((category) => {
            const description = BIRADS_DESCRIPTIONS[category];
            return (
              <MenuItem key={category} value={category}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: getBIRADSColor(category),
                    }}
                  />
                  <Typography>
                    <strong>BI-RADS {category}:</strong> {description}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </TextField>
      </Box>

      {/* BI-RADS Info Card */}
      {biradsCategory !== undefined && (
        <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Info color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                BI-RADS {biradsCategory}: {BIRADS_DESCRIPTIONS[biradsCategory]}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Recommended Action:</strong>
            </Typography>
            <Typography variant="body2">{BIRADS_RECOMMENDATIONS[biradsCategory]}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Clinical Impression */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={6}
          label="Clinical Impression"
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          placeholder="Provide detailed clinical impression based on findings and measurements..."
          required
          helperText="Summarize key findings and their clinical significance"
        />
      </Box>

      {/* Recommendation */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Recommendation"
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          placeholder="Clinical recommendations and follow-up plan..."
          helperText="Auto-populated based on BI-RADS category, can be customized"
        />
      </Box>

      {/* Summary */}
      {currentSession && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Case Summary:</strong>
          </Typography>
          <Typography variant="body2">
            Patient: {currentSession.patientInfo.name || 'N/A'} (
            {currentSession.patientInfo.patientId})
          </Typography>
          <Typography variant="body2">
            Study: {currentSession.studyInfo.studyDescription} (
            {currentSession.studyInfo.studyDate})
          </Typography>
          <Typography variant="body2">
            Findings: {currentSession.findings.length} documented
          </Typography>
          <Typography variant="body2">
            Measurements: {currentSession.measurements?.length || 0} recorded
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={handleSave}>
          Save Assessment
        </Button>
        <Button 
          variant="contained" 
          color={mode === 'quick' ? 'success' : 'primary'}
          endIcon={mode === 'quick' ? <CheckCircle /> : <ArrowForward />} 
          onClick={handleContinue}
        >
          {mode === 'quick' ? 'Complete Analysis' : 'Generate Report'}
        </Button>
      </Box>
    </Paper>
  );
};
