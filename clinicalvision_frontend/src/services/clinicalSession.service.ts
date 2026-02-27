/**
 * Clinical Session Service
 * Manages analysis sessions with auto-save and persistence
 * 
 * Design Principles (Paton et al. 2021):
 * - Error prevention (Nielsen #5): Auto-save prevents data loss
 * - User control and freedom (Nielsen #3): Session management
 * - Visibility of system status (Nielsen #1): Save state feedback
 */

import { AnalysisSession, AutoSaveState, WorkflowStep, WorkflowMode } from '../types/clinical.types';

const SESSION_STORAGE_KEY = 'clinicalvision_sessions';
const CURRENT_SESSION_KEY = 'clinicalvision_current_session';
const WORKFLOW_MODE_KEY = 'clinicalvision_workflow_mode';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

class ClinicalSessionService {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private autoSaveState: AutoSaveState = {
    enabled: true,
    interval: 30,
    lastSaved: new Date().toISOString(),
    isDirty: false,
    savingInProgress: false,
  };

  /**
   * Create a new analysis session with workflow mode support
   */
  createSession(initialData: Partial<AnalysisSession>): AnalysisSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get preferred workflow mode from storage or default to 'quick'
    const storedMode = localStorage.getItem(WORKFLOW_MODE_KEY) as WorkflowMode | null;
    const workflowMode: WorkflowMode = initialData.workflow?.mode || storedMode || 'quick';
    
    const session: AnalysisSession = {
      sessionId,
      patientInfo: initialData.patientInfo || {
        patientId: '', // Empty by default - filled in during workflow
      },
      studyInfo: initialData.studyInfo || {
        studyId: `study_${Date.now()}`,
        studyDate: new Date().toISOString().split('T')[0],
        studyDescription: 'Mammography Screening',
        modality: 'MG',
      },
      images: initialData.images || [],
      findings: initialData.findings || [],
      assessment: initialData.assessment || {
        impression: '',
        recommendation: '',
      },
      workflow: {
        mode: workflowMode,
        currentStep: WorkflowStep.UPLOAD, // Start with upload
        completedSteps: [],
        status: 'in-progress',
        startedAt: new Date().toISOString(),
        stepHistory: [],
        ...initialData.workflow,
      },
      measurements: initialData.measurements || [],
      viewerSettings: {
        windowLevel: { width: 255, center: 128 },
        zoom: 1.0,
        rotation: 0,
        gridEnabled: false,
        gridSpacing: 5,
        calibration: 10,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'radiologist', // TODO: Get from auth
        lastModified: new Date().toISOString(),
        modifiedBy: 'radiologist',
        version: 1,
        autoSaveEnabled: true,
      },
    };

    this.saveSession(session);
    this.setCurrentSession(sessionId);
    this.startAutoSave();

    return session;
  }

  /**
   * Save preferred workflow mode
   */
  setPreferredWorkflowMode(mode: WorkflowMode): void {
    localStorage.setItem(WORKFLOW_MODE_KEY, mode);
  }

  /**
   * Get preferred workflow mode
   */
  getPreferredWorkflowMode(): WorkflowMode {
    return (localStorage.getItem(WORKFLOW_MODE_KEY) as WorkflowMode) || 'quick';
  }

  /**
   * Get current active session
   */
  getCurrentSession(): AnalysisSession | null {
    const sessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AnalysisSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): AnalysisSession[] {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save/update session
   */
  saveSession(session: AnalysisSession): void {
    session.metadata.lastModified = new Date().toISOString();
    session.metadata.version += 1;

    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.sessionId === session.sessionId);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    this.autoSaveState.lastSaved = new Date().toISOString();
    this.autoSaveState.isDirty = false;

    console.log(`✓ Session saved: ${session.sessionId} (v${session.metadata.version})`);
  }

  /**
   * Set current active session
   */
  setCurrentSession(sessionId: string): void {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
  }

  /**
   * Update session data
   */
  updateSession(sessionId: string, updates: Partial<AnalysisSession>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    const updatedSession = { ...session, ...updates };
    this.saveSession(updatedSession);
    this.autoSaveState.isDirty = true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    const sessions = this.getAllSessions();
    const filtered = sessions.filter(s => s.sessionId !== sessionId);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filtered));

    if (localStorage.getItem(CURRENT_SESSION_KEY) === sessionId) {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }

  /**
   * Reset workflow state for a session
   * Use this to fix corrupted completedSteps data
   */
  resetWorkflowState(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    
    // Determine which steps should actually be marked complete based on data
    const validCompletedSteps: WorkflowStep[] = [];
    
    // UPLOAD: Complete if images exist
    if (session.images && session.images.length > 0) {
      validCompletedSteps.push(WorkflowStep.UPLOAD);
    }
    
    // AI_ANALYSIS: Complete if any image is analyzed or findings exist
    if (session.images?.some(img => img.analyzed) || session.findings?.length > 0 || session.storedAnalysisResults) {
      validCompletedSteps.push(WorkflowStep.AI_ANALYSIS);
    }
    
    // PATIENT_INFO: Complete if patient ID exists
    if (session.patientInfo?.patientId && session.patientInfo.patientId.trim() !== '') {
      validCompletedSteps.push(WorkflowStep.PATIENT_INFO);
    }
    
    // MEASUREMENTS: Complete if measurements exist
    if (session.measurements && session.measurements.length > 0) {
      validCompletedSteps.push(WorkflowStep.MEASUREMENTS);
    }
    
    // ASSESSMENT: Complete if BI-RADS category is selected
    if (session.assessment?.biradsCategory !== undefined && session.assessment.biradsCategory !== null) {
      validCompletedSteps.push(WorkflowStep.ASSESSMENT);
    }
    
    // REPORT: Would need to check if report was generated (not easily detectable)
    // FINALIZE: Would need to check if workflow was finalized
    
    console.log(`🔧 Resetting workflow for ${sessionId}. Valid completed steps: [${validCompletedSteps.map(s => WorkflowStep[s]).join(', ')}]`);
    
    session.workflow.completedSteps = validCompletedSteps;
    this.saveSession(session);
  }

  /**
   * Clear all sessions and storage - use for development/testing
   */
  clearAllSessions(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    console.log('🗑️ All sessions cleared');
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId: string): string {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  importSession(jsonData: string): AnalysisSession {
    const session: AnalysisSession = JSON.parse(jsonData);
    session.sessionId = `imported_${Date.now()}`; // Generate new ID
    this.saveSession(session);
    return session;
  }

  /**
   * Auto-save functionality
   */
  startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.autoSaveState.enabled && this.autoSaveState.isDirty) {
        const currentSession = this.getCurrentSession();
        if (currentSession) {
          this.autoSaveState.savingInProgress = true;
          this.saveSession(currentSession);
          this.autoSaveState.savingInProgress = false;
        }
      }
    }, AUTO_SAVE_INTERVAL);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  getAutoSaveState(): AutoSaveState {
    return { ...this.autoSaveState };
  }

  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveState.enabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  /**
   * Mark session as dirty (needs saving)
   */
  markDirty(): void {
    this.autoSaveState.isDirty = true;
  }

  /**
   * Workflow management
   * 
   * CRITICAL DESIGN DECISION: advanceWorkflow ONLY navigates to a step.
   * It does NOT auto-complete previous steps - steps are ONLY marked complete
   * when the user actually completes the required data for that step.
   * 
   * This ensures:
   * 1. Progress bar accurately reflects actual completion
   * 2. Users can't accidentally skip required steps
   * 3. Sequential workflow integrity is maintained
   */
  advanceWorkflow(sessionId: string, step: WorkflowStep): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    // ONLY navigate to the step - DO NOT auto-complete previous steps
    // Steps are marked complete via markStepCompleted() when user fulfills requirements
    session.workflow.currentStep = step;
    
    console.log(`📍 Navigated to step ${step} (${WorkflowStep[step]}), completed steps: [${session.workflow.completedSteps.map(s => WorkflowStep[s]).join(', ')}]`);

    this.saveSession(session);
  }

  /**
   * Mark a specific step as completed
   * Called when user successfully fills out a step's data
   */
  markStepCompleted(sessionId: string, step: WorkflowStep): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (!session.workflow.completedSteps.includes(step)) {
      session.workflow.completedSteps.push(step);
      console.log(`✅ Marked step ${step} (${WorkflowStep[step]}) as completed`);
      this.saveSession(session);
    }
  }

  completeWorkflow(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    // Get mode to determine which steps to mark complete
    const mode = session.workflow?.mode || 'clinical';
    
    // In quick mode, only mark visible steps (0=UPLOAD, 1=AI_ANALYSIS, 4=ASSESSMENT)
    // In clinical mode, mark all 7 steps (0-6)
    const completedSteps = mode === 'quick' 
      ? [0, 1, 4]  // UPLOAD, AI_ANALYSIS, ASSESSMENT
      : [0, 1, 2, 3, 4, 5, 6];  // All clinical workflow steps
    
    const finalStep = mode === 'quick' ? 4 : 6;  // ASSESSMENT or FINALIZE
    
    this.updateSession(sessionId, {
      workflow: {
        ...session.workflow,
        currentStep: finalStep,
        completedSteps: completedSteps,
        status: 'completed',
      },
    });
    
    console.log(`✅ Workflow completed (${mode} mode). Completed steps: [${completedSteps.join(', ')}]`);
  }

  /**
   * Search sessions
   */
  searchSessions(query: {
    patientId?: string;
    studyDate?: string;
    status?: string;
  }): AnalysisSession[] {
    const sessions = this.getAllSessions();
    
    return sessions.filter(session => {
      if (query.patientId && !session.patientInfo.patientId.includes(query.patientId)) {
        return false;
      }
      if (query.studyDate && session.studyInfo.studyDate !== query.studyDate) {
        return false;
      }
      if (query.status && session.workflow.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalImages: number;
    totalFindings: number;
    totalMeasurements: number;
    completionPercentage: number;
    timeElapsed: string;
  } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const created = new Date(session.metadata.createdAt);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 1000 / 60); // minutes

    return {
      totalImages: session.images.length,
      totalFindings: session.findings.length,
      totalMeasurements: session.measurements.length,
      completionPercentage: (session.workflow.completedSteps.length / 7) * 100, // 7 steps: 0-6
      timeElapsed: `${elapsed} minutes`,
    };
  }
}

export const clinicalSessionService = new ClinicalSessionService();
