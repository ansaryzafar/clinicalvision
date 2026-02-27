/**
 * Phase G.3 — TDD Tests for BIRADS Constants (Duplicate Key Fix)
 * 
 * Tests validate:
 * 1. BIRADS_DESCRIPTIONS has entries for all enum values
 * 2. BIRADS_DESCRIPTIONS has generic category '4' (not in enum but clinically needed)
 * 3. BIRADS_RECOMMENDATIONS has entries for all enum values
 * 4. BIRADS_RECOMMENDATIONS has generic category '4'
 * 5. No runtime duplicate key collisions
 * 6. 4A/4B/4C subdivisions are all present
 */
import {
  BIRADS,
  BIRADS_DESCRIPTIONS,
  BIRADS_RECOMMENDATIONS,
  BIRADSValue,
} from '../clinical.types';

describe('BIRADS_DESCRIPTIONS', () => {
  test('has descriptions for all BIRADS enum values', () => {
    const enumValues = Object.values(BIRADS);
    enumValues.forEach(value => {
      expect(BIRADS_DESCRIPTIONS[value]).toBeDefined();
      expect(typeof BIRADS_DESCRIPTIONS[value]).toBe('string');
      expect(BIRADS_DESCRIPTIONS[value].length).toBeGreaterThan(0);
    });
  });

  test('has generic category "4" description', () => {
    expect(BIRADS_DESCRIPTIONS['4']).toBeDefined();
    expect(BIRADS_DESCRIPTIONS['4']).toContain('Suspicious');
  });

  test('has 4A/4B/4C subdivisions', () => {
    expect(BIRADS_DESCRIPTIONS['4A']).toBeDefined();
    expect(BIRADS_DESCRIPTIONS['4B']).toBeDefined();
    expect(BIRADS_DESCRIPTIONS['4C']).toBeDefined();
  });

  test('total unique keys include enum values + generic "4"', () => {
    const keys = Object.keys(BIRADS_DESCRIPTIONS);
    // Should have: 0,1,2,3,4A,4B,4C,5,6 (9 enum) + 4 (generic) = 10 unique keys
    expect(keys.length).toBe(10);
  });

  test('BIRADS 0 description matches expected', () => {
    expect(BIRADS_DESCRIPTIONS[BIRADS.INCOMPLETE]).toContain('Incomplete');
  });

  test('BIRADS 5 description matches expected', () => {
    expect(BIRADS_DESCRIPTIONS[BIRADS.HIGHLY_SUGGESTIVE]).toContain('Highly Suggestive');
  });

  test('BIRADS 6 description matches expected', () => {
    expect(BIRADS_DESCRIPTIONS[BIRADS.KNOWN_BIOPSY_PROVEN]).toContain('Known');
  });
});

describe('BIRADS_RECOMMENDATIONS', () => {
  test('has recommendations for all BIRADS enum values', () => {
    const enumValues = Object.values(BIRADS);
    enumValues.forEach(value => {
      expect(BIRADS_RECOMMENDATIONS[value]).toBeDefined();
      expect(typeof BIRADS_RECOMMENDATIONS[value]).toBe('string');
      expect(BIRADS_RECOMMENDATIONS[value].length).toBeGreaterThan(0);
    });
  });

  test('has generic category "4" recommendation', () => {
    expect(BIRADS_RECOMMENDATIONS['4']).toBeDefined();
    expect(BIRADS_RECOMMENDATIONS['4']).toContain('Biopsy');
  });

  test('has 4A/4B/4C subdivisions', () => {
    expect(BIRADS_RECOMMENDATIONS['4A']).toBeDefined();
    expect(BIRADS_RECOMMENDATIONS['4B']).toBeDefined();
    expect(BIRADS_RECOMMENDATIONS['4C']).toBeDefined();
  });

  test('total unique keys include enum values + generic "4"', () => {
    const keys = Object.keys(BIRADS_RECOMMENDATIONS);
    expect(keys.length).toBe(10);
  });

  test('BIRADS 5 recommends tissue diagnosis', () => {
    expect(BIRADS_RECOMMENDATIONS[BIRADS.HIGHLY_SUGGESTIVE]).toContain('Tissue diagnosis');
  });

  test('BIRADS 6 recommends treatment', () => {
    expect(BIRADS_RECOMMENDATIONS[BIRADS.KNOWN_BIOPSY_PROVEN]).toContain('Treatment');
  });
});

describe('BIRADS enum integrity', () => {
  test('all enum values are unique strings', () => {
    const values = Object.values(BIRADS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  test('enum has exactly 9 members (0,1,2,3,4A,4B,4C,5,6)', () => {
    const values = Object.values(BIRADS);
    expect(values).toHaveLength(9);
    expect(values).toContain('0');
    expect(values).toContain('1');
    expect(values).toContain('2');
    expect(values).toContain('3');
    expect(values).toContain('4A');
    expect(values).toContain('4B');
    expect(values).toContain('4C');
    expect(values).toContain('5');
    expect(values).toContain('6');
  });
});
