/**
 * Lunit Design System - ClinicalVision
 * 
 * Based on lunit.io design patterns
 * Typography: ClashGrotesk (headings), Lexend (body)
 * Color Palette: Teal primary, clean whites/grays
 */

// ============================================
// COLOR PALETTE
// ============================================
export const lunitColors = {
  // Primary Brand Colors
  teal: '#00C9EA',
  tealDarker: '#0F95AB',
  
  // Base Colors
  black: '#000000',
  white: '#FFFFFF',
  
  // Accent Colors
  green: '#56C14D',
  yellow: '#FFC205',
  brightYellow: '#FFE205',
  orange: '#FF5321',
  orangeDarker: '#CC421A',
  red: '#FF4444',
  
  // Gray Scale
  darkerGray: '#233232',
  darkGrey: '#5C6A6B',
  grey: '#95A3A4',
  lightGray: '#CFD6D7',
  lightestGray: '#EFF0F4',
  extraLightGray: '#EBEBEB',
  
  // Text Colors
  headingColor: '#151515',
  headingColor2: '#233232',
  text: '#233232',
  paragraphLink: '#233232',
  
  // Transparent
  transparent: 'rgba(255, 255, 255, 0)',
};

// ============================================
// TYPOGRAPHY
// ============================================
export const lunitTypography = {
  // Font Families
  fontFamilyHeading: '"ClashGrotesk", system-ui, sans-serif',
  fontFamilyBody: '"Lexend", system-ui, sans-serif',
  
  // Font Weights
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  
  // Font Sizes (responsive using clamp)
  fontSize: {
    '6xl': 'clamp(45px, calc(45px + (100 - 45) * ((100vw - 320px) / 1600)), 100px)',
    '5xl': 'clamp(40px, calc(40px + (80 - 40) * ((100vw - 320px) / 1600)), 80px)',
    '4xl': 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / 1600)), 60px)',
    '3xl': 'clamp(36px, calc(36px + (48 - 36) * ((100vw - 320px) / 1600)), 48px)',
    '2xl': 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / 1600)), 40px)',
    xl: 'clamp(20px, calc(20px + (32 - 20) * ((100vw - 320px) / 1600)), 32px)',
    lg: 'clamp(18px, calc(18px + (24 - 18) * ((100vw - 320px) / 1600)), 24px)',
    md: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / 1600)), 20px)',
    sm: 'clamp(14px, calc(14px + (18 - 14) * ((100vw - 320px) / 1600)), 18px)',
    xs: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / 1600)), 16px)',
    xxs: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / 1600)), 14px)',
    xxxs: '12px',
  },
  
  // Line Heights
  lineHeight: {
    '6xl': 'clamp(50px, calc(50px + (120 - 50) * ((100vw - 320px) / 1600)), 120px)',
    '5xl': 'clamp(45px, calc(45px + (95 - 45) * ((100vw - 320px) / 1600)), 95px)',
    '4xl': 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
    '3xl': 'clamp(36px, calc(36px + (64 - 36) * ((100vw - 320px) / 1600)), 64px)',
    '2xl': 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
    xl: 'clamp(30px, calc(30px + (40 - 30) * ((100vw - 320px) / 1600)), 40px)',
    lg: 'clamp(28px, calc(28px + (34 - 28) * ((100vw - 320px) / 1600)), 34px)',
    md: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
    sm: 'clamp(20px, calc(20px + (24 - 20) * ((100vw - 320px) / 1600)), 24px)',
    xs: 'clamp(18px, calc(18px + (22 - 18) * ((100vw - 320px) / 1600)), 22px)',
    xxs: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / 1600)), 18px)',
    xxxs: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / 1600)), 16px)',
  },
};

// ============================================
// SPACING
// ============================================
export const lunitSpacing = {
  // Section Padding
  sectionPaddingY: { xs: '60px', md: '80px', lg: '100px' },
  sectionPaddingX: { xs: '20px', lg: '60px' },
  
  // Container
  maxWidth: '1440px',
  
  // Component Spacing
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '80px',
};

// ============================================
// SHADOWS
// ============================================
export const lunitShadows = {
  subtle: '0 1px 2px rgba(35, 50, 50, 0.06)',
  light: '0 2px 4px rgba(35, 50, 50, 0.1)',
  medium: '0 4px 8px rgba(35, 50, 50, 0.15)',
  heavy: '0 8px 16px rgba(35, 50, 50, 0.2)',
  card: '0 4px 20px rgba(35, 50, 50, 0.08)',
  cardHover: '0 10px 40px rgba(35, 50, 50, 0.15)',
};

// ============================================
// BORDER RADIUS
// ============================================
export const lunitRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '100px',
};

// ============================================
// BUTTON STYLES
// ============================================
export const lunitButtonStyles = {
  // Primary Button (Black bg, teal on hover)
  primary: {
    backgroundColor: lunitColors.black,
    color: lunitColors.white,
    '&:hover': {
      backgroundColor: lunitColors.teal,
      color: lunitColors.black,
    },
  },
  
  // Primary Light (Teal bg)
  primaryLight: {
    backgroundColor: lunitColors.teal,
    color: lunitColors.black,
    '&:hover': {
      backgroundColor: lunitColors.tealDarker,
      color: lunitColors.white,
    },
  },
  
  // Secondary (Outlined black)
  secondary: {
    backgroundColor: 'transparent',
    color: lunitColors.black,
    border: `1px solid ${lunitColors.black}`,
    '&:hover': {
      backgroundColor: lunitColors.black,
      color: lunitColors.white,
    },
  },
  
  // Secondary Light (Outlined white)
  secondaryLight: {
    backgroundColor: 'transparent',
    color: lunitColors.white,
    border: `1px solid ${lunitColors.white}`,
    '&:hover': {
      backgroundColor: lunitColors.white,
      color: lunitColors.black,
    },
  },
  
  // Link Style
  link: {
    backgroundColor: 'transparent',
    color: lunitColors.darkerGray,
    '&:hover': {
      color: lunitColors.teal,
    },
  },
  
  // Common Properties
  common: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontWeight: 500,
    borderRadius: lunitRadius.full,
    textTransform: 'none' as const,
    transition: 'all 0.4s ease-in-out',
    padding: '9px 24px',
    fontSize: '16px',
    lineHeight: 1.5,
  },
  
  // Size Variants
  lg: {
    fontSize: '18px',
    padding: '12px 32px',
  },
  sm: {
    fontSize: '14px',
    padding: '6px 16px',
  },
};

// ============================================
// GRADIENTS & BACKGROUNDS
// ============================================
export const lunitGradients = {
  // Footer gradient (colorful bottom-left corner)
  footerGradient: `
    radial-gradient(12.99% 20.36% at 99.17% 1.65%, rgba(255, 83, 33, 0.8) 0%, rgba(255, 83, 33, 0.1) 62.98%, rgba(255, 83, 33, 0) 99.99%), 
    radial-gradient(17.32% 24.96% at 0% 100%, #FFE205 21.82%, rgba(255, 194, 5, 0) 100%), 
    radial-gradient(24.05% 48.99% at 0% 100%, #56C14D 30%, rgba(86, 193, 77, 0) 100%), 
    radial-gradient(36.63% 58.37% at 0% 102.08%, #00C9EA 57.5%, rgba(0, 201, 234, 0.4) 78.36%, rgba(0, 201, 234, 0) 100%), 
    ${lunitColors.lightestGray}
  `,
  
  // Hero accent gradient (top-right teal glow)
  heroAccent: `radial-gradient(ellipse at 100% 0%, rgba(0, 201, 234, 0.08) 0%, transparent 60%)`,
  
  // Card hover gradient
  cardGlow: `linear-gradient(135deg, ${lunitColors.teal} 0%, ${lunitColors.tealDarker} 100%)`,
  
  // Hero multi-layer gradients (from lunit.css)
  heroLightOverlay: `
    radial-gradient(ellipse at 90% 10%, rgba(0, 201, 234, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 10% 90%, rgba(86, 193, 77, 0.04) 0%, transparent 40%)
  `,
  heroDarkOverlay: `
    radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, rgba(86, 193, 77, 0.08) 0%, transparent 40%)
  `,

  // ── Standardised page banner (dark) ──
  // Base gradient: darkerGray → deep teal → tealDarker
  pageBannerBg: `linear-gradient(155deg, ${lunitColors.darkerGray} 0%, #0d2f2f 55%, ${lunitColors.tealDarker} 100%)`,
  // Overlay glows (two layers)
  pageBannerOverlay: `
    radial-gradient(ellipse at 80% 15%, rgba(0, 201, 234, 0.18) 0%, transparent 55%),
    radial-gradient(ellipse at 15% 85%, rgba(86, 193, 77, 0.07) 0%, transparent 45%)
  `,
  
  // Dark card gradient with hover reveal
  cardDarkGradient: `linear-gradient(135deg, ${lunitColors.darkerGray} 0%, #1a2626 100%)`,
  cardDarkGradientHover: `linear-gradient(135deg, rgba(0, 201, 234, 0.15) 0%, rgba(0, 201, 234, 0.05) 100%)`,
  
  // FAQ/Section gradient backgrounds
  faqGradient: `linear-gradient(180deg, rgba(0, 201, 234, 0.03) 0%, transparent 100%)`,
  
  // Stats section gradient
  statsGradient: `radial-gradient(circle at 50% 0%, rgba(0, 201, 234, 0.08) 0%, transparent 60%)`,
  
  // Testimonial section gradient
  testimonialGradient: `radial-gradient(ellipse at 100% 0%, rgba(0, 201, 234, 0.12) 0%, transparent 60%)`,
};

// ============================================
// COMMON COMPONENT STYLES
// ============================================
export const lunitComponentStyles = {
  // Page Header (fixed navigation)
  header: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid rgba(35, 50, 50, 0.1)`,
  },
  
  // Section Title (uppercase label)
  sectionLabel: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: lunitColors.teal,
    marginBottom: '16px',
  },
  
  // Page Title (large heading)
  pageTitle: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: lunitTypography.fontSize['4xl'],
    fontWeight: lunitTypography.fontWeightLight,
    lineHeight: 1.1,
    color: lunitColors.headingColor,
  },
  
  // Section Heading
  sectionHeading: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: lunitTypography.fontSize['3xl'],
    fontWeight: lunitTypography.fontWeightLight,
    lineHeight: 1.2,
    color: lunitColors.headingColor,
  },
  
  // Card Title
  cardTitle: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: lunitTypography.fontSize.xl,
    fontWeight: lunitTypography.fontWeightMedium,
    color: lunitColors.headingColor,
  },
  
  // Body Text
  bodyText: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: lunitTypography.fontSize.md,
    fontWeight: lunitTypography.fontWeightLight,
    lineHeight: 1.8,
    color: lunitColors.text,
  },
  
  // Small Text
  smallText: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: lunitTypography.fontSize.sm,
    fontWeight: lunitTypography.fontWeightLight,
    lineHeight: 1.7,
    color: lunitColors.darkGrey,
  },
  
  // Card Base
  card: {
    backgroundColor: lunitColors.white,
    borderRadius: lunitRadius['2xl'],
    padding: '32px',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: lunitShadows.cardHover,
    },
  },
  
  // Input Field
  inputField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: lunitRadius.md,
      fontFamily: lunitTypography.fontFamilyBody,
      '& fieldset': {
        borderColor: lunitColors.lightGray,
      },
      '&:hover fieldset': {
        borderColor: lunitColors.grey,
      },
      '&.Mui-focused fieldset': {
        borderColor: lunitColors.teal,
        borderWidth: '1px',
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: lunitTypography.fontFamilyBody,
      color: lunitColors.darkGrey,
      '&.Mui-focused': {
        color: lunitColors.teal,
      },
    },
  },
};

// ============================================
// ANIMATION TIMINGS
// ============================================
export const lunitTransitions = {
  fast: '0.2s ease',
  default: '0.3s ease',
  slow: '0.4s ease-in-out',
  button: 'all 0.4s ease-in-out',
  card: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  hover: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ============================================
// ANIMATIONS (keyframes as objects for MUI)
// ============================================
export const lunitAnimations = {
  // Partner logos scroll animation
  scrollX: {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-50%)' },
  },
  
  // Fade in up animation
  fadeInUp: {
    '0%': { opacity: 0, transform: 'translateY(20px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  
  // Scale in animation
  scaleIn: {
    '0%': { opacity: 0, transform: 'scale(0.95)' },
    '100%': { opacity: 1, transform: 'scale(1)' },
  },
  
  // Pulse glow for CTA buttons
  pulseGlow: {
    '0%': { boxShadow: '0 0 0 0 rgba(0, 201, 234, 0.4)' },
    '70%': { boxShadow: '0 0 0 10px rgba(0, 201, 234, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(0, 201, 234, 0)' },
  },
};

// ============================================
// PREMIUM CARD STYLES (from lunit.css)
// ============================================
export const lunitCardStyles = {
  // Dark gradient card with hover effect
  darkGradient: {
    background: `linear-gradient(135deg, ${lunitColors.darkerGray} 0%, #1a2626 100%)`,
    borderRadius: lunitRadius['2xl'],
    border: `1px solid rgba(255, 255, 255, 0.06)`,
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      inset: 0,
      background: `linear-gradient(135deg, rgba(0, 201, 234, 0.12) 0%, rgba(0, 201, 234, 0.02) 100%)`,
      opacity: 0,
      transition: 'opacity 0.35s ease',
    },
    '&:hover': {
      transform: 'translateY(-6px)',
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.3)`,
      borderColor: 'rgba(0, 201, 234, 0.3)',
      '&::before': {
        opacity: 1,
      },
    },
  },
  
  // Light card with teal accent border
  lightAccent: {
    background: lunitColors.white,
    borderRadius: lunitRadius['2xl'],
    border: `1px solid ${lunitColors.lightGray}`,
    borderTop: `3px solid ${lunitColors.teal}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: lunitShadows.cardHover,
      transform: 'translateY(-4px)',
    },
  },
  
  // Glass card effect
  glass: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: lunitRadius['2xl'],
    border: '1px solid rgba(35, 50, 50, 0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.95)',
      boxShadow: lunitShadows.card,
    },
  },
  
  // Feature card with icon
  feature: {
    background: lunitColors.white,
    borderRadius: lunitRadius['2xl'],
    border: `1px solid rgba(35, 50, 50, 0.08)`,
    padding: '32px',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      borderColor: 'transparent',
      boxShadow: lunitShadows.cardHover,
      transform: 'translateY(-6px)',
    },
  },
};

// ============================================
// HERO STYLES (from lunit.css)
// ============================================
export const lunitHeroStyles = {
  // Hero container base
  container: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
  },
  
  // Light hero theme
  light: {
    bgcolor: lunitColors.white,
    color: lunitColors.headingColor,
  },
  
  // Dark hero theme
  dark: {
    bgcolor: lunitColors.darkerGray,
    color: lunitColors.white,
  },
  
  // Hero text group
  textGroup: {
    maxWidth: '800px',
    position: 'relative' as const,
    zIndex: 2,
  },
  
  // Split headline style (two-line with accent)
  splitHeadline: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontWeight: lunitTypography.fontWeightLight,
    lineHeight: 1.05,
    '& .accent': {
      color: lunitColors.teal,
      display: 'block',
    },
  },
};

// ============================================
// STATS SECTION STYLES (from lunit.css)
// ============================================
export const lunitStatsStyles = {
  container: {
    textAlign: 'center' as const,
  },
  statItem: {
    position: 'relative' as const,
    padding: '20px 0',
  },
  statNumber: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontWeight: lunitTypography.fontWeightLight,
    color: lunitColors.teal,
    lineHeight: 1,
    marginBottom: '8px',
  },
  statLabel: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontWeight: 500,
    fontSize: '14px',
    color: lunitColors.darkerGray,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  // Vertical separator line between stats
  separator: {
    position: 'absolute' as const,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '1px',
    height: '60%',
    bgcolor: lunitColors.lightGray,
  },
};

// ============================================
// FAQ/ACCORDION STYLES (from lunit.css)
// ============================================
export const lunitFAQStyles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  item: {
    background: `linear-gradient(180deg, rgba(0, 201, 234, 0.02) 0%, transparent 100%)`,
    borderRadius: lunitRadius.lg,
    border: `1px solid rgba(35, 50, 50, 0.08)`,
    marginBottom: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: lunitColors.teal,
    },
  },
  question: {
    padding: '20px 24px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: '18px',
    fontWeight: 500,
    color: lunitColors.headingColor,
  },
  answer: {
    padding: '0 24px 20px',
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: '15px',
    fontWeight: 300,
    color: lunitColors.text,
    lineHeight: 1.7,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: `1px solid ${lunitColors.grey}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    '&.expanded': {
      borderColor: lunitColors.teal,
      bgcolor: lunitColors.teal,
      color: lunitColors.black,
    },
  },
};

// ============================================
// TIMELINE STYLES (from lunit.css)
// ============================================
export const lunitTimelineStyles = {
  yearNav: {
    display: 'flex',
    gap: '16px',
    marginBottom: '40px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  yearButton: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: '32px',
    fontWeight: 300,
    color: lunitColors.grey,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 16px',
    transition: 'all 0.3s ease',
    '&.active': {
      color: lunitColors.headingColor,
    },
    '&:hover': {
      color: lunitColors.teal,
    },
  },
  // Year opacity cascade (like lunit.css)
  yearOpacities: [1, 0.5, 0.3, 0.2, 0.1],
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  milestone: {
    padding: '24px 0',
    borderBottom: `1px solid ${lunitColors.lightGray}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
};

// ============================================
// TESTIMONIAL STYLES (from lunit.css)
// ============================================
export const lunitTestimonialStyles = {
  container: {
    bgcolor: lunitColors.darkerGray,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  quote: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontSize: 'clamp(20px, 3vw, 28px)',
    fontWeight: 300,
    color: lunitColors.white,
    lineHeight: 1.5,
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center' as const,
    '&::before': {
      content: '"""',
      display: 'block',
      fontSize: '60px',
      color: lunitColors.teal,
      lineHeight: 1,
      marginBottom: '20px',
    },
  },
  author: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '32px',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    bgcolor: lunitColors.teal,
    color: lunitColors.black,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: lunitTypography.fontFamilyHeading,
    fontWeight: 500,
    fontSize: '20px',
  },
  authorInfo: {
    textAlign: 'left' as const,
  },
  authorName: {
    fontFamily: lunitTypography.fontFamilyHeading,
    fontWeight: 500,
    fontSize: '18px',
    color: lunitColors.white,
  },
  authorRole: {
    fontFamily: lunitTypography.fontFamilyBody,
    fontWeight: 300,
    fontSize: '14px',
    color: lunitColors.grey,
  },
  separator: {
    width: '40px',
    height: '1px',
    bgcolor: lunitColors.teal,
    margin: '24px auto',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '32px',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: 'rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&.active': {
      bgcolor: lunitColors.teal,
    },
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.6)',
    },
  },
};

// ============================================
// PARTNER LOGOS STYLES (from lunit.css)
// ============================================
export const lunitPartnerStyles = {
  container: {
    overflow: 'hidden',
    position: 'relative' as const,
    '&::before, &::after': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      width: '100px',
      zIndex: 2,
    },
    '&::before': {
      left: 0,
      background: 'linear-gradient(90deg, white 0%, transparent 100%)',
    },
    '&::after': {
      right: 0,
      background: 'linear-gradient(-90deg, white 0%, transparent 100%)',
    },
  },
  track: {
    display: 'flex',
    gap: '60px',
    animation: 'scroll 30s linear infinite',
  },
  logo: {
    flexShrink: 0,
    opacity: 0.6,
    transition: 'opacity 0.3s ease',
    '&:hover': {
      opacity: 1,
    },
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '40px',
    alignItems: 'center',
    justifyItems: 'center',
  },
};

// ============================================
// LINK WITH ICON STYLES (from lunit.css)
// ============================================
export const lunitLinkStyles = {
  withIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: '16px',
    fontWeight: 500,
    color: lunitColors.darkerGray,
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    '& .icon': {
      transition: 'transform 0.3s ease',
    },
    '&:hover': {
      color: lunitColors.teal,
      '& .icon': {
        transform: 'translateX(4px)',
      },
    },
  },
  withIconLight: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: lunitTypography.fontFamilyBody,
    fontSize: '16px',
    fontWeight: 500,
    color: lunitColors.white,
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    '& .icon': {
      transition: 'transform 0.3s ease',
    },
    '&:hover': {
      color: lunitColors.teal,
      '& .icon': {
        transform: 'translateX(4px)',
      },
    },
  },
};

// ============================================
// BREAKPOINTS (matching MUI defaults)
// ============================================
export const lunitBreakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

const lunitDesignSystem = {
  colors: lunitColors,
  typography: lunitTypography,
  spacing: lunitSpacing,
  shadows: lunitShadows,
  radius: lunitRadius,
  buttonStyles: lunitButtonStyles,
  gradients: lunitGradients,
  componentStyles: lunitComponentStyles,
  transitions: lunitTransitions,
  animations: lunitAnimations,
  cardStyles: lunitCardStyles,
  heroStyles: lunitHeroStyles,
  statsStyles: lunitStatsStyles,
  faqStyles: lunitFAQStyles,
  timelineStyles: lunitTimelineStyles,
  testimonialStyles: lunitTestimonialStyles,
  partnerStyles: lunitPartnerStyles,
  linkStyles: lunitLinkStyles,
  breakpoints: lunitBreakpoints,
};

export default lunitDesignSystem;