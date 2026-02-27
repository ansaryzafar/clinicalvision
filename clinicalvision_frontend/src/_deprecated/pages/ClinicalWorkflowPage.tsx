/**
 * Integrated Clinical Workflow Page
 * Combines patient info, findings, measurements, assessment, and reporting
 * 
 * Design Principles (Paton et al. 2021 + VoxLogicA UI Thesis):
 * - Progressive Disclosure: Show tabs based on workflow mode
 * - Consistency (Nielsen #4): Unified navigation patterns
 * - User control and freedom (Nielsen #3): Easy navigation between steps
 * - Visibility of system status (Nielsen #1): Clear tab states
 * 
 * CRITICAL: Tabs MUST accurately reflect:
 * 1. Which steps are completed (checkmark)
 * 2. Which step is current (highlighted)
 * 3. Which steps are accessible (enabled)
 * 4. Which steps are locked (disabled with indicator)
 */

import React from 'react';
import { Box, Container, Tabs, Tab, Paper, Alert, Button, Chip, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Add, Bolt, MedicalServices, Check, Lock } from '@mui/icons-material';
import { useLegacyWorkflow } from '../workflow-v3';
import { WorkflowStepper } from '../components/workflow/WorkflowStepper';
import { AutoSaveStatus } from '../components/workflow/AutoSaveStatus';
import { PatientInfoForm } from '../components/workflow/PatientInfoForm';
import { ImageLibrary } from '../components/workflow/ImageLibrary';
import { FindingsPanel } from '../components/workflow/FindingsPanel';
import { MeasurementsPanel } from '../components/workflow/MeasurementsPanel';
import { AssessmentForm } from '../components/workflow/AssessmentForm';
import { ReportGenerator } from '../components/workflow/ReportGenerator';
import { WorkflowStep, getVisibleSteps } from '../types/clinical.types';
import { isStepActuallyCompleted, canNavigateToStep } from '../utils/workflowUtils';

export const ClinicalWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    getCurrentStepIndex, 
    advanceToStep, 
    currentSession, 
    createNewSession,
    addImages,
    updateImage,
    deleteImage,
    setActiveImage,
    workflowMode,
  } = useLegacyWorkflow();
  const [activeTab, setActiveTab] = React.useState(0);

  // Get mode from session or context
  const mode = currentSession?.workflow?.mode || workflowMode;
  
  // Get visible steps for current mode
  const visibleSteps = getVisibleSteps(mode);
  
  // Current step from session
  const currentStepIndex = getCurrentStepIndex();

  // Map visible workflow steps to tabs with their components
  const getTabComponent = (step: WorkflowStep) => {
    switch (step) {
      case WorkflowStep.UPLOAD:
        return (
          <ImageLibrary
            images={currentSession?.images || []}
            activeImageId={currentSession?.activeImageId}
            onImagesAdd={addImages}
            onImageDelete={deleteImage}
            onImageSelect={setActiveImage}
            onImageUpdate={updateImage}
          />
        );
      case WorkflowStep.AI_ANALYSIS:
        return <FindingsPanel />;
      case WorkflowStep.PATIENT_INFO:
        return <PatientInfoForm />;
      case WorkflowStep.MEASUREMENTS:
        return <MeasurementsPanel />;
      case WorkflowStep.ASSESSMENT:
        return <AssessmentForm />;
      case WorkflowStep.REPORT:
        return <ReportGenerator />;
      case WorkflowStep.FINALIZE:
        return <ReportGenerator />; // Finalize uses report generator with sign-off
      default:
        return <PatientInfoForm />;
    }
  };

  /**
   * Build tabs from visible steps with DERIVED state
   * Uses isStepActuallyCompleted from workflowUtils for single source of truth
   */
  const workflowTabs = visibleSteps.map((stepConfig, index) => {
    // DERIVED STATE - calculated from actual session data
    const completed = isStepActuallyCompleted(currentSession, stepConfig.step);
    const current = stepConfig.step === currentStepIndex;
    const accessible = canNavigateToStep(currentSession, stepConfig.step, mode);
    
    return {
      label: stepConfig.label,
      step: stepConfig.step,
      component: getTabComponent(stepConfig.step),
      disabled: !accessible,
      completed,
      current,
      index,
    };
  });

  // Find the tab index that matches the current step
  // Using a separate effect to avoid infinite loops
  const prevStepRef = React.useRef(currentStepIndex);
  React.useEffect(() => {
    if (prevStepRef.current !== currentStepIndex) {
      prevStepRef.current = currentStepIndex;
      const tabIndex = visibleSteps.findIndex(s => s.step === currentStepIndex);
      if (tabIndex >= 0) {
        setActiveTab(tabIndex);
      }
    }
  }, [currentStepIndex, visibleSteps]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue < workflowTabs.length && !workflowTabs[newValue].disabled) {
      setActiveTab(newValue);
      advanceToStep(workflowTabs[newValue].step);
    }
  };

  const handleCreateNew = () => {
    createNewSession({
      workflow: {
        mode: workflowMode,
        currentStep: WorkflowStep.UPLOAD,
        completedSteps: [],
        status: 'in-progress',
        startedAt: new Date().toISOString(),
      },
    });
    navigate('/workflow');
  };

  // Show message if no session is loaded
  if (!currentSession) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert 
          severity="info" 
          action={
            <Button color="inherit" size="small" startIcon={<Add />} onClick={handleCreateNew}>
              Start Analysis
            </Button>
          }
        >
          No active case loaded. Start a new analysis or select an existing case from the Cases Dashboard.
        </Alert>
      </Container>
    );
  }

  // Ensure activeTab is valid
  const safeActiveTab = Math.min(Math.max(0, activeTab), workflowTabs.length - 1);
  const currentTabComponent = workflowTabs[safeActiveTab]?.component || <PatientInfoForm />;

  /**
   * Calculate completed steps count for progress display
   */
  const completedCount = workflowTabs.filter(tab => tab.completed).length;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header with mode indicator and auto-save status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={mode === 'quick' ? 'Quick Analysis - Fast screening workflow' : 'Clinical Mode - Complete diagnostic workflow'}>
            <Chip
              icon={mode === 'quick' ? <Bolt /> : <MedicalServices />}
              label={mode === 'quick' ? 'Quick Analysis Mode' : 'Clinical Workflow Mode'}
              color={mode === 'quick' ? 'warning' : 'primary'}
              variant="outlined"
            />
          </Tooltip>
          {/* Progress indicator */}
          <Chip
            label={`${completedCount}/${workflowTabs.length} completed`}
            size="small"
            color={completedCount === workflowTabs.length ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
        <AutoSaveStatus />
      </Box>

      {/* Workflow stepper */}
      <WorkflowStepper compact />

      {/* Enhanced Tab Navigation with completion indicators */}
      <Paper sx={{ mt: 3, mb: 2 }}>
        <Tabs
          value={safeActiveTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {workflowTabs.map((tab) => (
            <Tab 
              key={tab.step} 
              disabled={tab.disabled}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Completion indicator */}
                  {tab.completed && (
                    <Check sx={{ fontSize: 16, color: 'success.main' }} />
                  )}
                  {tab.disabled && !tab.completed && (
                    <Lock sx={{ fontSize: 14, color: 'text.disabled', opacity: 0.5 }} />
                  )}
                  <span>{tab.label}</span>
                  {/* Step number badge */}
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: tab.completed 
                        ? 'success.light'
                        : tab.current 
                        ? 'primary.main' 
                        : 'grey.200',
                      color: (tab.completed || tab.current) ? 'white' : 'grey.600',
                      fontSize: 10,
                      fontWeight: 700,
                      ml: 0.5,
                    }}
                  >
                    {tab.index + 1}
                  </Box>
                </Box>
              }
              sx={{
                minHeight: 56,
                opacity: tab.disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 600,
                },
                '&:hover:not(.Mui-disabled)': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>{currentTabComponent}</Box>
    </Container>
  );
};
