/**
 * TDD — Feature Cards on Target Pages
 *
 * Tests verify that TechnologyPage and BreastCancerSolutionPage have
 * the specific feature cards with anchored IDs that the landing page
 * solutions overview links to.
 *
 * These cards ensure visitors who click a solution item on the landing
 * page arrive at a section that describes what they clicked.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Navigation mock
// ============================================================================

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// ============================================================================
// BreastCancerSolutionPage — Feature Cards
// ============================================================================

describe('BreastCancerSolutionPage — Analysis Feature Cards', () => {
  let BreastCancerSolutionPage: React.ComponentType;

  beforeAll(async () => {
    BreastCancerSolutionPage = (
      await import('../../pages/solutions/BreastCancerSolutionPage')
    ).default;
  });

  const requiredFeatureCards = [
    { id: 'single-view-classification', title: 'Single-View Classification' },
    { id: 'dual-view-fusion', title: 'Dual-View Fusion Analysis' },
    { id: 'bilateral-symmetry', title: 'Bilateral Symmetry Analysis' },
    { id: 'historical-trending', title: 'Historical Trending' },
    { id: 'clinical-narratives', title: 'Clinical Narratives' },
    { id: 'anatomical-mapping', title: 'Anatomical Mapping' },
  ];

  it.each(requiredFeatureCards)(
    'renders feature card "$title" with anchor id "$id"',
    ({ id, title }) => {
      render(<BreastCancerSolutionPage />);
      // Check the element with the ID exists
      const anchorEl = document.getElementById(id);
      expect(anchorEl).toBeInTheDocument();
      // Check the title text is within the anchored card
      expect(anchorEl!.textContent).toContain(title);
    }
  );

  it('renders "Analysis Features" section heading', () => {
    render(<BreastCancerSolutionPage />);
    expect(screen.getByText('Analysis Features')).toBeInTheDocument();
  });

  it('renders the section subheading for analysis features', () => {
    render(<BreastCancerSolutionPage />);
    expect(
      screen.getByText('Comprehensive Mammogram Analysis Capabilities')
    ).toBeInTheDocument();
  });
});

// ============================================================================
// TechnologyPage — Feature Cards
// ============================================================================

describe('TechnologyPage — Explainability Feature Cards', () => {
  let TechnologyPage: React.ComponentType;

  beforeAll(async () => {
    TechnologyPage = (await import('../../pages/TechnologyPage')).default;
  });

  const requiredFeatureCards = [
    { id: 'explainable-ai', title: 'Explainable AI' },
    { id: 'uncertainty-quantification', title: 'Uncertainty Quantification' },
    { id: 'integrated-gradients', title: 'Integrated Gradients Analysis' },
    { id: 'calibrated-confidence', title: 'Calibrated Confidence Scores' },
    { id: 'fairness-monitoring', title: 'Fairness Monitoring' },
  ];

  it.each(requiredFeatureCards)(
    'renders feature card "$title" with anchor id "$id"',
    ({ id, title }) => {
      render(<TechnologyPage />);
      const anchorEl = document.getElementById(id);
      expect(anchorEl).toBeInTheDocument();
      expect(anchorEl!.textContent).toContain(title);
    }
  );

  it('renders "Platform Capabilities" section heading', () => {
    render(<TechnologyPage />);
    expect(screen.getByText('Platform Capabilities')).toBeInTheDocument();
  });

  it('renders the section subheading for platform capabilities', () => {
    render(<TechnologyPage />);
    expect(
      screen.getByText('Explainability & Responsible AI')
    ).toBeInTheDocument();
  });
});
