import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Stack,
  alpha,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import {
  LinkedIn,
  Twitter,
  GitHub,
  KeyboardArrowDown,
  Menu as MenuIcon,
  ArrowForward,
} from '@mui/icons-material';
import {
  lunitColors,
  lunitTypography,
  lunitGradients,
  lunitSpacing,
} from '../../styles/lunitDesignSystem';
import { useScrollReveal } from '../../hooks/useScrollReveal';

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

// Navigation items — matching LandingPage structure exactly
const navItems = [
  {
    label: 'Products',
    hasDropdown: true,
    children: [
      { label: 'Features', path: ROUTES.FEATURES },
      { label: 'Pricing', path: ROUTES.PRICING },
      { label: 'Demo', path: ROUTES.DEMO },
      { label: 'API', path: ROUTES.API },
    ],
  },
  { label: 'Technology', hasDropdown: false, path: ROUTES.FEATURES },
  {
    label: 'About',
    hasDropdown: true,
    children: [
      { label: 'About Us', path: ROUTES.ABOUT },
      { label: 'Careers', path: ROUTES.CAREERS },
      { label: 'Research', path: ROUTES.RESEARCH },
      { label: 'Contact', path: ROUTES.CONTACT },
    ],
  },
  {
    label: 'Resources',
    hasDropdown: true,
    children: [
      { label: 'Documentation', path: ROUTES.DOCUMENTATION },
      { label: 'Blog', path: ROUTES.BLOG },
      { label: 'Support', path: ROUTES.SUPPORT },
      { label: 'System Status', path: ROUTES.STATUS },
    ],
  },
];

interface PageHeaderProps {
  variant?: 'light' | 'dark';
}

export const PageHeader: React.FC<PageHeaderProps> = ({ variant = 'light' }) => {
  const navigate = useNavigate();
  const isDark = variant === 'dark';
  const [scrolled, setScrolled] = useState(false);
  const [menuAnchors, setMenuAnchors] = useState<Record<string, HTMLElement | null>>({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleNavOpen = (label: string, el: HTMLElement) =>
    setMenuAnchors((prev) => ({ ...prev, [label]: el }));
  const handleNavClose = (label: string) =>
    setMenuAnchors((prev) => ({ ...prev, [label]: null }));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const textColor = isDark
    ? scrolled ? lunitColors.darkerGray : lunitColors.white
    : lunitColors.text;

  return (
    <>
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        bgcolor: scrolled
          ? 'rgba(255, 255, 255, 0.98)'
          : isDark
            ? alpha(lunitColors.darkerGray, 0.95)
            : 'rgba(255, 255, 255, 0.95)',
        borderBottom: scrolled
          ? `1px solid ${alpha(lunitColors.lightGray, 0.5)}`
          : isDark
            ? `1px solid ${alpha(lunitColors.white, 0.1)}`
            : 'none',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.3s ease-in-out',
        boxShadow: scrolled ? '0 2px 20px rgba(35, 50, 50, 0.08)' : 'none',
      }}
    >
      <Box sx={{ maxWidth: '1440px', width: '100%', mx: 'auto', px: { xs: '20px', lg: '60px' } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: scrolled ? '14px' : '20px',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          {/* Logo — same size and style as LandingPage */}
          <Box
            onClick={() => navigate(ROUTES.HOME)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              lineHeight: 0,
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'scale(1.02)' },
            }}
          >
            <Box
              component="img"
              src="/images/clinicalvision-logo.svg?v=11"
              alt="ClinicalVision AI Logo"
              sx={{
                height: { xs: 52, md: 72 },
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0, 201, 234, 0.15))',
              }}
            />
          </Box>

          {/* Main Navigation — 4 items with dropdowns, matching LandingPage */}
          <Stack
            direction="row"
            spacing={0}
            alignItems="center"
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            {navItems.map((item) => (
              <React.Fragment key={item.label}>
                <Button
                  onClick={(e) => {
                    if (item.hasDropdown && item.children) {
                      handleNavOpen(item.label, e.currentTarget);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  endIcon={
                    item.hasDropdown ? (
                      <KeyboardArrowDown sx={{ fontSize: '18px !important', ml: -0.5 }} />
                    ) : undefined
                  }
                  sx={{
                    textTransform: 'none',
                    color: scrolled ? lunitColors.text : textColor,
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: '15px',
                    fontWeight: 400,
                    px: 2.5,
                    py: 1.25,
                    borderRadius: '8px',
                    letterSpacing: '0.01em',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(lunitColors.lightestGray, 0.7),
                      color: lunitColors.tealDarker,
                    },
                  }}
                >
                  {item.label}
                </Button>
                {item.hasDropdown && item.children && (
                  <Menu
                    anchorEl={menuAnchors[item.label] || null}
                    open={Boolean(menuAnchors[item.label])}
                    onClose={() => handleNavClose(item.label)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1,
                          minWidth: 200,
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                          border: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                        },
                      },
                    }}
                  >
                    {item.children.map((child) => (
                      <MenuItem
                        key={child.label}
                        onClick={() => {
                          navigate(child.path);
                          handleNavClose(item.label);
                        }}
                        sx={{
                          fontFamily: '"Lexend", sans-serif',
                          fontSize: '14px',
                          fontWeight: 400,
                          py: 1.5,
                          px: 2.5,
                          color: lunitColors.text,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha(lunitColors.teal, 0.08),
                            color: lunitColors.tealDarker,
                          },
                        }}
                      >
                        {child.label}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </React.Fragment>
            ))}
          </Stack>

          {/* Right Actions — Sign In + Get Started + Mobile Hamburger */}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: scrolled ? lunitColors.text : textColor,
              }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Button
                variant="text"
                onClick={() => navigate(ROUTES.LOGIN)}
                sx={{
                  textTransform: 'none',
                  color: scrolled ? lunitColors.text : textColor,
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '15px',
                  fontWeight: 500,
                  px: 2.5,
                  py: 1,
                  borderRadius: '8px',
                  letterSpacing: '0.01em',
                  '&:hover': { bgcolor: alpha(lunitColors.lightestGray, 0.7) },
                }}
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.REGISTER)}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 500,
                  fontSize: '15px',
                  px: 3.5,
                  py: 1.25,
                  bgcolor: lunitColors.black,
                  color: lunitColors.white,
                  boxShadow: 'none',
                  transition: 'all 0.4s ease-in-out',
                  '&:hover': {
                    bgcolor: lunitColors.teal,
                    color: lunitColors.black,
                    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.4)',
                  },
                }}
              >
                Get Started
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>

    {/* Mobile Navigation Drawer */}
    <Drawer
      anchor="right"
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      PaperProps={{ sx: { width: 300, bgcolor: lunitColors.white, pt: 2 } }}
    >
      <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: lunitColors.text }}>
          <ArrowForward />
        </IconButton>
      </Box>
      <List>
        {navItems.map((item) => (
          <React.Fragment key={item.label}>
            {item.hasDropdown && item.children ? (
              <>
                <ListItem sx={{ px: 3, py: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: lunitColors.grey,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {item.label}
                  </Typography>
                </ListItem>
                {item.children.map((child) => (
                  <ListItemButton
                    key={child.label}
                    onClick={() => {
                      navigate(child.path);
                      setMobileDrawerOpen(false);
                    }}
                    sx={{ px: 4, py: 1.5, '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) } }}
                  >
                    <ListItemText
                      primary={child.label}
                      primaryTypographyProps={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: '15px',
                        fontWeight: 400,
                        color: lunitColors.text,
                      }}
                    />
                  </ListItemButton>
                ))}
                <Divider sx={{ my: 1 }} />
              </>
            ) : (
              <ListItemButton
                onClick={() => {
                  if (item.path) navigate(item.path);
                  setMobileDrawerOpen(false);
                }}
                sx={{ px: 3, py: 1.5, '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) } }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: lunitColors.text,
                  }}
                />
              </ListItemButton>
            )}
          </React.Fragment>
        ))}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => { navigate(ROUTES.LOGIN); setMobileDrawerOpen(false); }}
            sx={{
              borderRadius: '100px',
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              borderColor: lunitColors.lightGray,
              color: lunitColors.text,
              '&:hover': { borderColor: lunitColors.teal, color: lunitColors.tealDarker },
            }}
          >
            Sign In
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => { navigate(ROUTES.REGISTER); setMobileDrawerOpen(false); }}
            sx={{
              borderRadius: '100px',
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              bgcolor: lunitColors.black,
              color: lunitColors.white,
              '&:hover': { bgcolor: lunitColors.teal, color: lunitColors.black },
            }}
          >
            Get Started
          </Button>
        </Box>
      </List>
    </Drawer>
    </>
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
            <Box
              component="img"
              src="/images/clinicalvision-logo.svg?v=11"
              alt="ClinicalVision AI"
              sx={{ height: 36, width: 'auto', mb: 3, display: 'block' }}
            />
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
              { icon: <LinkedIn fontSize="small" />, label: 'LinkedIn', url: 'https://linkedin.com/company/clinicalvision' },
              { icon: <Twitter fontSize="small" />, label: 'Twitter', url: 'https://twitter.com/clinicalvision' },
              { icon: <GitHub fontSize="small" />, label: 'GitHub', url: 'https://github.com/clinicalvision' },
            ].map((social) => (
              <Box
                key={social.label}
                component="a"
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: lunitColors.darkGrey,
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textDecoration: 'none',
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
      <Box sx={{ pt: { xs: '70px', md: '100px' } }}>
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
        background: dark ? lunitGradients.pageBannerBg : lunitColors.white,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient overlays */}
      {dark ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: lunitGradients.pageBannerOverlay,
            pointerEvents: 'none',
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: lunitGradients.heroAccent,
            pointerEvents: 'none',
          }}
        />
      )}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            maxWidth: '800px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
          }}
        >
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
                color: dark ? alpha(lunitColors.white, 0.8) : lunitColors.text,
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
  const { ref, isVisible } = useScrollReveal(0.1);

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
      ref={ref}
      sx={{
        py: padding[paddingY],
        bgcolor: bgColors[background],
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
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
  const { ref, isVisible } = useScrollReveal(0.15);
  const isDark = variant === 'dark';

  return (
    <Box
      ref={ref}
      sx={{
        py: { xs: '60px', md: '80px' },
        bgcolor: isDark ? lunitColors.darkerGray : lunitColors.lightestGray,
        textAlign: 'center',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
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
