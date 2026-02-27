/**
 * Shared Components Index
 * 
 * Export all reusable UI components implementing:
 * - Nielsen's 10 Usability Heuristics
 * - VoxLogicA UI Design Principles
 * - KLM/Fitts' Law optimizations (Paton et al.)
 * - Medical-grade visual standards
 */

// Risk Assessment Components
export { 
  RiskIndicator, 
  RiskBadge, 
  confidenceToRiskLevel,
  type RiskLevel 
} from './RiskIndicator';

// System Status Components
export { SystemStatus } from './SystemStatus';

// Analysis Result Components  
export { 
  AnalysisResultCard,
} from './AnalysisResultCard';

// Loading & Progress Components
export {
  AnalysisProgress,
  AnalysisResultSkeleton,
  ImageLoadingSkeleton,
  type AnalysisStage,
} from './AnalysisProgress';

// Keyboard & Command Components (KLM Optimization)
export { KeyboardShortcuts } from './KeyboardShortcuts';
export { CommandPalette } from './CommandPalette';

// Navigation Components (VoxLogicA UI Pattern)
export { Breadcrumbs, PageHeader } from './Breadcrumbs';

// Notification System (H1: Visibility of System Status)
export { ToastProvider, useToast, type Toast, type ToastSeverity } from './ToastNotification';

// Help & Documentation (H10: Help and Documentation)
export { 
  HelpIcon, 
  HelpPopover, 
  InlineHelp, 
  helpContent,
  tourSteps,
  type TourStep,
} from './ContextualHelp';
