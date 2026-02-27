/**
 * Report Operations
 * 
 * Phase 6: Reporting System
 * 
 * Provides utilities for:
 * - BI-RADS assessment validation
 * - Report content generation
 * - Recommendation computation
 * - Report finalization and signing
 */

import {
  BiRadsAssessment,
  BreastAssessment,
  BreastComposition,
  BiRadsCategory,
  BiRadsValues,
  BIRADS_CATEGORY_DESCRIPTIONS,
  ClinicalCase,
  ClinicalWorkflowStep,
  GeneratedReport,
  Result,
  success,
  failure,
  ValidationResult,
  Laterality,
  FindingType,
} from '../types/case.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of report validation with specific requirements
 */
export interface ReportValidationResult extends ValidationResult {
  canGenerate?: boolean;
  missingRequirements?: string[];
}

/**
 * Options for report generation
 */
export interface ReportGenerationOptions {
  /** Include AI analysis details */
  includeAIResults?: boolean;
  /** Include attention heatmaps */
  includeHeatmaps?: boolean;
  /** Report template type */
  templateType?: 'standard' | 'detailed' | 'compact';
  /** Include disclaimer text */
  includeDisclaimer?: boolean;
}

// ============================================================================
// BI-RADS CATEGORY ORDERING
// ============================================================================

/**
 * Numeric ordering for BI-RADS categories (for comparison)
 * Higher number = higher risk
 */
const BIRADS_ORDER: Record<BiRadsCategory, number> = {
  '0': -1,  // Incomplete - special handling
  '1': 0,
  '2': 1,
  '3': 2,
  '4A': 3,
  '4B': 4,
  '4C': 5,
  '5': 6,
  '6': 7,
};

/**
 * Valid BI-RADS categories
 */
const VALID_BIRADS_CATEGORIES: BiRadsCategory[] = [
  '0', '1', '2', '3', '4A', '4B', '4C', '5', '6'
];

/**
 * Valid breast compositions
 */
const VALID_COMPOSITIONS: BreastComposition[] = [
  BreastComposition.A,
  BreastComposition.B,
  BreastComposition.C,
  BreastComposition.D,
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a complete BI-RADS assessment
 */
export function validateBiRadsAssessment(
  assessment: BiRadsAssessment | null | undefined
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Handle null/undefined
  if (!assessment) {
    result.isValid = false;
    result.errors.push({
      field: 'assessment',
      message: 'Assessment is required',
    });
    return result;
  }

  // Validate right breast
  if (!assessment.rightBreast) {
    result.isValid = false;
    result.errors.push({
      field: 'rightBreast',
      message: 'Right breast assessment is required',
    });
  } else {
    validateBreastAssessment(assessment.rightBreast, 'rightBreast', result);
  }

  // Validate left breast
  if (!assessment.leftBreast) {
    result.isValid = false;
    result.errors.push({
      field: 'leftBreast',
      message: 'Left breast assessment is required',
    });
  } else {
    validateBreastAssessment(assessment.leftBreast, 'leftBreast', result);
  }

  // Validate overall category
  if (!assessment.overallCategory || !VALID_BIRADS_CATEGORIES.includes(assessment.overallCategory)) {
    result.isValid = false;
    result.errors.push({
      field: 'overallCategory',
      message: 'Overall BI-RADS category is required',
    });
  }

  // Validate impression
  if (!assessment.impression || assessment.impression.trim() === '') {
    result.isValid = false;
    result.errors.push({
      field: 'impression',
      message: 'Clinical impression is required',
    });
  }

  // Validate recommendation
  if (!assessment.recommendation || assessment.recommendation.trim() === '') {
    result.isValid = false;
    result.errors.push({
      field: 'recommendation',
      message: 'Management recommendation is required',
    });
  }

  // Warning: Check if overall category is consistent
  if (assessment.rightBreast && assessment.leftBreast && assessment.overallCategory) {
    const expectedOverall = calculateOverallCategory(
      assessment.rightBreast.biRadsCategory,
      assessment.leftBreast.biRadsCategory
    );
    
    if (BIRADS_ORDER[assessment.overallCategory] < BIRADS_ORDER[expectedOverall]) {
      result.warnings.push(
        `Overall category (${assessment.overallCategory}) is lower than expected (${expectedOverall}) based on individual breast categories`
      );
    }
  }

  // Warning: BI-RADS 3 should have follow-up interval
  if (assessment.overallCategory === BiRadsValues.PROBABLY_BENIGN && !assessment.followUpInterval) {
    result.warnings.push(
      'BI-RADS 3 assessment should specify a follow-up interval (typically 6 months)'
    );
  }

  return result;
}

/**
 * Validate individual breast assessment
 */
function validateBreastAssessment(
  breast: BreastAssessment,
  prefix: string,
  result: ValidationResult
): void {
  if (!breast.composition || !VALID_COMPOSITIONS.includes(breast.composition)) {
    result.isValid = false;
    result.errors.push({
      field: `${prefix}.composition`,
      message: `${prefix === 'rightBreast' ? 'Right' : 'Left'} breast composition is required`,
    });
  }

  if (!breast.biRadsCategory || !VALID_BIRADS_CATEGORIES.includes(breast.biRadsCategory)) {
    result.isValid = false;
    result.errors.push({
      field: `${prefix}.biRadsCategory`,
      message: `${prefix === 'rightBreast' ? 'Right' : 'Left'} breast BI-RADS category is required`,
    });
  }
}

// ============================================================================
// DEFAULT ASSESSMENT CREATION
// ============================================================================

/**
 * Create a default empty assessment
 */
export function createDefaultAssessment(
  suggestedBiRads?: BiRadsCategory
): BiRadsAssessment {
  const category = suggestedBiRads || BiRadsValues.INCOMPLETE;
  
  return {
    rightBreast: {
      composition: BreastComposition.B,
      biRadsCategory: category,
    },
    leftBreast: {
      composition: BreastComposition.B,
      biRadsCategory: category,
    },
    overallCategory: category,
    impression: '',
    recommendation: '',
    comparedWithPrior: false,
  };
}

/**
 * Update one breast's assessment
 */
export function updateBreastAssessment(
  assessment: BiRadsAssessment,
  side: 'right' | 'left',
  updates: Partial<BreastAssessment>
): BiRadsAssessment {
  const updatedBreast = {
    ...(side === 'right' ? assessment.rightBreast : assessment.leftBreast),
    ...updates,
  };

  const newAssessment: BiRadsAssessment = {
    ...assessment,
    [side === 'right' ? 'rightBreast' : 'leftBreast']: updatedBreast,
  };

  // Auto-update overall category
  const newOverall = calculateOverallCategory(
    newAssessment.rightBreast.biRadsCategory,
    newAssessment.leftBreast.biRadsCategory
  );
  newAssessment.overallCategory = newOverall;

  return newAssessment;
}

// ============================================================================
// OVERALL CATEGORY CALCULATION
// ============================================================================

/**
 * Calculate the overall BI-RADS category from both breasts
 * Returns the higher-risk category, or BI-RADS 0 if either is incomplete
 */
export function calculateOverallCategory(
  rightCategory: BiRadsCategory,
  leftCategory: BiRadsCategory
): BiRadsCategory {
  // If either is incomplete, overall is incomplete
  if (rightCategory === BiRadsValues.INCOMPLETE || leftCategory === BiRadsValues.INCOMPLETE) {
    return BiRadsValues.INCOMPLETE;
  }

  const rightOrder = BIRADS_ORDER[rightCategory];
  const leftOrder = BIRADS_ORDER[leftCategory];

  // Return the higher-risk category
  return rightOrder >= leftOrder ? rightCategory : leftCategory;
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate management recommendation based on BI-RADS category
 */
export function generateRecommendation(category: BiRadsCategory): string {
  const recommendations: Record<BiRadsCategory, string> = {
    '0': 'Additional imaging evaluation is needed. Please schedule follow-up imaging (spot compression, magnification views, or ultrasound) as clinically appropriate.',
    '1': 'No mammographic evidence of malignancy. Continue routine annual screening mammography.',
    '2': 'Benign finding(s). Continue routine annual screening mammography.',
    '3': 'Probably benign finding(s). Short-term follow-up (6 months) is recommended to establish stability. If stable at 6 months, continue follow-up at 12 and 24 months.',
    '4A': 'Low suspicion for malignancy. Biopsy should be considered. Please discuss tissue diagnosis options with the patient.',
    '4B': 'Moderate suspicion for malignancy. Biopsy is recommended for tissue diagnosis.',
    '4C': 'High suspicion for malignancy. Biopsy is strongly recommended for tissue diagnosis.',
    '5': 'Highly suggestive of malignancy. Tissue diagnosis and appropriate oncologic action are required.',
    '6': 'Known biopsy-proven malignancy. Continue treatment as clinically appropriate with oncology.',
  };

  return recommendations[category] || recommendations['0'];
}

/**
 * Get follow-up interval for a BI-RADS category
 */
export function getFollowUpInterval(category: BiRadsCategory): string | null {
  switch (category) {
    case BiRadsValues.NEGATIVE:
    case BiRadsValues.BENIGN:
      return '12 months';
    case BiRadsValues.PROBABLY_BENIGN:
      return '6 months';
    default:
      // 0, 4A-C, 5, 6 don't have standard follow-up intervals
      return null;
  }
}

// ============================================================================
// RISK UTILITIES
// ============================================================================

/**
 * Get malignancy risk percentage for a BI-RADS category
 * Returns the upper bound of the range
 */
export function getBiRadsRiskPercentage(category: BiRadsCategory): number {
  const riskRanges: Record<BiRadsCategory, number> = {
    '0': 0,     // N/A
    '1': 0,
    '2': 0,
    '3': 2,
    '4A': 10,
    '4B': 50,
    '4C': 95,
    '5': 98,    // >95%
    '6': 100,
  };

  return riskRanges[category] ?? 0;
}

/**
 * Check if a BI-RADS category requires biopsy
 */
export function requiresBiopsy(category: BiRadsCategory): boolean {
  return ['4A', '4B', '4C', '5'].includes(category);
}

// ============================================================================
// IMPRESSION GENERATION
// ============================================================================

/**
 * Generate clinical impression text from assessment
 */
export function generateImpression(assessment: BiRadsAssessment): string {
  const parts: string[] = [];

  // Check if both breasts have same category
  const sameCategory = 
    assessment.rightBreast.biRadsCategory === assessment.leftBreast.biRadsCategory;

  // Breast density
  const rightDense = assessment.rightBreast.composition === BreastComposition.C ||
                     assessment.rightBreast.composition === BreastComposition.D;
  const leftDense = assessment.leftBreast.composition === BreastComposition.C ||
                    assessment.leftBreast.composition === BreastComposition.D;

  if (rightDense && leftDense) {
    parts.push('Bilateral dense breast tissue which may lower sensitivity of mammography.');
  } else if (rightDense || leftDense) {
    const side = rightDense ? 'Right' : 'Left';
    parts.push(`${side} breast demonstrates dense tissue which may lower sensitivity of mammography.`);
  }

  // Comparison
  if (assessment.comparedWithPrior && assessment.priorStudyDate) {
    parts.push(`Compared to prior mammogram dated ${assessment.priorStudyDate}.`);
  } else if (assessment.comparedWithPrior) {
    parts.push('Compared to prior mammogram.');
  }

  // Change from prior
  if (assessment.changeFromPrior) {
    const changeText: Record<string, string> = {
      stable: 'Findings are stable compared to prior examination.',
      improved: 'Findings have improved compared to prior examination.',
      worse: 'Findings have worsened compared to prior examination.',
      new: 'New findings identified since prior examination.',
    };
    parts.push(changeText[assessment.changeFromPrior] || '');
  }

  // Per-breast findings
  if (assessment.rightBreast.findings) {
    parts.push(`Right breast: ${assessment.rightBreast.findings}`);
  }
  if (assessment.leftBreast.findings) {
    parts.push(`Left breast: ${assessment.leftBreast.findings}`);
  }

  // Overall assessment
  if (sameCategory) {
    parts.push(
      `Bilateral mammogram assessment: BI-RADS ${assessment.overallCategory} - ${BIRADS_CATEGORY_DESCRIPTIONS[assessment.overallCategory]}.`
    );
  } else {
    parts.push(
      `Right breast: BI-RADS ${assessment.rightBreast.biRadsCategory} - ${BIRADS_CATEGORY_DESCRIPTIONS[assessment.rightBreast.biRadsCategory]}.`
    );
    parts.push(
      `Left breast: BI-RADS ${assessment.leftBreast.biRadsCategory} - ${BIRADS_CATEGORY_DESCRIPTIONS[assessment.leftBreast.biRadsCategory]}.`
    );
  }

  return parts.filter(p => p).join(' ');
}

// ============================================================================
// REPORT CONTENT GENERATION
// ============================================================================

/**
 * Format a report section with label
 */
export function formatReportSection(label: string, content: string): string {
  if (!content || content.trim() === '') {
    return '';
  }
  return `${label}:\n${content}\n`;
}

/**
 * Sanitize text for report (remove potentially harmful content)
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  // Remove script tags and other potentially harmful HTML
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Format patient name safely
 */
function formatPatientName(firstName: string, lastName: string): string {
  return `${sanitizeText(lastName)}, ${sanitizeText(firstName)}`;
}

/**
 * Generate report header content
 */
function generateHeaderContent(clinicalCase: ClinicalCase): string {
  const { patient, caseNumber } = clinicalCase;
  const patientName = formatPatientName(patient.firstName, patient.lastName);
  const dob = patient.dateOfBirth || 'Not provided';
  
  const lines = [
    'MAMMOGRAPHY REPORT',
    '',
    `Patient: ${patientName}`,
    `MRN: ${patient.mrn}`,
    `Date of Birth: ${dob}`,
    `Case Number: ${caseNumber}`,
    `Report Date: ${new Date().toISOString().split('T')[0]}`,
  ];
  
  return lines.join('\n');
}

/**
 * Generate clinical history content
 */
function generateClinicalHistoryContent(clinicalCase: ClinicalCase): string {
  const { clinicalHistory } = clinicalCase;
  const parts: string[] = [];

  // Indication
  parts.push(`Clinical Indication: ${clinicalHistory.clinicalIndication || 'Screening mammogram'}`);

  // Risk factors
  const riskFactors: string[] = [];
  if (clinicalHistory.familyHistoryBreastCancer) {
    riskFactors.push('Family history of breast cancer');
  }
  if (clinicalHistory.personalHistoryBreastCancer) {
    riskFactors.push('Personal history of breast cancer');
  }
  if (clinicalHistory.brca1Positive) {
    riskFactors.push('BRCA1 positive');
  }
  if (clinicalHistory.brca2Positive) {
    riskFactors.push('BRCA2 positive');
  }
  if (clinicalHistory.previousBiopsy) {
    riskFactors.push('Previous breast biopsy');
    if (clinicalHistory.biopsyResults) {
      riskFactors.push(`Biopsy results: ${clinicalHistory.biopsyResults}`);
    }
  }

  if (riskFactors.length > 0) {
    parts.push(`Risk Factors: ${riskFactors.join(', ')}`);
  } else {
    parts.push('Risk Factors: No significant risk factors identified');
  }

  // Symptoms
  if (clinicalHistory.symptoms && clinicalHistory.symptoms.length > 0) {
    parts.push(`Presenting Symptoms: ${clinicalHistory.symptoms.join(', ')}`);
  }

  // Additional notes
  if (clinicalHistory.additionalNotes) {
    parts.push(`Additional Notes: ${clinicalHistory.additionalNotes}`);
  }

  return parts.join('\n');
}

/**
 * Generate technique section content
 */
function generateTechniqueContent(clinicalCase: ClinicalCase): string {
  const imageCount = clinicalCase.images.length;
  const views = clinicalCase.images.map(img => 
    `${img.laterality === Laterality.RIGHT ? 'R' : 'L'}${img.viewType}`
  ).join(', ');

  return `Digital mammography examination. ${imageCount} views obtained${views ? `: ${views}` : ''}.`;
}

/**
 * Generate comparison section content
 */
function generateComparisonContent(clinicalCase: ClinicalCase): string {
  const { clinicalHistory } = clinicalCase;

  if (clinicalHistory.comparisonAvailable && clinicalHistory.priorMammogramDate) {
    return `Compared to prior mammogram dated ${clinicalHistory.priorMammogramDate}.`;
  } else if (clinicalHistory.comparisonAvailable) {
    return 'Compared to prior mammogram.';
  } else {
    return 'No prior mammogram available for comparison.';
  }
}

/**
 * Format finding type for report
 */
function formatFindingType(findingType: FindingType): string {
  const typeLabels: Record<FindingType, string> = {
    [FindingType.MASS]: 'Mass',
    [FindingType.CALCIFICATION]: 'Calcification',
    [FindingType.ARCHITECTURAL_DISTORTION]: 'Architectural distortion',
    [FindingType.ASYMMETRY]: 'Asymmetry',
    [FindingType.FOCAL_ASYMMETRY]: 'Focal asymmetry',
    [FindingType.GLOBAL_ASYMMETRY]: 'Global asymmetry',
    [FindingType.INTRAMAMMARY_LYMPH_NODE]: 'Intramammary lymph node',
    [FindingType.SKIN_LESION]: 'Skin lesion',
    [FindingType.SOLITARY_DILATED_DUCT]: 'Solitary dilated duct',
  };
  return typeLabels[findingType] || findingType;
}

/**
 * Format finding size with all available dimensions
 */
function formatFindingSize(size: { length: number; width?: number; depth?: number }): string {
  const parts = [`${size.length}`];
  if (size.width != null) parts.push(`${size.width}`);
  if (size.depth != null) parts.push(`${size.depth}`);
  return `${parts.join(' × ')}mm`;
}

/**
 * Generate findings section content
 */
function generateFindingsContent(clinicalCase: ClinicalCase): string {
  const { consolidatedFindings } = clinicalCase;

  if (!consolidatedFindings || consolidatedFindings.length === 0) {
    return 'No significant mammographic findings identified. No suspicious masses, calcifications, or architectural distortions.';
  }

  // Group findings by laterality
  const rightFindings = consolidatedFindings.filter(f => f.laterality === Laterality.RIGHT);
  const leftFindings = consolidatedFindings.filter(f => f.laterality === Laterality.LEFT);

  const parts: string[] = [];

  // Right breast findings
  if (rightFindings.length > 0) {
    parts.push('RIGHT BREAST:');
    rightFindings.forEach((finding, idx) => {
      const location = finding.clockPosition 
        ? `at ${finding.clockPosition} o'clock position`
        : '';
      const depth = finding.depth ? `, ${finding.depth.toLowerCase()} depth` : '';
      const size = finding.size 
        ? `, measuring ${formatFindingSize(finding.size)}` 
        : '';
      
      parts.push(
        `${idx + 1}. ${formatFindingType(finding.findingType)} ${location}${depth}${size}`
      );
      
      if (finding.shape) parts.push(`   Shape: ${finding.shape}`);
      if (finding.margin) parts.push(`   Margin: ${finding.margin}`);
      if (finding.density) parts.push(`   Density: ${finding.density}`);
      if (finding.radiologistNotes) parts.push(`   Notes: ${finding.radiologistNotes}`);
    });
  } else {
    parts.push('RIGHT BREAST: No significant findings.');
  }

  parts.push('');

  // Left breast findings
  if (leftFindings.length > 0) {
    parts.push('LEFT BREAST:');
    leftFindings.forEach((finding, idx) => {
      const location = finding.clockPosition 
        ? `at ${finding.clockPosition} o'clock position`
        : '';
      const depth = finding.depth ? `, ${finding.depth.toLowerCase()} depth` : '';
      const size = finding.size 
        ? `, measuring ${formatFindingSize(finding.size)}` 
        : '';
      
      parts.push(
        `${idx + 1}. ${formatFindingType(finding.findingType)} ${location}${depth}${size}`
      );
      
      if (finding.shape) parts.push(`   Shape: ${finding.shape}`);
      if (finding.margin) parts.push(`   Margin: ${finding.margin}`);
      if (finding.density) parts.push(`   Density: ${finding.density}`);
      if (finding.radiologistNotes) parts.push(`   Notes: ${finding.radiologistNotes}`);
    });
  } else {
    parts.push('LEFT BREAST: No significant findings.');
  }

  return parts.join('\n');
}

/**
 * Generate complete report content from clinical case
 */
export function generateReportContent(clinicalCase: ClinicalCase): GeneratedReport['content'] {
  return {
    header: generateHeaderContent(clinicalCase),
    clinicalHistory: generateClinicalHistoryContent(clinicalCase),
    technique: generateTechniqueContent(clinicalCase),
    comparison: generateComparisonContent(clinicalCase),
    findings: generateFindingsContent(clinicalCase),
    impression: clinicalCase.assessment?.impression || 
      'Assessment pending - BI-RADS assessment not completed.',
    recommendation: clinicalCase.assessment?.recommendation || 
      'Recommendation pending - BI-RADS assessment not completed.',
  };
}

// ============================================================================
// REPORT VALIDATION
// ============================================================================

/**
 * Check if a case can generate a report
 */
export function canGenerateReport(
  clinicalCase: ClinicalCase
): { canGenerate: boolean; missingRequirements: string[] } {
  const missingRequirements: string[] = [];

  // Check patient info
  if (!clinicalCase.patient || 
      !clinicalCase.patient.mrn || 
      !clinicalCase.patient.firstName ||
      !clinicalCase.patient.lastName) {
    missingRequirements.push('patient');
  }

  // Check images
  if (!clinicalCase.images || clinicalCase.images.length === 0) {
    missingRequirements.push('images');
  }

  // Check assessment
  if (!clinicalCase.assessment) {
    missingRequirements.push('assessment');
  }

  // Check workflow step
  const requiredSteps = [
    ClinicalWorkflowStep.PATIENT_REGISTRATION,
    ClinicalWorkflowStep.IMAGE_UPLOAD,
    ClinicalWorkflowStep.BIRADS_ASSESSMENT,
  ];

  const completedSteps = clinicalCase.workflow.completedSteps;
  for (const step of requiredSteps) {
    if (!completedSteps.includes(step)) {
      missingRequirements.push(`workflow_step_${step}`);
    }
  }

  return {
    canGenerate: missingRequirements.length === 0,
    missingRequirements,
  };
}

/**
 * Validate a report for finalization
 */
export function validateReportForFinalization(
  report: GeneratedReport
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check status - cannot finalize already signed report
  if (report.status === 'signed' || report.status === 'amended') {
    result.isValid = false;
    result.errors.push({
      field: 'status',
      message: 'Report has already been finalized and signed',
    });
  }

  // Check required content sections
  if (!report.content.impression || report.content.impression.trim() === '') {
    result.isValid = false;
    result.errors.push({
      field: 'content.impression',
      message: 'Report must include an impression',
    });
  }

  if (!report.content.recommendation || report.content.recommendation.trim() === '') {
    result.isValid = false;
    result.errors.push({
      field: 'content.recommendation',
      message: 'Report must include a recommendation',
    });
  }

  return result;
}

// ============================================================================
// REPORT CREATION
// ============================================================================

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a generated report from a clinical case
 */
export function createGeneratedReport(
  clinicalCase: ClinicalCase,
  options?: ReportGenerationOptions
): Result<GeneratedReport> {
  // Validate prerequisites
  const canGenerate = canGenerateReport(clinicalCase);
  if (!canGenerate.canGenerate) {
    return failure(new Error(`Cannot generate report: missing ${canGenerate.missingRequirements.join(', ')}`));
  }

  // Validate assessment
  if (!clinicalCase.assessment) {
    return failure(new Error('Cannot generate report: BI-RADS assessment is required'));
  }

  const assessmentValidation = validateBiRadsAssessment(clinicalCase.assessment);
  if (!assessmentValidation.isValid) {
    return failure(new Error(
      `Invalid assessment: ${assessmentValidation.errors.map(e => e.message).join(', ')}`
    ));
  }

  // Generate content
  const content = generateReportContent(clinicalCase);
  const now = new Date().toISOString();

  const report: GeneratedReport = {
    id: generateReportId(),
    content,
    status: 'draft',
    generatedAt: now,
    modifiedAt: now,
  };

  // Apply options
  if (options?.includeDisclaimer !== false) {
    report.content.recommendation += '\n\nThis report was generated with AI assistance. Final diagnostic decisions remain the responsibility of the interpreting physician.';
  }

  return success(report, assessmentValidation.warnings);
}

// ============================================================================
// REPORT FINALIZATION
// ============================================================================

/**
 * Finalize a draft report (mark as pending review)
 */
export function finalizeReport(report: GeneratedReport): Result<GeneratedReport> {
  // Validate
  const validation = validateReportForFinalization(report);
  if (!validation.isValid) {
    return failure(new Error(
      `Cannot finalize report: ${validation.errors.map(e => e.message).join(', ')}`
    ));
  }

  // Update status
  const finalizedReport: GeneratedReport = {
    ...report,
    status: 'pending_review',
    modifiedAt: new Date().toISOString(),
  };

  return success(finalizedReport);
}

/**
 * Sign a reviewed report
 */
export function signReport(
  report: GeneratedReport,
  userId: string,
  _credentials: string
): Result<GeneratedReport> {
  // Validate user
  if (!userId || userId.trim() === '') {
    return failure(new Error('User ID is required to sign report'));
  }

  // Check status - must be reviewed or pending_review
  if (report.status !== 'reviewed' && report.status !== 'pending_review') {
    return failure(new Error(`Cannot sign report with status: ${report.status}. Report must be reviewed first.`));
  }

  // In a real system, we would verify credentials here
  // For now, we just check they're provided
  // Note: _credentials is prefixed with _ to indicate it's intentionally unused in this implementation

  const signedReport: GeneratedReport = {
    ...report,
    status: 'signed',
    modifiedAt: new Date().toISOString(),
  };

  return success(signedReport);
}
