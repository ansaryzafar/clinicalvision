/**
 * Test Utilities
 * 
 * Comprehensive testing utilities for ClinicalVision:
 * - Custom render functions with providers
 * - Theme testing helpers
 * - Mock data generators
 * - Performance testing utilities
 * - Accessibility helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { clinicalTheme } from '../theme/medicalTheme';
import '@testing-library/jest-dom';

// ============================================================================
// PROVIDERS
// ============================================================================

interface AllProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrap component with all necessary providers for testing
 */
export const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider theme={clinicalTheme}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </ThemeProvider>
  );
};

/**
 * Custom render function that includes providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllProviders, ...options });
};

/**
 * Render with only theme provider
 */
export const renderWithTheme = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={clinicalTheme}>{children}</ThemeProvider>
  );
  
  return render(ui, { wrapper: ThemeWrapper, ...options });
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate mock medical image data
 */
export const mockMedicalImage = (overrides?: Partial<any>) => ({
  id: 'img_' + Math.random().toString(36).substr(2, 9),
  filename: 'mammogram_001.dcm',
  fileSize: 2048576,
  mimeType: 'application/dicom',
  uploadedAt: new Date().toISOString(),
  patientId: 'PAT_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  studyDate: new Date().toISOString().split('T')[0],
  modality: 'MG',
  viewPosition: 'CC',
  laterality: 'L',
  ...overrides,
});

/**
 * Generate mock analysis result
 */
export const mockAnalysisResult = (overrides?: Partial<any>) => ({
  id: 'analysis_' + Math.random().toString(36).substr(2, 9),
  imageId: 'img_' + Math.random().toString(36).substr(2, 9),
  prediction: Math.random() > 0.5 ? 'malignant' : 'benign',
  confidence: parseFloat((Math.random() * 0.4 + 0.6).toFixed(4)),
  processingTime: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
  modelVersion: 'v2.1.0',
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Generate mock patient data
 */
export const mockPatient = (overrides?: Partial<any>) => ({
  id: 'PAT_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  mrn: 'MRN' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
  name: 'Test Patient',
  dateOfBirth: '1975-05-15',
  gender: 'F',
  ...overrides,
});

/**
 * Generate mock clinical report
 */
export const mockClinicalReport = (overrides?: Partial<any>) => ({
  id: 'report_' + Math.random().toString(36).substr(2, 9),
  patientId: 'PAT_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  studyDate: new Date().toISOString().split('T')[0],
  findings: 'No significant abnormalities detected.',
  impression: 'BI-RADS 2 - Benign',
  radiologist: 'Dr. Test Radiologist',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// PERFORMANCE TESTING
// ============================================================================

/**
 * Measure component render time
 */
export const measureRenderTime = (renderFn: () => void): number => {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  return endTime - startTime;
};

/**
 * Performance test wrapper
 */
export const expectPerformance = (
  renderFn: () => void,
  maxTime: number = 100
): void => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Check if element has proper ARIA attributes
 */
export const expectAccessible = (element: HTMLElement): void => {
  // Check for basic accessibility
  expect(element).toBeInTheDocument();
  
  // If it's interactive, it should be keyboard accessible
  if (['BUTTON', 'A', 'INPUT'].includes(element.tagName)) {
    expect(element).not.toHaveAttribute('tabindex', '-1');
  }
};

/**
 * Check color contrast ratios
 */
export const checkContrastRatio = (
  foreground: string,
  background: string
): number => {
  // Simplified contrast calculation
  // In production, use a proper WCAG contrast checker
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = ((rgb >> 0) & 0xff) / 255;
    
    const linearize = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Expect WCAG AA compliance (4.5:1 for normal text)
 */
export const expectWCAGCompliant = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): void => {
  const ratio = checkContrastRatio(foreground, background);
  const minRatio = level === 'AAA' ? 7 : 4.5;
  
  expect(ratio).toBeGreaterThanOrEqual(minRatio);
};

// ============================================================================
// THEME HELPERS
// ============================================================================

/**
 * Get theme color value
 */
export const getThemeColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = clinicalTheme;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || '';
};

/**
 * Test theme color contrast
 */
export const expectThemeContrast = (
  textPath: string,
  bgPath: string,
  level: 'AA' | 'AAA' = 'AA'
): void => {
  const textColor = getThemeColor(textPath);
  const bgColor = getThemeColor(bgPath);
  
  expectWCAGCompliant(textColor, bgColor, level);
};

// ============================================================================
// ASYNC HELPERS
// ============================================================================

/**
 * Wait for async operations with timeout
 */
export const waitForAsync = async (
  callback: () => boolean | Promise<boolean>,
  timeout: number = 5000
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await callback();
    if (result) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error(`waitForAsync timed out after ${timeout}ms`);
};

// ============================================================================
// ERROR TESTING
// ============================================================================

/**
 * Suppress console errors during test
 */
export const suppressConsoleErrors = (callback: () => void): void => {
  const originalError = console.error;
  console.error = jest.fn();
  
  try {
    callback();
  } finally {
    console.error = originalError;
  }
};

/**
 * Expect component to handle error gracefully
 */
export const expectErrorHandling = (
  renderFn: () => void,
  expectedError?: Error
): void => {
  suppressConsoleErrors(() => {
    expect(renderFn).not.toThrow();
  });
};

// ============================================================================
// INTERACTION HELPERS
// ============================================================================

/**
 * Simulate hover interaction
 */
export const hoverElement = async (element: HTMLElement): Promise<void> => {
  element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 100));
};

/**
 * Simulate click with timing
 */
export const clickWithDelay = async (
  element: HTMLElement,
  delay: number = 0
): Promise<void> => {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  element.click();
};

// ============================================================================
// RE-EXPORTS
// ============================================================================

export * from '@testing-library/react';
// @testing-library/jest-dom extends expect matchers via side-effect import
import '@testing-library/jest-dom';
export { clinicalTheme } from '../theme/medicalTheme';
