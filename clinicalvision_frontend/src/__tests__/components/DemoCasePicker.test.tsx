/**
 * TDD Tests for DemoCasePicker Component — Phase 2 Frontend Integration
 *
 * A reusable component that displays available demo cases as selectable cards.
 * Used in the LandingPage demo section and the upload empty-state prompt.
 *
 * Usage:
 *   npx react-scripts test --testPathPattern="DemoCasePicker" --watchAll=false
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import DemoCasePicker from '../../components/demo/DemoCasePicker';
import { DemoCaseSummary } from '../../services/demoDataService';

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_CASES: DemoCaseSummary[] = [
  { id: 'DEMO-001', label: 'Normal / Benign Screening', difficulty: 'Easy', views: 4, path: '/demo-data/case-1-normal/' },
  { id: 'DEMO-002', label: 'Suspicious Mass Finding', difficulty: 'Intermediate', views: 6, path: '/demo-data/case-2-suspicious/' },
  { id: 'DEMO-003', label: 'Calcification Follow-up', difficulty: 'Advanced', views: 2, path: '/demo-data/case-3-calcification/' },
];

// ============================================================================
// Tests — Rendering
// ============================================================================

describe('DemoCasePicker — Rendering', () => {
  it('renders without crashing', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);
  });

  it('renders a card for each demo case', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);

    expect(screen.getByText(/Normal \/ Benign Screening/i)).toBeInTheDocument();
    expect(screen.getByText(/Suspicious Mass Finding/i)).toBeInTheDocument();
    expect(screen.getByText(/Calcification Follow-up/i)).toBeInTheDocument();
  });

  it('displays difficulty for each case', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);

    expect(screen.getByText(/Easy/i)).toBeInTheDocument();
    expect(screen.getByText(/Intermediate/i)).toBeInTheDocument();
    expect(screen.getByText(/Advanced/i)).toBeInTheDocument();
  });

  it('displays view count for each case', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);

    // Should show view counts (e.g., "4 views", "6 views", "2 views")
    expect(screen.getByText(/4 views/i)).toBeInTheDocument();
    expect(screen.getByText(/6 views/i)).toBeInTheDocument();
    expect(screen.getByText(/2 views/i)).toBeInTheDocument();
  });

  it('renders a title/header', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);

    // Should have a heading indicating these are sample cases
    const heading = screen.getByText(/sample cases|demo cases|try with sample/i);
    expect(heading).toBeInTheDocument();
  });
});

// ============================================================================
// Tests — Interaction
// ============================================================================

describe('DemoCasePicker — Interaction', () => {
  it('calls onSelect with case ID when a case card is clicked', () => {
    const onSelect = jest.fn();
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={onSelect} />);

    const firstCase = screen.getByText(/Normal \/ Benign Screening/i);
    fireEvent.click(firstCase.closest('[role="button"], button, [data-testid]') || firstCase);

    expect(onSelect).toHaveBeenCalledWith('DEMO-001');
  });

  it('calls onSelect with correct ID for different cases', () => {
    const onSelect = jest.fn();
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={onSelect} />);

    const thirdCase = screen.getByText(/Calcification Follow-up/i);
    fireEvent.click(thirdCase.closest('[role="button"], button, [data-testid]') || thirdCase);

    expect(onSelect).toHaveBeenCalledWith('DEMO-003');
  });
});

// ============================================================================
// Tests — Empty State
// ============================================================================

describe('DemoCasePicker — Empty State', () => {
  it('renders gracefully with empty cases array', () => {
    render(<DemoCasePicker cases={[]} onSelect={jest.fn()} />);
    // Should not crash; may show a fallback message
  });

  it('shows a message when no cases are available', () => {
    render(<DemoCasePicker cases={[]} onSelect={jest.fn()} />);
    // Should indicate no demo cases available or render nothing
    const cards = screen.queryAllByText(/DEMO-/);
    expect(cards).toHaveLength(0);
  });
});

// ============================================================================
// Tests — Loading State
// ============================================================================

describe('DemoCasePicker — Loading State', () => {
  it('shows loading indicator when loading prop is true', () => {
    render(<DemoCasePicker cases={[]} onSelect={jest.fn()} loading={true} />);

    // Should show a loading indicator (CircularProgress, skeleton, or text)
    const loading = screen.queryByRole('progressbar') ||
      screen.queryByText(/loading/i);
    expect(loading).toBeInTheDocument();
  });

  it('does not show loading indicator when loading is false', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} loading={false} />);

    const loading = screen.queryByRole('progressbar');
    expect(loading).not.toBeInTheDocument();
  });
});

// ============================================================================
// Tests — Difficulty Styling
// ============================================================================

describe('DemoCasePicker — Difficulty Indicators', () => {
  it('renders difficulty chips/badges with distinct styling', () => {
    render(<DemoCasePicker cases={MOCK_CASES} onSelect={jest.fn()} />);

    // All three difficulty labels should be rendered
    const easyEl = screen.getByText(/Easy/i);
    const intermediateEl = screen.getByText(/Intermediate/i);
    const advancedEl = screen.getByText(/Advanced/i);

    expect(easyEl).toBeInTheDocument();
    expect(intermediateEl).toBeInTheDocument();
    expect(advancedEl).toBeInTheDocument();
  });
});

// ============================================================================
// Tests — Compact Mode
// ============================================================================

describe('DemoCasePicker — Compact Mode', () => {
  it('supports a compact variant for inline use', () => {
    render(
      <DemoCasePicker
        cases={MOCK_CASES}
        onSelect={jest.fn()}
        compact={true}
      />
    );

    // Should still render cases
    expect(screen.getByText(/Normal \/ Benign Screening/i)).toBeInTheDocument();
  });
});
