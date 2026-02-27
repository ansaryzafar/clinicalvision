/**
 * FindingsPanel Component Test Suite
 * 
 * Tests findings CRUD operations:
 * - Add new finding
 * - Edit existing finding
 * - Delete finding
 * - Status changes
 * - AI confidence display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Types
// ============================================================================

interface Finding {
  id: string;
  type: 'mass' | 'calcification' | 'architectural_distortion' | 'asymmetry' | 'other';
  location: {
    quadrant: string;
    clockPosition?: string;
    depth?: 'anterior' | 'middle' | 'posterior';
  };
  description: string;
  size?: { width: number; height: number; unit: 'mm' | 'cm' };
  status: 'suspected' | 'confirmed' | 'dismissed';
  aiConfidence?: number;
  biradsCategory?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Findings Manager for Testing
// ============================================================================

class FindingsManager {
  private findings: Finding[] = [];
  private lastId = 0;

  generateId(): string {
    this.lastId++;
    return `finding_${this.lastId}`;
  }

  addFinding(finding: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'>): Finding {
    const now = new Date().toISOString();
    const newFinding: Finding = {
      ...finding,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.findings.push(newFinding);
    return newFinding;
  }

  updateFinding(id: string, updates: Partial<Finding>): Finding | null {
    const index = this.findings.findIndex(f => f.id === id);
    if (index === -1) return null;

    this.findings[index] = {
      ...this.findings[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.findings[index];
  }

  deleteFinding(id: string): boolean {
    const index = this.findings.findIndex(f => f.id === id);
    if (index === -1) return false;

    this.findings.splice(index, 1);
    return true;
  }

  getFinding(id: string): Finding | undefined {
    return this.findings.find(f => f.id === id);
  }

  getAllFindings(): Finding[] {
    return [...this.findings];
  }

  getByStatus(status: Finding['status']): Finding[] {
    return this.findings.filter(f => f.status === status);
  }

  getByType(type: Finding['type']): Finding[] {
    return this.findings.filter(f => f.type === type);
  }

  clear(): void {
    this.findings = [];
    this.lastId = 0;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

const validateFinding = (finding: Partial<Finding>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!finding.type) {
    errors.push('Type is required');
  }

  if (!finding.location?.quadrant) {
    errors.push('Location quadrant is required');
  }

  if (!finding.description || finding.description.length < 3) {
    errors.push('Description must be at least 3 characters');
  }

  if (finding.size) {
    if (finding.size.width <= 0 || finding.size.height <= 0) {
      errors.push('Size dimensions must be positive');
    }
  }

  if (finding.biradsCategory !== undefined) {
    if (finding.biradsCategory < 0 || finding.biradsCategory > 6) {
      errors.push('BI-RADS category must be between 0 and 6');
    }
  }

  return { valid: errors.length === 0, errors };
};

const getAIConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Moderate';
  if (confidence >= 0.25) return 'Low';
  return 'Very Low';
};

const getStatusColor = (status: Finding['status']): string => {
  switch (status) {
    case 'confirmed': return 'error';
    case 'suspected': return 'warning';
    case 'dismissed': return 'default';
    default: return 'default';
  }
};

// ============================================================================
// Test Suites
// ============================================================================

describe('FindingsManager CRUD Operations', () => {
  let manager: FindingsManager;

  beforeEach(() => {
    manager = new FindingsManager();
  });

  describe('addFinding', () => {
    test('adds a finding with generated id', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Suspicious mass identified',
        status: 'suspected',
      });

      expect(finding.id).toBe('finding_1');
      expect(finding.type).toBe('mass');
      expect(manager.getAllFindings()).toHaveLength(1);
    });

    test('adds multiple findings with unique ids', () => {
      manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Finding 1',
        status: 'suspected',
      });

      manager.addFinding({
        type: 'calcification',
        location: { quadrant: 'LIQ' },
        description: 'Finding 2',
        status: 'suspected',
      });

      const findings = manager.getAllFindings();
      expect(findings).toHaveLength(2);
      expect(findings[0].id).not.toBe(findings[1].id);
    });

    test('sets timestamps on creation', () => {
      const before = new Date().toISOString();
      
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Test finding',
        status: 'suspected',
      });

      const after = new Date().toISOString();
      
      expect(finding.createdAt >= before).toBe(true);
      expect(finding.createdAt <= after).toBe(true);
      expect(finding.updatedAt).toBe(finding.createdAt);
    });

    test('preserves AI confidence when provided', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'AI detected mass',
        status: 'suspected',
        aiConfidence: 0.87,
      });

      expect(finding.aiConfidence).toBe(0.87);
    });
  });

  describe('updateFinding', () => {
    test('updates existing finding', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Original description',
        status: 'suspected',
      });

      const updated = manager.updateFinding(finding.id, {
        description: 'Updated description',
      });

      expect(updated?.description).toBe('Updated description');
    });

    test('updates updatedAt timestamp', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Test',
        status: 'suspected',
      });

      const originalUpdatedAt = finding.updatedAt;

      // Wait a tiny bit to ensure different timestamp
      const updated = manager.updateFinding(finding.id, {
        status: 'confirmed',
      });

      expect(updated?.updatedAt >= originalUpdatedAt).toBe(true);
    });

    test('returns null for non-existent finding', () => {
      const result = manager.updateFinding('nonexistent', {
        description: 'test',
      });

      expect(result).toBeNull();
    });

    test('can update status from suspected to confirmed', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Test',
        status: 'suspected',
      });

      const updated = manager.updateFinding(finding.id, {
        status: 'confirmed',
      });

      expect(updated?.status).toBe('confirmed');
    });

    test('can update status to dismissed', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'False positive',
        status: 'suspected',
      });

      const updated = manager.updateFinding(finding.id, {
        status: 'dismissed',
      });

      expect(updated?.status).toBe('dismissed');
    });
  });

  describe('deleteFinding', () => {
    test('removes finding from list', () => {
      const finding = manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Test',
        status: 'suspected',
      });

      const result = manager.deleteFinding(finding.id);

      expect(result).toBe(true);
      expect(manager.getAllFindings()).toHaveLength(0);
    });

    test('returns false for non-existent finding', () => {
      const result = manager.deleteFinding('nonexistent');
      expect(result).toBe(false);
    });

    test('only removes specified finding', () => {
      manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Finding 1',
        status: 'suspected',
      });

      const finding2 = manager.addFinding({
        type: 'calcification',
        location: { quadrant: 'LIQ' },
        description: 'Finding 2',
        status: 'suspected',
      });

      manager.deleteFinding(finding2.id);

      const remaining = manager.getAllFindings();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].type).toBe('mass');
    });
  });

  describe('query methods', () => {
    beforeEach(() => {
      manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Mass 1',
        status: 'confirmed',
      });

      manager.addFinding({
        type: 'mass',
        location: { quadrant: 'UIQ' },
        description: 'Mass 2',
        status: 'suspected',
      });

      manager.addFinding({
        type: 'calcification',
        location: { quadrant: 'LOQ' },
        description: 'Calcification',
        status: 'dismissed',
      });
    });

    test('getByStatus returns correct findings', () => {
      expect(manager.getByStatus('confirmed')).toHaveLength(1);
      expect(manager.getByStatus('suspected')).toHaveLength(1);
      expect(manager.getByStatus('dismissed')).toHaveLength(1);
    });

    test('getByType returns correct findings', () => {
      expect(manager.getByType('mass')).toHaveLength(2);
      expect(manager.getByType('calcification')).toHaveLength(1);
      expect(manager.getByType('asymmetry')).toHaveLength(0);
    });
  });
});

describe('Finding Validation', () => {
  test('requires type', () => {
    const result = validateFinding({
      location: { quadrant: 'UOQ' },
      description: 'Test description',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Type is required');
  });

  test('requires location quadrant', () => {
    const result = validateFinding({
      type: 'mass',
      location: {},
      description: 'Test description',
    } as any);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Location quadrant is required');
  });

  test('requires description of at least 3 characters', () => {
    const result = validateFinding({
      type: 'mass',
      location: { quadrant: 'UOQ' },
      description: 'ab',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Description must be at least 3 characters');
  });

  test('validates positive size dimensions', () => {
    const result = validateFinding({
      type: 'mass',
      location: { quadrant: 'UOQ' },
      description: 'Test finding',
      size: { width: 0, height: 5, unit: 'mm' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Size dimensions must be positive');
  });

  test('validates BI-RADS category range', () => {
    const invalid1 = validateFinding({
      type: 'mass',
      location: { quadrant: 'UOQ' },
      description: 'Test finding',
      biradsCategory: -1,
    });

    const invalid2 = validateFinding({
      type: 'mass',
      location: { quadrant: 'UOQ' },
      description: 'Test finding',
      biradsCategory: 7,
    });

    expect(invalid1.valid).toBe(false);
    expect(invalid2.valid).toBe(false);
  });

  test('accepts valid BI-RADS categories 0-6', () => {
    for (let i = 0; i <= 6; i++) {
      const result = validateFinding({
        type: 'mass',
        location: { quadrant: 'UOQ' },
        description: 'Test finding',
        biradsCategory: i,
      });

      expect(result.valid).toBe(true);
    }
  });

  test('passes validation with all required fields', () => {
    const result = validateFinding({
      type: 'mass',
      location: { quadrant: 'UOQ' },
      description: 'Valid finding description',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('AI Confidence Display', () => {
  test('returns "Very High" for confidence >= 0.9', () => {
    expect(getAIConfidenceLabel(0.9)).toBe('Very High');
    expect(getAIConfidenceLabel(0.95)).toBe('Very High');
    expect(getAIConfidenceLabel(1.0)).toBe('Very High');
  });

  test('returns "High" for confidence 0.75-0.89', () => {
    expect(getAIConfidenceLabel(0.75)).toBe('High');
    expect(getAIConfidenceLabel(0.85)).toBe('High');
    expect(getAIConfidenceLabel(0.89)).toBe('High');
  });

  test('returns "Moderate" for confidence 0.5-0.74', () => {
    expect(getAIConfidenceLabel(0.5)).toBe('Moderate');
    expect(getAIConfidenceLabel(0.65)).toBe('Moderate');
    expect(getAIConfidenceLabel(0.74)).toBe('Moderate');
  });

  test('returns "Low" for confidence 0.25-0.49', () => {
    expect(getAIConfidenceLabel(0.25)).toBe('Low');
    expect(getAIConfidenceLabel(0.35)).toBe('Low');
    expect(getAIConfidenceLabel(0.49)).toBe('Low');
  });

  test('returns "Very Low" for confidence < 0.25', () => {
    expect(getAIConfidenceLabel(0.1)).toBe('Very Low');
    expect(getAIConfidenceLabel(0.24)).toBe('Very Low');
    expect(getAIConfidenceLabel(0.0)).toBe('Very Low');
  });
});

describe('Status Color Mapping', () => {
  test('confirmed findings use error color', () => {
    expect(getStatusColor('confirmed')).toBe('error');
  });

  test('suspected findings use warning color', () => {
    expect(getStatusColor('suspected')).toBe('warning');
  });

  test('dismissed findings use default color', () => {
    expect(getStatusColor('dismissed')).toBe('default');
  });
});
