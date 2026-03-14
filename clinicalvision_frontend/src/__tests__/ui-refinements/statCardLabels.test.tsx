/**
 * CasesDashboard Stat Card Labels — TDD Tests
 *
 * Validates that the Active Cases stat cards use intuitive, unambiguous labels:
 *  1. "Not Started" replaces "Pending" — no work has begun
 *  2. "On Hold" replaces "Paused" — deliberately paused, clinical term
 *  3. "In Progress" remains — actively being analyzed
 *  4. Each card has a descriptive subtitle explaining status meaning
 *  5. Status chip labels in the table also use new terminology
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Navigate mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ── Mock session data ─────────────────────────────────────────────────────
const now = new Date().toISOString();

const baseMeta = { createdAt: now, lastModified: now, filename: 'mammo.dcm', originalFilename: 'mammo.dcm' };
const baseStudy = { studyDate: now, modality: 'MG', bodyPart: 'BREAST' };

const mockSessions = [
  {
    id: 'sess-1', sessionId: 'sess-1',
    patientInfo: { name: 'Jane Doe', age: 55, medicalRecordNumber: 'MRN-001', patientId: 'P001' },
    metadata: { ...baseMeta, filename: 'mammo_1.dcm', originalFilename: 'mammo_1.dcm' },
    studyInfo: { ...baseStudy },
    workflow: { status: 'pending', currentStep: 0, mode: 'quick', completedSteps: [] },
    results: {}, findings: [],
  },
  {
    id: 'sess-2', sessionId: 'sess-2',
    patientInfo: { name: 'Alice Smith', age: 62, medicalRecordNumber: 'MRN-002', patientId: 'P002' },
    metadata: { ...baseMeta, filename: 'mammo_2.dcm', originalFilename: 'mammo_2.dcm' },
    studyInfo: { ...baseStudy },
    workflow: { status: 'in-progress', currentStep: 1, mode: 'quick', completedSteps: ['upload'] },
    results: {}, findings: [],
  },
  {
    id: 'sess-3', sessionId: 'sess-3',
    patientInfo: { name: 'Bob Jones', age: 48, medicalRecordNumber: 'MRN-003', patientId: 'P003' },
    metadata: { ...baseMeta, filename: 'mammo_3.dcm', originalFilename: 'mammo_3.dcm' },
    studyInfo: { ...baseStudy },
    workflow: { status: 'paused', currentStep: 1, mode: 'quick', completedSteps: ['upload'] },
    results: {}, findings: [],
  },
  {
    id: 'sess-4', sessionId: 'sess-4',
    patientInfo: { name: 'Carol White', age: 70, medicalRecordNumber: 'MRN-004', patientId: 'P004' },
    metadata: { ...baseMeta, filename: 'mammo_4.dcm', originalFilename: 'mammo_4.dcm' },
    studyInfo: { ...baseStudy },
    workflow: { status: 'in-progress', currentStep: 2, mode: 'quick', completedSteps: ['upload', 'analysis'] },
    results: {}, findings: [],
  },
];

// ── Mock useLegacyWorkflow ────────────────────────────────────────────────
jest.mock('../../workflow-v3', () => ({
  useLegacyWorkflow: () => ({
    createNewSession: jest.fn(),
  }),
}));

// ── Mock clinicalSessionService ───────────────────────────────────────────
const mockGetActiveSessions = jest.fn();
jest.mock('../../services/clinicalSession.service', () => ({
  clinicalSessionService: {
    getActiveSessions: (...args: any[]) => mockGetActiveSessions(...args),
    deleteSession: jest.fn(),
    markSessionCompleted: jest.fn(),
    exportSession: jest.fn().mockResolvedValue({}),
  },
}));

const theme = createTheme();

const renderCasesDashboard = async () => {
  const { CasesDashboard } = await import('../../pages/CasesDashboard');
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <CasesDashboard />
      </MemoryRouter>
    </ThemeProvider>
  );
};

// Helper: finds a DashboardStatCard by its label text (rendered as body2 typography)
const findStatCard = (label: string) => {
  const labelEl = screen.getByText(label, { selector: '.MuiTypography-body2' });
  // Walk up to the card root (Paper element)
  return labelEl.closest('.MuiPaper-root') as HTMLElement;
};

// ============================================================================
// Stat Card Label Tests
// ============================================================================
describe('CasesDashboard — Stat Card Labels', () => {
  beforeEach(() => {
    mockGetActiveSessions.mockReturnValue([...mockSessions]);
  });
  it('renders "Not Started" label instead of "Pending"', async () => {
    await renderCasesDashboard();
    // New label
    expect(screen.getByText('Not Started', { selector: '.MuiTypography-body2' })).toBeInTheDocument();
    // Old label must be gone from stat cards (may still appear in status chips)
    const pendingLabels = screen.queryAllByText('Pending', { selector: '.MuiTypography-body2' });
    expect(pendingLabels).toHaveLength(0);
  });

  it('renders "On Hold" label instead of "Paused"', async () => {
    await renderCasesDashboard();
    expect(screen.getByText('On Hold', { selector: '.MuiTypography-body2' })).toBeInTheDocument();
    const pausedLabels = screen.queryAllByText('Paused', { selector: '.MuiTypography-body2' });
    expect(pausedLabels).toHaveLength(0);
  });

  it('keeps "In Progress" label unchanged', async () => {
    await renderCasesDashboard();
    expect(screen.getByText('In Progress', { selector: '.MuiTypography-body2' })).toBeInTheDocument();
  });

  it('keeps "Total Cases" label unchanged', async () => {
    await renderCasesDashboard();
    expect(screen.getByText('Total Cases', { selector: '.MuiTypography-body2' })).toBeInTheDocument();
  });

  // ── Subtitle tests ────────────────────────────────────────────────────
  it('"Not Started" card has subtitle "Awaiting first action"', async () => {
    await renderCasesDashboard();
    const card = findStatCard('Not Started');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('Awaiting first action')).toBeInTheDocument();
  });

  it('"On Hold" card has subtitle "Temporarily paused"', async () => {
    await renderCasesDashboard();
    const card = findStatCard('On Hold');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('Temporarily paused')).toBeInTheDocument();
  });

  it('"In Progress" card has subtitle "Actively being analyzed"', async () => {
    await renderCasesDashboard();
    const card = findStatCard('In Progress');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('Actively being analyzed')).toBeInTheDocument();
  });
});

// ============================================================================
// Status Chip Label Tests (in the table)
// ============================================================================
describe('CasesDashboard — Status Chip Labels', () => {
  beforeEach(() => {
    mockGetActiveSessions.mockReturnValue([...mockSessions]);
  });
  it('renders "Not Started" chip for pending sessions', async () => {
    await renderCasesDashboard();
    expect(screen.getByText('Not Started', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('renders "On Hold" chip for paused sessions', async () => {
    await renderCasesDashboard();
    expect(screen.getByText('On Hold', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('renders "In Progress" chip(s) for in-progress sessions', async () => {
    await renderCasesDashboard();
    const chips = screen.getAllByText('In Progress', { selector: '.MuiChip-label' });
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });
});
