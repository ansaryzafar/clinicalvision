/**
 * UI Refinement — Logo & Navbar Lunit-Benchmark Tests (TDD)
 *
 * Tests that logo sizing, SVG efficiency, and navbar proportions match
 * the Lunit.io reference design system.
 *
 * Lunit.io reference values:
 *  - Logo rendered: 165px × 45px, SVG fills ~90% of viewBox height
 *  - Navbar total height: ~103px (29px padding + 45px logo + 29px padding)
 *  - Nav link font-weight: 300 (Light)
 *  - Container max-width: 1440px
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// SVG Logo Tests — Structural analysis of the logo file
// ============================================================================

describe('Logo SVG — Structural Efficiency', () => {
  const svgPath = path.resolve(__dirname, '../../../public/images/clinicalvision-logo.svg');
  let svgContent: string;

  beforeAll(() => {
    svgContent = fs.readFileSync(svgPath, 'utf-8');
  });

  it('SVG viewBox width should be ≤ 340 (no excessive right-side whitespace)', () => {
    // The original SVG had viewBox 420×120 with content ending at x≈318,
    // leaving ~33% dead space on the right. Trimmed viewBox eliminates this.
    const viewBoxMatch = svgContent.match(/viewBox="0\s+0\s+(\d+)\s+(\d+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const width = parseInt(viewBoxMatch![1], 10);
    expect(width).toBeLessThanOrEqual(340);
    expect(width).toBeGreaterThanOrEqual(280);
  });

  it('SVG viewBox height should remain 120 (preserves dotted-C vertical fill)', () => {
    const viewBoxMatch = svgContent.match(/viewBox="0\s+0\s+(\d+)\s+(\d+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const height = parseInt(viewBoxMatch![2], 10);
    expect(height).toBe(120);
  });

  it('should use live <text> elements with Lexend font for crisp rendering', () => {
    // Live SVG <text> renders with browser sub-pixel anti-aliasing
    // vs outlined <path> which can't benefit from hinting/subpixel.
    const hasTextElement = /<text\s[^>]*font-family="[^"]*Lexend[^"]*"/.test(svgContent);
    expect(hasTextElement).toBe(true);
  });

  it('text font-size should be ≥ 36 SVG units for prominence at logo sizes', () => {
    // At 72px rendered height (120 SVG units), font-size 42 → ~25px rendered.
    // This ensures readable, prominent text.
    const fontSizeMatch = svgContent.match(/font-size="(\d+)"/);
    expect(fontSizeMatch).not.toBeNull();
    const fontSize = parseInt(fontSizeMatch![1], 10);
    expect(fontSize).toBeGreaterThanOrEqual(36);
    expect(fontSize).toBeLessThanOrEqual(54);
  });

  it('text should use a dedicated textGradient with ≥ 3 stops for visible sweep', () => {
    // Old gradient had 3 stops in narrow ΔE≈15 range — invisible.
    // New textGradient spans deep teal to bright cyan for a clearly visible sweep.
    const hasTextGradient = /id="textGradient"/.test(svgContent);
    expect(hasTextGradient).toBe(true);
    const gradientStops = svgContent.match(
      /id="textGradient"[\s\S]*?<\/linearGradient>/
    );
    expect(gradientStops).not.toBeNull();
    const stopCount = (gradientStops![0].match(/<stop\s/g) || []).length;
    expect(stopCount).toBeGreaterThanOrEqual(3);
  });

  it('SVG aspect ratio should be between 2.2:1 and 3.0:1 (content-filling)', () => {
    // Lunit's aspect ratio is 3.69:1 but they have NO icon.
    // With icon+text, a tighter ratio (2.5–2.8:1) ensures content fills the box.
    // Original 3.5:1 was too wide due to empty right margin.
    const viewBoxMatch = svgContent.match(/viewBox="0\s+0\s+(\d+)\s+(\d+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const ratio = parseInt(viewBoxMatch![1], 10) / parseInt(viewBoxMatch![2], 10);
    expect(ratio).toBeGreaterThanOrEqual(2.2);
    expect(ratio).toBeLessThanOrEqual(3.0);
  });

  it('SVG width attribute matches viewBox width', () => {
    const viewBoxMatch = svgContent.match(/viewBox="0\s+0\s+(\d+)\s+(\d+)"/);
    const widthMatch = svgContent.match(/\bwidth="(\d+)"/);
    expect(viewBoxMatch).not.toBeNull();
    expect(widthMatch).not.toBeNull();
    expect(widthMatch![1]).toBe(viewBoxMatch![1]);
  });
});

// ============================================================================
// Landing Page Navbar Tests — Source-level pattern matching
// ============================================================================

describe('Landing Page Navbar — Lunit Proportions', () => {
  const landingPagePath = path.resolve(
    __dirname, '../../pages/LandingPage.tsx'
  );
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(landingPagePath, 'utf-8');
  });

  it('logo desktop height should be ≥ 56px for visual prominence', () => {
    // At the SVG's new aspect ratio, height 56-64px gives 150-170px width
    // which matches Lunit's 165px logo width. The text portion becomes
    // ≥ 17px (readable) instead of the old 12.45px (invisible).
    const heightMatch = source.match(/md:\s*(\d+)\s*[},]/);
    expect(heightMatch).not.toBeNull();
    const desktopHeight = parseInt(heightMatch![1], 10);
    expect(desktopHeight).toBeGreaterThanOrEqual(64);
    expect(desktopHeight).toBeLessThanOrEqual(80);
  });

  it('logo mobile height should be ≥ 44px', () => {
    const heightMatch = source.match(/xs:\s*(\d+)\s*,\s*md:/);
    expect(heightMatch).not.toBeNull();
    const mobileHeight = parseInt(heightMatch![1], 10);
    expect(mobileHeight).toBeGreaterThanOrEqual(48);
  });

  it('navbar non-scrolled padding should produce ~100-110px total height', () => {
    // Lunit's navbar: 29px + 45px logo + 29px = 103px total
    // Our navbar: py + logo_height + py ≈ 100-110px
    // Extract the non-scrolled py value (the larger one)
    const pyMatch = source.match(/py:\s*scrolled\s*\?\s*['"](\d+)px['"]\s*:\s*['"](\d+)px['"]/);
    expect(pyMatch).not.toBeNull();
    const nonScrolledPy = parseInt(pyMatch![2], 10);
    expect(nonScrolledPy).toBeGreaterThanOrEqual(20);
    expect(nonScrolledPy).toBeLessThanOrEqual(32);
  });

  it('navbar scrolled padding should be smaller than non-scrolled', () => {
    const pyMatch = source.match(/py:\s*scrolled\s*\?\s*['"](\d+)px['"]\s*:\s*['"](\d+)px['"]/);
    expect(pyMatch).not.toBeNull();
    const scrolledPy = parseInt(pyMatch![1], 10);
    const nonScrolledPy = parseInt(pyMatch![2], 10);
    expect(scrolledPy).toBeLessThan(nonScrolledPy);
  });

  it('nav link font-weight should be ≤ 450 (Lunit uses 300, light feel)', () => {
    // Lunit's nav links use font-weight 300 (Light).
    // We match this lighter aesthetic — no heavy/bold nav links.
    const weightMatch = source.match(/fontWeight:\s*(\d+)\s*,\s*\n\s*px:/);
    expect(weightMatch).not.toBeNull();
    const weight = parseInt(weightMatch![1], 10);
    expect(weight).toBeLessThanOrEqual(450);
    expect(weight).toBeGreaterThanOrEqual(300);
  });

  it('logo image uses cache-busted URL (v=10+)', () => {
    const versionMatch = source.match(/clinicalvision-logo\.svg\?v=(\d+)/);
    expect(versionMatch).not.toBeNull();
    const version = parseInt(versionMatch![1], 10);
    expect(version).toBeGreaterThanOrEqual(10);
  });
});

// ============================================================================
// Sidebar Logo Tests — ModernMainLayout proportions
// ============================================================================

describe('Sidebar Logo — Proportional to 260px Drawer', () => {
  const sidebarPath = path.resolve(
    __dirname, '../../components/layout/ModernMainLayout.tsx'
  );
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(sidebarPath, 'utf-8');
  });

  it('sidebar logo height should be ≥ 48px', () => {
    const heightMatch = source.match(/height:\s*(\d+)\s*,\s*\n\s*width:/);
    expect(heightMatch).not.toBeNull();
    const height = parseInt(heightMatch![1], 10);
    expect(height).toBeGreaterThanOrEqual(52);
    expect(height).toBeLessThanOrEqual(68);
  });

  it('sidebar logo maxWidth should accommodate the new SVG ratio', () => {
    // With tighter SVG aspect ratio (2.7:1), a 52px logo renders at ~140px wide.
    // maxWidth must be ≥ 180px to avoid clipping.
    const maxWidthMatch = source.match(/maxWidth:\s*(\d+)/);
    expect(maxWidthMatch).not.toBeNull();
    const maxWidth = parseInt(maxWidthMatch![1], 10);
    expect(maxWidth).toBeGreaterThanOrEqual(180);
  });

  it('sidebar logo uses cache-busted URL (v=10+)', () => {
    const versionMatch = source.match(/clinicalvision-logo\.svg\?v=(\d+)/);
    expect(versionMatch).not.toBeNull();
    const version = parseInt(versionMatch![1], 10);
    expect(version).toBeGreaterThanOrEqual(10);
  });
});
