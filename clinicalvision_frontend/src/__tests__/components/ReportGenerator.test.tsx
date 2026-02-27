/**
 * ReportGenerator Component Test Suite
 * 
 * Tests report generation functionality:
 * - PDF generation
 * - JSON export
 * - Report structure validation
 * - Workflow completion
 */

import '@testing-library/jest-dom';

// ============================================================================
// Types
// ============================================================================

interface ReportData {
  patientInfo: {
    id: string;
    name: string;
    dateOfBirth: string;
    mrn?: string;
  };
  studyInfo: {
    studyDate: string;
    modality: string;
    accessionNumber?: string;
    referringPhysician?: string;
  };
  analysisResults: {
    prediction: 'benign' | 'malignant';
    confidence: number;
    riskLevel: 'low' | 'moderate' | 'high';
    modelVersion: string;
    processingTimeMs: number;
  };
  findings: Array<{
    id: string;
    type: string;
    location: string;
    description: string;
    status: string;
  }>;
  assessment: {
    biradsCategory: number;
    biradsSubcategory?: string;
    impression: string;
    recommendation: string;
    breastDensity: string;
    laterality: string;
  };
  metadata: {
    generatedAt: string;
    generatedBy: string;
    version: string;
    institutionName?: string;
  };
}

interface ReportOptions {
  format: 'pdf' | 'json';
  includeImages: boolean;
  includeHeatmaps: boolean;
  includeFindings: boolean;
  includeDisclaimer: boolean;
  templateType: 'standard' | 'detailed' | 'compact';
}

// ============================================================================
// Report Generator Logic
// ============================================================================

class ReportGenerator {
  private defaultOptions: ReportOptions = {
    format: 'pdf',
    includeImages: true,
    includeHeatmaps: true,
    includeFindings: true,
    includeDisclaimer: true,
    templateType: 'standard',
  };

  validateReportData(data: Partial<ReportData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.patientInfo?.id) {
      errors.push('Patient ID is required');
    }

    if (!data.studyInfo?.studyDate) {
      errors.push('Study date is required');
    }

    if (!data.analysisResults?.prediction) {
      errors.push('Analysis results are required');
    }

    if (!data.assessment?.biradsCategory && data.assessment?.biradsCategory !== 0) {
      errors.push('BI-RADS assessment is required');
    }

    if (!data.assessment?.impression) {
      errors.push('Clinical impression is required');
    }

    return { valid: errors.length === 0, errors };
  }

  generateFilename(data: ReportData, format: 'pdf' | 'json'): string {
    const date = new Date().toISOString().split('T')[0];
    const patientId = data.patientInfo.id.replace(/[^a-zA-Z0-9]/g, '_');
    return `mammogram_report_${patientId}_${date}.${format}`;
  }

  calculateReportSize(data: ReportData, options: ReportOptions): number {
    let baseSize = 50 * 1024; // 50KB base

    if (options.includeImages) {
      baseSize += 500 * 1024; // 500KB for images
    }

    if (options.includeHeatmaps) {
      baseSize += 200 * 1024; // 200KB for heatmaps
    }

    if (options.includeFindings) {
      baseSize += data.findings.length * 5 * 1024; // 5KB per finding
    }

    return baseSize;
  }

  prepareJsonExport(data: ReportData): string {
    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      formatVersion: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  getDisclaimer(): string {
    return 'This report is computer-generated and should be reviewed by a qualified healthcare professional. ' +
      'AI-assisted analysis is intended to support, not replace, clinical judgment. ' +
      'Results should be interpreted in conjunction with clinical findings and patient history.';
  }

  formatPdfSections(data: ReportData, options: ReportOptions): string[] {
    const sections: string[] = [];

    sections.push('HEADER');
    sections.push('PATIENT_INFO');
    sections.push('STUDY_INFO');

    if (options.includeImages) {
      sections.push('MAMMOGRAM_IMAGES');
    }

    if (options.includeHeatmaps) {
      sections.push('AI_HEATMAPS');
    }

    sections.push('AI_ANALYSIS');

    if (options.includeFindings && data.findings.length > 0) {
      sections.push('FINDINGS');
    }

    sections.push('ASSESSMENT');
    sections.push('RECOMMENDATION');

    if (options.includeDisclaimer) {
      sections.push('DISCLAIMER');
    }

    sections.push('FOOTER');

    return sections;
  }

  getWorkflowCompletionStatus(data: Partial<ReportData>): {
    complete: boolean;
    completedSteps: string[];
    pendingSteps: string[];
  } {
    const requiredSteps = [
      { name: 'Patient Information', check: () => !!data.patientInfo?.id },
      { name: 'Study Information', check: () => !!data.studyInfo?.studyDate },
      { name: 'Image Analysis', check: () => !!data.analysisResults?.prediction },
      { name: 'Findings Documentation', check: () => true }, // Optional
      { name: 'Assessment', check: () => !!data.assessment?.biradsCategory || data.assessment?.biradsCategory === 0 },
      { name: 'Impression', check: () => !!data.assessment?.impression },
    ];

    const completed = requiredSteps.filter(s => s.check()).map(s => s.name);
    const pending = requiredSteps.filter(s => !s.check()).map(s => s.name);

    return {
      complete: pending.length === 0,
      completedSteps: completed,
      pendingSteps: pending,
    };
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('ReportGenerator Validation', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('requires patient ID', () => {
    const result = generator.validateReportData({
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.9,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        biradsCategory: 1,
        impression: 'Normal mammogram',
        recommendation: 'Routine screening',
        breastDensity: 'B',
        laterality: 'bilateral',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Patient ID is required');
  });

  test('requires study date', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.9,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        biradsCategory: 1,
        impression: 'Normal mammogram',
        recommendation: 'Routine',
        breastDensity: 'B',
        laterality: 'bilateral',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Study date is required');
  });

  test('requires analysis results', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      assessment: {
        biradsCategory: 1,
        impression: 'Normal mammogram',
        recommendation: 'Routine',
        breastDensity: 'B',
        laterality: 'bilateral',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Analysis results are required');
  });

  test('requires BI-RADS assessment', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.9,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        impression: 'Normal mammogram',
        recommendation: 'Routine',
        breastDensity: 'B',
        laterality: 'bilateral',
      } as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BI-RADS assessment is required');
  });

  test('accepts BI-RADS category 0', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.5,
        riskLevel: 'moderate',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        biradsCategory: 0,
        impression: 'Incomplete - additional imaging needed',
        recommendation: 'Recall for additional views',
        breastDensity: 'C',
        laterality: 'left',
      },
    });

    expect(result.valid).toBe(true);
  });

  test('requires clinical impression', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.9,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        biradsCategory: 1,
        recommendation: 'Routine',
        breastDensity: 'B',
        laterality: 'bilateral',
      } as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Clinical impression is required');
  });

  test('passes validation with complete data', () => {
    const result = generator.validateReportData({
      patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.92,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1234,
      },
      assessment: {
        biradsCategory: 1,
        impression: 'Normal bilateral mammogram',
        recommendation: 'Routine annual screening',
        breastDensity: 'B',
        laterality: 'bilateral',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('ReportGenerator File Naming', () => {
  let generator: ReportGenerator;
  const mockData: ReportData = {
    patientInfo: { id: 'P-001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
    studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
    analysisResults: {
      prediction: 'benign',
      confidence: 0.9,
      riskLevel: 'low',
      modelVersion: 'v12',
      processingTimeMs: 1000,
    },
    findings: [],
    assessment: {
      biradsCategory: 1,
      impression: 'Normal',
      recommendation: 'Routine',
      breastDensity: 'B',
      laterality: 'bilateral',
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'ClinicalVision',
      version: '1.0',
    },
  };

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('generates PDF filename with patient ID and date', () => {
    const filename = generator.generateFilename(mockData, 'pdf');
    
    expect(filename).toContain('mammogram_report');
    expect(filename).toContain('P_001'); // Sanitized patient ID
    expect(filename.endsWith('.pdf')).toBe(true);
  });

  test('generates JSON filename', () => {
    const filename = generator.generateFilename(mockData, 'json');
    
    expect(filename.endsWith('.json')).toBe(true);
  });

  test('sanitizes special characters in patient ID', () => {
    const dataWithSpecialChars: ReportData = {
      ...mockData,
      patientInfo: { ...mockData.patientInfo, id: 'P/001\\TEST' },
    };
    
    const filename = generator.generateFilename(dataWithSpecialChars, 'pdf');
    
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('\\');
  });
});

describe('ReportGenerator Size Calculation', () => {
  let generator: ReportGenerator;
  const mockData: ReportData = {
    patientInfo: { id: 'P001', name: 'Test', dateOfBirth: '1970-01-01' },
    studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
    analysisResults: {
      prediction: 'benign',
      confidence: 0.9,
      riskLevel: 'low',
      modelVersion: 'v12',
      processingTimeMs: 1000,
    },
    findings: [
      { id: '1', type: 'mass', location: 'UOQ', description: 'Test', status: 'confirmed' },
      { id: '2', type: 'calcification', location: 'LIQ', description: 'Test', status: 'suspected' },
    ],
    assessment: {
      biradsCategory: 1,
      impression: 'Normal',
      recommendation: 'Routine',
      breastDensity: 'B',
      laterality: 'bilateral',
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'ClinicalVision',
      version: '1.0',
    },
  };

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('base size is 50KB', () => {
    const size = generator.calculateReportSize(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: true,
      templateType: 'standard',
    });
    
    expect(size).toBe(50 * 1024);
  });

  test('adds 500KB for images', () => {
    const sizeWithImages = generator.calculateReportSize(mockData, {
      format: 'pdf',
      includeImages: true,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: true,
      templateType: 'standard',
    });

    const sizeWithoutImages = generator.calculateReportSize(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: true,
      templateType: 'standard',
    });
    
    expect(sizeWithImages - sizeWithoutImages).toBe(500 * 1024);
  });

  test('adds 5KB per finding', () => {
    const size = generator.calculateReportSize(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: true,
      includeDisclaimer: true,
      templateType: 'standard',
    });
    
    // Base (50KB) + 2 findings * 5KB = 60KB
    expect(size).toBe(60 * 1024);
  });
});

describe('ReportGenerator JSON Export', () => {
  let generator: ReportGenerator;
  const mockData: ReportData = {
    patientInfo: { id: 'P001', name: 'Test Patient', dateOfBirth: '1970-01-01' },
    studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
    analysisResults: {
      prediction: 'benign',
      confidence: 0.92,
      riskLevel: 'low',
      modelVersion: 'v12',
      processingTimeMs: 1234,
    },
    findings: [],
    assessment: {
      biradsCategory: 1,
      impression: 'Normal mammogram',
      recommendation: 'Routine screening',
      breastDensity: 'B',
      laterality: 'bilateral',
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'ClinicalVision',
      version: '1.0',
    },
  };

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('produces valid JSON', () => {
    const json = generator.prepareJsonExport(mockData);
    
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('includes exportedAt timestamp', () => {
    const json = generator.prepareJsonExport(mockData);
    const parsed = JSON.parse(json);
    
    expect(parsed.exportedAt).toBeDefined();
  });

  test('includes format version', () => {
    const json = generator.prepareJsonExport(mockData);
    const parsed = JSON.parse(json);
    
    expect(parsed.formatVersion).toBe('1.0');
  });

  test('preserves all report data', () => {
    const json = generator.prepareJsonExport(mockData);
    const parsed = JSON.parse(json);
    
    expect(parsed.patientInfo.id).toBe('P001');
    expect(parsed.analysisResults.confidence).toBe(0.92);
    expect(parsed.assessment.biradsCategory).toBe(1);
  });
});

describe('ReportGenerator PDF Sections', () => {
  let generator: ReportGenerator;
  const mockData: ReportData = {
    patientInfo: { id: 'P001', name: 'Test', dateOfBirth: '1970-01-01' },
    studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
    analysisResults: {
      prediction: 'benign',
      confidence: 0.9,
      riskLevel: 'low',
      modelVersion: 'v12',
      processingTimeMs: 1000,
    },
    findings: [{ id: '1', type: 'mass', location: 'UOQ', description: 'Test', status: 'confirmed' }],
    assessment: {
      biradsCategory: 1,
      impression: 'Normal',
      recommendation: 'Routine',
      breastDensity: 'B',
      laterality: 'bilateral',
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'ClinicalVision',
      version: '1.0',
    },
  };

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('always includes header and footer', () => {
    const sections = generator.formatPdfSections(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: false,
      templateType: 'standard',
    });
    
    expect(sections[0]).toBe('HEADER');
    expect(sections[sections.length - 1]).toBe('FOOTER');
  });

  test('includes images section when enabled', () => {
    const sections = generator.formatPdfSections(mockData, {
      format: 'pdf',
      includeImages: true,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: false,
      templateType: 'standard',
    });
    
    expect(sections).toContain('MAMMOGRAM_IMAGES');
  });

  test('excludes images section when disabled', () => {
    const sections = generator.formatPdfSections(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: false,
      templateType: 'standard',
    });
    
    expect(sections).not.toContain('MAMMOGRAM_IMAGES');
  });

  test('includes findings section only when enabled and findings exist', () => {
    const sectionsWithFindings = generator.formatPdfSections(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: true,
      includeDisclaimer: false,
      templateType: 'standard',
    });
    
    expect(sectionsWithFindings).toContain('FINDINGS');

    const dataWithoutFindings = { ...mockData, findings: [] };
    const sectionsNoFindings = generator.formatPdfSections(dataWithoutFindings, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: true,
      includeDisclaimer: false,
      templateType: 'standard',
    });
    
    expect(sectionsNoFindings).not.toContain('FINDINGS');
  });

  test('includes disclaimer when enabled', () => {
    const sections = generator.formatPdfSections(mockData, {
      format: 'pdf',
      includeImages: false,
      includeHeatmaps: false,
      includeFindings: false,
      includeDisclaimer: true,
      templateType: 'standard',
    });
    
    expect(sections).toContain('DISCLAIMER');
  });
});

describe('ReportGenerator Workflow Status', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('identifies incomplete workflow', () => {
    const status = generator.getWorkflowCompletionStatus({
      patientInfo: { id: 'P001', name: 'Test', dateOfBirth: '1970-01-01' },
    });

    expect(status.complete).toBe(false);
    expect(status.pendingSteps).toContain('Study Information');
    expect(status.pendingSteps).toContain('Image Analysis');
  });

  test('identifies complete workflow', () => {
    const status = generator.getWorkflowCompletionStatus({
      patientInfo: { id: 'P001', name: 'Test', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
      analysisResults: {
        prediction: 'benign',
        confidence: 0.9,
        riskLevel: 'low',
        modelVersion: 'v12',
        processingTimeMs: 1000,
      },
      assessment: {
        biradsCategory: 1,
        impression: 'Normal mammogram findings',
        recommendation: 'Routine',
        breastDensity: 'B',
        laterality: 'bilateral',
      },
    });

    expect(status.complete).toBe(true);
    expect(status.pendingSteps).toHaveLength(0);
  });

  test('tracks completed steps correctly', () => {
    const status = generator.getWorkflowCompletionStatus({
      patientInfo: { id: 'P001', name: 'Test', dateOfBirth: '1970-01-01' },
      studyInfo: { studyDate: '2026-01-15', modality: 'MG' },
    });

    expect(status.completedSteps).toContain('Patient Information');
    expect(status.completedSteps).toContain('Study Information');
    expect(status.pendingSteps).toContain('Image Analysis');
  });
});

describe('ReportGenerator Disclaimer', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  test('disclaimer mentions AI assistance', () => {
    const disclaimer = generator.getDisclaimer();
    
    expect(disclaimer.toLowerCase()).toContain('ai');
  });

  test('disclaimer mentions healthcare professional review', () => {
    const disclaimer = generator.getDisclaimer();
    
    expect(disclaimer.toLowerCase()).toContain('healthcare professional');
  });

  test('disclaimer mentions clinical judgment', () => {
    const disclaimer = generator.getDisclaimer();
    
    expect(disclaimer.toLowerCase()).toContain('clinical judgment');
  });
});
