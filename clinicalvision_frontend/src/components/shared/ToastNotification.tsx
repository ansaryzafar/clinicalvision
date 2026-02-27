/**
 * Toast Notification System
 * 
 * Implements multiple Nielsen Heuristics:
 * - H1: Visibility of system status (feedback on actions)
 * - H9: Help users recognize, diagnose, and recover from errors
 * - H3: User control and freedom (dismissible notifications)
 * 
 * Based on VoxLogicA UI principle of Responsiveness:
 * "The system should provide immediate feedback to user actions"
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Stack,
  Slide,
  styled,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import {
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  CloudUpload,
  Analytics,
} from '@mui/icons-material';

// Toast types
export type ToastSeverity = AlertColor;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
  title?: string;
  duration?: number; // ms, 0 = persistent
  action?: ToastAction;
  icon?: React.ReactNode;
  progress?: boolean; // Show progress bar
}

// Styled components
const ToastAlert = styled(Alert)(({ theme }) => ({
  minWidth: 320,
  maxWidth: 450,
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  '& .MuiAlert-icon': {
    fontSize: 24,
  },
  '& .MuiAlert-message': {
    width: '100%',
  },
}));

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  borderRadius: '0 0 12px 12px',
}));

// Context
interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  // Convenience methods
  success: (message: string, options?: Partial<Toast>) => string;
  error: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  info: (message: string, options?: Partial<Toast>) => string;
  // Specialized toasts
  uploadProgress: (filename: string, progress: number) => string;
  analysisComplete: (result: string, onView: () => void) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Hook to use toast notifications
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Provider component
interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 3 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Generate unique ID
  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Show a toast
  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5s
    };

    setToasts(prev => {
      // Remove oldest if max reached
      const updated = prev.length >= maxToasts ? prev.slice(1) : prev;
      return [...updated, newToast];
    });

    return id;
  }, [maxToasts]);

  // Hide a toast
  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({ message, severity: 'success', ...options });
  }, [showToast]);

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({ 
      message, 
      severity: 'error', 
      duration: 0, // Errors persist until dismissed
      ...options 
    });
  }, [showToast]);

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({ message, severity: 'warning', duration: 7000, ...options });
  }, [showToast]);

  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({ message, severity: 'info', ...options });
  }, [showToast]);

  // Specialized: Upload progress
  const uploadProgress = useCallback((filename: string, progress: number) => {
    const existingId = toasts.find(t => t.title === 'Uploading')?.id;
    
    if (existingId && progress < 100) {
      // Update existing toast (simplified - in production use a ref)
      return existingId;
    }

    if (progress >= 100) {
      return showToast({
        message: `${filename} uploaded successfully`,
        severity: 'success',
        icon: <CloudUpload />,
      });
    }

    return showToast({
      title: 'Uploading',
      message: filename,
      severity: 'info',
      icon: <CloudUpload />,
      progress: true,
      duration: 0,
    });
  }, [showToast, toasts]);

  // Specialized: Analysis complete
  const analysisComplete = useCallback((result: string, onView: () => void) => {
    return showToast({
      title: 'Analysis Complete',
      message: `Result: ${result}`,
      severity: result.toLowerCase().includes('malignant') ? 'warning' : 'success',
      icon: <Analytics />,
      duration: 0,
      action: {
        label: 'View Results',
        onClick: onView,
      },
    });
  }, [showToast]);

  const value: ToastContextValue = {
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
    uploadProgress,
    analysisComplete,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast container */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 1,
        }}
      >
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => hideToast(toast.id)}
            index={index}
          />
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

// Individual toast item
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
  index: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose, index }) => {
  const [progress, setProgress] = useState(100);
  const [open, setOpen] = useState(true);

  // Auto-dismiss timer with progress
  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const interval = 50; // Update every 50ms
      const decrement = (interval / toast.duration) * 100;
      
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            setOpen(false);
            setTimeout(onClose, 300); // Wait for exit animation
            return 0;
          }
          return prev - decrement;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [toast.duration, onClose]);

  // Get icon based on severity
  const getIcon = () => {
    if (toast.icon) return toast.icon;
    switch (toast.severity) {
      case 'success': return <CheckCircle />;
      case 'error': return <ErrorIcon />;
      case 'warning': return <Warning />;
      case 'info': return <Info />;
      default: return <Info />;
    }
  };

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <ToastAlert
        severity={toast.severity}
        icon={getIcon()}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center">
            {toast.action && (
              <Box
                component="button"
                onClick={() => {
                  toast.action?.onClick();
                  onClose();
                }}
                sx={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
                {toast.action.label}
              </Box>
            )}
            <IconButton
              size="small"
              onClick={() => {
                setOpen(false);
                setTimeout(onClose, 300);
              }}
              sx={{ color: 'inherit', opacity: 0.7 }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        }
        sx={{ position: 'relative', overflow: 'hidden' }}
      >
        {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
        <Typography variant="body2">{toast.message}</Typography>
        
        {/* Progress bar for timed toasts */}
        {toast.duration && toast.duration > 0 && (
          <ProgressBar
            variant="determinate"
            value={progress}
            color={toast.severity}
          />
        )}
      </ToastAlert>
    </Slide>
  );
};

export default ToastProvider;
