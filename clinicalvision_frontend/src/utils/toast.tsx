/**
 * Toast Notification System
 * 
 * Wrapper around react-hot-toast with:
 * - Medical theme integration
 * - Pre-configured variants (success, error, warning, info)
 * - Clinical context notifications
 * - Custom icons and styling
 * - Performance optimized
 */

import toast, { Renderable, Toaster as HotToaster, Toast } from 'react-hot-toast';
import { CheckCircle, Error, Warning, Info } from '@mui/icons-material';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'clinical';

export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: React.ReactNode;
}

export interface ClinicalToastOptions extends ToastOptions {
  finding?: 'benign' | 'malignant' | 'uncertain';
  confidence?: number;
}

// ============================================================================
// TOAST FUNCTIONS
// ============================================================================

/**
 * Show success toast
 */
export const showSuccess = (message: string, options?: ToastOptions): string => {
  return toast.success(message, {
    duration: options?.duration || 4000,
    position: options?.position || 'top-right',
    icon: (options?.icon || <CheckCircle style={{ color: '#4CAF50' }} />) as Renderable,
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: '1px solid rgba(76, 175, 80, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(76, 175, 80, 0.2)',
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  });
};

/**
 * Show error toast
 */
export const showError = (message: string, options?: ToastOptions): string => {
  return toast.error(message, {
    duration: options?.duration || 6000,
    position: options?.position || 'top-right',
    icon: (options?.icon || <Error style={{ color: '#EF5350' }} />) as Renderable,
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: '1px solid rgba(239, 83, 80, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(239, 83, 80, 0.2)',
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  });
};

/**
 * Show warning toast
 */
export const showWarning = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    duration: options?.duration || 5000,
    position: options?.position || 'top-right',
    icon: (options?.icon || <Warning style={{ color: '#FFA726' }} />) as Renderable,
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: '1px solid rgba(255, 167, 38, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(255, 167, 38, 0.2)',
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  });
};

/**
 * Show info toast
 */
export const showInfo = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    duration: options?.duration || 4000,
    position: options?.position || 'top-right',
    icon: (options?.icon || <Info style={{ color: '#29B6F6' }} />) as Renderable,
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: '1px solid rgba(41, 182, 246, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(41, 182, 246, 0.2)',
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  });
};

/**
 * Show clinical analysis result toast
 */
export const showClinical = (
  message: string,
  options: ClinicalToastOptions = {}
): string => {
  const { finding, confidence, ...toastOptions } = options;
  
  let borderColor = 'rgba(123, 45, 142, 0.3)';
  let shadowColor = 'rgba(123, 45, 142, 0.2)';
  
  if (finding === 'benign') {
    borderColor = 'rgba(76, 175, 80, 0.3)';
    shadowColor = 'rgba(76, 175, 80, 0.2)';
  } else if (finding === 'malignant') {
    borderColor = 'rgba(239, 83, 80, 0.3)';
    shadowColor = 'rgba(239, 83, 80, 0.2)';
  } else if (finding === 'uncertain') {
    borderColor = 'rgba(255, 167, 38, 0.3)';
    shadowColor = 'rgba(255, 167, 38, 0.2)';
  }
  
  return toast(message, {
    duration: toastOptions?.duration || 6000,
    position: toastOptions?.position || 'top-right',
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      boxShadow: `0 4px 20px ${shadowColor}`,
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
      minWidth: '300px',
    },
  });
};

/**
 * Show loading toast
 */
export const showLoading = (message: string, options?: ToastOptions): string => {
  return toast.loading(message, {
    position: options?.position || 'top-right',
    style: {
      background: '#0B0B0B',
      color: '#FFFFFF',
      border: '1px solid rgba(123, 45, 142, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(123, 45, 142, 0.2)',
      padding: '16px',
      fontSize: '0.875rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  });
};

/**
 * Dismiss toast
 */
export const dismissToast = (toastId?: string): void => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

/**
 * Promise-based toast (for async operations)
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: ToastOptions
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: options?.position || 'top-right',
      style: {
        background: '#0B0B0B',
        color: '#FFFFFF',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '0.875rem',
        fontFamily: '"Inter", system-ui, sans-serif',
      },
    }
  );
};

// ============================================================================
// MEDICAL-SPECIFIC TOASTS
// ============================================================================

/**
 * Show image upload success
 */
export const showImageUploadSuccess = (filename: string): string => {
  return showSuccess(`Image uploaded: ${filename}`, {
    duration: 3000,
  });
};

/**
 * Show analysis complete
 */
export const showAnalysisComplete = (
  prediction: string,
  confidence: number
): string => {
  const finding = prediction.toLowerCase() as 'benign' | 'malignant' | 'uncertain';
  return showClinical(
    `Analysis complete: ${prediction} (${(confidence * 100).toFixed(1)}% confidence)`,
    {
      finding,
      confidence,
      duration: 8000,
    }
  );
};

/**
 * Show processing error
 */
export const showProcessingError = (error: string): string => {
  return showError(`Processing failed: ${error}`, {
    duration: 6000,
  });
};

/**
 * Show export success
 */
export const showExportSuccess = (format: string): string => {
  return showSuccess(`Report exported as ${format}`, {
    duration: 3000,
  });
};

// ============================================================================
// EXPORT
// ============================================================================

export {
  toast,
  HotToaster as Toaster,
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  clinical: showClinical,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  // Medical-specific
  imageUploadSuccess: showImageUploadSuccess,
  analysisComplete: showAnalysisComplete,
  processingError: showProcessingError,
  exportSuccess: showExportSuccess,
};
