/**
 * Phase G.1 & G.2 — TDD Tests for Finding Type & WorkflowStatus Extensions
 * 
 * Tests validate:
 * 1. Finding interface accepts riskLevel, biRads, confidence (convenience aliases)
 * 2. getRiskLevel() maps biradsCategory → risk level correctly (all edge cases)
 * 3. getNumericBirads() maps biradsCategory → numeric value
 * 4. getNormalizedConfidence() normalizes aiConfidence → 0-100 confidence
 * 5. WorkflowStatus union accepts 'pending' and 'paused'
 * 6. normalizeFinding() enriches a Finding with computed convenience fields
 */
import {
  Finding,
  FindingStatus,
  WorkflowStatus,
  BIRADS,
  BIRADSValue,
  getRiskLevel,
  getNumericBirads,
  getNormalizedConfidence,
  normalizeFinding,
} from '../clinical.types';

// ============================================================================
// G.1 — Finding Interface Convenience Aliases
// ============================================================================

describe('Finding Interface Convenience Aliases', () => {
  const baseFinding: Finding = {
    findingId: 'f-001',
    findingType: 'mass',
    location: { breast: 'left', quadrant: 'UOQ' },
    status: 'pending' as FindingStatus,
  };

  test('Finding with riskLevel is valid TypeScript', () => {
    const finding: Finding = {
      ...baseFinding,
      riskLevel: 'high',
    };
    expect(finding.riskLevel).toBe('high');
  });

  test('Finding with biRads is valid TypeScript', () => {
    const finding: Finding = {
      ...baseFinding,
      biRads: 4,
    };
    expect(finding.biRads).toBe(4);
  });

  test('Finding with confidence is valid TypeScript', () => {
    const finding: Finding = {
      ...baseFinding,
      confidence: 87,
    };
    expect(finding.confidence).toBe(87);
  });

  test('Finding with all aliases together is valid', () => {
    const finding: Finding = {
      ...baseFinding,
      riskLevel: 'moderate',
      biRads: 3,
      confidence: 65,
      aiConfidence: 0.65,
      biradsCategory: BIRADS.PROBABLY_BENIGN,
    };
    expect(finding.riskLevel).toBe('moderate');
    expect(finding.biRads).toBe(3);
    expect(finding.confidence).toBe(65);
    expect(finding.aiConfidence).toBe(0.65);
    expect(finding.biradsCategory).toBe('3');
  });

  test('Finding without aliases still works (backward compat)', () => {
    const finding: Finding = {
      ...baseFinding,
      aiConfidence: 0.92,
      biradsCategory: BIRADS.HIGHLY_SUGGESTIVE,
    };
    expect(finding.riskLevel).toBeUndefined();
    expect(finding.biRads).toBeUndefined();
    expect(finding.confidence).toBeUndefined();
    expect(finding.aiConfidence).toBe(0.92);
  });
});

// ============================================================================
// G.1 — getRiskLevel() Helper
// ============================================================================

describe('getRiskLevel()', () => {
  test('maps BIRADS 0 (Incomplete) → "low"', () => {
    expect(getRiskLevel(BIRADS.INCOMPLETE)).toBe('low');
  });

  test('maps BIRADS 1 (Negative) → "low"', () => {
    expect(getRiskLevel(BIRADS.NEGATIVE)).toBe('low');
  });

  test('maps BIRADS 2 (Benign) → "low"', () => {
    expect(getRiskLevel(BIRADS.BENIGN)).toBe('low');
  });

  test('maps BIRADS 3 (Probably Benign) → "moderate"', () => {
    expect(getRiskLevel(BIRADS.PROBABLY_BENIGN)).toBe('moderate');
  });

  test('maps BIRADS 4A (Low Suspicion) → "high"', () => {
    expect(getRiskLevel(BIRADS.SUSPICIOUS_LOW)).toBe('high');
  });

  test('maps BIRADS 4B (Moderate Suspicion) → "high"', () => {
    expect(getRiskLevel(BIRADS.SUSPICIOUS_MODERATE)).toBe('high');
  });

  test('maps BIRADS 4C (High Suspicion) → "high"', () => {
    expect(getRiskLevel(BIRADS.SUSPICIOUS_HIGH)).toBe('high');
  });

  test('maps BIRADS 5 (Highly Suggestive) → "high"', () => {
    expect(getRiskLevel(BIRADS.HIGHLY_SUGGESTIVE)).toBe('high');
  });

  test('maps BIRADS 6 (Known Biopsy-Proven) → "high"', () => {
    expect(getRiskLevel(BIRADS.KNOWN_BIOPSY_PROVEN)).toBe('high');
  });

  test('handles undefined → "low" (safe default)', () => {
    expect(getRiskLevel(undefined)).toBe('low');
  });

  test('handles null-ish values → "low"', () => {
    expect(getRiskLevel(undefined)).toBe('low');
    // Testing runtime safety for JS callers - null treated as undefined
    expect(getRiskLevel(null as unknown as undefined)).toBe('low');
  });

  test('handles legacy numeric string "4" → "high"', () => {
    expect(getRiskLevel('4' as BIRADSValue)).toBe('high');
  });
});

// ============================================================================
// G.1 — getNumericBirads() Helper
// ============================================================================

describe('getNumericBirads()', () => {
  test('maps BIRADS 0 → 0', () => {
    expect(getNumericBirads(BIRADS.INCOMPLETE)).toBe(0);
  });

  test('maps BIRADS 3 → 3', () => {
    expect(getNumericBirads(BIRADS.PROBABLY_BENIGN)).toBe(3);
  });

  test('maps BIRADS 4A → 4', () => {
    expect(getNumericBirads(BIRADS.SUSPICIOUS_LOW)).toBe(4);
  });

  test('maps BIRADS 4B → 4', () => {
    expect(getNumericBirads(BIRADS.SUSPICIOUS_MODERATE)).toBe(4);
  });

  test('maps BIRADS 4C → 4', () => {
    expect(getNumericBirads(BIRADS.SUSPICIOUS_HIGH)).toBe(4);
  });

  test('maps BIRADS 5 → 5', () => {
    expect(getNumericBirads(BIRADS.HIGHLY_SUGGESTIVE)).toBe(5);
  });

  test('maps BIRADS 6 → 6', () => {
    expect(getNumericBirads(BIRADS.KNOWN_BIOPSY_PROVEN)).toBe(6);
  });

  test('handles undefined → 0 (safe default)', () => {
    expect(getNumericBirads(undefined)).toBe(0);
  });
});

// ============================================================================
// G.1 — getNormalizedConfidence() Helper
// ============================================================================

describe('getNormalizedConfidence()', () => {
  test('converts 0.95 → 95', () => {
    expect(getNormalizedConfidence(0.95)).toBe(95);
  });

  test('converts 0.0 → 0', () => {
    expect(getNormalizedConfidence(0.0)).toBe(0);
  });

  test('converts 1.0 → 100', () => {
    expect(getNormalizedConfidence(1.0)).toBe(100);
  });

  test('passes through values already in 0-100 range', () => {
    expect(getNormalizedConfidence(85)).toBe(85);
  });

  test('handles undefined → 0', () => {
    expect(getNormalizedConfidence(undefined)).toBe(0);
  });

  test('clamps values > 100 to 100', () => {
    expect(getNormalizedConfidence(150)).toBe(100);
  });

  test('clamps negative values to 0', () => {
    expect(getNormalizedConfidence(-5)).toBe(0);
  });
});

// ============================================================================
// G.1 — normalizeFinding() — Enriches Finding with computed aliases
// ============================================================================

describe('normalizeFinding()', () => {
  test('adds riskLevel from biradsCategory', () => {
    const finding: Finding = {
      findingId: 'f-001',
      findingType: 'mass',
      location: { breast: 'left' },
      status: 'pending',
      biradsCategory: BIRADS.HIGHLY_SUGGESTIVE,
    };
    const normalized = normalizeFinding(finding);
    expect(normalized.riskLevel).toBe('high');
  });

  test('adds biRads numeric from biradsCategory', () => {
    const finding: Finding = {
      findingId: 'f-002',
      findingType: 'calcification',
      location: { breast: 'right' },
      status: 'reviewed',
      biradsCategory: BIRADS.SUSPICIOUS_MODERATE,
    };
    const normalized = normalizeFinding(finding);
    expect(normalized.biRads).toBe(4);
  });

  test('adds confidence from aiConfidence', () => {
    const finding: Finding = {
      findingId: 'f-003',
      findingType: 'asymmetry',
      location: { breast: 'left' },
      status: 'confirmed',
      aiConfidence: 0.87,
    };
    const normalized = normalizeFinding(finding);
    expect(normalized.confidence).toBe(87);
  });

  test('preserves existing convenience aliases if already set', () => {
    const finding: Finding = {
      findingId: 'f-004',
      findingType: 'mass',
      location: { breast: 'right' },
      status: 'pending',
      riskLevel: 'moderate',
      biRads: 3,
      confidence: 50,
      biradsCategory: BIRADS.HIGHLY_SUGGESTIVE, // Would compute 'high'
      aiConfidence: 0.95, // Would compute 95
    };
    const normalized = normalizeFinding(finding);
    // Existing values should be preserved (user/system explicitly set them)
    expect(normalized.riskLevel).toBe('moderate');
    expect(normalized.biRads).toBe(3);
    expect(normalized.confidence).toBe(50);
  });

  test('handles finding with no biradsCategory or aiConfidence', () => {
    const finding: Finding = {
      findingId: 'f-005',
      findingType: 'other',
      location: { breast: 'left' },
      status: 'pending',
    };
    const normalized = normalizeFinding(finding);
    expect(normalized.riskLevel).toBe('low');
    expect(normalized.biRads).toBe(0);
    expect(normalized.confidence).toBe(0);
  });

  test('does not mutate the original finding', () => {
    const original: Finding = {
      findingId: 'f-006',
      findingType: 'mass',
      location: { breast: 'left' },
      status: 'pending',
      biradsCategory: BIRADS.SUSPICIOUS_HIGH,
      aiConfidence: 0.72,
    };
    const normalized = normalizeFinding(original);
    expect(original.riskLevel).toBeUndefined();
    expect(normalized.riskLevel).toBe('high');
    expect(normalized).not.toBe(original); // Different reference
  });
});

// ============================================================================
// G.2 — WorkflowStatus Extensions
// ============================================================================

describe('WorkflowStatus Type Extensions', () => {
  test('accepts "pending" value', () => {
    const status: WorkflowStatus = 'pending';
    expect(status).toBe('pending');
  });

  test('accepts "paused" value', () => {
    const status: WorkflowStatus = 'paused';
    expect(status).toBe('paused');
  });

  test('accepts all original values (regression check)', () => {
    const statuses: WorkflowStatus[] = [
      'in-progress',
      'completed',
      'reviewed',
      'finalized',
    ];
    expect(statuses).toHaveLength(4);
    statuses.forEach(s => expect(typeof s).toBe('string'));
  });

  test('full status lifecycle is valid', () => {
    const lifecycle: WorkflowStatus[] = [
      'pending',
      'in-progress',
      'paused',
      'in-progress',
      'completed',
      'reviewed',
      'finalized',
    ];
    expect(lifecycle).toHaveLength(7);
  });
});
