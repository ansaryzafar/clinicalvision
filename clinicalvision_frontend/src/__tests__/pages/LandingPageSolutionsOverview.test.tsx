/**
 * TDD — Solutions Overview Section Tests
 *
 * Tests cover:
 *  1. Section renders with correct heading
 *  2. Both category suites render (Mammogram Analysis Suite, Explainability Suite)
 *  3. All 8 mammogram solution items render
 *  4. All 3 explainability solution items render
 *  5. "Begin Analysis" CTA navigates to /demo
 *  6. "View Capabilities" CTA navigates to /features
 *  7. Each solution item is a clickable link navigating to the correct route
 *  8. Solution items have accessible roles (links)
 *  9. Category icons render
 * 10. Solution item descriptions/subtitles render
 * 11. Divider between categories renders
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Navigation mock
// ============================================================================

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn(() => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// ============================================================================
// Auth mock
// ============================================================================

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
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
// IntersectionObserver: already mocked globally in setupTests.ts
// ============================================================================

describe('LandingPage — Solutions Overview Section', () => {
  let LandingPage: React.ComponentType;

  beforeAll(async () => {
    LandingPage = (await import('../../pages/LandingPage')).default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ── Section Structure ───────────────────────────────────────────────────

  it('renders the section heading "One Platform. Complete Clinical Intelligence."', () => {
    render(<LandingPage />);
    expect(
      screen.getByText('One Platform. Complete Clinical Intelligence.')
    ).toBeInTheDocument();
  });

  it('renders the Mammogram Analysis Suite category title', () => {
    render(<LandingPage />);
    expect(screen.getByText('Mammogram Analysis Suite')).toBeInTheDocument();
  });

  it('renders the Explainability Suite category title', () => {
    render(<LandingPage />);
    expect(screen.getByText('Explainability Suite')).toBeInTheDocument();
  });

  it('renders a divider between the two categories', () => {
    render(<LandingPage />);
    const wrapper = document.querySelector('.solutions-overview-wrapper');
    expect(wrapper).toBeInTheDocument();
    const divider = wrapper?.querySelector('.solutions-overview__divider');
    expect(divider).toBeInTheDocument();
  });

  // ── Mammogram Analysis Suite — All 8 Solution Items ─────────────────────

  const mammogramSolutions = [
    'Single-View Classification',
    'Dual-View Fusion Analysis',
    'Bilateral Symmetry Analysis',
    'Historical Trending',
    'GradCAM Attention Maps',
    'Uncertainty Metrics',
    'Clinical Narratives',
    'Anatomical Mapping',
  ];

  it.each(mammogramSolutions)(
    'renders mammogram solution item: "%s"',
    (solutionName) => {
      render(<LandingPage />);
      expect(screen.getByText(solutionName)).toBeInTheDocument();
    }
  );

  // ── Explainability Suite — All 3 Solution Items ─────────────────────────

  const explainabilitySolutions = [
    'Integrated Gradients Analysis',
    'Calibrated Confidence Scores',
    'Fairness Monitoring Dashboard',
  ];

  it.each(explainabilitySolutions)(
    'renders explainability solution item: "%s"',
    (solutionName) => {
      render(<LandingPage />);
      const category = document.querySelector('[data-category="precision-oncology"]');
      expect(category).toBeInTheDocument();
      expect(within(category as HTMLElement).getByText(solutionName)).toBeInTheDocument();
    }
  );

  // ── CTA Buttons ─────────────────────────────────────────────────────────

  it('renders "Begin Analysis" CTA button', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('button', { name: /begin analysis/i })
    ).toBeInTheDocument();
  });

  it('"Begin Analysis" navigates to /demo', () => {
    render(<LandingPage />);
    const btn = screen.getByRole('button', { name: /begin analysis/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/demo');
  });

  it('renders "View Capabilities" CTA button', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('button', { name: /view capabilities/i })
    ).toBeInTheDocument();
  });

  it('"View Capabilities" navigates to /features', () => {
    render(<LandingPage />);
    const btn = screen.getByRole('button', { name: /view capabilities/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/features');
  });

  // ── Solution Items Are Clickable Links ──────────────────────────────────

  const solutionRouteMap: Record<string, string> = {
    'Single-View Classification': '/solutions/breast-cancer#single-view-classification',
    'Dual-View Fusion Analysis': '/solutions/breast-cancer#dual-view-fusion',
    'Bilateral Symmetry Analysis': '/solutions/breast-cancer#bilateral-symmetry',
    'Historical Trending': '/solutions/breast-cancer#historical-trending',
    'GradCAM Attention Maps': '/technology#explainable-ai',
    'Uncertainty Metrics': '/technology#uncertainty-quantification',
    'Clinical Narratives': '/solutions/breast-cancer#clinical-narratives',
    'Anatomical Mapping': '/solutions/breast-cancer#anatomical-mapping',
    'Integrated Gradients Analysis': '/technology#integrated-gradients',
    'Calibrated Confidence Scores': '/technology#calibrated-confidence',
    'Fairness Monitoring Dashboard': '/technology#fairness-monitoring',
  };

  it.each(Object.entries(solutionRouteMap))(
    'clicking "%s" navigates to %s',
    (solutionName, expectedRoute) => {
      render(<LandingPage />);
      // Scope to the correct category to avoid duplicate text matches
      const mammogramCategory = document.querySelector('[data-category="cancer-screening"]') as HTMLElement;
      const explainCategory = document.querySelector('[data-category="precision-oncology"]') as HTMLElement;
      const mammogramItems = ['Single-View Classification', 'Dual-View Fusion Analysis', 'Bilateral Symmetry Analysis', 'Historical Trending', 'GradCAM Attention Maps', 'Uncertainty Metrics', 'Clinical Narratives', 'Anatomical Mapping'];
      const container = mammogramItems.includes(solutionName) ? mammogramCategory : explainCategory;
      const solutionText = within(container).getByText(solutionName);
      const clickable = solutionText.closest('.solutions-overview__solution-item');
      expect(clickable).toBeInTheDocument();
      fireEvent.click(clickable!);
      expect(mockNavigate).toHaveBeenCalledWith(expectedRoute);
    }
  );

  // ── Solution Item Descriptions (subtitles) ──────────────────────────────

  const solutionDescriptions: Record<string, string> = {
    'Single-View Classification': 'AI-powered single mammogram analysis',
    'Dual-View Fusion Analysis': 'CC + MLO combined diagnostic view',
    'Bilateral Symmetry Analysis': 'Left vs right breast comparison',
    'Historical Trending': 'Track changes across prior studies',
    'GradCAM Attention Maps': 'Visual evidence heatmaps',
    'Uncertainty Metrics': 'Calibrated confidence scoring',
    'Clinical Narratives': 'Structured diagnostic reports',
    'Anatomical Mapping': 'Precise lesion localisation',
    'Integrated Gradients Analysis': 'Pixel-level attribution maps',
    'Calibrated Confidence Scores': 'Statistically validated outputs',
    'Fairness Monitoring Dashboard': 'Demographic parity tracking',
  };

  it.each(Object.entries(solutionDescriptions))(
    'solution item "%s" shows subtitle "%s"',
    (solutionName, expectedDesc) => {
      render(<LandingPage />);
      const mammogramCategory = document.querySelector('[data-category="cancer-screening"]') as HTMLElement;
      const explainCategory = document.querySelector('[data-category="precision-oncology"]') as HTMLElement;
      const mammogramItems = ['Single-View Classification', 'Dual-View Fusion Analysis', 'Bilateral Symmetry Analysis', 'Historical Trending', 'GradCAM Attention Maps', 'Uncertainty Metrics', 'Clinical Narratives', 'Anatomical Mapping'];
      const container = mammogramItems.includes(solutionName) ? mammogramCategory : explainCategory;
      const solutionText = within(container).getByText(solutionName);
      const item = solutionText.closest('.solutions-overview__solution-item');
      expect(item).toBeInTheDocument();
      expect(within(item as HTMLElement).getByText(expectedDesc)).toBeInTheDocument();
    }
  );

  // ── Category Icons ──────────────────────────────────────────────────────

  it('renders BiotechIcon for Mammogram Analysis Suite', () => {
    render(<LandingPage />);
    const category = document.querySelector('[data-category="cancer-screening"]');
    expect(category).toBeInTheDocument();
    expect(category?.querySelector('[data-testid="BiotechIcon"]')).toBeInTheDocument();
  });

  it('renders ScienceIcon for Explainability Suite', () => {
    render(<LandingPage />);
    const category = document.querySelector('[data-category="precision-oncology"]');
    expect(category).toBeInTheDocument();
    expect(category?.querySelector('[data-testid="ScienceIcon"]')).toBeInTheDocument();
  });

  // ── Category Descriptions ───────────────────────────────────────────────

  it('renders mammogram suite description paragraphs', () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/Upload a mammogram\. Receive instant AI-driven analysis/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Calibrated confidence scores and flagged uncertainties/i)
    ).toBeInTheDocument();
  });

  it('renders explainability suite description paragraphs', () => {
    render(<LandingPage />);
    const category = document.querySelector('[data-category="precision-oncology"]');
    expect(category).toBeInTheDocument();
    expect(
      within(category as HTMLElement).getByText(/Multiple explanation methods for every finding/i)
    ).toBeInTheDocument();
    expect(
      within(category as HTMLElement).getByText(/Integrated fairness monitoring validates/i)
    ).toBeInTheDocument();
  });

  // ── No Protected Routes ─────────────────────────────────────────────────

  const protectedPaths = ['/workflow', '/dashboard', '/cases', '/analysis-archive', '/analysis-suite', '/history', '/settings', '/fairness'];

  it('does NOT navigate to any auth-protected route', () => {
    render(<LandingPage />);
    const wrapper = document.querySelector('.solutions-overview-wrapper');
    expect(wrapper).toBeInTheDocument();
    const allItems = wrapper!.querySelectorAll('.solutions-overview__solution-item');
    allItems.forEach((item) => {
      mockNavigate.mockClear();
      fireEvent.click(item);
      if (mockNavigate.mock.calls.length > 0) {
        const navigatedTo = mockNavigate.mock.calls[0][0] as string;
        const basePath = navigatedTo.split('#')[0];
        protectedPaths.forEach((pp) => {
          expect(basePath).not.toBe(pp);
        });
      }
    });
  });

  it('all solution items navigate to /technology or /solutions/breast-cancer only', () => {
    render(<LandingPage />);
    const wrapper = document.querySelector('.solutions-overview-wrapper');
    const allItems = wrapper!.querySelectorAll('.solutions-overview__solution-item');
    const allowedBases = ['/technology', '/solutions/breast-cancer'];
    allItems.forEach((item) => {
      mockNavigate.mockClear();
      fireEvent.click(item);
      if (mockNavigate.mock.calls.length > 0) {
        const navigatedTo = mockNavigate.mock.calls[0][0] as string;
        const basePath = navigatedTo.split('#')[0];
        expect(allowedBases).toContain(basePath);
      }
    });
  });
});
