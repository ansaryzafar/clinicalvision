/**
 * Patient Information Form
 * Step 2 of the clinical workflow - Collect patient demographics
 * 
 * Features:
 * - Real-time validation with specific error messages
 * - Auto-calculation of age from DOB
 * - Success/error notifications
 * - Loading states for async operations
 * - Input sanitization and format validation
 * - Keyboard shortcuts (Ctrl+S to save)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Stack,
  Snackbar,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import { ArrowForward, Save, CheckCircle, Error as ErrorIcon, Info } from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { PatientInfo, StudyInfo, WorkflowStep } from '../../types/clinical.types';

const MODALITY_OPTIONS = [
  { value: 'MG', label: 'Mammography (MG)' },
  { value: 'DBT', label: 'Digital Breast Tomosynthesis (DBT)' },
  { value: 'US', label: 'Ultrasound (US)' },
  { value: 'MRI', label: 'MRI' },
];

const GENDER_OPTIONS = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
  { value: 'O', label: 'Other' },
];

export const PatientInfoForm: React.FC = () => {
  const { currentSession, updateSessionData, advanceToStep } = useLegacyWorkflow();

  // Form state
  const [patientInfo, setPatientInfo] = useState<Partial<PatientInfo>>({
    patientId: '',
    name: '',
    dateOfBirth: '',
    age: undefined,
    gender: 'F',
    medicalRecordNumber: '',
  });

  const [studyInfo, setStudyInfo] = useState<Partial<StudyInfo>>({
    studyId: '',
    studyDate: new Date().toISOString().split('T')[0],
    studyDescription: 'Mammography Screening',
    modality: 'MG',
    institution: '',
    referringPhysician: '',
    performingPhysician: '',
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Load existing data from session
  useEffect(() => {
    if (currentSession) {
      if (currentSession.patientInfo) {
        setPatientInfo(currentSession.patientInfo);
      }
      if (currentSession.studyInfo) {
        setStudyInfo(currentSession.studyInfo);
      }
    }
  }, [currentSession]);

  // Calculate age from DOB
  useEffect(() => {
    if (patientInfo.dateOfBirth) {
      try {
        const dob = new Date(patientInfo.dateOfBirth);
        const today = new Date();
        
        // Validate date
        if (isNaN(dob.getTime())) {
          return;
        }
        
        // Check if DOB is not in the future
        if (dob > today) {
          setErrors(prev => ({ ...prev, dateOfBirth: 'Date of birth cannot be in the future' }));
          return;
        }
        
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        
        // Validate reasonable age range
        if (age < 0 || age > 150) {
          setErrors(prev => ({ ...prev, dateOfBirth: 'Please enter a valid date of birth' }));
          return;
        }
        
        setPatientInfo(prev => ({ ...prev, age }));
        // Clear DOB error if it was about invalid date
        if (errors.dateOfBirth && errors.dateOfBirth.includes('valid')) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.dateOfBirth;
            return newErrors;
          });
        }
      } catch (error) {
        console.error('Error calculating age:', error);
      }
    }
  }, [patientInfo.dateOfBirth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patientInfo, studyInfo]); // Dependencies for handleSave

  /**
   * Validate a single field
   */
  const validateField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'patientId':
        if (!value || !value.trim()) return 'Patient ID is required';
        if (value.length < 3) return 'Patient ID must be at least 3 characters';
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Patient ID can only contain letters, numbers, hyphens, and underscores';
        return '';
        
      case 'name':
        if (!value || !value.trim()) return 'Patient name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        return '';
        
      case 'dateOfBirth':
        if (!value) return 'Date of birth is required';
        const dob = new Date(value);
        if (isNaN(dob.getTime())) return 'Please enter a valid date';
        if (dob > new Date()) return 'Date of birth cannot be in the future';
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 0 || age > 150) return 'Please enter a valid date of birth';
        return '';
        
      case 'studyDate':
        if (!value) return 'Study date is required';
        const studyDate = new Date(value);
        if (isNaN(studyDate.getTime())) return 'Please enter a valid date';
        // Allow study dates up to 1 day in the future (timezone tolerance)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (studyDate > tomorrow) return 'Study date cannot be more than 1 day in the future';
        return '';
        
      case 'medicalRecordNumber':
        if (value && value.length > 0 && value.length < 3) return 'MRN must be at least 3 characters if provided';
        return '';
        
      default:
        return '';
    }
  }, []);

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    const patientIdError = validateField('patientId', patientInfo.patientId);
    if (patientIdError) newErrors.patientId = patientIdError;
    
    const nameError = validateField('name', patientInfo.name);
    if (nameError) newErrors.name = nameError;
    
    const dobError = validateField('dateOfBirth', patientInfo.dateOfBirth);
    if (dobError) newErrors.dateOfBirth = dobError;
    
    const studyDateError = validateField('studyDate', studyInfo.studyDate);
    if (studyDateError) newErrors.studyDate = studyDateError;
    
    // Optional field validation
    const mrnError = validateField('medicalRecordNumber', patientInfo.medicalRecordNumber);
    if (mrnError) newErrors.medicalRecordNumber = mrnError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [patientInfo, studyInfo, validateField]);

  /**
   * Handle field blur for real-time validation
   */
  const handleFieldBlur = (fieldName: string, value: any) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = validateField(fieldName, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  /**
   * Sanitize and update patient info
   */
  const updatePatientInfo = (field: keyof PatientInfo, value: any) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation if field was touched or form was submitted
    if (touched[field] || hasAttemptedSubmit) {
      setTimeout(() => handleFieldBlur(field, value), 0);
    }
  };

  /**
   * Sanitize and update study info
   */
  const updateStudyInfo = (field: keyof StudyInfo, value: any) => {
    setStudyInfo(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation if field was touched or form was submitted
    if (touched[field] || hasAttemptedSubmit) {
      setTimeout(() => handleFieldBlur(field, value), 0);
    }
  };

  /**
   * Save form data (without advancing workflow)
   */
  const handleSave = async () => {
    setHasAttemptedSubmit(true);
    
    if (!validateForm()) {
      setSnackbarMessage('Please fix validation errors before saving');
      setShowErrorSnackbar(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-generate Study ID if not provided
      const finalStudyInfo = {
        ...studyInfo,
        studyId: studyInfo.studyId || `STUDY_${Date.now()}`,
      };

      await updateSessionData({
        patientInfo: patientInfo as PatientInfo,
        studyInfo: finalStudyInfo as StudyInfo,
      });

      setSnackbarMessage('Patient information saved successfully');
      setShowSuccessSnackbar(true);
      setHasAttemptedSubmit(false);
    } catch (error) {
      console.error('Error saving patient info:', error);
      setSnackbarMessage('Failed to save patient information. Please try again.');
      setShowErrorSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Save and continue to next workflow step
   */
  const handleContinue = async () => {
    setHasAttemptedSubmit(true);
    
    if (!validateForm()) {
      setSnackbarMessage('Please fill in all required fields correctly');
      setShowErrorSnackbar(true);
      
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-generate Study ID if not provided
      const finalStudyInfo = {
        ...studyInfo,
        studyId: studyInfo.studyId || `STUDY_${Date.now()}`,
      };

      await updateSessionData({
        patientInfo: patientInfo as PatientInfo,
        studyInfo: finalStudyInfo as StudyInfo,
      });

      // Navigate to next logical step based on workflow state
      // If AI analysis is done, go to Measurements (clinical) or Assessment (quick)
      // If AI analysis NOT done, go to Upload to prompt image upload
      const hasAIResults = currentSession?.storedAnalysisResults || (currentSession?.findings?.length || 0) > 0;
      const mode = currentSession?.workflow?.mode || 'clinical';
      
      if (hasAIResults) {
        if (mode === 'quick') {
          await advanceToStep(WorkflowStep.ASSESSMENT);
          setSnackbarMessage('Patient information saved. Proceeding to Assessment...');
        } else {
          await advanceToStep(WorkflowStep.MEASUREMENTS);
          setSnackbarMessage('Patient information saved. Proceeding to Measurements...');
        }
      } else {
        // No AI results yet - go to Upload to get images analyzed
        await advanceToStep(WorkflowStep.UPLOAD);
        setSnackbarMessage('Patient information saved. Please upload images for analysis...');
      }
      setShowSuccessSnackbar(true);
      setHasAttemptedSubmit(false);
    } catch (error) {
      console.error('Error continuing workflow:', error);
      setSnackbarMessage('Failed to save and continue. Please try again.');
      setShowErrorSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Close snackbar notifications
   */
  const handleCloseSnackbar = () => {
    setShowSuccessSnackbar(false);
    setShowErrorSnackbar(false);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Patient Information
        </Typography>
        <Tooltip title="Ctrl+S to save">
          <IconButton size="small">
            <Info fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter patient demographics and study details. Fields marked with * are required.
      </Typography>

      {/* Global Error Alert */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />}>
          <strong>Please correct the following errors:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Patient Information Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          Patient Demographics
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Patient ID"
              name="patientId"
              value={patientInfo.patientId || ''}
              onChange={e => updatePatientInfo('patientId', e.target.value)}
              onBlur={e => handleFieldBlur('patientId', e.target.value)}
              error={!!(touched.patientId || hasAttemptedSubmit) && !!errors.patientId}
              helperText={(touched.patientId || hasAttemptedSubmit) && errors.patientId}
              required
              disabled={isSubmitting}
              placeholder="e.g., PAT-12345"
              InputProps={{
                endAdornment: patientInfo.patientId && !errors.patientId ? (
                  <CheckCircle color="success" fontSize="small" />
                ) : null,
              }}
            />
            <TextField
              fullWidth
              label="Medical Record Number (MRN)"
              name="medicalRecordNumber"
              value={patientInfo.medicalRecordNumber || ''}
              onChange={e => updatePatientInfo('medicalRecordNumber', e.target.value)}
              onBlur={e => handleFieldBlur('medicalRecordNumber', e.target.value)}
              error={!!(touched.medicalRecordNumber || hasAttemptedSubmit) && !!errors.medicalRecordNumber}
              helperText={(touched.medicalRecordNumber || hasAttemptedSubmit) ? errors.medicalRecordNumber : 'Optional'}
              disabled={isSubmitting}
              placeholder="e.g., MRN-98765"
            />
          </Stack>
          <TextField
            fullWidth
            label="Patient Name"
            name="name"
            value={patientInfo.name || ''}
            onChange={e => updatePatientInfo('name', e.target.value)}
            onBlur={e => handleFieldBlur('name', e.target.value)}
            error={!!(touched.name || hasAttemptedSubmit) && !!errors.name}
            helperText={(touched.name || hasAttemptedSubmit) && errors.name}
            required
            disabled={isSubmitting}
            placeholder="e.g., Jane Doe"
            InputProps={{
              endAdornment: patientInfo.name && !errors.name ? (
                <CheckCircle color="success" fontSize="small" />
              ) : null,
            }}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={patientInfo.dateOfBirth || ''}
              onChange={e => updatePatientInfo('dateOfBirth', e.target.value)}
              onBlur={e => handleFieldBlur('dateOfBirth', e.target.value)}
              error={!!(touched.dateOfBirth || hasAttemptedSubmit) && !!errors.dateOfBirth}
              helperText={(touched.dateOfBirth || hasAttemptedSubmit) && errors.dateOfBirth}
              InputLabelProps={{ shrink: true }}
              required
              disabled={isSubmitting}
              inputProps={{ max: new Date().toISOString().split('T')[0] }}
            />
            <TextField
              fullWidth
              label="Age"
              type="number"
              value={patientInfo.age || ''}
              InputProps={{ 
                readOnly: true,
                endAdornment: patientInfo.age ? (
                  <Typography variant="caption" color="text.secondary">years</Typography>
                ) : null,
              }}
              helperText="Auto-calculated from date of birth"
              disabled
            />
            <TextField
              fullWidth
              select
              label="Gender"
              name="gender"
              value={patientInfo.gender || 'F'}
              onChange={e => updatePatientInfo('gender', e.target.value)}
              disabled={isSubmitting}
            >
              {GENDER_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Box>

      {/* Study Information Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          Study Details
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Study ID"
              name="studyId"
              value={studyInfo.studyId || ''}
              onChange={e => updateStudyInfo('studyId', e.target.value)}
              helperText="Auto-generated if left blank"
              disabled={isSubmitting}
              placeholder="e.g., STUDY-2025-001"
            />
            <TextField
              fullWidth
              label="Study Date"
              name="studyDate"
              type="date"
              value={studyInfo.studyDate || ''}
              onChange={e => updateStudyInfo('studyDate', e.target.value)}
              onBlur={e => handleFieldBlur('studyDate', e.target.value)}
              error={!!(touched.studyDate || hasAttemptedSubmit) && !!errors.studyDate}
              helperText={(touched.studyDate || hasAttemptedSubmit) && errors.studyDate}
              InputLabelProps={{ shrink: true }}
              required
              disabled={isSubmitting}
              inputProps={{ max: new Date(Date.now() + 86400000).toISOString().split('T')[0] }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              select
              label="Modality"
              name="modality"
              value={studyInfo.modality || 'MG'}
              onChange={e => updateStudyInfo('modality', e.target.value)}
              disabled={isSubmitting}
            >
              {MODALITY_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Study Description"
              name="studyDescription"
              value={studyInfo.studyDescription || ''}
              onChange={e => updateStudyInfo('studyDescription', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Screening Mammography"
            />
          </Stack>
          <TextField
            fullWidth
            label="Institution"
            name="institution"
            value={studyInfo.institution || ''}
            onChange={e => updateStudyInfo('institution', e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g., General Hospital Radiology Department"
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Referring Physician"
              name="referringPhysician"
              value={studyInfo.referringPhysician || ''}
              onChange={e => updateStudyInfo('referringPhysician', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Dr. John Smith"
            />
            <TextField
              fullWidth
              label="Performing Physician"
              name="performingPhysician"
              value={studyInfo.performingPhysician || ''}
              onChange={e => updateStudyInfo('performingPhysician', e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Dr. Jane Williams"
            />
          </Stack>
        </Stack>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
        {isSubmitting && <CircularProgress size={24} />}
        <Button 
          variant="outlined" 
          startIcon={<Save />} 
          onClick={handleSave}
          disabled={isSubmitting || Object.keys(errors).length > 0}
        >
          Save
        </Button>
        <Button 
          variant="contained" 
          endIcon={<ArrowForward />} 
          onClick={handleContinue}
          disabled={isSubmitting}
        >
          Continue to Findings
        </Button>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showErrorSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
