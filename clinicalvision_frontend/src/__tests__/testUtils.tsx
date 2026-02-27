/**
 * Test Utilities for ClinicalVision
 * Reusable test helpers, mocks, and fixtures
 * 
 * Note: This is a utility file, not a test suite.
 */

import { AnalysisSession, PatientInfo, StudyInfo, ImageMetadata, Finding, BIRADS, WorkflowStep } from '../types/clinical.types';

// Dummy test to prevent Jest error
describe('Test Utils', () => {
  test('exports test utilities', () => {
    expect(mockPatientInfo).toBeDefined();
  });
});

/**
 * Mock Patient Data (De-identified for HIPAA compliance)
 */
export const mockPatientInfo: PatientInfo = {
  patientId: 'TEST001',
  name: 'Test Patient',
  dateOfBirth: '1980-01-01',
  age: 46,
  gender: 'F',
  medicalRecordNumber: 'MRN12345',
};

export const mockStudyInfo: StudyInfo = {
  studyId: 'STUDY001',
  studyDate: '2026-01-06',
  studyDescription: 'Screening Mammography',
  modality: 'MG',
  institution: 'Test Hospital',
  referringPhysician: 'Dr. Test',
  performingPhysician: 'Dr. Radiologist',
};

export const mockImageMetadata: ImageMetadata = {
  imageId: 'img_test_001',
  fileName: 'test-mammogram.png',
  fileSize: 1024000,
  uploadDate: '2026-01-06T10:00:00.000Z',
  viewType: 'CC',
  laterality: 'L',
  thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  analyzed: true,
  analysisDate: '2026-01-06T10:05:00.000Z',
};

export const mockFinding: Finding = {
  findingId: 'finding_001',
  findingType: 'mass',
  location: {
    clockPosition: 3,
    distanceFromNipple: 5,
  },
  coordinates: {
    x: 100,
    y: 200,
    width: 50,
    height: 50,
  },
  measurements: {
    maxDiameter: 12,
    minDiameter: 8,
    area: 96,
  },
  description: 'Irregular mass',
  characteristics: {
    shape: 'irregular',
    margin: 'spiculated',
    density: 'high',
  },
  aiConfidence: 0.85,
  status: 'pending',
};

export const mockAnalysisSession: AnalysisSession = {
  sessionId: 'session_test_001',
  patientInfo: mockPatientInfo,
  studyInfo: mockStudyInfo,
  images: [mockImageMetadata],
  activeImageId: 'img_test_001',
  findings: [mockFinding],
  assessment: {
    biradsCategory: BIRADS.SUSPICIOUS_MODERATE, // Updated from SUSPICIOUS to SUSPICIOUS_MODERATE (4B)
    impression: 'Suspicious mass requiring biopsy',
    recommendation: 'Biopsy recommended',
  },
  workflow: {
    mode: 'clinical',
    currentStep: WorkflowStep.MEASUREMENTS,
    completedSteps: [WorkflowStep.UPLOAD, WorkflowStep.AI_ANALYSIS],
    status: 'in-progress',
    startedAt: '2026-01-06T10:00:00.000Z',
    stepHistory: [],
  },
  measurements: [
    {
      measurementId: 'meas_001',
      imageId: 'img_test_001',
      type: 'distance',
      points: [{ x: 100, y: 100 }, { x: 150, y: 100 }],
      value: 12.5,
      unit: 'mm',
      label: 'Mass diameter',
    },
  ],
  viewerSettings: {
    windowLevel: { width: 400, center: 50 },
    zoom: 1.0,
    rotation: 0,
    gridEnabled: false,
    gridSpacing: 10,
    calibration: 1.0,
  },
  metadata: {
    createdAt: '2026-01-06T10:00:00.000Z',
    createdBy: 'test-user',
    lastModified: '2026-01-06T10:30:00.000Z',
    modifiedBy: 'test-user',
    version: 1,
    autoSaveEnabled: true,
  },
};

/**
 * Create a mock File object for testing uploads
 */
export const createMockFile = (
  name: string = 'test-image.png',
  size: number = 1024000,
  type: string = 'image/png'
): File => {
  const blob = new Blob(['fake image data'], { type });
  return new File([blob], name, { type });
};

/**
 * Create multiple mock files
 */
export const createMockFiles = (count: number): File[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockFile(`test-image-${i + 1}.png`, 1024000 + i * 100)
  );
};

/**
 * Wait for async operations in tests
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a mock WorkflowContext for testing components
 * that depend on WorkflowContext
 */
export const createMockWorkflowContext = () => ({
  session: mockAnalysisSession,
  setSession: jest.fn(),
  updatePatientInfo: jest.fn(),
  updateStudyInfo: jest.fn(),
  updateImages: jest.fn(),
  updateFindings: jest.fn(),
  updateAssessment: jest.fn(),
  updateWorkflow: jest.fn(),
  updateMeasurements: jest.fn(),
  updateViewerSettings: jest.fn(),
  updateSessionData: jest.fn(),
  addFinding: jest.fn(),
  removeFinding: jest.fn(),
  updateFinding: jest.fn(),
  addMeasurement: jest.fn(),
  removeMeasurement: jest.fn(),
  saveSession: jest.fn().mockResolvedValue({ success: true }),
  loadSession: jest.fn().mockResolvedValue(mockAnalysisSession),
  clearSession: jest.fn(),
  goToStep: jest.fn(),
  advanceToStep: jest.fn(),
  completeStep: jest.fn(),
  isStepComplete: jest.fn().mockReturnValue(false),
  canProceed: jest.fn().mockReturnValue(true),
  currentStep: WorkflowStep.PATIENT_INFO,
  mode: 'clinical' as const,
  addImage: jest.fn(),
  removeImage: jest.fn(),
  setActiveImage: jest.fn(),
  startNewSession: jest.fn(),
});

/**
 * Mock Quick Analysis Session (minimal data)
 */
export const mockQuickAnalysisSession: AnalysisSession = {
  sessionId: 'session_quick_001',
  patientInfo: {
    patientId: '',  // Empty in quick mode
  },
  studyInfo: {
    studyId: `study_quick_${Date.now()}`,
    studyDate: new Date().toISOString().split('T')[0],
    studyDescription: 'Quick Analysis',
    modality: 'MG',
  },
  images: [mockImageMetadata],
  activeImageId: 'img_test_001',
  findings: [mockFinding],
  assessment: {
    impression: '',
    recommendation: '',
  },
  workflow: {
    mode: 'quick',
    currentStep: WorkflowStep.AI_ANALYSIS,
    completedSteps: [WorkflowStep.UPLOAD],
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    stepHistory: [],
  },
  measurements: [],
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
    createdBy: 'test-user',
    lastModified: new Date().toISOString(),
    modifiedBy: 'test-user',
    version: 1,
    autoSaveEnabled: true,
  },
};
