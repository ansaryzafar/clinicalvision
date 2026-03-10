/**
 * TDD — PatientRecords (Case History) Filtering Tests
 *
 * After Phase 2 semantic separation, PatientRecords only shows completed
 * sessions (completed, reviewed, finalized) via getCompletedSessions().
 *
 * Tests verify:
 *  1. Stats cards show correct counts for completed-only sessions
 *  2. Clicking "Completed" card filters to completed status only
 *  3. Status dropdown includes "Completed", "Finalized", "Reviewed"
 *  4. Search filter works across completed sessions
 *  5. Combined filters (status + findings) work correctly
 *  6. "Total Sessions" card resets all filters
 *  7. Empty state shows correct message
 */
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';

// ============================================================================
// Navigation mock
// ============================================================================
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

// ============================================================================
// Auth mock
// ============================================================================
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    errorDetails: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshAuth: jest.fn(),
    clearError: jest.fn(),
    canAccess: jest.fn(() => true),
  }),
}));

// ============================================================================
// Session service mock with controlled test data
// ============================================================================
import { AnalysisSession, WorkflowStep, BIRADS } from '../../types/clinical.types';

const now = new Date().toISOString();

/** Helper to build a minimal AnalysisSession with overrides */
function makeSession(overrides: Partial<AnalysisSession> & { sessionId: string }): AnalysisSession {
  return {
    sessionId: overrides.sessionId,
    patientInfo: {
      patientId: overrides.patientInfo?.patientId || `PAT-${overrides.sessionId}`,
      name: overrides.patientInfo?.name || `Patient ${overrides.sessionId}`,
      dateOfBirth: '1975-03-15',
      age: 51,
      gender: 'F',
      ...overrides.patientInfo,
    },
    studyInfo: {
      studyId: `STUDY-${overrides.sessionId}`,
      studyDate: '2026-03-01',
      studyDescription: 'Screening Mammography',
      modality: 'MG',
      ...overrides.studyInfo,
    },
    images: overrides.images || [],
    activeImageId: overrides.activeImageId,
    findings: overrides.findings || [],
    assessment: overrides.assessment || { impression: '', recommendation: '' },
    workflow: {
      mode: 'clinical',
      currentStep: WorkflowStep.UPLOAD,
      completedSteps: [],
      status: 'in-progress',
      startedAt: now,
      stepHistory: [],
      ...overrides.workflow,
    },
    measurements: overrides.measurements || [],
    viewerSettings: overrides.viewerSettings || {
      windowLevel: { width: 255, center: 128 },
      zoom: 1.0,
      rotation: 0,
      gridEnabled: false,
      gridSpacing: 5,
      calibration: 10,
    },
    metadata: {
      createdAt: now,
      createdBy: 'test-user',
      lastModified: now,
      modifiedBy: 'test-user',
      version: 1,
      autoSaveEnabled: true,
      ...overrides.metadata,
    },
  };
}

/** Test data: 4 completed sessions (the kind PatientRecords shows) */
const completedTestSessions: AnalysisSession[] = [
  makeSession({
    sessionId: 'sess-completed-1',
    patientInfo: { patientId: 'PAT-001', name: 'Alice Smith' },
    workflow: { mode: 'clinical', currentStep: WorkflowStep.REPORT, completedSteps: [], status: 'completed', startedAt: now, stepHistory: [] },
  }),
  makeSession({
    sessionId: 'sess-completed-2',
    patientInfo: { patientId: 'PAT-002', name: 'Bob Johnson' },
    workflow: { mode: 'clinical', currentStep: WorkflowStep.REPORT, completedSteps: [], status: 'completed', startedAt: now, stepHistory: [] },
    findings: [{ findingId: 'f1', findingType: 'mass', location: { clockPosition: 3, distanceFromNipple: 5 }, status: 'pending' }],
  }),
  makeSession({
    sessionId: 'sess-finalized-1',
    patientInfo: { patientId: 'PAT-003', name: 'Carol White' },
    workflow: { mode: 'clinical', currentStep: WorkflowStep.REPORT, completedSteps: [], status: 'finalized', startedAt: now, stepHistory: [] },
  }),
  makeSession({
    sessionId: 'sess-finalized-2',
    patientInfo: { patientId: 'PAT-004', name: 'David Brown' },
    workflow: { mode: 'clinical', currentStep: WorkflowStep.REPORT, completedSteps: [], status: 'finalized', startedAt: now, stepHistory: [] },
    findings: [{ findingId: 'f2', findingType: 'calcification', location: { clockPosition: 6, distanceFromNipple: 3 }, status: 'reviewed' }],
  }),
];

const mockGetCompletedSessions = jest.fn(() => [...completedTestSessions]);
const mockGetAllSessions = jest.fn(() => [...completedTestSessions]);
const mockDeleteSession = jest.fn();
const mockExportSession = jest.fn(() => '{}');
const mockImportSession = jest.fn();

jest.mock('../../services/clinicalSession.service', () => ({
  clinicalSessionService: {
    getAllSessions: (...args: any[]) => mockGetAllSessions(...args),
    getCompletedSessions: (...args: any[]) => mockGetCompletedSessions(...args),
    getActiveSessions: jest.fn(() => []),
    deleteSession: (...args: any[]) => mockDeleteSession(...args),
    exportSession: (...args: any[]) => mockExportSession(...args),
    importSession: (...args: any[]) => mockImportSession(...args),
    markSessionCompleted: jest.fn(),
    createSession: jest.fn(),
    getCurrentSession: jest.fn(),
    getSession: jest.fn(),
    saveSession: jest.fn(),
    setCurrentSession: jest.fn(),
    updateSession: jest.fn(),
    advanceWorkflow: jest.fn(),
    markStepCompleted: jest.fn(),
    completeWorkflow: jest.fn(),
    clearAllSessions: jest.fn(),
    startAutoSave: jest.fn(),
    stopAutoSave: jest.fn(),
    markDirty: jest.fn(),
    getAutoSaveState: jest.fn(),
    setAutoSaveEnabled: jest.fn(),
    setPreferredWorkflowMode: jest.fn(),
    getPreferredWorkflowMode: jest.fn().mockReturnValue('quick'),
    searchSessions: jest.fn().mockReturnValue([]),
    getSessionStats: jest.fn(),
    resetWorkflowState: jest.fn(),
  },
}));

// ============================================================================
// Theme import
// ============================================================================
let testTheme: any;

beforeAll(async () => {
  const themeModule = await import('../../theme/medicalTheme');
  testTheme = themeModule.clinicalTheme;
});

// ============================================================================
// Render helper
// ============================================================================
function renderPatientRecords() {
  const PatientRecords = require('../../pages/PatientRecords').default;
  return render(
    <ThemeProvider theme={testTheme}>
      <BrowserRouter>
        <PatientRecords />
      </BrowserRouter>
    </ThemeProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================
describe('PatientRecords — Filtering', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetCompletedSessions.mockReturnValue([...completedTestSessions]);
    mockGetAllSessions.mockReturnValue([...completedTestSessions]);
  });

  // --------------------------------------------------------------------------
  // Helper: find stats card by its caption label (unique to stats cards)
  // --------------------------------------------------------------------------
  function getStatsCard(label: string) {
    // Stats card labels are rendered as <span class="MuiTypography-caption">label</span>
    // Session row chips also show "Completed", "In Progress" etc, but as <span class="MuiChip-label">
    // We target the caption element to avoid collisions.
    const captions = screen.getAllByText(label);
    const caption = captions.find(el => el.classList.contains('MuiTypography-caption'));
    if (!caption) throw new Error(`Stats card caption "${label}" not found`);
    return caption.closest('[class*="MuiCard"]')!;
  }

  // --------------------------------------------------------------------------
  // 1. Stats card counts (completed sessions only)
  // --------------------------------------------------------------------------
  describe('Stats card counts', () => {
    it('shows total count of completed sessions', () => {
      renderPatientRecords();
      const totalCard = getStatsCard('Total Sessions');
      expect(within(totalCard).getByText('4')).toBeInTheDocument();
    });

    it('shows completed count (status=completed only)', () => {
      renderPatientRecords();
      // 2 sessions with status 'completed'
      const completedCard = getStatsCard('Completed');
      expect(within(completedCard).getByText('2')).toBeInTheDocument();
    });

    it('shows finalized count', () => {
      renderPatientRecords();
      // 2 sessions with status 'finalized'
      const finalizedCard = getStatsCard('Finalized');
      expect(within(finalizedCard).getByText('2')).toBeInTheDocument();
    });

    it('shows "With Findings" count correctly', () => {
      renderPatientRecords();
      // 2 completed sessions have findings: sess-completed-2, sess-finalized-2
      const findingsCard = getStatsCard('With Findings');
      expect(within(findingsCard).getByText('2')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Clicking "Completed" card filters to completed-status-only sessions
  // --------------------------------------------------------------------------
  describe('Completed stats card filtering', () => {
    it('clicking "Completed" card shows only completed sessions (not finalized)', () => {
      renderPatientRecords();

      // Before filter: should show all 4 completed/finalized sessions
      expect(screen.getByText('PAT-001')).toBeInTheDocument();
      expect(screen.getByText('PAT-003')).toBeInTheDocument();

      // Click the "Completed" stats card
      fireEvent.click(getStatsCard('Completed'));

      // Should show only completed sessions
      expect(screen.getByText('PAT-001')).toBeInTheDocument(); // completed
      expect(screen.getByText('PAT-002')).toBeInTheDocument(); // completed

      // Should NOT show finalized
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument();
      expect(screen.queryByText('PAT-004')).not.toBeInTheDocument();
    });

    it('clicking "Completed" card again resets filter to all', () => {
      renderPatientRecords();

      // Click to activate
      fireEvent.click(getStatsCard('Completed'));
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument();

      // Click again to deactivate (toggle)
      fireEvent.click(getStatsCard('Completed'));
      expect(screen.getByText('PAT-003')).toBeInTheDocument();
      expect(screen.getByText('PAT-004')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Helper: open MUI Status Select dropdown and return the listbox
  // --------------------------------------------------------------------------
  function openStatusDropdown() {
    // MUI Select renders the trigger as a div with role="combobox"
    const comboboxes = screen.getAllByRole('combobox');
    const statusCombobox = comboboxes.find(
      (el) => el.getAttribute('aria-labelledby')?.includes('Status') || 
              el.textContent?.includes('All Statuses') ||
              el.textContent?.includes('Completed') ||
              el.textContent?.includes('Finalized') ||
              el.textContent?.includes('Reviewed')
    );
    if (!statusCombobox) throw new Error('Status combobox not found');
    fireEvent.mouseDown(statusCombobox);
    return screen.getByRole('listbox');
  }

  // --------------------------------------------------------------------------
  // 3. Status dropdown includes correct options for completed page
  // --------------------------------------------------------------------------
  describe('Status dropdown', () => {
    it('includes "Finalized" as a selectable option', () => {
      renderPatientRecords();

      const listbox = openStatusDropdown();
      expect(within(listbox).getByText('Finalized')).toBeInTheDocument();
    });

    it('selecting "Finalized" shows only finalized sessions', () => {
      renderPatientRecords();

      const listbox = openStatusDropdown();
      fireEvent.click(within(listbox).getByText('Finalized'));

      // Should show only finalized sessions
      expect(screen.getByText('PAT-003')).toBeInTheDocument();
      expect(screen.getByText('PAT-004')).toBeInTheDocument();

      // Should NOT show completed
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument();
      expect(screen.queryByText('PAT-002')).not.toBeInTheDocument();
    });

    it('selecting "Completed" from dropdown shows only completed sessions', () => {
      renderPatientRecords();

      const listbox = openStatusDropdown();
      fireEvent.click(within(listbox).getByText('Completed'));

      // Should show only completed sessions
      expect(screen.getByText('PAT-001')).toBeInTheDocument();
      expect(screen.getByText('PAT-002')).toBeInTheDocument();

      // Should NOT show finalized
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument();
      expect(screen.queryByText('PAT-004')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Search filter works across all statuses
  // --------------------------------------------------------------------------
  describe('Search filter', () => {
    it('filters by patient name (case insensitive)', () => {
      renderPatientRecords();

      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'alice' } });

      expect(screen.getByText('PAT-001')).toBeInTheDocument();
      expect(screen.queryByText('PAT-002')).not.toBeInTheDocument();
    });

    it('filters by patient ID', () => {
      renderPatientRecords();

      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'PAT-004' } });

      expect(screen.getByText('PAT-004')).toBeInTheDocument();
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument();
    });

    it('filters by session ID', () => {
      renderPatientRecords();

      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'sess-finalized' } });

      expect(screen.getByText('PAT-003')).toBeInTheDocument();
      expect(screen.getByText('PAT-004')).toBeInTheDocument();
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument();
    });

    it('shows "No Completed Cases Found" message for zero results', () => {
      renderPatientRecords();

      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistentxyz' } });

      expect(screen.getByText('No Completed Cases Found')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Combined filters
  // --------------------------------------------------------------------------
  describe('Combined filters', () => {
    it('status + findings filter works together', () => {
      renderPatientRecords();

      // Click "Completed" stats card
      fireEvent.click(getStatsCard('Completed'));

      // Also click "With Findings"
      fireEvent.click(getStatsCard('With Findings'));

      // Should show only completed sessions that have findings
      // sess-completed-2 (completed, has finding) ✓
      expect(screen.getByText('PAT-002')).toBeInTheDocument(); // completed + findings

      // These have no findings or are finalized
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument(); // completed, no findings
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument(); // finalized
      expect(screen.queryByText('PAT-004')).not.toBeInTheDocument(); // finalized + findings but wrong status filter
    });

    it('search + status filter works together', () => {
      renderPatientRecords();

      // Set status to completed
      fireEvent.click(getStatsCard('Completed'));

      // Search for "bob"
      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'bob' } });

      // Only Bob (completed) should show
      expect(screen.getByText('PAT-002')).toBeInTheDocument();
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument();
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Total Sessions card resets all filters
  // --------------------------------------------------------------------------
  describe('Total Sessions card', () => {
    it('resets status, findings, and search filters when clicked', () => {
      renderPatientRecords();

      // Apply multiple filters
      fireEvent.click(getStatsCard('Completed'));
      fireEvent.click(getStatsCard('With Findings'));

      const searchInput = screen.getByPlaceholderText(/search by patient/i);
      fireEvent.change(searchInput, { target: { value: 'bob' } });

      // Only PAT-002 visible at this point
      expect(screen.queryByText('PAT-003')).not.toBeInTheDocument();

      // Click "Total Sessions" to reset everything
      fireEvent.click(getStatsCard('Total Sessions'));

      // All 4 completed sessions should be visible again
      expect(screen.getByText('PAT-001')).toBeInTheDocument();
      expect(screen.getByText('PAT-002')).toBeInTheDocument();
      expect(screen.getByText('PAT-003')).toBeInTheDocument();
      expect(screen.getByText('PAT-004')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 7. Finalized filter
  // --------------------------------------------------------------------------
  describe('Finalized filter', () => {
    it('clicking "Finalized" card shows only finalized sessions', () => {
      renderPatientRecords();

      fireEvent.click(getStatsCard('Finalized'));

      expect(screen.getByText('PAT-003')).toBeInTheDocument();
      expect(screen.getByText('PAT-004')).toBeInTheDocument();
      expect(screen.queryByText('PAT-001')).not.toBeInTheDocument();
      expect(screen.queryByText('PAT-002')).not.toBeInTheDocument();
    });
  });
});
