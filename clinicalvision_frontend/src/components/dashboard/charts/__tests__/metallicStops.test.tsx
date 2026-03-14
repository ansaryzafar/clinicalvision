/**
 * metallicStops — Unit Tests
 *
 * Verifies the metallic gradient helper function that generates
 * 3-stop colour triplets (highlight, base, shadow) for SVG gradients.
 *
 * @jest-environment jsdom
 */

import { metallicStops } from '../dashboardTheme';

describe('metallicStops', () => {
  it('returns a triplet of hex strings [highlight, base, shadow]', () => {
    const result = metallicStops('#22C55E');
    expect(result).toHaveLength(3);
    result.forEach((hex) => {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('highlight is lighter than base', () => {
    const [highlight, base] = metallicStops('#22C55E');
    // Sum of RGB values in highlight should be greater (lighter)
    const sumRgb = (hex) =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);
    expect(sumRgb(highlight)).toBeGreaterThan(sumRgb(base));
  });

  it('shadow is darker than base', () => {
    const [, base, shadow] = metallicStops('#22C55E');
    const sumRgb = (hex) =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);
    expect(sumRgb(shadow)).toBeLessThan(sumRgb(base));
  });

  it('preserves the base colour unchanged', () => {
    const baseColor = '#EF4444';
    const [, base] = metallicStops(baseColor);
    expect(base).toBe(baseColor);
  });

  it('handles pure black (#000000)', () => {
    const [highlight, base, shadow] = metallicStops('#000000');
    expect(base).toBe('#000000');
    expect(shadow).toBe('#000000'); // 70% of 0 = 0
    // Highlight should be lightened (40% towards white)
    expect(highlight).toBe('#666666'); // round(255 * 0.4) = 102 = 0x66
  });

  it('handles pure white (#FFFFFF)', () => {
    const [highlight, base, shadow] = metallicStops('#FFFFFF');
    expect(base).toBe('#FFFFFF');
    expect(highlight).toBe('#ffffff'); // Already white
    // Shadow: 70% of 255 = round(178.5) = 179 = 0xb3
    expect(shadow.toLowerCase()).toBe('#b3b3b3');
  });

  it('works with primary colour', () => {
    const result = metallicStops('#00C9EA');
    expect(result).toHaveLength(3);
    // base is preserved
    expect(result[1]).toBe('#00C9EA');
  });
});
