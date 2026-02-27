/**
 * User Tier System — Scalable access control for ClinicalVision AI
 *
 * Current active tier: 'demo' (free registration → full workflow access).
 * Future tiers: 'professional', 'enterprise', 'validation'.
 *
 * Design:
 *  - Each tier defines which features it unlocks (feature flags).
 *  - The `getTierConfig()` function returns the config for a given tier.
 *  - Components query `canAccess(feature)` to gate UI elements.
 *  - Tier is stored on the User object and returned from the auth API.
 *  - When the backend adds billing, the tier will be set by subscription status.
 *
 * References:
 *  - SaaS tier patterns (Stripe model)
 *  - ACR accreditation levels for radiology software
 */

// ============================================================================
// TIER ENUM — Ordered by access level (lowest → highest)
// ============================================================================

export enum UserTier {
  /** Free demo account — full workflow, watermarked reports, limited storage */
  DEMO = 'demo',

  /** Licensed professional — full workflow, unlimited storage, PDF export */
  PROFESSIONAL = 'professional',

  /** Enterprise/hospital — multi-user, audit trail, PACS integration, SSO */
  ENTERPRISE = 'enterprise',

  /** Research / validation — read-only model access, benchmarking tools */
  VALIDATION = 'validation',
}

// ============================================================================
// FEATURE FLAGS — Granular per-tier feature gating
// ============================================================================

export type Feature =
  | 'workflow'             // Access clinical workflow
  | 'image_upload'         // Upload mammograms
  | 'ai_analysis'          // Run AI inference
  | 'report_generation'    // Generate clinical reports
  | 'report_export_pdf'    // Export reports to PDF
  | 'digital_signature'    // Sign reports digitally
  | 'pacs_integration'     // DICOM/PACS connectivity
  | 'batch_analysis'       // Multi-image batch analysis
  | 'fairness_dashboard'   // AI fairness monitoring
  | 'audit_trail'          // Full audit logging
  | 'multi_user'           // Organization user management
  | 'sso'                  // Single sign-on
  | 'benchmarking'         // Model benchmarking tools
  | 'api_access'           // REST API programmatic access
  | 'priority_support';    // Priority support channel

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export interface TierConfig {
  tier: UserTier;
  label: string;
  description: string;
  features: Feature[];
  limits: {
    maxCasesPerMonth: number;     // -1 = unlimited
    maxImagesPerCase: number;     // -1 = unlimited
    maxStorageMB: number;         // -1 = unlimited
    reportWatermark: boolean;     // Watermark on PDF exports
  };
  badge: {
    color: string;
    icon: string;
  };
}

const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  [UserTier.DEMO]: {
    tier: UserTier.DEMO,
    label: 'Demo',
    description: 'Free access to explore the full clinical workflow',
    features: [
      'workflow',
      'image_upload',
      'ai_analysis',
      'report_generation',
      'batch_analysis',
      'fairness_dashboard',
    ],
    limits: {
      maxCasesPerMonth: 50,
      maxImagesPerCase: 8,
      maxStorageMB: 500,
      reportWatermark: true,
    },
    badge: { color: '#00C9EA', icon: 'science' },
  },

  [UserTier.PROFESSIONAL]: {
    tier: UserTier.PROFESSIONAL,
    label: 'Professional',
    description: 'Full clinical workflow for licensed practitioners',
    features: [
      'workflow',
      'image_upload',
      'ai_analysis',
      'report_generation',
      'report_export_pdf',
      'digital_signature',
      'batch_analysis',
      'fairness_dashboard',
      'priority_support',
    ],
    limits: {
      maxCasesPerMonth: -1,
      maxImagesPerCase: -1,
      maxStorageMB: 10_000,
      reportWatermark: false,
    },
    badge: { color: '#4CAF50', icon: 'verified' },
  },

  [UserTier.ENTERPRISE]: {
    tier: UserTier.ENTERPRISE,
    label: 'Enterprise',
    description: 'Hospital-wide deployment with full integrations',
    features: [
      'workflow',
      'image_upload',
      'ai_analysis',
      'report_generation',
      'report_export_pdf',
      'digital_signature',
      'pacs_integration',
      'batch_analysis',
      'fairness_dashboard',
      'audit_trail',
      'multi_user',
      'sso',
      'api_access',
      'priority_support',
    ],
    limits: {
      maxCasesPerMonth: -1,
      maxImagesPerCase: -1,
      maxStorageMB: -1,
      reportWatermark: false,
    },
    badge: { color: '#FF9800', icon: 'business' },
  },

  [UserTier.VALIDATION]: {
    tier: UserTier.VALIDATION,
    label: 'Validation',
    description: 'Research and model validation access',
    features: [
      'workflow',
      'image_upload',
      'ai_analysis',
      'batch_analysis',
      'fairness_dashboard',
      'benchmarking',
      'api_access',
    ],
    limits: {
      maxCasesPerMonth: -1,
      maxImagesPerCase: -1,
      maxStorageMB: 5_000,
      reportWatermark: true,
    },
    badge: { color: '#9C27B0', icon: 'biotech' },
  },
};

// ============================================================================
// PUBLIC HELPERS
// ============================================================================

/** Get the full configuration for a tier */
export function getTierConfig(tier: UserTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/** Check whether a tier has access to a specific feature */
export function canAccessFeature(tier: UserTier, feature: Feature): boolean {
  return TIER_CONFIGS[tier].features.includes(feature);
}

/** Get the default tier for newly registered users */
export function getDefaultTier(): UserTier {
  return UserTier.DEMO;
}

/** All tier configs as an ordered array (for pricing page, etc.) */
export function getAllTierConfigs(): TierConfig[] {
  return [
    TIER_CONFIGS[UserTier.DEMO],
    TIER_CONFIGS[UserTier.PROFESSIONAL],
    TIER_CONFIGS[UserTier.ENTERPRISE],
    TIER_CONFIGS[UserTier.VALIDATION],
  ];
}

/** Check if a tier is a paid tier */
export function isPaidTier(tier: UserTier): boolean {
  return tier === UserTier.PROFESSIONAL || tier === UserTier.ENTERPRISE;
}
