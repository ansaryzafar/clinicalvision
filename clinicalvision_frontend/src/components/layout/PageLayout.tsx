import React from 'react';
import { Box, Typography, Button, Container, Stack, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { Assessment, LinkedIn, Twitter, GitHub } from '@mui/icons-material';
import {
  lunitColors,
  lunitTypography,
  lunitGradients,
  lunitSpacing,
} from '../../styles/lunitDesignSystem';

// Footer Link Data
const footerLinks = {
  product: [
    { label: 'Features', path: ROUTES.FEATURES },
    { label: 'Pricing', path: ROUTES.PRICING },
    { label: 'Demo', path: ROUTES.DEMO },
    { label: 'API', path: ROUTES.API },
  ],
  company: [
    { label: 'About', path: ROUTES.ABOUT },
    { label: 'Careers', path: ROUTES.CAREERS },
    { label: 'Research', path: ROUTES.RESEARCH },
    { label: 'Contact', path: ROUTES.CONTACT },
  ],
  resources: [
    { label: 'Documentation', path: ROUTES.DOCUMENTATION },
    { label: 'Blog', path: ROUTES.BLOG },
    { label: 'Support', path: ROUTES.SUPPORT },
    { label: 'Status', path: ROUTES.STATUS },
  ],
  legal: [
    { label: 'Privacy', path: ROUTES.PRIVACY },
    { label: 'Terms', path: ROUTES.TERMS },
    { label: 'Security', path: ROUTES.SECURITY },
    { label: 'Compliance', path: ROUTES.COMPLIANCE },
  ],
};

interface PageHeaderProps {
  variant?: 'light' | 'dark';
}

export const PageHeader: React.FC<PageHeaderProps> = ({ variant = 'light' }) => {
  const navigate = useNavigate();
  const isDark = variant === 'dark';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        bgcolor: isDark 
          ? alpha(lunitColors.darkerGray, 0.95) 
          : alpha(lunitColors.white, 0.95),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(isDark ? lunitColors.white : lunitColors.darkerGray, 0.1)}`,
      }}
    >
      <Box sx={{ maxWidth: lunitSpacing.maxWidth, mx: 'auto', px: lunitSpacing.sectionPaddingX }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            onClick={() => navigate(ROUTES.HOME)}
          >
            <Box
              component="img"
              src="/images/clinicalvision-logo.svg"
              alt="ClinicalVision"
              sx={{
                height: 36,
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontWeight: lunitTypography.fontWeightMedium,
                fontSize: '18px',
                color: isDark ? lunitColors.white : lunitColors.headingColor,
              }}
            >
              ClinicalVision
            </Typography>
          </Box>
          <Stack direction="row" spacing={3} alignItems="center">
            <Button
              onClick={() => navigate(ROUTES.HOME)}
              sx={{
                color: isDark ? lunitColors.grey : lunitColors.darkerGray,
                fontFamily: lunitTypography.fontFamilyBody,
                textTransform: 'none',
                fontSize: '14px',
                '&:hover': { color: lunitColors.teal },
              }}
            >
              Home
            </Button>
            <Button
              onClick={() => navigate(ROUTES.FEATURES)}
              sx={{
                color: isDark ? lunitColors.grey : lunitColors.darkerGray,
                fontFamily: lunitTypography.fontFamilyBody,
                textTransform: 'none',
                fontSize: '14px',
                '&:hover': { color: lunitColors.teal },
              }}
            >
              Features
            </Button>
            <Button
              onClick={() => navigate(ROUTES.PRICING)}
              sx={{
                color: isDark ? lunitColors.grey : lunitColors.darkerGray,
                fontFamily: lunitTypography.fontFamilyBody,
                textTransform: 'none',
                fontSize: '14px',
                '&:hover': { color: lunitColors.teal },
              }}
            >
              Pricing
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.DEMO)}
              sx={{
                bgcolor: lunitColors.black,
                color: lunitColors.white,
                fontFamily: lunitTypography.fontFamilyBody,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '100px',
                px: 3,
                '&:hover': {
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                },
              }}
            >
              Request Demo
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export const PageFooter: React.FC = () => {
  const navigate = useNavigate();

  const FooterLinkSection = ({ 
    title, 
    links 
  }: { 
    title: string; 
    links: { label: string; path: string }[] 
  }) => (
    <Box sx={{ flex: 1 }}>
      <Typography
        sx={{
          mb: 2.5,
          fontFamily: lunitTypography.fontFamilyBody,
          fontWeight: 600,
          fontSize: '15px',
          letterSpacing: '0.02em',
          color: lunitColors.darkerGray,
          borderBottom: `1.1px solid ${lunitColors.darkGrey}`,
          pb: 1.25,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={2}>
        {links.map((item) => (
          <Typography
            key={item.label}
            onClick={() => navigate(item.path)}
            sx={{
              color: lunitColors.darkGrey,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '12px',
              fontWeight: 300,
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              '&:hover': { color: lunitColors.tealDarker },
            }}
          >
            {item.label}
          </Typography>
        ))}
      </Stack>
    </Box>
  );

  return (
    <Box
      sx={{
        bgcolor: lunitColors.lightestGray,
        color: lunitColors.darkerGray,
        py: { xs: '60px', md: '80px' },
        pb: { xs: '90px', md: '120px' },
        position: 'relative',
        overflow: 'hidden',
        zIndex: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: lunitGradients.footerGradient,
          bottom: 0,
          right: 0,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '100% 0%',
          zIndex: -1,
        },
      }}
    >
      <Box sx={{ maxWidth: lunitSpacing.maxWidth, mx: 'auto', px: lunitSpacing.sectionPaddingX, position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: '40px', md: '60px' } }}>
          {/* Brand Section */}
          <Box sx={{ flex: '0 0 33%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${lunitColors.teal} 0%, ${lunitColors.tealDarker} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(lunitColors.teal, 0.3)}`,
                }}
              >
                <Assessment sx={{ color: lunitColors.black, fontSize: 26 }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontWeight: lunitTypography.fontWeightMedium,
                    fontSize: '18px',
                    lineHeight: 1.2,
                    color: lunitColors.darkerGray,
                  }}
                >
                  ClinicalVision
                </Typography>
                <Typography
                  sx={{
                    color: lunitColors.darkGrey,
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}
                >
                  AI Platform
                </Typography>
              </Box>
            </Box>
            <Typography
              sx={{
                color: lunitColors.darkGrey,
                lineHeight: 1.85,
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '14px',
                maxWidth: '320px',
              }}
            >
              AI-powered cancer detection platform empowering healthcare professionals
              with intelligent diagnostic tools.
            </Typography>
          </Box>

          {/* Link Sections */}
          <FooterLinkSection title="Product" links={footerLinks.product} />
          <FooterLinkSection title="Company" links={footerLinks.company} />
          <FooterLinkSection title="Resources" links={footerLinks.resources} />
          <FooterLinkSection title="Legal" links={footerLinks.legal} />
        </Box>

        {/* Bottom Bar */}
        <Box
          sx={{
            mt: 8,
            pt: 4,
            borderTop: `1px solid ${alpha(lunitColors.darkGrey, 0.3)}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            sx={{
              color: lunitColors.darkerGray,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '12px',
              fontWeight: 300,
            }}
          >
            © 2026 ClinicalVision AI. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            {[
              { icon: <LinkedIn fontSize="small" />, label: 'LinkedIn' },
              { icon: <Twitter fontSize="small" />, label: 'Twitter' },
              { icon: <GitHub fontSize="small" />, label: 'GitHub' },
            ].map((social) => (
              <Box
                key={social.label}
                sx={{
                  color: lunitColors.darkGrey,
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': { color: lunitColors.tealDarker },
                }}
              >
                {social.icon}
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 300,
                  }}
                >
                  {social.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

interface PageLayoutProps {
  children: React.ReactNode;
  headerVariant?: 'light' | 'dark';
  showFooter?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  headerVariant = 'light',
  showFooter = true,
}) => {
  return (
    <Box sx={{ bgcolor: lunitColors.white, minHeight: '100vh' }}>
      <PageHeader variant={headerVariant} />
      <Box sx={{ pt: '72px' }}>
        {children}
      </Box>
      {showFooter && <PageFooter />}
    </Box>
  );
};

// Hero Section Component
interface PageHeroProps {
  label?: string;
  title: string | React.ReactNode;
  subtitle?: string;
  dark?: boolean;
  size?: 'default' | 'small';
  children?: React.ReactNode;
}

export const PageHero: React.FC<PageHeroProps> = ({
  label,
  title,
  subtitle,
  dark = false,
  size = 'default',
  children,
}) => {
  const paddingTop = size === 'small' 
    ? { xs: '60px', md: '80px' } 
    : { xs: '80px', md: '120px' };
  const paddingBottom = size === 'small' 
    ? { xs: '40px', md: '60px' } 
    : { xs: '60px', md: '100px' };

  return (
    <Box
      sx={{
        pt: paddingTop,
        pb: paddingBottom,
        bgcolor: dark ? lunitColors.darkerGray : lunitColors.white,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: dark 
            ? `radial-gradient(ellipse at 100% 0%, ${alpha(lunitColors.teal, 0.15)} 0%, transparent 60%)`
            : lunitGradients.heroAccent,
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ maxWidth: '800px' }}>
          {label && (
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: lunitColors.teal,
                mb: 2,
              }}
            >
              {label}
            </Typography>
          )}
          <Typography
            variant="h1"
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: size === 'small' 
                ? 'clamp(32px, 5vw, 48px)' 
                : 'clamp(40px, 6vw, 64px)',
              fontWeight: lunitTypography.fontWeightLight,
              lineHeight: 1.1,
              color: dark ? lunitColors.white : lunitColors.headingColor,
              mb: subtitle ? 3 : 0,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: lunitTypography.fontWeightLight,
                lineHeight: 1.8,
                color: dark ? lunitColors.grey : lunitColors.text,
                maxWidth: '600px',
              }}
            >
              {subtitle}
            </Typography>
          )}
          {children}
        </Box>
      </Container>
    </Box>
  );
};

// Section Component
interface PageSectionProps {
  children: React.ReactNode;
  background?: 'white' | 'light' | 'dark';
  paddingY?: 'default' | 'small' | 'large';
}

export const PageSection: React.FC<PageSectionProps> = ({
  children,
  background = 'white',
  paddingY = 'default',
}) => {
  const bgColors = {
    white: lunitColors.white,
    light: lunitColors.lightestGray,
    dark: lunitColors.darkerGray,
  };

  const padding = {
    default: { xs: '60px', md: '80px' },
    small: { xs: '40px', md: '60px' },
    large: { xs: '80px', md: '120px' },
  };

  return (
    <Box
      sx={{
        py: padding[paddingY],
        bgcolor: bgColors[background],
      }}
    >
      <Container maxWidth="lg">
        {children}
      </Container>
    </Box>
  );
};

// CTA Section Component
interface CTASectionProps {
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonPath: string;
  variant?: 'light' | 'dark';
}

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  subtitle,
  buttonText,
  buttonPath,
  variant = 'light',
}) => {
  const navigate = useNavigate();
  const isDark = variant === 'dark';

  return (
    <Box
      sx={{
        py: { xs: '60px', md: '80px' },
        bgcolor: isDark ? lunitColors.darkerGray : lunitColors.lightestGray,
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: lunitTypography.fontWeightLight,
            color: isDark ? lunitColors.white : lunitColors.headingColor,
            mb: 2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: 300,
              color: isDark ? lunitColors.grey : lunitColors.text,
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            {subtitle}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={() => navigate(buttonPath)}
          sx={{
            bgcolor: isDark ? lunitColors.teal : lunitColors.black,
            color: isDark ? lunitColors.black : lunitColors.white,
            fontFamily: lunitTypography.fontFamilyBody,
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: '100px',
            px: 4,
            py: 1.5,
            '&:hover': {
              bgcolor: isDark ? lunitColors.white : lunitColors.teal,
              color: lunitColors.black,
            },
          }}
        >
          {buttonText}
        </Button>
      </Container>
    </Box>
  );
};

export default PageLayout;
