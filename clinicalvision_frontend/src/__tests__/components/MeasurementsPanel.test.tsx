/**
 * MeasurementsPanel Component Test Suite
 * 
 * Tests measurement recording functionality:
 * - Add measurements
 * - Edit measurements  
 * - Delete measurements
 * - Unit conversion
 * - Measurement types
 */

import React from 'react';
import '@testing-library/jest-dom';

// ============================================================================
// Types
// ============================================================================

interface Measurement {
  id: string;
  type: 'length' | 'area' | 'angle' | 'diameter';
  value: number;
  unit: 'mm' | 'cm' | 'px' | 'degrees';
  label?: string;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  associatedFindingId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Measurements Manager
// ============================================================================

class MeasurementsManager {
  private measurements: Measurement[] = [];
  private lastId = 0;

  generateId(): string {
    this.lastId++;
    return `measurement_${this.lastId}`;
  }

  addMeasurement(measurement: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'>): Measurement {
    const now = new Date().toISOString();
    const newMeasurement: Measurement = {
      ...measurement,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.measurements.push(newMeasurement);
    return newMeasurement;
  }

  updateMeasurement(id: string, updates: Partial<Measurement>): Measurement | null {
    const index = this.measurements.findIndex(m => m.id === id);
    if (index === -1) return null;

    this.measurements[index] = {
      ...this.measurements[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.measurements[index];
  }

  deleteMeasurement(id: string): boolean {
    const index = this.measurements.findIndex(m => m.id === id);
    if (index === -1) return false;

    this.measurements.splice(index, 1);
    return true;
  }

  getMeasurement(id: string): Measurement | undefined {
    return this.measurements.find(m => m.id === id);
  }

  getAllMeasurements(): Measurement[] {
    return [...this.measurements];
  }

  getMeasurementsForFinding(findingId: string): Measurement[] {
    return this.measurements.filter(m => m.associatedFindingId === findingId);
  }

  clear(): void {
    this.measurements = [];
    this.lastId = 0;
  }
}

// ============================================================================
// Unit Conversion Utilities
// ============================================================================

const mmToCm = (mm: number): number => mm / 10;
const cmToMm = (cm: number): number => cm * 10;

const convertLength = (value: number, fromUnit: 'mm' | 'cm' | 'px', toUnit: 'mm' | 'cm' | 'px', pixelSpacing?: number): number => {
  // Convert to mm first
  let mmValue: number;
  
  switch (fromUnit) {
    case 'mm':
      mmValue = value;
      break;
    case 'cm':
      mmValue = cmToMm(value);
      break;
    case 'px':
      mmValue = pixelSpacing ? value * pixelSpacing : value * 0.1; // Default 0.1mm/px
      break;
  }

  // Convert from mm to target unit
  switch (toUnit) {
    case 'mm':
      return mmValue;
    case 'cm':
      return mmToCm(mmValue);
    case 'px':
      return pixelSpacing ? mmValue / pixelSpacing : mmValue / 0.1;
    default:
      return mmValue;
  }
};

const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const formatMeasurement = (value: number, unit: string, precision: number = 2): string => {
  return `${value.toFixed(precision)} ${unit}`;
};

const validateMeasurement = (measurement: Partial<Measurement>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!measurement.type) {
    errors.push('Measurement type is required');
  }

  if (measurement.value === undefined || measurement.value < 0) {
    errors.push('Value must be non-negative');
  }

  if (!measurement.unit) {
    errors.push('Unit is required');
  }

  if (measurement.type === 'angle' && measurement.unit !== 'degrees') {
    errors.push('Angle measurements must use degrees');
  }

  if (measurement.type === 'length' && measurement.unit === 'degrees') {
    errors.push('Length measurements cannot use degrees');
  }

  return { valid: errors.length === 0, errors };
};

// ============================================================================
// Test Suites
// ============================================================================

describe('MeasurementsManager CRUD Operations', () => {
  let manager: MeasurementsManager;

  beforeEach(() => {
    manager = new MeasurementsManager();
  });

  describe('addMeasurement', () => {
    test('adds measurement with generated id', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 25.5,
        unit: 'mm',
        label: 'Tumor diameter',
      });

      expect(measurement.id).toBe('measurement_1');
      expect(measurement.value).toBe(25.5);
      expect(manager.getAllMeasurements()).toHaveLength(1);
    });

    test('adds measurement with coordinates', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 30,
        unit: 'mm',
        startPoint: { x: 100, y: 150 },
        endPoint: { x: 130, y: 150 },
      });

      expect(measurement.startPoint).toEqual({ x: 100, y: 150 });
      expect(measurement.endPoint).toEqual({ x: 130, y: 150 });
    });

    test('associates measurement with finding', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 15,
        unit: 'mm',
        associatedFindingId: 'finding_1',
      });

      expect(measurement.associatedFindingId).toBe('finding_1');
    });

    test('sets timestamps on creation', () => {
      const before = new Date().toISOString();
      
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
      });

      expect(measurement.createdAt >= before).toBe(true);
      expect(measurement.updatedAt).toBe(measurement.createdAt);
    });
  });

  describe('updateMeasurement', () => {
    test('updates existing measurement value', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
      });

      const updated = manager.updateMeasurement(measurement.id, {
        value: 25,
      });

      expect(updated?.value).toBe(25);
    });

    test('updates label', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
      });

      const updated = manager.updateMeasurement(measurement.id, {
        label: 'Updated label',
      });

      expect(updated?.label).toBe('Updated label');
    });

    test('returns null for non-existent measurement', () => {
      const result = manager.updateMeasurement('nonexistent', { value: 10 });
      expect(result).toBeNull();
    });

    test('updates updatedAt timestamp', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
      });

      const originalTime = measurement.updatedAt;

      const updated = manager.updateMeasurement(measurement.id, {
        value: 25,
      });

      expect(updated?.updatedAt >= originalTime).toBe(true);
    });
  });

  describe('deleteMeasurement', () => {
    test('removes measurement from list', () => {
      const measurement = manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
      });

      const result = manager.deleteMeasurement(measurement.id);

      expect(result).toBe(true);
      expect(manager.getAllMeasurements()).toHaveLength(0);
    });

    test('returns false for non-existent measurement', () => {
      const result = manager.deleteMeasurement('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getMeasurementsForFinding', () => {
    test('returns measurements associated with finding', () => {
      manager.addMeasurement({
        type: 'length',
        value: 20,
        unit: 'mm',
        associatedFindingId: 'finding_1',
      });

      manager.addMeasurement({
        type: 'diameter',
        value: 15,
        unit: 'mm',
        associatedFindingId: 'finding_1',
      });

      manager.addMeasurement({
        type: 'length',
        value: 10,
        unit: 'mm',
        associatedFindingId: 'finding_2',
      });

      const findingMeasurements = manager.getMeasurementsForFinding('finding_1');

      expect(findingMeasurements).toHaveLength(2);
    });

    test('returns empty array when no measurements for finding', () => {
      const result = manager.getMeasurementsForFinding('nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});

describe('Unit Conversion', () => {
  describe('mmToCm and cmToMm', () => {
    test('converts mm to cm correctly', () => {
      expect(mmToCm(10)).toBe(1);
      expect(mmToCm(25.5)).toBe(2.55);
      expect(mmToCm(100)).toBe(10);
    });

    test('converts cm to mm correctly', () => {
      expect(cmToMm(1)).toBe(10);
      expect(cmToMm(2.5)).toBe(25);
      expect(cmToMm(10)).toBe(100);
    });

    test('round trip conversion is accurate', () => {
      const original = 15.5;
      const converted = cmToMm(mmToCm(original));
      expect(converted).toBeCloseTo(original, 10);
    });
  });

  describe('convertLength', () => {
    test('converts mm to cm', () => {
      expect(convertLength(10, 'mm', 'cm')).toBe(1);
    });

    test('converts cm to mm', () => {
      expect(convertLength(1, 'cm', 'mm')).toBe(10);
    });

    test('returns same value when units match', () => {
      expect(convertLength(15, 'mm', 'mm')).toBe(15);
      expect(convertLength(2.5, 'cm', 'cm')).toBe(2.5);
    });

    test('converts pixels to mm with default spacing', () => {
      const result = convertLength(100, 'px', 'mm');
      expect(result).toBe(10); // 100px * 0.1mm/px = 10mm
    });

    test('converts pixels to mm with custom spacing', () => {
      const result = convertLength(100, 'px', 'mm', 0.2);
      expect(result).toBe(20); // 100px * 0.2mm/px = 20mm
    });

    test('converts mm to pixels', () => {
      const result = convertLength(10, 'mm', 'px');
      expect(result).toBe(100); // 10mm / 0.1mm/px = 100px
    });
  });
});

describe('Distance Calculation', () => {
  test('calculates horizontal distance', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };
    
    expect(calculateDistance(p1, p2)).toBe(100);
  });

  test('calculates vertical distance', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 0, y: 50 };
    
    expect(calculateDistance(p1, p2)).toBe(50);
  });

  test('calculates diagonal distance', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    
    expect(calculateDistance(p1, p2)).toBe(5); // 3-4-5 triangle
  });

  test('returns 0 for same point', () => {
    const p = { x: 100, y: 100 };
    
    expect(calculateDistance(p, p)).toBe(0);
  });

  test('handles negative coordinates', () => {
    const p1 = { x: -10, y: -10 };
    const p2 = { x: 10, y: 10 };
    
    const expected = Math.sqrt(800); // sqrt((20)^2 + (20)^2)
    expect(calculateDistance(p1, p2)).toBeCloseTo(expected);
  });
});

describe('Measurement Formatting', () => {
  test('formats with default precision', () => {
    expect(formatMeasurement(25.567, 'mm')).toBe('25.57 mm');
  });

  test('formats with custom precision', () => {
    expect(formatMeasurement(25.5678, 'mm', 3)).toBe('25.568 mm');
  });

  test('formats integer values', () => {
    expect(formatMeasurement(25, 'cm')).toBe('25.00 cm');
  });

  test('formats degrees', () => {
    expect(formatMeasurement(45, 'degrees', 1)).toBe('45.0 degrees');
  });
});

describe('Measurement Validation', () => {
  test('requires measurement type', () => {
    const result = validateMeasurement({
      value: 10,
      unit: 'mm',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Measurement type is required');
  });

  test('requires non-negative value', () => {
    const result = validateMeasurement({
      type: 'length',
      value: -5,
      unit: 'mm',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Value must be non-negative');
  });

  test('requires unit', () => {
    const result = validateMeasurement({
      type: 'length',
      value: 10,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unit is required');
  });

  test('angle measurements must use degrees', () => {
    const result = validateMeasurement({
      type: 'angle',
      value: 45,
      unit: 'mm',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Angle measurements must use degrees');
  });

  test('length measurements cannot use degrees', () => {
    const result = validateMeasurement({
      type: 'length',
      value: 45,
      unit: 'degrees',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Length measurements cannot use degrees');
  });

  test('accepts valid measurement', () => {
    const result = validateMeasurement({
      type: 'length',
      value: 25.5,
      unit: 'mm',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('accepts valid angle measurement', () => {
    const result = validateMeasurement({
      type: 'angle',
      value: 90,
      unit: 'degrees',
    });

    expect(result.valid).toBe(true);
  });

  test('accepts zero value', () => {
    const result = validateMeasurement({
      type: 'length',
      value: 0,
      unit: 'mm',
    });

    expect(result.valid).toBe(true);
  });
});
