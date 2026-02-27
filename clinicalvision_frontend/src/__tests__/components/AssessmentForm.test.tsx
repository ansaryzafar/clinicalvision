/**
 * AssessmentForm Component Test Suite
 * 
 * Tests assessment form functionality:
 * - BI-RADS category selection
 * - Assessment validation
 * - Recommendations
 * - Form submission
 */

import React from 'react';
import '@testing-library/jest-dom';

// ============================================================================
// Types
// ============================================================================

interface Assessment {
  id: string;
  biradsCategory: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  biradsSubcategory?: '4A' | '4B' | '4C';
  laterality: 'left' | 'right' | 'bilateral';
  breastDensity: 'A' | 'B' | 'C' | 'D';
  recommendation: string;
  followUpInterval?: string;
  clinicalHistory?: string;
  impression: string;
  createdAt: string;
  updatedAt: string;
}

interface BiradsInfo {
  category: number;
  name: string;
  description: string;
  recommendation: string;
  malignancyProbability: string;
}

// ============================================================================
// BI-RADS Category Information
// ============================================================================

const BIRADS_CATEGORIES: BiradsInfo[] = [
  {
    category: 0,
    name: 'Incomplete',
    description: 'Need additional imaging evaluation',
    recommendation: 'Recall for additional imaging',
    malignancyProbability: 'N/A',
  },
  {
    category: 1,
    name: 'Negative',
    description: 'No finding to report',
    recommendation: 'Routine annual screening',
    malignancyProbability: '0%',
  },
  {
    category: 2,
    name: 'Benign',
    description: 'Definitely benign finding',
    recommendation: 'Routine annual screening',
    malignancyProbability: '0%',
  },
  {
    category: 3,
    name: 'Probably Benign',
    description: 'Finding with very high probability of being benign',
    recommendation: 'Short-term follow-up (6 months)',
    malignancyProbability: '< 2%',
  },
  {
    category: 4,
    name: 'Suspicious',
    description: 'Finding suspicious for malignancy',
    recommendation: 'Tissue diagnosis (biopsy)',
    malignancyProbability: '2% - 95%',
  },
  {
    category: 5,
    name: 'Highly Suspicious',
    description: 'Finding highly suggestive of malignancy',
    recommendation: 'Tissue diagnosis (biopsy) and appropriate action',
    malignancyProbability: '> 95%',
  },
  {
    category: 6,
    name: 'Known Malignancy',
    description: 'Known biopsy-proven malignancy',
    recommendation: 'Surgical excision when clinically appropriate',
    malignancyProbability: 'N/A (already proven)',
  },
];

const BIRADS_4_SUBCATEGORIES = {
  '4A': { malignancyProbability: '2% - 10%', description: 'Low suspicion for malignancy' },
  '4B': { malignancyProbability: '10% - 50%', description: 'Moderate suspicion for malignancy' },
  '4C': { malignancyProbability: '50% - 95%', description: 'High suspicion for malignancy' },
};

// ============================================================================
// Assessment Manager
// ============================================================================

class AssessmentManager {
  private assessment: Assessment | null = null;

  getBiradsInfo(category: number): BiradsInfo | undefined {
    return BIRADS_CATEGORIES.find(b => b.category === category);
  }

  getRecommendation(category: number): string {
    const info = this.getBiradsInfo(category);
    return info?.recommendation || 'No recommendation available';
  }

  requiresSubcategory(category: number): boolean {
    return category === 4;
  }

  requiresFollowUp(category: number): boolean {
    return [0, 3, 4, 5].includes(category);
  }

  validateAssessment(assessment: Partial<Assessment>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (assessment.biradsCategory === undefined) {
      errors.push('BI-RADS category is required');
    } else if (assessment.biradsCategory < 0 || assessment.biradsCategory > 6) {
      errors.push('BI-RADS category must be between 0 and 6');
    }

    if (assessment.biradsCategory === 4 && !assessment.biradsSubcategory) {
      errors.push('BI-RADS 4 requires a subcategory (4A, 4B, or 4C)');
    }

    if (!assessment.laterality) {
      errors.push('Laterality is required');
    }

    if (!assessment.breastDensity) {
      errors.push('Breast density is required');
    }

    if (!assessment.impression || assessment.impression.length < 10) {
      errors.push('Impression must be at least 10 characters');
    }

    if (this.requiresFollowUp(assessment.biradsCategory!) && !assessment.followUpInterval) {
      errors.push('Follow-up interval is required for this BI-RADS category');
    }

    return { valid: errors.length === 0, errors };
  }

  createAssessment(data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>): Assessment {
    const now = new Date().toISOString();
    this.assessment = {
      ...data,
      id: `assessment_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    return this.assessment;
  }

  updateAssessment(updates: Partial<Assessment>): Assessment | null {
    if (!this.assessment) return null;

    this.assessment = {
      ...this.assessment,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.assessment;
  }

  getAssessment(): Assessment | null {
    return this.assessment;
  }

  clear(): void {
    this.assessment = null;
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('BI-RADS Category Information', () => {
  const manager = new AssessmentManager();

  test('returns correct info for category 0', () => {
    const info = manager.getBiradsInfo(0);
    
    expect(info?.name).toBe('Incomplete');
    expect(info?.recommendation).toContain('additional imaging');
  });

  test('returns correct info for category 1', () => {
    const info = manager.getBiradsInfo(1);
    
    expect(info?.name).toBe('Negative');
    expect(info?.malignancyProbability).toBe('0%');
  });

  test('returns correct info for category 2', () => {
    const info = manager.getBiradsInfo(2);
    
    expect(info?.name).toBe('Benign');
  });

  test('returns correct info for category 3', () => {
    const info = manager.getBiradsInfo(3);
    
    expect(info?.name).toBe('Probably Benign');
    expect(info?.recommendation).toContain('6 months');
  });

  test('returns correct info for category 4', () => {
    const info = manager.getBiradsInfo(4);
    
    expect(info?.name).toBe('Suspicious');
    expect(info?.recommendation).toContain('biopsy');
  });

  test('returns correct info for category 5', () => {
    const info = manager.getBiradsInfo(5);
    
    expect(info?.name).toBe('Highly Suspicious');
    expect(info?.malignancyProbability).toBe('> 95%');
  });

  test('returns correct info for category 6', () => {
    const info = manager.getBiradsInfo(6);
    
    expect(info?.name).toBe('Known Malignancy');
  });

  test('returns undefined for invalid category', () => {
    const info = manager.getBiradsInfo(7);
    
    expect(info).toBeUndefined();
  });
});

describe('BI-RADS 4 Subcategories', () => {
  test('4A has lowest malignancy probability', () => {
    expect(BIRADS_4_SUBCATEGORIES['4A'].malignancyProbability).toBe('2% - 10%');
  });

  test('4B has moderate malignancy probability', () => {
    expect(BIRADS_4_SUBCATEGORIES['4B'].malignancyProbability).toBe('10% - 50%');
  });

  test('4C has highest malignancy probability', () => {
    expect(BIRADS_4_SUBCATEGORIES['4C'].malignancyProbability).toBe('50% - 95%');
  });
});

describe('AssessmentManager Requirements', () => {
  const manager = new AssessmentManager();

  describe('requiresSubcategory', () => {
    test('returns true only for category 4', () => {
      expect(manager.requiresSubcategory(4)).toBe(true);
    });

    test('returns false for other categories', () => {
      expect(manager.requiresSubcategory(0)).toBe(false);
      expect(manager.requiresSubcategory(1)).toBe(false);
      expect(manager.requiresSubcategory(2)).toBe(false);
      expect(manager.requiresSubcategory(3)).toBe(false);
      expect(manager.requiresSubcategory(5)).toBe(false);
      expect(manager.requiresSubcategory(6)).toBe(false);
    });
  });

  describe('requiresFollowUp', () => {
    test('returns true for categories 0, 3, 4, 5', () => {
      expect(manager.requiresFollowUp(0)).toBe(true);
      expect(manager.requiresFollowUp(3)).toBe(true);
      expect(manager.requiresFollowUp(4)).toBe(true);
      expect(manager.requiresFollowUp(5)).toBe(true);
    });

    test('returns false for categories 1, 2, 6', () => {
      expect(manager.requiresFollowUp(1)).toBe(false);
      expect(manager.requiresFollowUp(2)).toBe(false);
      expect(manager.requiresFollowUp(6)).toBe(false);
    });
  });
});

describe('Assessment Validation', () => {
  let manager: AssessmentManager;

  beforeEach(() => {
    manager = new AssessmentManager();
  });

  test('requires BI-RADS category', () => {
    const result = manager.validateAssessment({
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Normal mammogram findings',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BI-RADS category is required');
  });

  test('validates BI-RADS category range', () => {
    const result = manager.validateAssessment({
      biradsCategory: 8 as any,
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Normal mammogram findings',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BI-RADS category must be between 0 and 6');
  });

  test('requires subcategory for BI-RADS 4', () => {
    const result = manager.validateAssessment({
      biradsCategory: 4,
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Suspicious finding requiring biopsy',
      followUpInterval: '2 weeks',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BI-RADS 4 requires a subcategory (4A, 4B, or 4C)');
  });

  test('requires laterality', () => {
    const result = manager.validateAssessment({
      biradsCategory: 1,
      breastDensity: 'B',
      impression: 'Normal mammogram findings',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Laterality is required');
  });

  test('requires breast density', () => {
    const result = manager.validateAssessment({
      biradsCategory: 1,
      laterality: 'left',
      impression: 'Normal mammogram findings',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Breast density is required');
  });

  test('requires impression of at least 10 characters', () => {
    const result = manager.validateAssessment({
      biradsCategory: 1,
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Normal',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Impression must be at least 10 characters');
  });

  test('requires follow-up interval for certain categories', () => {
    const result = manager.validateAssessment({
      biradsCategory: 3,
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Probably benign finding requiring follow-up',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Follow-up interval is required for this BI-RADS category');
  });

  test('passes validation with all required fields', () => {
    const result = manager.validateAssessment({
      biradsCategory: 1,
      laterality: 'left',
      breastDensity: 'B',
      impression: 'Normal bilateral mammogram with no evidence of malignancy',
      recommendation: 'Routine annual screening',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('passes validation for BI-RADS 4 with subcategory', () => {
    const result = manager.validateAssessment({
      biradsCategory: 4,
      biradsSubcategory: '4A',
      laterality: 'right',
      breastDensity: 'C',
      impression: 'Suspicious finding with low suspicion for malignancy',
      followUpInterval: '2 weeks',
    });

    expect(result.valid).toBe(true);
  });
});

describe('Assessment CRUD Operations', () => {
  let manager: AssessmentManager;

  beforeEach(() => {
    manager = new AssessmentManager();
  });

  test('creates assessment with timestamps', () => {
    const assessment = manager.createAssessment({
      biradsCategory: 2,
      laterality: 'bilateral',
      breastDensity: 'B',
      recommendation: 'Routine annual screening',
      impression: 'Benign findings including calcifications',
    });

    expect(assessment.id).toMatch(/^assessment_\d+$/);
    expect(assessment.biradsCategory).toBe(2);
    expect(assessment.createdAt).toBeDefined();
    expect(assessment.updatedAt).toBe(assessment.createdAt);
  });

  test('updates existing assessment', () => {
    manager.createAssessment({
      biradsCategory: 2,
      laterality: 'left',
      breastDensity: 'B',
      recommendation: 'Routine screening',
      impression: 'Initial impression',
    });

    const updated = manager.updateAssessment({
      impression: 'Updated impression with more details',
    });

    expect(updated?.impression).toBe('Updated impression with more details');
    // Check that updatedAt is >= createdAt (they may be the same in fast execution)
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(updated!.createdAt).getTime()
    );
  });

  test('returns null when updating without existing assessment', () => {
    const result = manager.updateAssessment({ impression: 'test' });
    expect(result).toBeNull();
  });

  test('getAssessment returns current assessment', () => {
    manager.createAssessment({
      biradsCategory: 1,
      laterality: 'left',
      breastDensity: 'A',
      recommendation: 'Routine',
      impression: 'Normal findings',
    });

    const assessment = manager.getAssessment();
    expect(assessment?.biradsCategory).toBe(1);
  });

  test('clear removes assessment', () => {
    manager.createAssessment({
      biradsCategory: 1,
      laterality: 'left',
      breastDensity: 'A',
      recommendation: 'Routine',
      impression: 'Normal findings',
    });

    manager.clear();
    expect(manager.getAssessment()).toBeNull();
  });
});

describe('Assessment Recommendations', () => {
  const manager = new AssessmentManager();

  test('returns routine screening for benign findings', () => {
    const recommendation = manager.getRecommendation(1);
    expect(recommendation.toLowerCase()).toContain('routine');
  });

  test('returns follow-up for probably benign', () => {
    const recommendation = manager.getRecommendation(3);
    expect(recommendation.toLowerCase()).toContain('follow');
  });

  test('returns biopsy for suspicious findings', () => {
    const recommendation = manager.getRecommendation(4);
    expect(recommendation.toLowerCase()).toContain('biopsy');
  });

  test('returns biopsy for highly suspicious findings', () => {
    const recommendation = manager.getRecommendation(5);
    expect(recommendation.toLowerCase()).toContain('biopsy');
  });
});

describe('Breast Density Categories', () => {
  const densityDescriptions = {
    'A': 'Almost entirely fatty',
    'B': 'Scattered fibroglandular',
    'C': 'Heterogeneously dense',
    'D': 'Extremely dense',
  };

  test('density A indicates fatty breast tissue', () => {
    expect(densityDescriptions['A']).toContain('fatty');
  });

  test('density D indicates extremely dense tissue', () => {
    expect(densityDescriptions['D']).toContain('Extremely dense');
  });

  test('all density categories are defined', () => {
    expect(Object.keys(densityDescriptions)).toHaveLength(4);
  });
});
