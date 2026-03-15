/**
 * CookieConsentBanner — GDPR / CCPA / ePrivacy-compliant cookie consent UI
 *
 * Enterprise-grade cookie consent management with:
 * - Three-action banner (Accept All · Decline Non-Essential · Settings)
 * - Granular category toggles (Necessary · Analytics · Functional · Marketing)
 * - Persistent consent stored in localStorage
 * - Auto-appears 4 seconds after first visit (or if consent is missing)
 * - Animated slide-up banner at page bottom
 * - Fully themed with Lunit design system
 *
 * Compliant with:
 * - EU General Data Protection Regulation (GDPR) Art. 6, 7; Recital 30, 32
 * - ePrivacy Directive 2002/58/EC (amended 2009) — "cookie law"
 * - UK PECR (Privacy and Electronic Communications Regulations)
 * - California Consumer Privacy Act (CCPA) / CPRA
 *
 * @module components/shared/CookieConsentBanner
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Divider,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Cookie as CookieIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Shield as ShieldIcon,
  Analytics as AnalyticsIcon,
  Tune as TuneIcon,
  Campaign as CampaignIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CookiePreferences {
  necessary: boolean;      // Always true — cannot be disabled
  analytics: boolean;      // Performance & usage analytics
  functional: boolean;     // Preferences, saved settings
  marketing: boolean;      // Third-party tracking, advertising
  consentDate: string;     // ISO 8601 timestamp
  consentVersion: string;  // Bumped when categories change
}

interface CookieCategory {
  key: keyof Omit<CookiePreferences, 'consentDate' | 'consentVersion'>;
  label: string;
  description: string;
  examples: string;
  icon: React.ReactNode;
  required: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_STORAGE_KEY = 'clinicalvision_cookie_consent';
const CONSENT_VERSION = '1.0';
const BANNER_DELAY_MS = 4000; // 4 seconds

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    key: 'necessary',
    label: 'Strictly Necessary',
    description:
      'These cookies are essential for the platform to function correctly. They enable core features such as user authentication, session management, and security protections. Without these cookies, the platform cannot operate safely.',
    examples: 'Authentication tokens, session identifiers, CSRF protection, load balancing',
    icon: <LockIcon fontSize="small" />,
    required: true,
  },
  {
    key: 'functional',
    label: 'Functional',
    description:
      'Functional cookies remember your preferences and settings to provide a more personalised experience. They allow the platform to recall choices such as your preferred theme, language, and layout configurations.',
    examples: 'Theme preference (dark/light mode), UI layout settings, recently viewed items',
    icon: <TuneIcon fontSize="small" />,
    required: false,
  },
  {
    key: 'analytics',
    label: 'Analytics & Performance',
    description:
      'These cookies collect anonymised, aggregated information about how visitors interact with the platform. This data helps us understand usage patterns, identify performance bottlenecks, and improve the overall user experience.',
    examples: 'Page view counts, feature usage metrics, error rates, load time measurements',
    icon: <AnalyticsIcon fontSize="small" />,
    required: false,
  },
  {
    key: 'marketing',
    label: 'Marketing & Communications',
    description:
      'Marketing cookies may be used to deliver relevant communications about product updates, educational content, and feature announcements. ClinicalVision does not sell personal data or serve third-party advertisements.',
    examples: 'Email campaign attribution, feature announcement tracking, referral source identification',
    icon: <CampaignIcon fontSize="small" />,
    required: false,
  },
];

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  functional: false,
  marketing: false,
  consentDate: '',
  consentVersion: CONSENT_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CookiePreferences = JSON.parse(raw);
    // Re-prompt if consent version has changed
    if (parsed.consentVersion !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(prefs: CookiePreferences): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs));
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const CookieConsentBanner: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({ ...DEFAULT_PREFERENCES });

  // ── On mount: check for existing consent ──
  useEffect(() => {
    const existing = loadConsent();
    if (existing) {
      // Consent already given — don't show banner
      setPreferences(existing);
      return;
    }
    // First visit or version bump → show banner after delay
    const timer = setTimeout(() => setVisible(true), BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // ── Accept All ──
  const handleAcceptAll = useCallback(() => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true,
      consentDate: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    saveConsent(prefs);
    setPreferences(prefs);
    setVisible(false);
    setSettingsOpen(false);
  }, []);

  // ── Decline Non-Essential ──
  const handleDecline = useCallback(() => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false,
      consentDate: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    saveConsent(prefs);
    setPreferences(prefs);
    setVisible(false);
    setSettingsOpen(false);
  }, []);

  // ── Save custom preferences from Settings dialog ──
  const handleSavePreferences = useCallback(() => {
    const prefs: CookiePreferences = {
      ...preferences,
      necessary: true, // always enforced
      consentDate: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
    };
    saveConsent(prefs);
    setPreferences(prefs);
    setVisible(false);
    setSettingsOpen(false);
  }, [preferences]);

  // ── Toggle individual category ──
  const toggleCategory = (key: keyof Omit<CookiePreferences, 'consentDate' | 'consentVersion'>) => {
    if (key === 'necessary') return; // Cannot disable
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Don't render if consent already stored ──
  if (!visible && !settingsOpen) return null;

  // ── Shared colours ──
  const primary = '#00C9EA';
  const primaryDark = '#0F95AB';
  const bannerBg = isDark ? '#0D1117' : '#FFFFFF';
  const bannerBorder = isDark ? 'rgba(0, 201, 234, 0.20)' : 'rgba(15, 149, 171, 0.15)';
  const textPrimary = isDark ? '#E6EDF3' : '#1B2631';
  const textSecondary = isDark ? '#8B949E' : '#5A6A7A';

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          BANNER — slides up from bottom
          ════════════════════════════════════════════════════════════════════ */}
      <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
        <Box
          role="dialog"
          aria-label="Cookie consent"
          aria-describedby="cookie-consent-description"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: bannerBg,
            borderTop: `1px solid ${bannerBorder}`,
            boxShadow: isDark
              ? '0 -8px 40px rgba(0, 0, 0, 0.6), 0 -2px 12px rgba(0, 201, 234, 0.08)'
              : '0 -8px 40px rgba(0, 0, 0, 0.10), 0 -2px 12px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Accent line at top */}
          <Box
            sx={{
              height: 2,
              background: `linear-gradient(90deg, ${primary}, ${primaryDark}, ${primary})`,
              opacity: 0.5,
            }}
          />

          <Box
            sx={{
              maxWidth: 1200,
              mx: 'auto',
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 2, sm: 2.5 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: { xs: 2, md: 3 },
            }}
          >
            {/* ── Icon + Text ── */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${alpha(primary, 0.12)}, ${alpha(primaryDark, 0.18)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <CookieIcon sx={{ color: primary, fontSize: 22 }} />
              </Box>

              <Box>
                <Typography
                  variant="subtitle1"
                  id="cookie-consent-description"
                  sx={{
                    fontWeight: 600,
                    color: textPrimary,
                    mb: 0.5,
                    lineHeight: 1.3,
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                  }}
                >
                  We value your privacy
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: textSecondary,
                    lineHeight: 1.6,
                    maxWidth: 640,
                    fontSize: '0.835rem',
                  }}
                >
                  ClinicalVision uses cookies and similar technologies to ensure
                  essential platform functionality, enhance your experience, and
                  analyse usage to improve our services. You can accept all cookies,
                  decline non-essential ones, or customise your preferences. For
                  more information, please read our{' '}
                  <Box
                    component={RouterLink}
                    to={ROUTES.PRIVACY}
                    sx={{
                      color: primary,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      '&:hover': { color: primaryDark },
                    }}
                  >
                    Privacy Policy
                  </Box>
                  .
                </Typography>
              </Box>
            </Box>

            {/* ── Action Buttons ── */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.25,
                flexShrink: 0,
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              {/* Cookie Settings */}
              <Button
                variant="outlined"
                size="medium"
                startIcon={<SettingsIcon sx={{ fontSize: 18 }} />}
                onClick={() => setSettingsOpen(true)}
                sx={{
                  borderColor: bannerBorder,
                  color: textSecondary,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '10px',
                  px: 2.5,
                  py: 1,
                  fontSize: '0.84rem',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: primary,
                    color: primary,
                    background: alpha(primary, 0.06),
                  },
                }}
              >
                Cookie Settings
              </Button>

              {/* Decline */}
              <Button
                variant="outlined"
                size="medium"
                onClick={handleDecline}
                sx={{
                  borderColor: bannerBorder,
                  color: textSecondary,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '10px',
                  px: 2.5,
                  py: 1,
                  fontSize: '0.84rem',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: isDark ? '#444' : '#aaa',
                    background: alpha(textSecondary, 0.06),
                  },
                }}
              >
                Decline Non-Essential
              </Button>

              {/* Accept All */}
              <Button
                variant="contained"
                size="medium"
                startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                onClick={handleAcceptAll}
                sx={{
                  background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
                  color: '#FFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  px: 3,
                  py: 1,
                  fontSize: '0.84rem',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 4px 14px ${alpha(primary, 0.35)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${primaryDark}, ${primary})`,
                    boxShadow: `0 6px 20px ${alpha(primary, 0.45)}`,
                  },
                }}
              >
                Accept All Cookies
              </Button>
            </Box>
          </Box>
        </Box>
      </Slide>

      {/* ════════════════════════════════════════════════════════════════════
          SETTINGS DIALOG — granular category toggles
          ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: bannerBg,
            border: `1px solid ${bannerBorder}`,
            boxShadow: isDark
              ? '0 24px 80px rgba(0, 0, 0, 0.7)'
              : '0 24px 80px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
          },
        }}
      >
        {/* Accent line */}
        <Box
          sx={{
            height: 3,
            background: `linear-gradient(90deg, ${primary}, ${primaryDark}, ${primary})`,
          }}
        />

        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 1,
            pt: 2.5,
            px: 3,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${alpha(primary, 0.12)}, ${alpha(primaryDark, 0.18)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldIcon sx={{ color: primary, fontSize: 20 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: textPrimary,
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: '1.1rem',
              }}
            >
              Cookie Preferences
            </Typography>
            <Typography variant="caption" sx={{ color: textSecondary }}>
              Manage how ClinicalVision uses cookies on your device
            </Typography>
          </Box>
          <IconButton
            onClick={() => setSettingsOpen(false)}
            size="small"
            sx={{ color: textSecondary }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ borderColor: bannerBorder }} />

        <DialogContent sx={{ px: 3, py: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: textSecondary, mb: 2.5, lineHeight: 1.65, fontSize: '0.82rem' }}
          >
            ClinicalVision is a medical imaging platform committed to protecting your
            privacy. We use cookies and similar storage technologies to deliver core
            functionality and, with your consent, to improve performance and
            communications. You can enable or disable each category below.
            Strictly necessary cookies cannot be disabled as they are required for
            the platform to function securely.
          </Typography>

          {/* ── Category Cards ── */}
          {COOKIE_CATEGORIES.map((cat, idx) => (
            <Box key={cat.key}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 2,
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '8px',
                    background: preferences[cat.key]
                      ? `linear-gradient(135deg, ${alpha(primary, 0.14)}, ${alpha(primaryDark, 0.20)})`
                      : alpha(textSecondary, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.25,
                    transition: 'background 0.2s',
                  }}
                >
                  {React.cloneElement(cat.icon as React.ReactElement<any>, {
                    sx: {
                      color: preferences[cat.key] ? primary : textSecondary,
                      fontSize: 18,
                      transition: 'color 0.2s',
                    },
                  })}
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: textPrimary, fontSize: '0.88rem' }}
                    >
                      {cat.label}
                    </Typography>
                    {cat.required && (
                      <Chip
                        label="Always Active"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          background: alpha(primary, 0.12),
                          color: primary,
                          border: `1px solid ${alpha(primary, 0.25)}`,
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: textSecondary,
                      fontSize: '0.79rem',
                      lineHeight: 1.55,
                      mb: 0.75,
                    }}
                  >
                    {cat.description}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: alpha(textSecondary, 0.7),
                      fontSize: '0.72rem',
                      fontStyle: 'italic',
                    }}
                  >
                    Examples: {cat.examples}
                  </Typography>
                </Box>

                {/* Toggle */}
                <Switch
                  checked={preferences[cat.key]}
                  onChange={() => toggleCategory(cat.key)}
                  disabled={cat.required}
                  size="small"
                  sx={{
                    mt: 0.5,
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: primary,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: primary,
                    },
                  }}
                />
              </Box>
              {idx < COOKIE_CATEGORIES.length - 1 && (
                <Divider sx={{ borderColor: alpha(bannerBorder, 0.5) }} />
              )}
            </Box>
          ))}
        </DialogContent>

        <Divider sx={{ borderColor: bannerBorder }} />

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Button
            variant="outlined"
            size="medium"
            onClick={handleDecline}
            sx={{
              borderColor: bannerBorder,
              color: textSecondary,
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '10px',
              px: 2.5,
              fontSize: '0.84rem',
              flex: { xs: 1, sm: 'none' },
              '&:hover': {
                borderColor: isDark ? '#444' : '#aaa',
                background: alpha(textSecondary, 0.06),
              },
            }}
          >
            Decline Non-Essential
          </Button>
          <Button
            variant="outlined"
            size="medium"
            onClick={handleSavePreferences}
            sx={{
              borderColor: alpha(primary, 0.4),
              color: primary,
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '10px',
              px: 2.5,
              fontSize: '0.84rem',
              flex: { xs: 1, sm: 'none' },
              '&:hover': {
                borderColor: primary,
                background: alpha(primary, 0.08),
              },
            }}
          >
            Save My Preferences
          </Button>
          <Button
            variant="contained"
            size="medium"
            onClick={handleAcceptAll}
            sx={{
              background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
              color: '#FFF',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 3,
              fontSize: '0.84rem',
              flex: { xs: 1, sm: 'none' },
              boxShadow: `0 4px 14px ${alpha(primary, 0.35)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${primaryDark}, ${primary})`,
                boxShadow: `0 6px 20px ${alpha(primary, 0.45)}`,
              },
            }}
          >
            Accept All Cookies
          </Button>
        </DialogActions>

        {/* Footer note */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography
            variant="caption"
            sx={{ color: alpha(textSecondary, 0.6), fontSize: '0.7rem', lineHeight: 1.5 }}
          >
            Your cookie preferences are stored locally on your device and can be
            changed at any time. For questions about our data practices, please
            review our{' '}
            <Box
              component={RouterLink}
              to={ROUTES.PRIVACY}
              sx={{
                color: alpha(primary, 0.8),
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                '&:hover': { color: primary },
              }}
            >
              Privacy Policy
            </Box>{' '}
            or contact our Data Protection Officer at{' '}
            <Box
              component="a"
              href="mailto:privacy@clinicalvision.ai"
              sx={{
                color: alpha(primary, 0.8),
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                '&:hover': { color: primary },
              }}
            >
              privacy@clinicalvision.ai
            </Box>
            .
          </Typography>
        </Box>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;

/**
 * Utility hook to read current cookie consent preferences.
 * Returns null if the user hasn't interacted with the banner yet.
 */
export function useCookieConsent(): CookiePreferences | null {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    setPrefs(loadConsent());
    // Listen for consent updates (in case banner is accepted in same session)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) {
        setPrefs(loadConsent());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return prefs;
}
