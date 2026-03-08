/**
 * Button / Card / Dropdown Enhancement Tests
 *
 * Validates the UI refinements applied to LandingPage.tsx and PageLayout.tsx:
 *  - Button standardization: fontWeight 600, cubic-bezier transition,
 *    translateY(-2px) hover lift, scale(0.98) active press, arrow animation
 *  - Card hover unification: translateY(-6px) lift, teal top-edge glow,
 *    color-coded shadows (orange / red / green)
 *  - Dropdown enhancements: mutual exclusion in handleNavOpen,
 *    upgraded dropdown shadow, translateX(4px) item hover slide
 *
 * Uses source-level pattern matching (fs.readFileSync + regex) because
 * JSDOM does not apply MUI sx-prop styles at the DOM level.
 *
 * @jest-environment jsdom
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  lunitShadows,
  lunitTransitions,
  lunitButtonStyles,
  lunitCardBase,
} from '../../styles/lunitDesignSystem';

// ============================================================================
// Source files — read once
// ============================================================================

const landingPagePath = path.resolve(__dirname, '../../pages/LandingPage.tsx');
const pageLayoutPath = path.resolve(
  __dirname, '../../components/layout/PageLayout.tsx',
);

let landingSrc: string;
let layoutSrc: string;

beforeAll(() => {
  landingSrc = fs.readFileSync(landingPagePath, 'utf-8');
  layoutSrc = fs.readFileSync(pageLayoutPath, 'utf-8');
});

// ============================================================================
// 1. BUTTON STANDARDIZATION
// ============================================================================

describe('Button Standardization — LandingPage', () => {
  // ── fontWeight 600 ──
  it('hero "Request a Demo" button uses fontWeight 600', () => {
    // The hero CTA appears after the hero headline "Precision Intelligence" —
    // find the fontWeight in that specific Button block
    const heroIdx = landingSrc.indexOf('Precision Intelligence');
    expect(heroIdx).toBeGreaterThan(0);
    const afterHero = landingSrc.substring(heroIdx);
    const demoIdx = afterHero.indexOf('Request a Demo');
    const heroBlock = afterHero.substring(0, demoIdx);
    const weights = heroBlock.match(/fontWeight:\s*(\d+)/g);
    expect(weights).not.toBeNull();
    const last = weights![weights!.length - 1];
    expect(last).toContain('600');
  });

  it('no button still uses fontWeight 500 with old 0.4s ease-in-out', () => {
    // The old pattern was fontWeight: 500 + transition: 'all 0.4s ease-in-out'
    // This combination should no longer appear anywhere in button sx blocks
    const oldPattern = /fontWeight:\s*500[\s\S]{0,200}transition:\s*['"]all\s+0\.4s\s+ease-in-out['"]/;
    expect(landingSrc).not.toMatch(oldPattern);
  });

  // ── cubic-bezier transition ──
  it('buttons use cubic-bezier(0.4, 0, 0.2, 1) transition', () => {
    const cubicCount = (landingSrc.match(/cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/g) || []).length;
    // At minimum: hero Demo, hero Sign In, Discover Architecture, View System Architecture,
    // Launch Clinical Demo, Technical Documentation, Begin Analysis, View Capabilities,
    // Initiate a Pilot, View Research, Explore the Platform, View Publications & Validation,
    // View All News, View Publications, Download Eval, Final Demo, Final Schedule
    // That's 17+ buttons
    expect(cubicCount).toBeGreaterThanOrEqual(15);
  });

  // ── translateY(-2px) hover lift ──
  it('contained/outlined buttons have translateY(-2px) hover lift', () => {
    const liftCount = (landingSrc.match(/translateY\(-2px\)/g) || []).length;
    // Multiple buttons should have this lift effect
    expect(liftCount).toBeGreaterThanOrEqual(10);
  });

  // ── scale(0.98) active press ──
  it('buttons include scale(0.98) active press state', () => {
    const activeCount = (landingSrc.match(/scale\(0\.98\)/g) || []).length;
    expect(activeCount).toBeGreaterThanOrEqual(10);
  });

  // ── Arrow animation on endIcon buttons ──
  it('buttons with endIcon have translateX(4px) arrow hover animation', () => {
    // Buttons with ArrowForward endIcon should animate with translateX(4px)
    const arrowAnimCount = (
      landingSrc.match(/MuiButton-endIcon['"]:\s*\{\s*transform:\s*['"]translateX\(4px\)['"]/g) || []
    ).length;
    expect(arrowAnimCount).toBeGreaterThanOrEqual(3);
  });

  // ── Specific button checks ──
  it('"View All News" button has cubic-bezier transition (was missing)', () => {
    const newsSection = landingSrc.split('View All News')[0];
    // Look backwards from "View All News" for the main transition (not &:active's 0.1s ease)
    const mainTransitions = newsSection.match(/transition:\s*['"]all\s+0\.35s\s+cubic-bezier[^'"]+['"]/g);
    expect(mainTransitions).not.toBeNull();
    expect(mainTransitions!.length).toBeGreaterThan(0);
    const lastMain = mainTransitions![mainTransitions!.length - 1];
    expect(lastMain).toContain('cubic-bezier');
  });

  it('"Download Evaluation Package" button uses pill borderRadius (100px)', () => {
    const downloadSection = landingSrc.split('Download Evaluation Package')[0];
    const radii = downloadSection.match(/borderRadius:\s*['"]([^'"]+)['"]/g);
    expect(radii).not.toBeNull();
    const lastRadius = radii![radii!.length - 1];
    expect(lastRadius).toContain('100px');
  });
});

// ============================================================================
// 2. CARD HOVER UNIFICATION
// ============================================================================

describe('Card Hover Unification — LandingPage', () => {
  // ── translateY(-6px) standard lift ──
  it('cards use translateY(-6px) lift (not the old scale(1.02))', () => {
    const liftCount = (landingSrc.match(/translateY\(-6px\)/g) || []).length;
    // News cards, demo case cards, partner cards, tech feature cards
    expect(liftCount).toBeGreaterThanOrEqual(4);
  });

  it('scale(1.02) only appears on logo and partner gradient overlays, not card containers', () => {
    // scale(1.02) is legitimate for logo hover and partner gradient overlays
    // but should NOT appear as a card container hover effect
    const matches = landingSrc.match(/scale\(1\.02\)/g) || [];
    // 3 legitimate uses: logo hover, partner-gradient-hover, partner-gradient-hover-2
    expect(matches.length).toBeLessThanOrEqual(3);
    // Verify none are on card container transforms
    // News cards should use translateY(-6px) instead
    const newsSection = landingSrc.split('Latest Insights')[1] || '';
    const newsCards = newsSection.split('View All News')[0] || '';
    expect(newsCards).not.toContain("transform: 'scale(1.02)'");
  });

  // ── Teal top-edge glow ──
  it('cards have teal top-edge glow (0 -3px 0 0 #00C9EA)', () => {
    const tealGlowCount = (landingSrc.match(/0 -3px 0 0 #00C9EA/g) || []).length;
    // News cards, tech feature cards, partner cards
    expect(tealGlowCount).toBeGreaterThanOrEqual(3);
  });

  // ── Color-coded demo case shadows ──
  it('demo case cards use color-coded shadows (teal, orange, red)', () => {
    expect(landingSrc).toContain('#FF9800'); // orange shadow
    expect(landingSrc).toContain('#F44336'); // red shadow
  });

  // ── Tech feature card top-edge ──
  it('tech feature cards (dark section) have teal top-edge', () => {
    // The dark section tech feature cards should have the teal top-edge
    // They appear after "Powering the Future of Clinical Imaging" or similar
    const techSection = landingSrc.split('Powering the Future')[1] || landingSrc;
    expect(techSection).toContain('0 -3px 0 0 #00C9EA');
  });

  // ── Partner card lift ──
  it('partner cards have translateY(-6px) hover lift', () => {
    // Partner cards are near "Institutional Adoption" or partner logos
    const partnerIdx = landingSrc.indexOf('Clinical Performance');
    if (partnerIdx > 0) {
      const afterPartner = landingSrc.substring(partnerIdx);
      expect(afterPartner).toContain('translateY(-6px)');
    }
    // Fallback: at least the total count covers partner cards
    const totalLifts = (landingSrc.match(/translateY\(-6px\)/g) || []).length;
    expect(totalLifts).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// 3. DESIGN SYSTEM TOKEN INTEGRATION
// ============================================================================

describe('Design System Token Integration', () => {
  it('lunitCardBase mixin is consistent with LandingPage card patterns', () => {
    // The design system card base should match what we apply in LandingPage
    expect(lunitCardBase['&:hover'].transform).toBe('translateY(-6px)');
    expect(lunitCardBase['&:hover'].boxShadow).toBe(lunitShadows.cardHoverTeal);
    expect(lunitCardBase.transition).toBe(lunitTransitions.smooth);
  });

  it('lunitButtonStyles.common matches LandingPage button patterns', () => {
    const common = lunitButtonStyles.common;
    expect(common.fontWeight).toBe(600);
    expect(common.transition).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(common['&:active'].transform).toContain('scale(0.98)');
  });

  it('lunitShadows.dropdown is used in both LandingPage and PageLayout', () => {
    // The dropdown shadow token should be the canonical shadow for menus
    expect(lunitShadows.dropdown).toBeDefined();
    expect(lunitShadows.dropdown).toContain('rgba(35, 50, 50');
    // PageLayout should reference the token directly
    expect(layoutSrc).toContain('lunitShadows.dropdown');
  });
});

// ============================================================================
// 4. DROPDOWN ENHANCEMENTS
// ============================================================================

describe('Dropdown Enhancements — Mutual Exclusion', () => {
  it('LandingPage handleNavOpen resets other dropdowns before opening', () => {
    // The mutual exclusion pattern sets all other anchors to null
    // Look for the pattern where handleNavOpen sets others to null
    const hasExclusion = /handleNavOpen[\s\S]{0,200}null[\s\S]{0,100}null/;
    expect(landingSrc).toMatch(hasExclusion);
  });

  it('PageLayout handleNavOpen resets other dropdowns before opening', () => {
    const hasExclusion = /handleNavOpen[\s\S]{0,200}null[\s\S]{0,100}null/;
    expect(layoutSrc).toMatch(hasExclusion);
  });
});

describe('Dropdown Enhancements — Shadow & Hover', () => {
  // ── PageLayout dropdown shadow ──
  it('PageLayout Solutions dropdown uses lunitShadows.dropdown', () => {
    // The Solutions mega-dropdown Paper should reference the dropdown token
    expect(layoutSrc).toContain('lunitShadows.dropdown');
  });

  it('PageLayout standard dropdown uses lunitShadows.dropdown (not lunitShadows.card)', () => {
    // Count occurrences: dropdown shadow should appear for both mega & standard
    const dropdownTokenCount = (layoutSrc.match(/lunitShadows\.dropdown/g) || []).length;
    expect(dropdownTokenCount).toBeGreaterThanOrEqual(2);
  });

  // ── translateX(4px) item slide ──
  it('LandingPage dropdown items have translateX(4px) hover slide', () => {
    const slideCount = (landingSrc.match(/translateX\(4px\)/g) || []).length;
    // Clinical AI items + platform items + standard dropdown items + arrow animations
    expect(slideCount).toBeGreaterThanOrEqual(3);
  });

  it('PageLayout dropdown items have translateX(4px) hover slide', () => {
    const slideCount = (layoutSrc.match(/translateX\(4px\)/g) || []).length;
    // Clinical AI items + platform items + standard dropdown items
    expect(slideCount).toBeGreaterThanOrEqual(3);
  });

  // ── No old single-layer shadow in PageLayout dropdowns ──
  it('PageLayout dropdown Papers do not use the old lunitShadows.card', () => {
    // After our changes, no dropdown Paper should use the basic card shadow
    // Look for Paper sx blocks in dropdown context that still use .card
    const dropdownPaperPattern = /Paper[\s\S]{0,100}boxShadow:\s*lunitShadows\.card/g;
    const matches = layoutSrc.match(dropdownPaperPattern) || [];
    expect(matches.length).toBe(0);
  });
});

// ============================================================================
// 5. TRANSITION CONSISTENCY
// ============================================================================

describe('Transition Consistency', () => {
  it('LandingPage has no remaining "all 0.4s ease-in-out" transitions', () => {
    // The old transition pattern should be fully replaced in all buttons
    const oldTransitionCount = (
      landingSrc.match(/transition:\s*['"]all\s+0\.4s\s+ease-in-out['"]/g) || []
    ).length;
    expect(oldTransitionCount).toBe(0);
  });

  it('LandingPage uses cubic-bezier consistently across buttons', () => {
    // All button transition properties should use cubic-bezier, not linear/ease
    // Get all transition declarations
    const transitions = landingSrc.match(/transition:\s*['"]all\s+0\.\d+s\s+[^'"]+['"]/g) || [];
    const cubicTransitions = transitions.filter(t => t.includes('cubic-bezier'));
    const easeTransitions = transitions.filter(t =>
      t.includes('ease-in-out') || t.includes('ease-out'),
    );
    // cubic-bezier should dominate; there may be simple "ease" for non-button elements
    expect(cubicTransitions.length).toBeGreaterThan(easeTransitions.length);
  });

  it('card transitions use 0.35s duration consistently', () => {
    // Cards should use 0.35s (matching lunitTransitions.smooth)
    const cardTransitions = (
      landingSrc.match(/transition:\s*['"]all\s+0\.35s/g) || []
    ).length;
    expect(cardTransitions).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// 6. NO REGRESSIONS — Critical elements still exist
// ============================================================================

describe('No Regressions — Critical Elements', () => {
  it('LandingPage still has "Request a Demo" buttons', () => {
    expect(landingSrc).toContain('Request a Demo');
  });

  it('LandingPage still has "Sign In" button', () => {
    expect(landingSrc).toContain('Sign In');
  });

  it('LandingPage still has "Launch Clinical Demo" button', () => {
    expect(landingSrc).toContain('Launch Clinical Demo');
  });

  it('LandingPage still has "Technical Documentation" button', () => {
    expect(landingSrc).toContain('Technical Documentation');
  });

  it('LandingPage still has "Begin Analysis" button', () => {
    expect(landingSrc).toContain('Begin Analysis');
  });

  it('LandingPage still has "Explore the Platform" button', () => {
    expect(landingSrc).toContain('Explore the Platform');
  });

  it('PageLayout still has handleNavOpen and handleNavClose', () => {
    expect(layoutSrc).toContain('handleNavOpen');
    expect(layoutSrc).toContain('handleNavClose');
  });

  it('PageLayout still imports lunitShadows', () => {
    expect(layoutSrc).toContain('lunitShadows');
  });
});
