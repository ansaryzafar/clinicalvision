import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Popper,
  Paper,
  Fade,
  Chip,
  ClickAwayListener,
} from '@mui/material';
import {
  ArrowForward,
  CheckCircle,
  Biotech,
  Psychology,
  Science,
  TrendingUp,
  KeyboardArrowDown,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Visibility as ViewsIcon,
  CheckCircleOutline,
  WarningAmber,
  FiberManualRecord,
  BiotechOutlined,
  AirOutlined,
  SearchOutlined,
  ScienceOutlined,
  ArchitectureOutlined,
  MenuBookOutlined,
  SecurityOutlined,
  DescriptionOutlined,
  CodeOutlined,
  ArticleOutlined,
  SupportAgentOutlined,
  BusinessOutlined,
  WorkOutlineOutlined,
  HandshakeOutlined,
  EventOutlined,
  ContactMailOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES, DEFAULT_AUTH_REDIRECT } from '../routes/paths';
import { useAuth } from '../contexts/AuthContext';

// Import Lunit animations CSS
import '../styles/lunit-animations.css';

// Lunit-inspired CSS variables
const lunitColors = {
  teal: '#00C9EA',
  tealDarker: '#0F95AB',
  black: '#000000',
  white: '#FFFFFF',
  darkerGray: '#233232',
  darkGrey: '#5C6A6B',
  grey: '#95A3A4',
  lightGray: '#CFD6D7',
  lightestGray: '#EFF0F4',
  headingColor: '#151515',
  headingColor2: '#233232',
  text: '#233232',
};

// Custom hook for scroll reveal animations
const useScrollReveal = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
};

// Custom hook for animated counter
const useCountUp = (end: number, duration = 2000, shouldStart = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (shouldStart && !hasStarted) {
      setHasStarted(true);
    }
  }, [shouldStart, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [hasStarted, end, duration]);

  return count;
};

// Animated Stat Card Component
interface StatCardProps {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
  index: number;
  isVisible: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ value, prefix, suffix, label, index, isVisible }) => {
  const count = useCountUp(value, 2000, isVisible);
  
  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        textAlign: 'center',
        position: 'relative',
        width: 'fit-content',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`,
        cursor: 'default',
        '@media (hover: hover)': {
          '&:hover': {
            transform: isVisible ? 'translateY(-4px)' : 'translateY(20px)',
            '& .stat-number': {
              color: '#00C9EA',
            },
            '& .stat-divider::after': {
              left: '-10%',
              right: '-10%',
            },
          },
        },
      }}
    >
      <Typography
        className="stat-number"
        variant="h2"
        sx={{
          fontFamily: '"ClashGrotesk", system-ui, sans-serif',
          fontSize: 'clamp(45px, calc(45px + (100 - 45) * ((100vw - 320px) / (1600))), 100px)',
          fontWeight: 400,
          lineHeight: 'clamp(50px, calc(50px + (120 - 50) * ((100vw - 320px) / 1600)), 120px)',
          color: lunitColors.darkerGray,
          m: 0,
          letterSpacing: '-0.02em',
          width: '100%',
          textAlign: 'center',
          transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {prefix}{count.toLocaleString()}{suffix}
      </Typography>
      {/* Divider line - Lunit stat-line style */}
      <Box
        className="stat-divider"
        sx={{
          height: 0,
          position: 'relative',
          width: '100%',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            top: '-1px',
            bgcolor: lunitColors.grey,
            height: '1.2px',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      />
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Lexend", sans-serif',
          fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
          fontWeight: 400,
          lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
          color: lunitColors.black,
          m: 0,
          letterSpacing: '0.01em',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Scroll reveal refs for sections
  const statsReveal = useScrollReveal(0.2);
  const reimaginingReveal = useScrollReveal(0.15);
  const productReveal = useScrollReveal(0.15);
  const technologyReveal = useScrollReveal(0.15);
  const aiCareReveal = useScrollReveal(0.15);
  const partneringReveal = useScrollReveal(0.15);
  const testimonialsReveal = useScrollReveal(0.15);
  const newsReveal = useScrollReveal(0.15);
  const ctaReveal = useScrollReveal(0.2);
  const aiUnderstandReveal = useScrollReveal(0.15);
  const investorReveal = useScrollReveal(0.15);
  const demoDataReveal = useScrollReveal(0.15);

  // Track scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(DEFAULT_AUTH_REDIRECT, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // ── Solutions mega-dropdown data ──────────────────────────────────────
  const solutionsClinicalItems = [
    { label: 'Breast Cancer Detection', description: 'AI-powered mammography analysis', path: ROUTES.SOLUTION_BREAST_CANCER, status: 'live' as const, icon: <BiotechOutlined sx={{ fontSize: 22, color: lunitColors.teal }} /> },
    { label: 'Lung Cancer Detection', description: 'Thoracic imaging AI', path: ROUTES.SOLUTION_LUNG_CANCER, status: 'coming' as const, icon: <AirOutlined sx={{ fontSize: 22, color: lunitColors.grey }} /> },
    { label: 'Prostate Cancer Detection', description: 'Histopathology grading AI', path: ROUTES.SOLUTION_PROSTATE_CANCER, status: 'coming' as const, icon: <SearchOutlined sx={{ fontSize: 22, color: lunitColors.grey }} /> },
    { label: 'Colorectal Cancer Detection', description: 'Colorectal pathology AI', path: ROUTES.SOLUTION_COLORECTAL_CANCER, status: 'coming' as const, icon: <ScienceOutlined sx={{ fontSize: 22, color: lunitColors.grey }} /> },
  ];
  const solutionsPlatformItems = [
    { label: 'Clinical Analysis Platform', description: 'End-to-end clinical workflow', path: ROUTES.FEATURES },
    { label: 'Pricing', description: 'Transparent pricing', path: ROUTES.PRICING },
  ];

  // Navigation items — new 4-item structure
  type NavChild = { label: string; description?: string; path: string; icon?: React.ReactNode };
  type NavItem =
    | { label: string; type: 'solutions' }
    | { label: string; type: 'dropdown'; children: NavChild[] }
    | { label: string; type: 'link'; path: string };

  const navItems: NavItem[] = [
    { label: 'Solutions', type: 'solutions' },
    {
      label: 'Technology',
      type: 'dropdown',
      children: [
        { label: 'AI Models & Architecture', description: 'Core technology deep-dive', path: ROUTES.TECHNOLOGY, icon: <ArchitectureOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Research & Validation', description: 'Peer-reviewed publications', path: ROUTES.RESEARCH, icon: <ScienceOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Security & Compliance', description: 'Trust & regulatory', path: ROUTES.SECURITY, icon: <SecurityOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
      ],
    },
    {
      label: 'Resources',
      type: 'dropdown',
      children: [
        { label: 'Documentation', description: 'Guides & references', path: ROUTES.DOCUMENTATION, icon: <DescriptionOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'API Reference', description: 'Integration tools', path: ROUTES.API, icon: <CodeOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Insights', description: 'Thought leadership', path: ROUTES.BLOG, icon: <ArticleOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Support', description: 'Help & FAQs', path: ROUTES.SUPPORT, icon: <SupportAgentOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
      ],
    },
    {
      label: 'Company',
      type: 'dropdown',
      children: [
        { label: 'About ClinicalVision', description: 'Our mission & team', path: ROUTES.ABOUT, icon: <BusinessOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Careers', description: 'Join us', path: ROUTES.CAREERS, icon: <WorkOutlineOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Partners', description: 'Collaborate with us', path: ROUTES.PARTNERS, icon: <HandshakeOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Events', description: 'Conferences & webinars', path: ROUTES.EVENTS, icon: <EventOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
        { label: 'Contact Us', description: 'Get in touch', path: ROUTES.CONTACT, icon: <ContactMailOutlined sx={{ fontSize: 20, color: lunitColors.grey }} /> },
      ],
    },
  ];

  // Dropdown menu state (keyed by nav label) — mutual exclusion: only one open at a time
  const [menuAnchors, setMenuAnchors] = useState<Record<string, HTMLElement | null>>({});
  const handleNavOpen = (label: string, el: HTMLElement) => {
    // Close all other dropdowns, open only this one
    setMenuAnchors(prev => {
      const reset: Record<string, HTMLElement | null> = {};
      Object.keys(prev).forEach(k => { reset[k] = null; });
      return { ...reset, [label]: el };
    });
  };
  const handleNavClose = (label: string) => setMenuAnchors(prev => ({ ...prev, [label]: null }));

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Social link data
  const socialLinks = [
    { label: 'LinkedIn', url: 'https://linkedin.com/company/clinicalvision' },
    { label: 'Twitter', url: 'https://twitter.com/clinicalvision' },
    { label: 'GitHub', url: 'https://github.com/ansaryzafar/clinicalvision' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: lunitColors.white }}>
      {/* Enhanced Navigation Bar - Lunit Style */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: scrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
          borderBottom: scrolled ? `1px solid ${alpha(lunitColors.lightGray, 0.5)}` : 'none',
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
            {/* Logo Section - Using Custom SVG Logo */}
            <Box 
              onClick={() => navigate(ROUTES.HOME)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                lineHeight: 0,
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
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
            
            {/* Main Navigation — Solutions mega-dropdown + 3 standard dropdowns */}
            <Stack 
              direction="row" 
              spacing={0} 
              alignItems="center"
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              {navItems.map((item) => (
                <React.Fragment key={item.label}>
                  <Button
                    aria-haspopup={item.type !== 'link' ? 'true' : undefined}
                    aria-expanded={item.type !== 'link' ? Boolean(menuAnchors[item.label]) : undefined}
                    onClick={(e) => {
                      if (item.type === 'link') {
                        navigate(item.path);
                      } else {
                        handleNavOpen(item.label, e.currentTarget);
                      }
                    }}
                    endIcon={
                      item.type !== 'link' ? (
                        <KeyboardArrowDown
                          sx={{
                            fontSize: '18px !important',
                            ml: -0.5,
                            transition: 'transform 0.2s ease',
                            transform: Boolean(menuAnchors[item.label]) ? 'rotate(180deg)' : 'none',
                          }}
                        />
                      ) : undefined
                    }
                    sx={{
                      textTransform: 'none',
                      color: lunitColors.text,
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

                  {/* ── Solutions mega-dropdown ─────────────────────────── */}
                  {item.type === 'solutions' && (
                    <Popper
                      open={Boolean(menuAnchors[item.label])}
                      anchorEl={menuAnchors[item.label] || null}
                      placement="bottom-start"
                      transition
                      disablePortal={false}
                      sx={{ zIndex: 1200 }}
                    >
                      {({ TransitionProps }) => (
                        <ClickAwayListener onClickAway={() => handleNavClose(item.label)}>
                          <Fade {...TransitionProps} timeout={200}>
                            <Paper
                              elevation={0}
                              sx={{
                                mt: 1.5,
                                borderRadius: '16px',
                                border: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                                boxShadow: '0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 560,
                              }}
                            >
                            <Box sx={{ display: 'flex' }}>
                              {/* Left column — Clinical AI */}
                              <Box sx={{ flex: 1, p: 3, borderRight: `1px solid ${alpha(lunitColors.lightGray, 0.4)}` }}>
                                <Typography
                                  sx={{
                                    fontFamily: '"Lexend", sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: lunitColors.grey,
                                    mb: 2,
                                  }}
                                >
                                  Clinical AI
                                </Typography>
                                <Stack spacing={0.5}>
                                  {solutionsClinicalItems.map((sol, solIdx) => (
                                    <Box
                                      key={sol.label}
                                      onClick={() => { navigate(sol.path); handleNavClose(item.label); }}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1.5,
                                        px: 1.5,
                                        py: 1.25,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        animation: `itemSlideIn 0.2s ease-out ${solIdx * 0.04}s both`,
                                        '@keyframes itemSlideIn': {
                                          '0%': { opacity: 0, transform: 'translateX(-8px)' },
                                          '100%': { opacity: 1, transform: 'translateX(0)' },
                                        },
                                        '&:hover': {
                                          bgcolor: alpha(lunitColors.teal, 0.06),
                                          transform: 'translateX(4px)',
                                          '& .dropdown-chevron': { opacity: 1 },
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '2px', minWidth: 24 }}>{sol.icon}</Box>
                                      <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                          <Typography
                                            sx={{
                                              fontFamily: '"Lexend", sans-serif',
                                              fontSize: '14px',
                                              fontWeight: 500,
                                              color: lunitColors.text,
                                            }}
                                          >
                                            {sol.label}
                                          </Typography>
                                          {sol.status === 'live' ? (
                                            <Chip
                                              icon={<FiberManualRecord sx={{ fontSize: '8px !important', animation: 'statusPulse 2s ease-in-out infinite', '@keyframes statusPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />}
                                              label="Available"
                                              size="small"
                                              sx={{
                                                height: 20,
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                fontFamily: '"Lexend", sans-serif',
                                                bgcolor: alpha('#22C55E', 0.1),
                                                color: '#16A34A',
                                                '& .MuiChip-icon': { color: '#22C55E', ml: '4px' },
                                              }}
                                            />
                                          ) : (
                                            <Chip
                                              label="In Development"
                                              size="small"
                                              sx={{
                                                height: 20,
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                fontFamily: '"Lexend", sans-serif',
                                                bgcolor: alpha('#F97316', 0.1),
                                                color: '#EA580C',
                                              }}
                                            />
                                          )}
                                        </Box>
                                        <Typography
                                          sx={{
                                            fontFamily: '"Lexend", sans-serif',
                                            fontSize: '12px',
                                            color: lunitColors.grey,
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {sol.description}
                                        </Typography>
                                      </Box>
                                      <ChevronRight className="dropdown-chevron" sx={{ fontSize: 16, color: lunitColors.grey, opacity: 0, transition: 'opacity 0.2s ease', mt: '4px' }} />
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>

                              {/* Right column — Platform */}
                              <Box sx={{ width: 220, p: 3, bgcolor: alpha(lunitColors.lightestGray, 0.4) }}>
                                <Typography
                                  sx={{
                                    fontFamily: '"Lexend", sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: lunitColors.grey,
                                    mb: 2,
                                  }}
                                >
                                  Platform
                                </Typography>
                                <Stack spacing={0.5}>
                                  {solutionsPlatformItems.map((pItem) => (
                                    <Box
                                      key={pItem.label}
                                      onClick={() => { navigate(pItem.path); handleNavClose(item.label); }}
                                      sx={{
                                        px: 1.5,
                                        py: 1.25,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          bgcolor: alpha(lunitColors.teal, 0.08),
                                          transform: 'translateX(4px)',
                                        },
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontFamily: '"Lexend", sans-serif',
                                          fontSize: '14px',
                                          fontWeight: 500,
                                          color: lunitColors.text,
                                          mb: 0.25,
                                        }}
                                      >
                                        {pItem.label}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontFamily: '"Lexend", sans-serif',
                                          fontSize: '12px',
                                          color: lunitColors.grey,
                                        }}
                                      >
                                        {pItem.description}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            </Box>
                            {/* Promotional footer bar */}
                            <Box
                              onClick={() => { navigate(ROUTES.DEMO); handleNavClose(item.label); }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 3,
                                py: 1.5,
                                borderTop: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                                bgcolor: alpha(lunitColors.teal, 0.04),
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: alpha(lunitColors.teal, 0.08),
                                },
                              }}
                            >
                              <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '13px', fontWeight: 500, color: lunitColors.tealDarker }}>
                                Request a personalized demo →
                              </Typography>
                            </Box>
                            </Paper>
                          </Fade>
                        </ClickAwayListener>
                      )}
                    </Popper>
                  )}

                  {/* ── Standard dropdowns (Technology / Resources / Company) */}
                  {item.type === 'dropdown' && (
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
                            minWidth: 240,
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(35, 50, 50, 0.12), 0 4px 20px rgba(35, 50, 50, 0.06)',
                            border: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                            py: 1,
                          },
                        },
                      }}
                    >
                      {item.children.map((child, childIdx) => (
                        <MenuItem
                          key={child.label}
                          onClick={() => {
                            navigate(child.path);
                            handleNavClose(item.label);
                          }}
                          sx={{
                            py: 1.5,
                            px: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            transition: 'all 0.2s ease',
                            animation: `itemSlideIn 0.2s ease-out ${childIdx * 0.04}s both`,
                            '@keyframes itemSlideIn': {
                              '0%': { opacity: 0, transform: 'translateX(-8px)' },
                              '100%': { opacity: 1, transform: 'translateX(0)' },
                            },
                            '&:hover': {
                              bgcolor: alpha(lunitColors.teal, 0.06),
                              transform: 'translateX(4px)',
                              '& .dropdown-chevron': { opacity: 1 },
                            },
                          }}
                        >
                          {child.icon && (
                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 24 }}>{child.icon}</Box>
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontFamily: '"Lexend", sans-serif',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: lunitColors.text,
                              }}
                            >
                              {child.label}
                            </Typography>
                            {child.description && (
                              <Typography
                                sx={{
                                  fontFamily: '"Lexend", sans-serif',
                                  fontSize: '12px',
                                  color: lunitColors.grey,
                                  mt: 0.25,
                                }}
                              >
                                {child.description}
                              </Typography>
                            )}
                          </Box>
                          <ChevronRight className="dropdown-chevron" sx={{ fontSize: 16, color: lunitColors.grey, opacity: 0, transition: 'opacity 0.2s ease' }} />
                        </MenuItem>
                      ))}
                    </Menu>
                  )}
                </React.Fragment>
              ))}
            </Stack>

            {/* Right Actions — Login + Request a Demo */}
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Mobile Menu */}
              <IconButton
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  color: lunitColors.text,
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
                    color: lunitColors.text,
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    borderRadius: '8px',
                    letterSpacing: '0.01em',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      bgcolor: alpha(lunitColors.lightestGray, 0.7),
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(ROUTES.DEMO)}
                  sx={{
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    px: 3.5,
                    py: 1.25,
                    bgcolor: lunitColors.black,
                    color: lunitColors.white,
                    boxShadow: 'none',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Request a Demo
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Backdrop overlay when dropdown is open */}
      {Object.values(menuAnchors).some(Boolean) && (
        <Box
          onClick={() => {
            setMenuAnchors(prev => {
              const reset: Record<string, HTMLElement | null> = {};
              Object.keys(prev).forEach(k => { reset[k] = null; });
              return reset;
            });
          }}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1099,
            bgcolor: 'rgba(0, 0, 0, 0.03)',
            backdropFilter: 'blur(2px)',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: lunitColors.white,
            pt: 2,
          },
        }}
      >
        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: lunitColors.text }}>
            <ArrowForward />
          </IconButton>
        </Box>
        <List>
          {/* Solutions section */}
          <ListItem sx={{ px: 3, py: 0.5 }}>
            <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '12px', fontWeight: 600, color: lunitColors.grey, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Solutions
            </Typography>
          </ListItem>
          {solutionsClinicalItems.map((sol) => (
            <ListItemButton
              key={sol.label}
              onClick={() => { navigate(sol.path); setMobileDrawerOpen(false); }}
              sx={{ px: 4, py: 1.5, '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) } }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{sol.label}</span>
                    {sol.status === 'live' ? (
                      <Chip label="Available" size="small" sx={{ height: 18, fontSize: '9px', fontWeight: 700, fontFamily: '"Lexend", sans-serif', bgcolor: alpha('#22C55E', 0.1), color: '#16A34A' }} />
                    ) : (
                      <Chip label="In Dev" size="small" sx={{ height: 18, fontSize: '9px', fontWeight: 700, fontFamily: '"Lexend", sans-serif', bgcolor: alpha('#F97316', 0.1), color: '#EA580C' }} />
                    )}
                  </Box>
                }
                primaryTypographyProps={{ fontFamily: '"Lexend", sans-serif', fontSize: '15px', fontWeight: 400, color: lunitColors.text }}
              />
            </ListItemButton>
          ))}
          {solutionsPlatformItems.map((pItem) => (
            <ListItemButton
              key={pItem.label}
              onClick={() => { navigate(pItem.path); setMobileDrawerOpen(false); }}
              sx={{ px: 4, py: 1.5, '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) } }}
            >
              <ListItemText
                primary={pItem.label}
                primaryTypographyProps={{ fontFamily: '"Lexend", sans-serif', fontSize: '15px', fontWeight: 400, color: lunitColors.text }}
              />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1 }} />

          {/* Standard dropdown sections */}
          {navItems.filter((item): item is Extract<NavItem, { type: 'dropdown' }> => item.type === 'dropdown').map((item) => (
            <React.Fragment key={item.label}>
              <ListItem sx={{ px: 3, py: 0.5 }}>
                <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '12px', fontWeight: 600, color: lunitColors.grey, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {item.label}
                </Typography>
              </ListItem>
              {item.children.map((child) => (
                <ListItemButton
                  key={child.label}
                  onClick={() => { navigate(child.path); setMobileDrawerOpen(false); }}
                  sx={{ px: 4, py: 1.5, '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) } }}
                >
                  <ListItemText
                    primary={child.label}
                    primaryTypographyProps={{ fontFamily: '"Lexend", sans-serif', fontSize: '15px', fontWeight: 400, color: lunitColors.text }}
                  />
                </ListItemButton>
              ))}
              <Divider sx={{ my: 1 }} />
            </React.Fragment>
          ))}

          <Box sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { navigate(ROUTES.LOGIN); setMobileDrawerOpen(false); }}
              sx={{
                borderRadius: '100px', textTransform: 'none', fontFamily: '"Lexend", sans-serif',
                fontWeight: 600, borderColor: lunitColors.lightGray, color: lunitColors.text,
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { borderColor: lunitColors.teal, color: lunitColors.tealDarker, transform: 'translateY(-2px)' },
                '&:active': { transform: 'translateY(0px) scale(0.98)', transition: 'all 0.1s ease' },
                '&:focus-visible': { outline: '2px solid #00C9EA', outlineOffset: '3px', boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)' },
              }}
            >
              Login
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => { navigate(ROUTES.DEMO); setMobileDrawerOpen(false); }}
              sx={{
                borderRadius: '100px', textTransform: 'none', fontFamily: '"Lexend", sans-serif',
                fontWeight: 600, bgcolor: lunitColors.black, color: lunitColors.white,
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { bgcolor: lunitColors.teal, color: lunitColors.black, transform: 'translateY(-2px)' },
                '&:active': { transform: 'translateY(0px) scale(0.98)', transition: 'all 0.1s ease' },
                '&:focus-visible': { outline: '2px solid #00C9EA', outlineOffset: '3px', boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)' },
              }}
            >
              Request a Demo
            </Button>
          </Box>
        </List>
      </Drawer>

      {/* Spacer for fixed navbar */}
      <Box sx={{ height: { xs: '70px', md: '80px' } }} />

      {/* Hero Section - Lunit Supreme Style with Full Width Background */}
      <Box
        component="section"
        className="lunit-hero lunit-hero-wrapper lunit-hero--light"
        sx={{
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
          bgcolor: lunitColors.white,
          /* Lunit exact padding values from CSS */
          pt: { xs: '119px', sm: '147px', md: '211px', lg: '230px' },
          pb: { xs: '118px', sm: '118px', md: '200px', lg: '275px' },
          /* Hero background image with gradient accent overlay */
          backgroundImage: {
            xs: `radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(86, 193, 77, 0.1) 0%, transparent 40%), url('/images/hero/landing-hero-data-eye-640w.webp')`,
            sm: `radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(86, 193, 77, 0.1) 0%, transparent 40%), url('/images/hero/landing-hero-data-eye-960w.webp')`,
            md: `radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(86, 193, 77, 0.1) 0%, transparent 40%), url('/images/hero/landing-hero-data-eye-1280w.webp')`,
            lg: `radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(86, 193, 77, 0.1) 0%, transparent 40%), url('/images/hero/landing-hero-data-eye-1920w.webp')`,
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Gradient overlay ::before - Lunit exact light hero pattern */}
        <Box
          sx={{
            content: '""',
            position: 'absolute',
            width: '100%',
            height: '100%',
            bottom: 0,
            left: 0,
            zIndex: 2,
            background: {
              xs: `radial-gradient(48.49% 33.36% at 102.17% 0%, #FF5321 0%, rgba(255, 83, 33, 0.1) 62.98%, rgba(255, 83, 33, 0) 99.99%),
                   radial-gradient(23.77% 21.79% at 0% 103.15%, #FFE205 21.82%, rgba(255, 194, 5, 0) 100%),
                   radial-gradient(33.09% 26.16% at 3.69% 101.55%, #56C14D 36.41%, rgba(86, 193, 77, 0) 100%),
                   radial-gradient(52.82% 57.47% at 0.66% 121.84%, #00C9EA 70.62%, rgba(0, 201, 234, 0.4) 87.58%, rgba(0, 201, 234, 0) 100%),
                   linear-gradient(90deg, rgb(255, 255, 255) 10%, rgba(255, 255, 255, 0.5) 110%)`,
              md: `radial-gradient(25.58% 36.75% at 98.07% 3.74%, #FF5321 0%, rgba(255, 83, 33, 0.1) 62.98%, rgba(255, 83, 33, 0) 99.99%),
                   radial-gradient(17.32% 24.96% at 0% 100%, #FFE205 21.82%, rgba(255, 194, 5, 0) 100%),
                   radial-gradient(24.05% 48.99% at 0% 100%, #56C14D 30%, rgba(86, 193, 77, 0) 100%),
                   radial-gradient(36.63% 58.37% at 0% 102.08%, ${lunitColors.teal} 57.5%, rgba(0, 201, 234, 0.4) 78.36%, rgba(0, 201, 234, 0) 100%),
                   linear-gradient(90deg, rgb(255, 255, 255) 50%, rgba(255, 255, 255, 0) 110%)`,
            },
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '100% 0%',
            pointerEvents: 'none',
          }}
        />
        
        {/* Decorative wave pattern ::after - Lunit Light-Banner-Pattern.svg style */}
        <Box
          sx={{
            content: '""',
            position: 'absolute',
            width: '100%',
            height: '100%',
            bottom: 0,
            left: 0,
            zIndex: 2,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 120'%3E%3Cpath d='M0,60 Q360,120 720,60 T1440,60 L1440,120 L0,120 Z' fill='none' stroke='rgba(0,201,234,0.15)' stroke-width='2'/%3E%3Cpath d='M0,80 Q360,140 720,80 T1440,80' fill='none' stroke='rgba(86,193,77,0.1)' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'bottom center',
            backgroundSize: '100% auto',
            pointerEvents: 'none',
          }}
        />
        
        {/* Hero Container - lunit-hero__container - matches css-1lr6jaq */}
        <Box
          className="lunit-hero__container"
          sx={{ 
            position: 'relative',
            zIndex: 10,
            top: '-29px',
            maxWidth: '1440px',
            mx: 'auto',
            width: '100%',
            /* Lunit container-spacing: 40px on tablet, 15px on mobile, 0 on desktop >1480px */
            px: { xs: '15px', sm: '40px', lg: 0 },
          }}
        >
          {/* Hero Wrap - lunit-hero__hero-wrap */}
          <Box
            className="lunit-hero__hero-wrap"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: '20px', md: '30px' }, /* --spacing-xl */
              width: '100%',
            }}
          >
            {/* Hero Content - lunit-hero__content */}
            <Box 
              className="lunit-hero__content"
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: '20px', md: '30px' }, /* --spacing-xl */
                maxWidth: '1104px',
                width: '100%',
              }}
            >
              {/* Main Headline - lunit-hero__headline - 6xl size */}
              <Typography
                variant="h1"
                className="lunit-hero__headline"
                sx={{
                  fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                  fontSize: 'clamp(45px, calc(45px + (100 - 45) * ((100vw - 320px) / (1600))), 100px)',
                  fontWeight: 300,
                  lineHeight: 'clamp(50px, calc(50px + (120 - 50) * ((100vw - 320px) / 1600)), 120px)',
                  color: lunitColors.headingColor,
                  letterSpacing: '-0.03em',
                  maxWidth: '1080px',
                  textWrap: 'balance',
                  m: 0,
                }}
              >
                Precision Intelligence
                <Box component="span" sx={{ display: 'block' }}>
                  with Quantified Certainty
                </Box>
              </Typography>

              {/* Text Group - lunit-hero__text-group */}
              <Box 
                className="lunit-hero__text-group"
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: { xs: '10px', md: '15px' }, /* --spacing-sm */
                  maxWidth: '915px' 
                }}
              >
                {/* Subtitle - lunit-hero__subheading */}
                <Typography
                  variant="h3"
                  className="lunit-hero__subheading"
                  sx={{
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                    fontSize: 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / (1600))), 40px)',
                    fontWeight: 400,
                    lineHeight: 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
                    color: lunitColors.headingColor2,
                    m: 0,
                  }}
                >
                  Explainable. Validated. Trusted.
                </Typography>

                {/* Description - lunit-hero__description */}
                <Typography
                  className="lunit-hero__description"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.text,
                    m: 0,
                    textWrap: 'balance',
                    maxWidth: { xs: '100%', lg: '68%' },
                  }}
                >
                  From mammogram to actionable insight — every flagged region includes visual evidence, confidence quantification, and clinical reasoning. Designed for the decisions that matter most.
                </Typography>
              </Box>

              {/* CTA Buttons - lunit-hero__buttons */}
              <Box 
                className="lunit-hero__buttons"
                sx={{ 
                  display: 'flex', 
                  gap: { xs: '20px', md: '30px' }, /* --spacing-xl */
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  className="btn btn-lg btn-primary"
                  onClick={() => navigate(ROUTES.DEMO)}
                endIcon={<ArrowForward />}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                  lineHeight: 'clamp(20px, calc(20px + (24 - 20) * ((100vw - 320px) / 1600)), 24px)',
                  px: '30px',
                  py: '9px',
                  bgcolor: lunitColors.black,
                  color: lunitColors.white,
                  boxShadow: 'none',
                  gap: '10px',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                  '&:hover': {
                    bgcolor: lunitColors.teal,
                    color: lunitColors.black,
                    boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                    transform: 'translateY(-2px)',
                    '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
              >
                Request a Demo
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate(ROUTES.LOGIN)}
                endIcon={<ArrowForward />}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                  lineHeight: 'clamp(20px, calc(20px + (24 - 20) * ((100vw - 320px) / 1600)), 24px)',
                  px: '30px',
                  py: '9px',
                  borderColor: lunitColors.black,
                  borderWidth: '1px',
                  color: lunitColors.black,
                  gap: '10px',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    bgcolor: 'rgba(0, 201, 234, 0.04)',
                    borderWidth: '1px',
                    color: lunitColors.teal,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                    '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
              >
                Sign In
              </Button>
            </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Stats Section - Lunit Supreme Stats Style with 4 columns */}
      <Box 
        ref={statsReveal.ref}
        sx={{ 
          py: { xs: '90px', md: '120px' }, 
          bgcolor: lunitColors.white,
          opacity: statsReveal.isVisible ? 1 : 0,
          transform: statsReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box
          sx={{
            maxWidth: '1440px',
            mx: 'auto',
            px: { xs: '20px', lg: 0 },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: '40px 20px', md: '0 159px' },
              justifyContent: 'center',
              width: '100%',
              alignItems: 'start',
              justifyItems: 'center',
            }}
          >
            <StatCard value={100} suffix="%" label="Fully Explainable Outputs" index={0} isVisible={statsReveal.isVisible} />
            <StatCard value={95} suffix="%+" label="Diagnostic Accuracy" index={1} isVisible={statsReveal.isVisible} />
            <StatCard value={3} prefix="<" suffix="s" label="Time to Insight" index={2} isVisible={statsReveal.isVisible} />
            <StatCard value={4} suffix="+" label="Layers of Evidence" index={3} isVisible={statsReveal.isVisible} />
          </Box>
        </Box>
      </Box>

      {/* Reimagining Section - Lunit Technology Hero Exact Design */}
      <Box
        component="section"
        className="supreme-lunit-technology-hero"
        sx={{
          px: { xs: 0, md: 'var(--container-spacing, 40px)', lg: 'var(--container-spacing, 40px)' },
          py: { xs: 0, md: 6 },
        }}
      >
        <Box
          ref={reimaginingReveal.ref}
          className="lunit-technology-hero lunit-technology-hero--bg-right-bottom lunit-technology-hero--align-left"
          sx={{
            position: 'relative',
            background: lunitColors.black,
            backgroundImage: {
              xs: 'none',
              md: 'radial-gradient(ellipse at 90% 90%, rgba(0, 201, 234, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(86, 193, 77, 0.2) 0%, transparent 40%)',
            },
            backgroundSize: { md: 'auto', lg: 'auto' },
            backgroundPosition: 'right bottom',
            backgroundRepeat: 'no-repeat',
            padding: { xs: '64px 0 0', md: '80px 0' },
            overflow: 'hidden',
            borderRadius: { xs: 0, md: '16px' },
            width: '100%',
            maxWidth: '1440px',
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: { xs: 'auto', md: '600px' },
            flexDirection: { xs: 'column', md: 'row' },
            opacity: reimaginingReveal.isVisible ? 1 : 0,
            transform: reimaginingReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.8s ease-out 0.1s, transform 0.8s ease-out 0.1s',
            /* Section hover triggers scan animation */
            '&:hover .scan-frame': {
              animation: 'scanPulseActive 1s ease-in-out infinite !important',
            },
            '&:hover .scan-corner': {
              opacity: '1 !important',
              filter: 'drop-shadow(0 0 8px #E53935)',
            },
            '&:hover .scan-glow': {
              opacity: '0.9 !important',
            },
            /* ::after gradient overlay */
            '&::after': {
              content: '""',
              position: 'absolute',
              background: {
                xs: 'radial-gradient(41% 24% at 100% 104.06%, rgba(86, 193, 77, 0.8) 10.86%, rgba(0, 201, 234, 0.5) 44.88%, rgba(0, 201, 234, 0) 68.35%)',
                md: 'radial-gradient(18.79% 40% at 100% 104.06%, rgba(86, 193, 77, 0.8) 10.86%, rgba(0, 201, 234, 0.5) 44.88%, rgba(0, 201, 234, 0) 68.35%), linear-gradient(90deg, rgb(0, 0, 0) 35%, rgba(0, 0, 0, 0) 70%)',
              },
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right bottom',
              width: '100%',
              height: '100%',
              bottom: 0,
              right: 0,
              zIndex: 0,
            },
            /* ::before pattern overlay */
            '&::before': {
              content: '""',
              position: 'absolute',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 170'%3E%3Cpath d='M0,85 Q360,170 720,85 T1440,85 L1440,170 L0,170 Z' fill='none' stroke='rgba(0,201,234,0.2)' stroke-width='1.5'/%3E%3Cpath d='M0,110 Q360,170 720,110 T1440,110' fill='none' stroke='rgba(86,193,77,0.15)' stroke-width='1'/%3E%3Cpath d='M0,135 Q360,170 720,135 T1440,135' fill='none' stroke='rgba(0,201,234,0.1)' stroke-width='0.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right bottom',
              backgroundSize: { xs: '60%', md: '100%' },
              width: '100%',
              height: '170px',
              bottom: 0,
              right: 0,
              zIndex: 1,
            },
          }}
        >
          {/* Animated Scanning Square on Mammogram Heatmap */}
          <Box
            className="scan-zone"
            sx={{
              position: 'absolute',
              top: 'calc(25% + 150px)',
              right: 'calc(15% - 110px)',
              width: '140px',
              height: '140px',
              zIndex: 10,
              display: { xs: 'none', md: 'block' },
              pointerEvents: 'none',
            }}
          >
            {/* Main scanning frame */}
            <Box
              className="scan-frame"
              sx={{
                position: 'absolute',
                inset: 0,
                border: '3px solid #E53935',
                borderRadius: '4px',
                boxShadow: '0 0 25px rgba(229, 57, 53, 0.6), inset 0 0 15px rgba(229, 57, 53, 0.15)',
              }}
            />
            {/* Corner accents - Top Left */}
            <Box
              className="scan-corner"
              sx={{
                position: 'absolute',
                top: -4,
                left: -4,
                width: '28px',
                height: '28px',
                borderTop: '5px solid #E53935',
                borderLeft: '5px solid #E53935',
                borderRadius: '4px 0 0 0',
                transition: 'all 0.3s ease',
              }}
            />
            {/* Corner accents - Top Right */}
            <Box
              className="scan-corner"
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: '28px',
                height: '28px',
                borderTop: '5px solid #E53935',
                borderRight: '5px solid #E53935',
                borderRadius: '0 4px 0 0',
                transition: 'all 0.3s ease',
              }}
            />
            {/* Corner accents - Bottom Left */}
            <Box
              className="scan-corner"
              sx={{
                position: 'absolute',
                bottom: -4,
                left: -4,
                width: '28px',
                height: '28px',
                borderBottom: '5px solid #E53935',
                borderLeft: '5px solid #E53935',
                borderRadius: '0 0 0 4px',
                transition: 'all 0.3s ease',
              }}
            />
            {/* Corner accents - Bottom Right */}
            <Box
              className="scan-corner"
              sx={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: '28px',
                height: '28px',
                borderBottom: '5px solid #E53935',
                borderRight: '5px solid #E53935',
                borderRadius: '0 0 4px 0',
                transition: 'all 0.3s ease',
              }}
            />
            {/* Inner glow effect */}
            <Box
              className="scan-glow"
              sx={{
                position: 'absolute',
                inset: '10%',
                background: 'radial-gradient(circle, rgba(229, 57, 53, 0.5) 0%, transparent 70%)',
                opacity: 0.6,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none',
              }}
            />
          </Box>

          {/* Container */}
          <Box
            className="lunit-technology-hero__container"
            sx={{
              maxWidth: '1440px',
              width: '100%',
              mx: 'auto',
              px: { xs: '15px', sm: '24px', md: '48px' },
              position: 'relative',
              zIndex: 5,
            }}
          >
            {/* Content */}
            <Box
              className="lunit-technology-hero__content"
              sx={{
                maxWidth: { xs: '100%', md: '900px' },
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: '24px', md: '32px' },
                position: 'relative',
                zIndex: 3,
              }}
            >
              {/* Header */}
              <Box className="lunit-technology-hero__header" sx={{ maxWidth: '900px', width: '100%' }}>
                <Typography
                  component="h2"
                  className="lunit-technology-hero__heading"
                  sx={{
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                    fontSize: 'clamp(32px, calc(32px + (56 - 32) * ((100vw - 320px) / (1600))), 56px)',
                    fontWeight: 300,
                    lineHeight: 1.15,
                    color: lunitColors.white,
                    margin: 0,
                    textWrap: 'balance',
                  }}
                >
                  From Black Box to Glass Box
                </Typography>
              </Box>

              {/* Body */}
              <Box
                className="lunit-technology-hero__body"
                sx={{
                  maxWidth: { xs: '100%', md: '736px' },
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: '32px', md: '48px' },
                }}
              >
                {/* Text */}
                <Box className="lunit-technology-hero__text">
                  <Typography
                    component="p"
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / (1600))), 18px)',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color: lunitColors.white,
                      mb: '12px',
                    }}
                  >
                    Conventional AI delivers conclusions. ClinicalVision delivers evidence — attention 
                    heatmaps that highlight the precise regions driving each diagnostic assessment.
                  </Typography>
                  <Typography
                    component="p"
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / (1600))), 18px)',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color: lunitColors.white,
                      mb: '12px',
                    }}
                  >
                    Calibrated confidence scores quantify diagnostic certainty. Structured clinical reports 
                    integrate seamlessly into established radiology workflows.
                  </Typography>
                  <Typography
                    component="p"
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / (1600))), 18px)',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color: lunitColors.white,
                      mb: 0,
                    }}
                  >
                    Decision support that augments clinical expertise — never replaces it.
                  </Typography>
                </Box>

                {/* Button Wrapper */}
                <Box className="lunit-technology-hero__button-wrapper" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    className="btn btn-secondary-light btn-lg"
                    onClick={() => navigate(ROUTES.TECHNOLOGY)}
                    sx={{
                      borderRadius: '100px',
                      textTransform: 'none',
                      fontFamily: '"Lexend", sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      px: { xs: '24px', md: '32px' },
                      py: { xs: '8px', md: '12px' },
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      color: lunitColors.white,
                      bgcolor: 'transparent',
                      boxShadow: 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: lunitColors.white,
                        color: lunitColors.black,
                        borderColor: lunitColors.white,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(255, 255, 255, 0.2)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #00C9EA',
                        outlineOffset: '3px',
                        boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                      },
                    }}
                  >
                    Discover the Architecture
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Mobile Image Section - only visible on mobile */}
          <Box
            className="lunit-technology-hero__mobile-image"
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: '100%',
              mt: '24px',
              zIndex: 1,
              alignItems: 'flex-end',
              textAlign: 'right',
              justifyContent: 'flex-end',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(130deg, rgb(0, 0, 0) 30%, rgba(0, 0, 0, 0) 100%)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: '320px',
                height: '200px',
                display: 'block',
                background: 'radial-gradient(ellipse at center, rgba(0, 201, 234, 0.3) 0%, transparent 70%)',
                borderRadius: '8px',
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Product Section - Lunit Hero Light Style */}
      <Box 
        ref={productReveal.ref}
        className="lunit-hero lunit-hero--light"
        sx={{ 
          bgcolor: lunitColors.white, 
          color: lunitColors.headingColor, 
          py: { xs: '100px', md: '160px' },
          opacity: productReveal.isVisible ? 1 : 0,
          transform: productReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient - top right teal */}
        <Box
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '60%',
            height: '80%',
            background: `radial-gradient(ellipse at center, ${alpha(lunitColors.teal, 0.08)} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        
        {/* Background gradient - bottom left green */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '50%',
            height: '70%',
            background: `radial-gradient(ellipse at center, ${alpha('#56C14D', 0.05)} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        
        <Box 
          className="lunit-hero__container"
          sx={{ 
            maxWidth: '1440px', 
            mx: 'auto', 
            px: { xs: '15px', sm: '40px', lg: 0 },
            position: 'relative', 
            zIndex: 1 
          }}
        >
          <Box 
            className="lunit-hero__hero-wrap"
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', lg: 'row' }, 
              gap: { xs: '60px', lg: '80px' }, 
              alignItems: 'center' 
            }}
          >
            {/* Left: Visual */}
            <Box sx={{ flex: { xs: '1', lg: '0 0 48%' }, width: '100%' }}>
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: '350px', md: '480px' },
                  borderRadius: '24px',
                  overflow: 'hidden',
                  bgcolor: lunitColors.darkerGray,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.5s ease',
                  '&:hover': {
                    '& .product-img': {
                      transform: 'scale(1.04)',
                    },
                  },
                }}
              >
                {/* Product screenshot — AI heatmap analysis */}
                <Box
                  component="img"
                  className="product-img"
                  src="/images/screenshots/ai-heatmap-analysis-product.webp"
                  alt="ClinicalVision mammogram analysis with GradCAM++ heatmap overlay showing anatomical quadrant mapping and 78% confidence detection"
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                {/* Subtle gradient overlay at bottom for depth */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
                    pointerEvents: 'none',
                  }}
                />
                {/* Teal accent glow at corners */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 0% 100%, ${alpha(lunitColors.teal, 0.15)} 0%, transparent 40%)`,
                    pointerEvents: 'none',
                  }}
                />
              </Box>
            </Box>
            
            {/* Right: Content - Hero Style */}
            <Box 
              className="lunit-hero__content"
              sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: '20px', md: '30px' },
                maxWidth: '600px',
              }}
            >
              {/* Headline */}
              <Typography
                variant="h1"
                className="lunit-hero__headline"
                sx={{
                  fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                  fontSize: 'clamp(36px, calc(36px + (64 - 36) * ((100vw - 320px) / (1600))), 64px)',
                  fontWeight: 300,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: lunitColors.headingColor,
                  m: 0,
                }}
              >
                Mammogram AI
                <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
                  You Can Verify
                </Box>
              </Typography>

              {/* Text Group */}
              <Box 
                className="lunit-hero__text-group"
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: { xs: '12px', md: '16px' },
                }}
              >
                {/* Subheading */}
                <Typography
                  variant="h3"
                  className="lunit-hero__subheading"
                  sx={{
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                    fontSize: 'clamp(20px, calc(20px + (28 - 20) * ((100vw - 320px) / (1600))), 28px)',
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: lunitColors.headingColor2,
                    m: 0,
                  }}
                >
                  Inspect the regions. Examine the reasoning. Validate with confidence.
                </Typography>

                {/* Description */}
                <Typography
                  className="lunit-hero__description"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / (1600))), 18px)',
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color: lunitColors.text,
                    m: 0,
                  }}
                >
                  Every finding includes GradCAM attention maps, confidence scores, and anatomical 
                  coordinates. Review AI decisions in seconds, not minutes.
                </Typography>
              </Box>

              {/* Buttons - Lunit Style */}
              <Box 
                className="lunit-hero__buttons"
                sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mt: 2,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  className="btn btn-lg btn-primary"
                  onClick={() => navigate(ROUTES.DEMO)}
                  sx={{
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    px: 4,
                    py: 1.5,
                    bgcolor: lunitColors.black,
                    color: lunitColors.white,
                    boxShadow: 'none',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                    '&:hover': {
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                      transform: 'translateY(-2px)',
                      '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Launch Clinical Demo
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(ROUTES.DOCUMENTATION)}
                  sx={{
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    px: 4,
                    py: 1.5,
                    borderColor: lunitColors.black,
                    borderWidth: '1.5px',
                    color: lunitColors.black,
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      borderColor: lunitColors.teal,
                      bgcolor: 'rgba(0, 201, 234, 0.04)',
                      borderWidth: '1.5px',
                      color: lunitColors.teal,
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Technical Documentation
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Technology Hero Section - Lunit Dark Style with Mammogram Background */}
      <Box 
        ref={technologyReveal.ref}
        sx={{ 
          py: { xs: '30px', md: '60px' },
          opacity: technologyReveal.isVisible ? 1 : 0,
          transform: technologyReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box sx={{ maxWidth: '1440px', mx: 'auto', px: { xs: '0', lg: '0' } }}>
          <Box
            sx={{
              position: 'relative',
              bgcolor: lunitColors.black,
              borderRadius: { xs: 0, md: '30px' },
              overflow: 'hidden',
              py: { xs: '90px', md: '120px' },
              px: { xs: '20px', md: '60px' },
              minHeight: { xs: 'auto', md: '500px' },
              display: 'flex',
              alignItems: 'center',
              /* Background image with subtle gradient accents */
              backgroundImage: `radial-gradient(ellipse at 90% 80%, rgba(0, 201, 234, 0.2) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(86, 193, 77, 0.15) 0%, transparent 40%), url('/images/sections/technology-plexus-network.webp')`,
              backgroundSize: 'cover',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Background gradient overlay - Lunit technology hero style */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(18.79% 40% at 100% 104.06%, rgba(86, 193, 77, 0.8) 10.86%, rgba(0, 201, 234, 0.5) 44.88%, rgba(0, 201, 234, 0) 68.35%),
                             linear-gradient(90deg, rgb(0, 0, 0) 35%, rgba(0, 0, 0, 0) 70%)`,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            
            {/* Decorative wave pattern at bottom */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '100%',
                height: '170px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 170'%3E%3Cpath d='M0,170 Q200,100 400,130 T800,100 L800,170 Z' fill='none' stroke='rgba(0,201,234,0.12)' stroke-width='1.5'/%3E%3Cpath d='M0,150 Q200,80 400,110 T800,80 L800,170 Z' fill='none' stroke='rgba(86,193,77,0.08)' stroke-width='1'/%3E%3Cpath d='M0,130 Q200,60 400,90 T800,60' fill='none' stroke='rgba(0,201,234,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
                backgroundSize: 'cover',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: '40px', md: '80px' }, alignItems: 'center', position: 'relative', zIndex: 2 }}>
              {/* Content Column */}
              <Box sx={{ flex: '0 0 58%' }}>
                <Box sx={{ maxWidth: '736px' }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                      fontSize: 'clamp(32px, calc(32px + (48 - 32) * ((100vw - 320px) / (1600))), 48px)',
                      fontWeight: 300,
                      lineHeight: 'clamp(40px, calc(40px + (60 - 40) * ((100vw - 320px) / 1600)), 60px)',
                      color: lunitColors.white,
                      mb: 2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Engineered for Transparency. End to End.
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                      fontSize: 'clamp(20px, calc(20px + (28 - 20) * ((100vw - 320px) / (1600))), 28px)',
                      fontWeight: 300,
                      lineHeight: 'clamp(28px, calc(28px + (36 - 28) * ((100vw - 320px) / 1600)), 36px)',
                      color: lunitColors.white,
                      mb: 4,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Every component designed to substantiate its output.
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                      fontWeight: 300,
                      lineHeight: 1.75,
                      color: lunitColors.white,
                      mb: 5,
                    }}
                  >
                    GradCAM++ heatmaps reveal attention regions. Monte Carlo Dropout quantifies 
                    diagnostic uncertainty. Integrated Gradients provide pixel-level attribution. 
                    A multi-layered evidence framework designed for clinical verification.
                  </Typography>
                  
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(ROUTES.TECHNOLOGY)}
                    sx={{
                      borderRadius: '100px',
                      textTransform: 'none',
                      fontFamily: '"Lexend", sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      px: 4,
                      py: 1.5,
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                      '&:hover': {
                        bgcolor: lunitColors.white,
                        color: lunitColors.black,
                        boxShadow: '0 6px 24px rgba(0, 201, 234, 0.4)',
                        transform: 'translateY(-2px)',
                        '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #00C9EA',
                        outlineOffset: '3px',
                        boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                      },
                    }}
                  >
                    View System Architecture
                  </Button>
                </Box>
              </Box>

              {/* Feature Cards Column */}
              <Box sx={{ flex: 1 }}>
                <Stack spacing={3}>
                  {[
                    { icon: <Psychology />, title: 'Attention-Based Heatmaps', desc: 'Visualize the precise regions driving each diagnostic assessment' },
                    { icon: <Science />, title: 'Calibrated Confidence Scores', desc: 'Quantified certainty that signals when additional clinical review is warranted' },
                    { icon: <TrendingUp />, title: 'Automated Clinical Reports', desc: 'Structured findings integrated directly into diagnostic workflows' },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 3,
                        borderRadius: '16px',
                        bgcolor: alpha(lunitColors.white, 0.05),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(lunitColors.white, 0.1)}`,
                        borderTop: `2px solid ${lunitColors.teal}`,
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          bgcolor: alpha(lunitColors.white, 0.1),
                          borderColor: alpha(lunitColors.teal, 0.5),
                          transform: 'translateX(8px)',
                          boxShadow: '0 -3px 0 0 #00C9EA',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: alpha(lunitColors.teal, 0.15),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {React.cloneElement(item.icon, { sx: { color: lunitColors.teal, fontSize: 26 } })}
                        </Box>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mb: 0.5, 
                              color: lunitColors.white,
                              fontFamily: '"ClashGrotesk", sans-serif',
                              fontWeight: 400,
                              fontSize: '20px',
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: alpha(lunitColors.white, 0.7),
                              fontFamily: '"Lexend", sans-serif',
                              fontSize: '14px',
                              fontWeight: 300,
                              lineHeight: 1.6,
                            }}
                          >
                            {item.desc}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Solutions Overview Section - Enhanced Design */}
      <Box 
        ref={aiCareReveal.ref}
        className="solutions-overview-wrapper"
        sx={{ 
          bgcolor: lunitColors.white, 
          py: { xs: '60px', md: '100px' },
          opacity: aiCareReveal.isVisible ? 1 : 0,
          transform: aiCareReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Box
          className="solutions-overview__container"
          sx={{ 
            maxWidth: '1440px',
            mx: 'auto',
            px: { xs: '15px', lg: '40px', xl: 0 },
          }}
        >
          {/* Section Header */}
          <Box 
            className="solutions-overview__header"
            sx={{ textAlign: 'left', mb: { xs: '48px', md: '64px' } }}
          >
            <Typography
              variant="h2"
              className="solutions-overview__title"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / (1600))), 60px)',
                fontWeight: 300,
                lineHeight: 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
                color: lunitColors.headingColor,
                letterSpacing: '-0.025em',
                m: 0,
              }}
            >
              One Platform. Complete Clinical Intelligence.
            </Typography>
          </Box>

          {/* Solutions Content */}
          <Box className="solutions-overview__content" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '50px', md: '60px' } }}>
            
            {/* ─── Mammogram Analysis Suite ─── */}
            <Box 
              className="solutions-overview__category"
              data-category="cancer-screening"
              sx={{
                display: 'flex',
                gap: { xs: '30px', md: '60px', lg: '80px' },
                alignItems: 'flex-start',
                flexDirection: { xs: 'column', md: 'row' },
              }}
            >
              {/* Category Info Panel */}
              <Box 
                className="solutions-overview__category-main"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: '15px', md: '20px' },
                  flex: '0 0 auto',
                  maxWidth: { xs: '100%', md: '468px' },
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                <Box className="solutions-overview__category-info" sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <Box 
                    className="solutions-overview__category-header"
                    sx={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                  >
                    <Box
                      className="solutions-overview__category-icon"
                      sx={{
                        flexShrink: 0,
                        width: { xs: '50px', md: '100px' },
                        height: { xs: '50px', md: '100px' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(lunitColors.teal, 0.1),
                        borderRadius: '16px',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        '&:hover': {
                          bgcolor: alpha(lunitColors.teal, 0.18),
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      <Biotech sx={{ color: lunitColors.teal, fontSize: { xs: 28, md: 56 } }} />
                    </Box>
                    <Typography
                      variant="h3"
                      className="solutions-overview__category-title"
                      sx={{
                        fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                        fontSize: 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / (1600))), 40px)',
                        fontWeight: 400,
                        lineHeight: 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
                        color: lunitColors.black,
                        m: 0,
                        flex: 1,
                      }}
                    >
                      Mammogram Analysis Suite
                    </Typography>
                  </Box>
                  
                  <Box 
                    className="solutions-overview__category-description"
                    sx={{ maxWidth: { xs: '100%', md: '85%' } }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                        fontWeight: 300,
                        lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                        color: lunitColors.text,
                        m: 0,
                        mb: '15px',
                      }}
                    >
                      Upload a mammogram. Receive instant AI-driven analysis with visual 
                      evidence mapping the precise regions driving each diagnostic assessment.
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                        fontWeight: 300,
                        lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                        color: lunitColors.text,
                        m: 0,
                      }}
                    >
                      Calibrated confidence scores and flagged uncertainties enable 
                      intelligent case prioritization and targeted clinical review.
                    </Typography>
                  </Box>
                </Box>
                
                <Box className="solutions-overview__category-cta" sx={{ mt: '10px' }}>
                  <Button
                    variant="contained"
                    size="large"
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate(ROUTES.DEMO)}
                    sx={{
                      borderRadius: '100px',
                      textTransform: 'none',
                      fontFamily: '"Lexend", sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                      px: '30px',
                      py: '9px',
                      bgcolor: lunitColors.black,
                      color: lunitColors.white,
                      boxShadow: 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: lunitColors.teal,
                        color: lunitColors.black,
                        boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #00C9EA',
                        outlineOffset: '3px',
                        boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                      },
                    }}
                  >
                    Begin Analysis
                  </Button>
                </Box>
              </Box>

              {/* Solutions Grid — Clickable items with subtitles */}
              <Box 
                className="solutions-overview__solutions"
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  pt: { xs: 0, md: '40px' },
                }}
              >
                <Box
                  className="solutions-overview__solutions-grid"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: { xs: '6px', md: '10px' },
                    maxWidth: { xs: '100%', md: '680px' },
                  }}
                >
                  {([
                    { title: 'Single-View Classification', subtitle: 'AI-powered single mammogram analysis', route: `${ROUTES.SOLUTION_BREAST_CANCER}#single-view-classification` },
                    { title: 'GradCAM Attention Maps', subtitle: 'Visual evidence heatmaps', route: `${ROUTES.TECHNOLOGY}#explainable-ai` },
                    { title: 'Dual-View Fusion Analysis', subtitle: 'CC + MLO combined diagnostic view', route: `${ROUTES.SOLUTION_BREAST_CANCER}#dual-view-fusion` },
                    { title: 'Uncertainty Metrics', subtitle: 'Calibrated confidence scoring', route: `${ROUTES.TECHNOLOGY}#uncertainty-quantification` },
                    { title: 'Bilateral Symmetry Analysis', subtitle: 'Left vs right breast comparison', route: `${ROUTES.SOLUTION_BREAST_CANCER}#bilateral-symmetry` },
                    { title: 'Clinical Narratives', subtitle: 'Structured diagnostic reports', route: `${ROUTES.SOLUTION_BREAST_CANCER}#clinical-narratives` },
                    { title: 'Historical Trending', subtitle: 'Track changes across prior studies', route: `${ROUTES.SOLUTION_BREAST_CANCER}#historical-trending` },
                    { title: 'Anatomical Mapping', subtitle: 'Precise lesion localisation', route: `${ROUTES.SOLUTION_BREAST_CANCER}#anatomical-mapping` },
                  ] as const).map((item, idx) => (
                    <Box
                      key={item.title}
                      className="solutions-overview__solution-item"
                      onClick={() => navigate(item.route)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.route); } }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        p: { xs: '10px 12px', md: '12px 16px' },
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: aiCareReveal.isVisible ? 1 : 0,
                        transform: aiCareReveal.isVisible ? 'translateY(0)' : 'translateY(16px)',
                        transitionDelay: aiCareReveal.isVisible ? `${0.15 + idx * 0.06}s` : '0s',
                        '&:hover': {
                          bgcolor: alpha(lunitColors.teal, 0.06),
                          transform: 'translateX(4px)',
                        },
                        '&:hover .solution-title': {
                          color: lunitColors.tealDarker,
                        },
                        '&:hover .solution-arrow': {
                          bgcolor: lunitColors.teal,
                          transform: 'translateX(3px)',
                          '& path': {
                            stroke: lunitColors.black,
                          },
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${lunitColors.teal}`,
                          outlineOffset: '2px',
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none',
                          transitionDelay: '0s !important',
                          opacity: '1 !important',
                          transform: 'none !important',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          className="solution-title"
                          sx={{
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: 'clamp(14px, calc(14px + (17 - 14) * ((100vw - 320px) / (1600))), 17px)',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: lunitColors.black,
                            transition: 'color 0.3s ease',
                            mb: '2px',
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          className="solution-subtitle"
                          sx={{
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / (1600))), 14px)',
                            fontWeight: 300,
                            lineHeight: 1.4,
                            color: lunitColors.darkGrey,
                          }}
                        >
                          {item.subtitle}
                        </Typography>
                      </Box>
                      <Box
                        className="solution-arrow"
                        sx={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: lunitColors.black,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }} />
                        </svg>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Animated Gradient Divider */}
            <Box className="solutions-overview__divider">
              <Box
                component="hr"
                sx={{
                  border: 'none',
                  height: '1px',
                  background: `linear-gradient(90deg, ${lunitColors.black} 0%, ${alpha(lunitColors.teal, 0.3)} 50%, transparent 100%)`,
                  m: 0,
                  opacity: 0.6,
                }}
              />
            </Box>

            {/* ─── Explainability Suite ─── */}
            <Box 
              className="solutions-overview__category"
              data-category="precision-oncology"
              sx={{
                display: 'flex',
                gap: { xs: '30px', md: '60px', lg: '80px' },
                alignItems: 'flex-start',
                flexDirection: { xs: 'column', md: 'row' },
              }}
            >
              <Box 
                className="solutions-overview__category-main"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: '15px', md: '20px' },
                  flex: '0 0 auto',
                  maxWidth: { xs: '100%', md: '468px' },
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                <Box className="solutions-overview__category-info" sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <Box 
                    className="solutions-overview__category-header"
                    sx={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                  >
                    <Box
                      className="solutions-overview__category-icon"
                      sx={{
                        flexShrink: 0,
                        width: { xs: '50px', md: '100px' },
                        height: { xs: '50px', md: '100px' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha('#FF5321', 0.1),
                        borderRadius: '16px',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        '&:hover': {
                          bgcolor: alpha('#FF5321', 0.18),
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      <Science sx={{ color: '#FF5321', fontSize: { xs: 28, md: 56 } }} />
                    </Box>
                    <Typography
                      variant="h3"
                      className="solutions-overview__category-title"
                      sx={{
                        fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                        fontSize: 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / (1600))), 40px)',
                        fontWeight: 400,
                        lineHeight: 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
                        color: lunitColors.black,
                        m: 0,
                        flex: 1,
                      }}
                    >
                      Explainability Suite
                    </Typography>
                  </Box>
                  
                  <Box 
                    className="solutions-overview__category-description"
                    sx={{ maxWidth: { xs: '100%', md: '85%' } }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                        fontWeight: 300,
                        lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                        color: lunitColors.text,
                        m: 0,
                        mb: '15px',
                      }}
                    >
                      Multiple explanation methods for every finding. Attention heatmaps, 
                      attribution scores, and structured clinical summaries — unified in a single diagnostic view.
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                        fontWeight: 300,
                        lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                        color: lunitColors.text,
                        m: 0,
                      }}
                    >
                      Integrated fairness monitoring validates diagnostic consistency 
                      across all patient demographics — a foundational requirement for responsible clinical AI.
                    </Typography>
                  </Box>
                </Box>
                
                <Box className="solutions-overview__category-cta" sx={{ mt: '10px' }}>
                  <Button
                    variant="contained"
                    size="large"
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate(ROUTES.FEATURES)}
                    sx={{
                      borderRadius: '100px',
                      textTransform: 'none',
                      fontFamily: '"Lexend", sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                      px: '30px',
                      py: '9px',
                      bgcolor: lunitColors.black,
                      color: lunitColors.white,
                      boxShadow: 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: '#FF5321',
                        color: lunitColors.white,
                        boxShadow: '0 6px 20px rgba(255, 83, 33, 0.3)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #FF5321',
                        outlineOffset: '3px',
                        boxShadow: '0 0 0 4px rgba(255, 83, 33, 0.15)',
                      },
                    }}
                  >
                    View Capabilities
                  </Button>
                </Box>
              </Box>

              {/* Explainability Solutions — clickable with subtitles */}
              <Box 
                className="solutions-overview__solutions"
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  pt: { xs: 0, md: '40px' },
                  maxWidth: { xs: '100%', md: '547px' },
                }}
              >
                <Box className="solutions-overview__solutions-single-column" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '6px', md: '10px' } }}>
                  {([
                    { title: 'Integrated Gradients Analysis', subtitle: 'Pixel-level attribution maps', route: `${ROUTES.TECHNOLOGY}#integrated-gradients` },
                    { title: 'Calibrated Confidence Scores', subtitle: 'Statistically validated outputs', route: `${ROUTES.TECHNOLOGY}#calibrated-confidence` },
                    { title: 'Fairness Monitoring Dashboard', subtitle: 'Demographic parity tracking', route: `${ROUTES.TECHNOLOGY}#fairness-monitoring` },
                  ] as const).map((item, idx) => (
                    <Box
                      key={item.title}
                      className="solutions-overview__solution-item"
                      onClick={() => navigate(item.route)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.route); } }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        p: { xs: '10px 12px', md: '12px 16px' },
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: aiCareReveal.isVisible ? 1 : 0,
                        transform: aiCareReveal.isVisible ? 'translateY(0)' : 'translateY(16px)',
                        transitionDelay: aiCareReveal.isVisible ? `${0.2 + idx * 0.08}s` : '0s',
                        '&:hover': {
                          bgcolor: alpha('#FF5321', 0.06),
                          transform: 'translateX(4px)',
                        },
                        '&:hover .solution-title': {
                          color: '#FF5321',
                        },
                        '&:hover .solution-arrow': {
                          bgcolor: '#FF5321',
                          transform: 'translateX(3px)',
                        },
                        '&:focus-visible': {
                          outline: '2px solid #FF5321',
                          outlineOffset: '2px',
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none',
                          transitionDelay: '0s !important',
                          opacity: '1 !important',
                          transform: 'none !important',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          className="solution-title"
                          sx={{
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: 'clamp(14px, calc(14px + (17 - 14) * ((100vw - 320px) / (1600))), 17px)',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: lunitColors.black,
                            transition: 'color 0.3s ease',
                            mb: '2px',
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          className="solution-subtitle"
                          sx={{
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / (1600))), 14px)',
                            fontWeight: 300,
                            lineHeight: 1.4,
                            color: lunitColors.darkGrey,
                          }}
                        >
                          {item.subtitle}
                        </Typography>
                      </Box>
                      <Box
                        className="solution-arrow"
                        sx={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: lunitColors.black,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }} />
                        </svg>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

          </Box>
        </Box>
      </Box>

      {/* Partnering Section - Lunit Style with Image Backgrounds */}
      <Box 
        ref={partneringReveal.ref}
        sx={{ 
          bgcolor: lunitColors.white, 
          py: { xs: '90px', md: '120px' },
          opacity: partneringReveal.isVisible ? 1 : 0,
          transform: partneringReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box 
          sx={{ 
            maxWidth: '1440px',
            mx: 'auto',
            px: { xs: '20px', lg: 0 },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: '60px', md: '60px' },
          }}
        >
          {/* Section Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / (1600))), 60px)',
                fontWeight: 300,
                lineHeight: 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
                color: lunitColors.black,
                letterSpacing: '-0.025em',
                m: 0,
              }}
            >
              Partnering to Advance Diagnostic Innovation
            </Typography>
          </Box>

          {/* Partner Cards Grid - Flexbox Layout like Lunit */}
          <Box
            sx={{
              display: 'flex',
              gap: '30px',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              width: '100%',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            {/* Radiology Partners Card */}
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: { xs: '100%', md: '49%' },
                maxWidth: { xs: '100%', md: '706px' },
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                p: '30px',
                pt: { xs: '295px', md: '245px' },
                borderRadius: { xs: '20px', md: '30px' },
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '@media (hover: hover)': {
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
                    '& .partner-card-bg': {
                      transform: 'scale(1.15)',
                    },
                    '& .partner-gradient-hover': {
                      opacity: 1,
                      transform: 'scale(1.02)',
                    },
                  },
                },
              }}
            >
              {/* Background Image */}
              <Box
                className="partner-card-bg"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  bgcolor: lunitColors.darkerGray,
                  backgroundImage: `url('/images/cards/partner-scientist-microscope.webp')`,
                  backgroundSize: 'cover',
                  backgroundPosition: { xs: '40% 100%', md: 'center' },
                  backgroundRepeat: 'no-repeat',
                  transform: 'scale(1)',
                  transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              
              {/* Dark gradient overlay (::after equivalent - always visible) */}
              <Box
                sx={{
                  content: '""',
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  bottom: 0,
                  left: 0,
                  background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 59.12%)',
                  opacity: 1,
                  pointerEvents: 'none',
                }}
              />
              
              {/* Colored gradient hover overlay (::before equivalent - shows on hover) */}
              <Box
                className="partner-gradient-hover"
                sx={{
                  content: '""',
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  bottom: 0,
                  left: 0,
                  background: `radial-gradient(30.27% 17.55% at 102.13% 100%, #FFE205 16.78%, rgba(255, 194, 5, 0) 100%), 
                               radial-gradient(5.13% 10.7% at 100% 100.78%, #56C14D 3.95%, rgba(86, 193, 77, 0) 100%), 
                               radial-gradient(41.41% 26.42% at 100.04% 100.98%, ${lunitColors.teal} 27.51%, rgba(0, 201, 234, 0) 100%), 
                               linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 51.93%)`,
                  opacity: 0,
                  transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
              
              {/* Content */}
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                    fontSize: 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / (1600))), 40px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
                    color: lunitColors.white,
                    mb: 2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Healthcare Systems & Providers
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    lineHeight: 1.6,
                    color: alpha(lunitColors.white, 0.9),
                    mb: 3,
                  }}
                >
                  Deploy explainable diagnostic AI that integrates seamlessly into 
                  existing radiology workflows. Every finding is substantiated with 
                  visual evidence — purpose-built for clinician verification.
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate(ROUTES.CONTACT)}
                  sx={{
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: lunitColors.white,
                    p: 0,
                    borderRadius: '8px',
                    position: 'relative',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: lunitColors.teal,
                      '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Initiate a Pilot Program
                </Button>
              </Box>
            </Box>

            {/* Biopharma Card */}
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: { xs: '100%', md: '49%' },
                maxWidth: { xs: '100%', md: '706px' },
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                p: '30px',
                pt: { xs: '295px', md: '245px' },
                borderRadius: { xs: '20px', md: '30px' },
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '@media (hover: hover)': {
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
                    '& .partner-card-bg-2': {
                      transform: 'scale(1.15)',
                    },
                    '& .partner-gradient-hover-2': {
                      opacity: 1,
                      transform: 'scale(1.02)',
                    },
                  },
                },
              }}
            >
              {/* Background Image */}
              <Box
                className="partner-card-bg-2"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  bgcolor: lunitColors.darkerGray,
                  backgroundImage: `url('/images/cards/partner-pathologist-profile.webp')`,
                  backgroundSize: 'cover',
                  backgroundPosition: { xs: '40% 100%', md: 'center' },
                  backgroundRepeat: 'no-repeat',
                  transform: 'scale(1)',
                  transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              
              {/* Dark gradient overlay (::after equivalent - always visible) */}
              <Box
                sx={{
                  content: '""',
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  bottom: 0,
                  left: 0,
                  background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 59.12%)',
                  opacity: 1,
                  pointerEvents: 'none',
                }}
              />
              
              {/* Colored gradient hover overlay (::before equivalent - shows on hover) */}
              <Box
                className="partner-gradient-hover-2"
                sx={{
                  content: '""',
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  bottom: 0,
                  left: 0,
                  background: `radial-gradient(30.27% 17.55% at 102.13% 100%, #FF5321 16.78%, rgba(255, 83, 33, 0) 100%), 
                               radial-gradient(5.13% 10.7% at 100% 100.78%, #FFC205 3.95%, rgba(255, 194, 5, 0) 100%), 
                               radial-gradient(41.41% 26.42% at 100.04% 100.98%, ${lunitColors.teal} 27.51%, rgba(0, 201, 234, 0) 100%), 
                               linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 51.93%)`,
                  opacity: 0,
                  transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
              
              {/* Content */}
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                    fontSize: 'clamp(24px, calc(24px + (40 - 24) * ((100vw - 320px) / (1600))), 40px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(32px, calc(32px + (50 - 32) * ((100vw - 320px) / 1600)), 50px)',
                    color: lunitColors.white,
                    mb: 2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Research & Academic Institutions
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    lineHeight: 1.6,
                    color: alpha(lunitColors.white, 0.9),
                    mb: 3,
                  }}
                >
                  Collaborate on explainability research, algorithmic fairness 
                  evaluation, and multi-site clinical validation studies. 
                  Advancing the science of trustworthy diagnostic AI.
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate(ROUTES.RESEARCH)}
                  sx={{
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: lunitColors.white,
                    p: 0,
                    borderRadius: '8px',
                    position: 'relative',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: lunitColors.teal,
                      '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  View Research Initiatives
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Trusted by Clinical Leaders - Testimonials Section (Lunit Style) */}
      <Box 
        ref={testimonialsReveal.ref}
        sx={{ 
          bgcolor: lunitColors.black, 
          position: 'relative',
          py: { xs: '90px', md: '120px' },
          pb: { xs: '90px', md: '140px' },
          overflow: 'hidden',
          opacity: testimonialsReveal.isVisible ? 1 : 0,
          transform: testimonialsReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        {/* Background gradient effects - Lunit exact style */}
        <Box
          sx={{
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(18.79% 40% at 100% 104.06%, rgba(86, 193, 77, 0.8) 10.86%, rgba(0, 201, 234, 0.5) 44.88%, rgba(0, 201, 234, 0) 68.35%),
                         linear-gradient(90deg, rgb(0, 0, 0) 35%, rgba(0, 0, 0, 0) 70%)`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right bottom',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Decorative wave pattern at bottom - Lunit style */}
        <Box
          sx={{
            content: '""',
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '100%',
            height: '170px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 170'%3E%3Cpath d='M0,170 Q200,100 400,130 T800,100 L800,170 Z' fill='none' stroke='rgba(0,201,234,0.12)' stroke-width='1.5'/%3E%3Cpath d='M0,150 Q200,80 400,110 T800,80 L800,170 Z' fill='none' stroke='rgba(86,193,77,0.08)' stroke-width='1'/%3E%3Cpath d='M0,130 Q200,60 400,90 T800,60' fill='none' stroke='rgba(0,201,234,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right bottom',
            backgroundSize: { xs: '200%', md: 'auto' },
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        
        <Box
          sx={{ 
            maxWidth: '1440px',
            mx: 'auto',
            px: { xs: '20px', lg: 0 },
            position: 'relative', 
            zIndex: 5 
          }}
        >
          {/* Section Header with Nav Buttons */}
          <Box sx={{ mb: { xs: '30px', md: '30px' }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / (1600))), 60px)',
                fontWeight: 300,
                lineHeight: 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
                color: lunitColors.white,
                maxWidth: '800px',
                letterSpacing: '-0.025em',
                m: 0,
              }}
            >
              Trusted by Clinical Leaders
              <Box component="span" sx={{ display: 'block' }}>
                Who Demand Evidence
              </Box>
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '12px',
                fontWeight: 300,
                color: alpha(lunitColors.white, 0.5),
                mt: 1,
                fontStyle: 'italic',
              }}
            >
              * Scenarios reflect anticipated clinical use cases
            </Typography>
            
            {/* Testimonials Navigation Buttons - Lunit Style */}
            <Stack direction="row" spacing={1.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              <IconButton
                onClick={() => setTestimonialIndex(prev => Math.max(0, prev - 1))}
                disabled={testimonialIndex === 0}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: lunitColors.white,
                  border: `1px solid ${lunitColors.black}`,
                  color: lunitColors.black,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    bgcolor: lunitColors.teal,
                    borderColor: lunitColors.teal,
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                onClick={() => setTestimonialIndex(prev => Math.min(1, prev + 1))}
                disabled={testimonialIndex === 1}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: lunitColors.white,
                  border: `1px solid ${lunitColors.black}`,
                  color: lunitColors.black,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    bgcolor: lunitColors.teal,
                    borderColor: lunitColors.teal,
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  },
                }}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </Box>

          {/* Testimonials - Flex layout with separator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: { xs: '90px', md: '127px' },
              width: '100%',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            {/* Testimonial 1 */}
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                minWidth: 0,
                maxWidth: { xs: '100%', md: '70%' },
              }}
            >
              {/* Testimonial Content */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Category Tag */}
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 600,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  Explainability in Practice
                </Typography>
                
                {/* Quote */}
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(20px, calc(20px + (32 - 20) * ((100vw - 320px) / (1600))), 32px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(30px, calc(30px + (40 - 30) * ((100vw - 320px) / 1600)), 40px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  "For the first time, I can see exactly why the AI flagged a region. The attention 
                  heatmaps correlate directly with the features I evaluate clinically — this changes 
                  how I think about AI-assisted diagnosis."
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(20px, calc(20px + (32 - 20) * ((100vw - 320px) / (1600))), 32px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(30px, calc(30px + (40 - 30) * ((100vw - 320px) / 1600)), 40px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  "The calibrated uncertainty scores fundamentally improve my workflow. When model 
                  confidence is below threshold, I allocate additional review time. It's a decision-support 
                  tool that quantifies its own limitations."
                </Typography>
              </Box>

              {/* Author */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Box
                  component="img"
                  src="/images/avatars/testimonial-radiologist.webp"
                  alt="Dr. Elena Rodriguez"
                  loading="lazy"
                  sx={{
                    width: 92,
                    height: 92,
                    borderRadius: '4.64px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / (1600))), 16px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(18px, calc(18px + (22 - 18) * ((100vw - 320px) / 1600)), 22px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Dr. Elena Rodriguez, MD, FACR
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / (1600))), 14px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / 1600)), 18px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Director of Breast Imaging,{'\n'}Academic Medical Center
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Vertical Separator - Desktop only */}
            <Box
              sx={{
                display: { xs: 'block', md: 'block' },
                width: { xs: '100%', md: '1px' },
                height: { xs: '1px', md: 'auto' },
                alignSelf: 'stretch',
                flexShrink: 0,
                bgcolor: lunitColors.darkGrey,
              }}
            />

            {/* Testimonial 2 */}
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                minWidth: 0,
                maxWidth: { xs: '100%', md: '70%' },
              }}
            >
              {/* Testimonial Content */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Category Tag */}
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 600,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  Clinical Workflow Integration
                </Typography>
                
                {/* Quote */}
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(20px, calc(20px + (32 - 20) * ((100vw - 320px) / (1600))), 32px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(30px, calc(30px + (40 - 30) * ((100vw - 320px) / 1600)), 40px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  "ClinicalVision integrated into our existing PACS workflow without disruption. 
                  Structured reports are generated in real-time, findings are immediately interpretable 
                  by the clinical team, and validation is a matter of seconds — not minutes."
                </Typography>
              </Box>

              {/* Author */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Box
                  component="img"
                  src="/images/avatars/testimonial-clinician.webp"
                  alt="Dr. Michael Okonkwo"
                  loading="lazy"
                  sx={{
                    width: 92,
                    height: 92,
                    borderRadius: '4.64px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / (1600))), 16px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(18px, calc(18px + (22 - 18) * ((100vw - 320px) / 1600)), 22px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Dr. Michael Okonkwo, MD
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / (1600))), 14px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / 1600)), 18px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Chief of Radiology,{'\n'}Multi-Site Healthcare Network
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Testimonial 3 — Fairness & Equity (Full-width below the pair) */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'flex-start',
              gap: '30px',
              width: '100%',
              mt: { xs: '60px', md: '80px' },
              pt: { xs: '60px', md: '80px' },
              borderTop: `1px solid ${lunitColors.darkGrey}`,
            }}
          >
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                minWidth: 0,
                maxWidth: { xs: '100%', md: '60%' },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 600,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  Fairness & Equity
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(20px, calc(20px + (32 - 20) * ((100vw - 320px) / (1600))), 32px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(30px, calc(30px + (40 - 30) * ((100vw - 320px) / 1600)), 40px)',
                    color: lunitColors.white,
                    m: 0,
                  }}
                >
                  "What sets ClinicalVision apart is the built-in fairness monitoring. We can 
                  verify that diagnostic accuracy holds across all patient demographics — that level 
                  of accountability is rare in any AI system, let alone one designed for clinical deployment."
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Box
                  component="img"
                  src="/images/avatars/testimonial-researcher.webp"
                  alt="Dr. Aisha Patel"
                  loading="lazy"
                  sx={{
                    width: 92,
                    height: 92,
                    borderRadius: '4.64px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / (1600))), 16px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(18px, calc(18px + (22 - 18) * ((100vw - 320px) / 1600)), 22px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Dr. Aisha Patel, MD, MPH
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: 'clamp(12px, calc(12px + (14 - 12) * ((100vw - 320px) / (1600))), 14px)',
                      fontWeight: 400,
                      lineHeight: 'clamp(16px, calc(16px + (18 - 16) * ((100vw - 320px) / 1600)), 18px)',
                      color: lunitColors.white,
                      m: 0,
                    }}
                  >
                    Chief Medical Officer,{'\n'}Community Health System
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Metric Badges */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                flex: 1,
                justifyContent: 'center',
                mt: { xs: 0, md: '20px' },
              }}
            >
              {[
                { label: '100% of outputs include visual evidence', icon: <CheckCircle sx={{ fontSize: 18, color: lunitColors.teal }} /> },
                { label: '<3 second analysis-to-report time', icon: <TrendingUp sx={{ fontSize: 18, color: '#FF5321' }} /> },
                { label: 'Validated across 12 demographic groups', icon: <Biotech sx={{ fontSize: 18, color: '#8B5CF6' }} /> },
              ].map((metric, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    px: '20px',
                    py: '14px',
                    borderRadius: '8px',
                    bgcolor: alpha(lunitColors.white, 0.05),
                    border: `1px solid ${alpha(lunitColors.white, 0.1)}`,
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'scale(1.03)',
                      boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                      borderColor: alpha(lunitColors.teal, 0.3),
                      bgcolor: alpha(lunitColors.white, 0.08),
                    },
                  }}
                >
                  {metric.icon}
                  <Typography
                    sx={{
                      fontFamily: '"Lexend", sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      color: alpha(lunitColors.white, 0.8),
                    }}
                  >
                    {metric.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Institutional Trust Statement */}
          <Box
            sx={{
              mt: { xs: '60px', md: '80px' },
              pt: { xs: '40px', md: '50px' },
              borderTop: `1px solid ${alpha(lunitColors.white, 0.1)}`,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: 'clamp(14px, calc(14px + (16 - 14) * ((100vw - 320px) / (1600))), 16px)',
                fontWeight: 300,
                color: alpha(lunitColors.white, 0.5),
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Trusted across leading academic medical centers and healthcare networks
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Medical AI Software - Technology Section (Lunit lunit-technology--gray-bg Style) */}
      <Box 
        ref={aiUnderstandReveal.ref}
        className="lunit-technology lunit-technology--gray-bg"
        sx={{ 
          bgcolor: lunitColors.lightestGray, 
          py: { xs: '60px', md: '90px' },
          opacity: aiUnderstandReveal.isVisible ? 1 : 0,
          transform: aiUnderstandReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box 
          className="lunit-technology__container"
          sx={{ maxWidth: '1440px', mx: 'auto', px: { xs: '15px', lg: '40px', xl: 0 } }}
        >
          <Box className="lunit-technology__content" sx={{ maxWidth: '900px' }}>
            {/* Main Heading */}
            <Typography
              component="h2"
              className="lunit-technology__heading"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / (1600))), 60px)',
                fontWeight: 300,
                lineHeight: 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
                color: lunitColors.headingColor,
                mb: { xs: 3, md: 4 },
                letterSpacing: '-0.025em',
              }}
            >
              AI Designed to Be Understood
            </Typography>
            
            {/* Body Content */}
            <Box className="lunit-technology__body" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '30px', md: '40px' } }}>
              {/* Text Content */}
              <Box className="lunit-technology__text" sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Typography
                  component="span"
                  className="lunit-technology__paragraph"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.text,
                    display: 'block',
                  }}
                >
                  Every analysis output includes attention-based visual evidence, calibrated confidence 
                  intervals, and structured clinical summaries. No ambiguity — every decision 
                  pathway is fully traceable.
                </Typography>
                <Typography
                  component="span"
                  className="lunit-technology__paragraph"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.text,
                    display: 'block',
                  }}
                >
                  Modular, API-first architecture enables seamless integration with existing PACS, 
                  RIS, and EHR systems. Deployable in weeks. Scalable across sites.
                </Typography>
                <Typography
                  component="span"
                  className="lunit-technology__paragraph"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.text,
                    display: 'block',
                  }}
                >
                  Integrated fairness monitoring validates diagnostic consistency across all patient 
                  demographics — a foundational requirement for responsible clinical AI deployment.
                </Typography>
              </Box>
              
              {/* Button */}
              <Box className="lunit-technology__button-wrapper">
                <Button
                  variant="contained"
                  size="large"
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate(ROUTES.FEATURES)}
                  sx={{
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 600,
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    px: '30px',
                    py: '9px',
                    bgcolor: lunitColors.black,
                    color: lunitColors.white,
                    boxShadow: 'none',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0px) scale(0.98)',
                      transition: 'all 0.1s ease',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #00C9EA',
                      outlineOffset: '3px',
                      boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                    },
                  }}
                >
                  Explore the Platform
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Investor Section - Lunit supreme-investor-hero Style */}
      <Box 
        ref={investorReveal.ref}
        className="supreme-investor-section-wrapper"
        sx={{ 
          bgcolor: lunitColors.white, 
          py: { xs: '60px', md: '90px' },
          opacity: investorReveal.isVisible ? 1 : 0,
          transform: investorReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box sx={{ maxWidth: '1440px', mx: 'auto', px: { xs: '15px', lg: '40px', xl: 0 } }}>
          <Box
            className="supreme-investor-hero__container supreme-investor-hero__container--row"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: '40px', md: '60px' },
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            {/* Image */}
            <Box 
              className="supreme-investor-hero__image-wrapper"
              sx={{ 
                flex: '0 0 auto',
                width: { xs: '100%', md: '45%' },
                maxWidth: { xs: '100%', md: '550px' },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: { xs: '16px', md: '20px' },
                  overflow: 'hidden',
                  aspectRatio: { xs: '16/9', md: '4/3' },
                  bgcolor: lunitColors.darkerGray,
                }}
              >
                <Box
                  component="img"
                  src="/images/sections/technology-ai-chip.webp"
                  alt="AI technology in healthcare"
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                {/* Gradient overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 70% 70%, ${alpha(lunitColors.teal, 0.3)} 0%, transparent 60%)`,
                    pointerEvents: 'none',
                  }}
                />
              </Box>
            </Box>
            
            {/* Content */}
            <Box 
              className="supreme-investor-hero__content"
              sx={{ flex: 1 }}
            >
              <Typography
                component="h3"
                className="supreme-investor-hero__heading"
                sx={{
                  fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                  fontSize: 'clamp(35px, calc(35px + (60 - 35) * ((100vw - 320px) / (1600))), 60px)',
                  fontWeight: 300,
                  lineHeight: 'clamp(40px, calc(40px + (75 - 40) * ((100vw - 320px) / 1600)), 75px)',
                  color: lunitColors.headingColor,
                  mb: { xs: 2, md: 3 },
                  letterSpacing: '-0.025em',
                }}
              >
                Setting the Standard for Trustworthy Diagnostic AI
              </Typography>
              <Box className="supreme-investor-hero__description-section">
                <Typography
                  className="supreme-investor-hero__description"
                  sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                    fontWeight: 300,
                    lineHeight: 'clamp(24px, calc(24px + (28 - 24) * ((100vw - 320px) / 1600)), 28px)',
                    color: lunitColors.text,
                    mb: { xs: 3, md: 4 },
                  }}
                >
                  Explainable outputs. Quantified uncertainty. Continuous fairness monitoring. 
                  We are building the diagnostic AI infrastructure that clinicians verify — and patients trust.
                </Typography>
                <Box className="supreme-investor-hero__cta-section">
                  <Button
                    variant="contained"
                    size="large"
                    className="btn btn-primary"
                    onClick={() => navigate(ROUTES.RESEARCH)}
                    sx={{
                      borderRadius: '100px',
                      textTransform: 'none',
                      fontFamily: '"Lexend", sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(16px, calc(16px + (20 - 16) * ((100vw - 320px) / (1600))), 20px)',
                      px: '30px',
                      py: '9px',
                      bgcolor: lunitColors.black,
                      color: lunitColors.white,
                      boxShadow: 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: lunitColors.teal,
                        color: lunitColors.black,
                        boxShadow: '0 6px 20px rgba(0, 201, 234, 0.3)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:focus-visible': {
                        outline: '2px solid #00C9EA',
                        outlineOffset: '3px',
                        boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                      },
                    }}
                  >
                    View Publications & Validation
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Featured News Section - Lunit Style */}
      <Box 
        ref={newsReveal.ref}
        sx={{ 
          bgcolor: lunitColors.white, 
          py: { xs: '90px', md: '120px' },
          opacity: newsReveal.isVisible ? 1 : 0,
          transform: newsReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box sx={{ maxWidth: '1440px', mx: 'auto', px: { xs: '20px', lg: '60px' } }}>
          {/* Section Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: { xs: 5, md: 8 }, flexWrap: 'wrap', gap: 3 }}>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                  fontSize: 'clamp(36px, calc(36px + (52 - 36) * ((100vw - 320px) / (1600))), 52px)',
                  fontWeight: 300,
                  lineHeight: 1.2,
                  color: lunitColors.headingColor,
                  letterSpacing: '-0.025em',
                  mb: 2,
                }}
              >
                Latest Developments
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '17px',
                  lineHeight: 1.6,
                  color: lunitColors.darkGrey,
                  maxWidth: '600px',
                }}
              >
                Research publications, clinical validation studies, and platform milestones. 
                Documenting the advancement of transparent, evidence-based diagnostic AI.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.BLOG)}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  px: 3,
                  py: 1,
                  borderColor: lunitColors.text,
                  color: lunitColors.text,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    bgcolor: alpha(lunitColors.teal, 0.05),
                    color: lunitColors.teal,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
              >
                View All News
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.RESEARCH)}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  px: 3,
                  py: 1,
                  borderColor: lunitColors.text,
                  color: lunitColors.text,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    bgcolor: alpha(lunitColors.teal, 0.05),
                    color: lunitColors.teal,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
              >
                View Publications
              </Button>
            </Stack>
          </Box>

          {/* News Cards */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: '16px', md: '30px' } }}>
            {[
              {
                category: 'Cancer Screening',
                title: 'Multi-Modal Deep Learning Architecture Achieves 95.2% Diagnostic Accuracy in Early-Stage Breast Cancer Detection',
                date: 'January 15, 2026',
                color: lunitColors.teal,
                image: '/images/cards/news-blood-tubes.webp',
              },
              {
                category: 'Precision Oncology',
                title: 'AI-Driven Biomarker Discovery Platform Demonstrates Accelerated Identification Timelines in Preclinical Validation',
                date: 'January 10, 2026',
                color: '#FF5321',
                image: '/images/cards/news-cancer-cells.webp',
              },
              {
                category: 'Research',
                title: 'Multi-Institutional Prospective Study Validates AI-Assisted Mammography Screening Across Diverse Patient Populations',
                date: 'January 5, 2026',
                color: '#56C14D',
                image: '/images/cards/news-lab-pipetting.webp',
              },
            ].map((news, idx) => (
              <Box sx={{ flex: 1 }} key={idx}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    '@media (hover: hover)': {
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
                        '& .news-gradient': {
                          opacity: 1,
                        },
                      },
                    },
                  }}
                >
                  {/* Image Area - 240px height like Lunit */}
                  <Box
                    sx={{
                      height: '240px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={news.image}
                      alt={news.category}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {/* Color accent overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: `radial-gradient(circle at 70% 30%, ${alpha(news.color, 0.25)} 0%, transparent 60%),
                                     radial-gradient(circle at 30% 70%, ${alpha(lunitColors.teal, 0.2)} 0%, transparent 50%)`,
                        pointerEvents: 'none',
                      }}
                    />
                  </Box>
                  
                  {/* Content Area - Dark background like Lunit */}
                  <Box
                    sx={{
                      bgcolor: lunitColors.darkerGray,
                      p: { xs: '24px', md: '30px' },
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {/* Gradient hover overlay on content */}
                    <Box
                      className="news-gradient"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: `radial-gradient(50.27% 24.55% at 127.43% 100%, ${news.color} 61.78%, transparent 100%),
                                     radial-gradient(36.13% 27.7% at 100% 108.78%, #56C14D 13.95%, rgba(86, 193, 77, 0) 100%),
                                     radial-gradient(53.41% 62.42% at 104.04% 128.98%, ${lunitColors.teal} 50.51%, rgba(0, 201, 234, 0) 100%)`,
                        opacity: 0,
                        transition: 'opacity 0.6s ease-in-out',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    />
                    
                    <Box sx={{ position: 'relative', zIndex: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '4px',
                            bgcolor: lunitColors.white,
                            color: lunitColors.darkerGray,
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          {news.category}
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: '"Lexend", sans-serif',
                            fontSize: '13px',
                            color: alpha(lunitColors.white, 0.7),
                          }}
                        >
                          {news.date}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h5"
                        sx={{
                          fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                          fontSize: 'clamp(18px, calc(18px + (22 - 18) * ((100vw - 320px) / (1600))), 22px)',
                          fontWeight: 400,
                          color: lunitColors.white,
                          lineHeight: 1.4,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {news.title}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ================================================================ */}
      {/* Demo Data Section — Download & Try with Real AI                  */}
      {/* ================================================================ */}
      <Box
        ref={demoDataReveal.ref}
        sx={{
          bgcolor: lunitColors.lightestGray,
          py: { xs: '80px', md: '110px' },
          position: 'relative',
          opacity: demoDataReveal.isVisible ? 1 : 0,
          transform: demoDataReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 3, md: 6 } }}>
          {/* Section Header */}
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
            <Typography
              variant="overline"
              sx={{
                color: lunitColors.teal,
                fontWeight: 600,
                letterSpacing: '3px',
                fontSize: '13px',
                mb: 2,
                display: 'block',
              }}
            >
              EVALUATE THE PLATFORM
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: lunitColors.headingColor,
                fontSize: { xs: '28px', md: '40px' },
                mb: 2,
                lineHeight: 1.2,
              }}
            >
              Evaluate with Clinical Demo Cases
            </Typography>
            <Typography
              sx={{
                color: lunitColors.darkGrey,
                fontSize: { xs: '16px', md: '18px' },
                maxWidth: '650px',
                mx: 'auto',
                lineHeight: 1.7,
              }}
            >
              Access curated CBIS-DDSM mammogram cases and evaluate the complete clinical workflow —
              AI-driven analysis, Monte Carlo Dropout uncertainty quantification, GradCAM++ attention 
              visualization, and automated BI-RADS assessment.
            </Typography>
          </Box>

          {/* Case Cards Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: { xs: 2.5, md: 3 },
              mb: { xs: 4, md: 5 },
            }}
          >
            {/* Case 1 — Normal */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: '16px',
                p: { xs: 3, md: 3.5 },
                border: '1px solid',
                borderColor: alpha(lunitColors.teal, 0.12),
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '@media (hover: hover)': {
                  '&:hover': {
                    borderColor: alpha(lunitColors.teal, 0.3),
                    boxShadow: '0 -3px 0 0 #00C9EA, 0 10px 40px rgba(0, 201, 234, 0.18)',
                    transform: 'translateY(-6px)',
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    bgcolor: alpha('#4caf50', 0.1), color: '#4caf50',
                    fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}
                >
                  <CheckCircleOutline sx={{ fontSize: 14 }} /> Easy
                </Box>
              </Box>
              <Typography
                sx={{
                  fontWeight: 700, fontSize: '18px',
                  color: lunitColors.headingColor, mb: 1,
                }}
              >
                Normal / Benign Screening
              </Typography>
              <Typography
                sx={{ color: lunitColors.darkGrey, fontSize: '14px', mb: 2, lineHeight: 1.6 }}
              >
                Jane A. Thompson — Routine annual screening. 4-view standard set (RCC, LCC, RMLO, LMLO).
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: lunitColors.grey }}>
                <ViewsIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '13px' }}>4 views</Typography>
                <Typography sx={{ fontSize: '13px', ml: 'auto', color: lunitColors.teal, fontWeight: 600 }}>
                  BI-RADS 1-2
                </Typography>
              </Box>
            </Box>

            {/* Case 2 — Suspicious */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: '16px',
                p: { xs: 3, md: 3.5 },
                border: '1px solid',
                borderColor: alpha('#ff9800', 0.2),
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '@media (hover: hover)': {
                  '&:hover': {
                    borderColor: alpha('#ff9800', 0.3),
                    boxShadow: '0 -3px 0 0 #FF9800, 0 10px 40px rgba(255, 152, 0, 0.15)',
                    transform: 'translateY(-6px)',
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    bgcolor: alpha('#ff9800', 0.1), color: '#ff9800',
                    fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}
                >
                  <TrendingUp sx={{ fontSize: 14 }} /> Intermediate
                </Box>
              </Box>
              <Typography
                sx={{
                  fontWeight: 700, fontSize: '18px',
                  color: lunitColors.headingColor, mb: 1,
                }}
              >
                Suspicious Mass Finding
              </Typography>
              <Typography
                sx={{ color: lunitColors.darkGrey, fontSize: '14px', mb: 2, lineHeight: 1.6 }}
              >
                Maria R. Chen — Palpable mass, diagnostic workup. 4-view standard set (RCC, LCC, RMLO, LMLO).
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: lunitColors.grey }}>
                <ViewsIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '13px' }}>4 views</Typography>
                <Typography sx={{ fontSize: '13px', ml: 'auto', color: '#ff9800', fontWeight: 600 }}>
                  BI-RADS 4-5
                </Typography>
              </Box>
            </Box>

            {/* Case 3 — Calcification */}
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: '16px',
                p: { xs: 3, md: 3.5 },
                border: '1px solid',
                borderColor: alpha('#f44336', 0.15),
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '@media (hover: hover)': {
                  '&:hover': {
                    borderColor: alpha('#f44336', 0.3),
                    boxShadow: '0 -3px 0 0 #F44336, 0 10px 40px rgba(244, 67, 54, 0.15)',
                    transform: 'translateY(-6px)',
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    bgcolor: alpha('#f44336', 0.1), color: '#f44336',
                    fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}
                >
                  <WarningAmber sx={{ fontSize: 14 }} /> Advanced
                </Box>
              </Box>
              <Typography
                sx={{
                  fontWeight: 700, fontSize: '18px',
                  color: lunitColors.headingColor, mb: 1,
                }}
              >
                Calcification Follow-up
              </Typography>
              <Typography
                sx={{ color: lunitColors.darkGrey, fontSize: '14px', mb: 2, lineHeight: 1.6 }}
              >
                Sarah L. Williams — BRCA1 positive, calcifications on prior imaging. 2-view left breast targeted study.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: lunitColors.grey }}>
                <ViewsIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '13px' }}>2 views</Typography>
                <Typography sx={{ fontSize: '13px', ml: 'auto', color: '#f44336', fontWeight: 600 }}>
                  BI-RADS 4B-4C
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Download Button + Description */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudDownload />}
              href="/demo-data/ClinicalVision_Demo_Package.zip"
              download
              sx={{
                bgcolor: lunitColors.teal,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '16px',
                px: 5,
                py: 1.8,
                borderRadius: '100px',
                textTransform: 'none',
                mb: 2,
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: lunitColors.tealDarker,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 24px ${alpha(lunitColors.teal, 0.35)}`,
                },
                '&:active': {
                  transform: 'translateY(0px) scale(0.98)',
                  transition: 'all 0.1s ease',
                },
                '&:focus-visible': {
                  outline: '2px solid #00C9EA',
                  outlineOffset: '3px',
                  boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                },
              }}
            >
              Download Evaluation Package
            </Button>
            <Typography
              sx={{
                color: lunitColors.grey,
                fontSize: '14px',
                maxWidth: '500px',
                mx: 'auto',
              }}
            >
              Includes 10 mammogram images, patient demographics, clinical history,
              and step-by-step testing instructions.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* CTA Section - Dark with Lunit gradient */}
      <Box 
        ref={ctaReveal.ref}
        sx={{ 
          bgcolor: lunitColors.black, 
          color: lunitColors.white, 
          py: { xs: '90px', md: '120px' },
          position: 'relative',
          overflow: 'hidden',
          opacity: ctaReveal.isVisible ? 1 : 0,
          transform: ctaReveal.isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        {/* Background gradient effect */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: '50%',
            height: '100%',
            background: `radial-gradient(ellipse at center, ${alpha(lunitColors.teal, 0.15)} 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ maxWidth: '960px', mx: 'auto', px: { xs: '20px', lg: '60px' }, position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(40px, calc(40px + (72 - 40) * ((100vw - 320px) / (1600))), 72px)',
                fontWeight: 300,
                lineHeight: 'clamp(48px, calc(48px + (88 - 48) * ((100vw - 320px) / 1600)), 88px)',
                mb: 4,
                letterSpacing: '-0.03em',
              }}
            >
              AI That Substantiates Every Finding.
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"ClashGrotesk", system-ui, sans-serif',
                fontSize: 'clamp(40px, calc(40px + (72 - 40) * ((100vw - 320px) / (1600))), 72px)',
                fontWeight: 300,
                lineHeight: 'clamp(48px, calc(48px + (88 - 48) * ((100vw - 320px) / 1600)), 88px)',
                mb: 4,
                letterSpacing: '-0.03em',
              }}
            >
              Decisions You Can Verify.
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '20px',
                fontWeight: 400,
                lineHeight: 1.7,
                color: alpha(lunitColors.white, 0.8),
                mb: 6,
                maxWidth: '640px',
                mx: 'auto',
              }}
            >
              Upload. Analyze. Verify. Report. — A complete diagnostic workflow, from image 
              acquisition to clinical decision support, in a single integrated platform.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '17px',
                  px: 4.5,
                  py: 1.75,
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                  boxShadow: `0 4px 20px ${alpha(lunitColors.teal, 0.4)}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' },
                  '&:hover': {
                    bgcolor: lunitColors.white,
                    boxShadow: `0 6px 30px ${alpha(lunitColors.white, 0.3)}`,
                    transform: 'translateY(-2px)',
                    '& .MuiButton-endIcon': { transform: 'translateX(4px)' },
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
                onClick={() => navigate(ROUTES.DEMO)}
              >
                Request a Demo
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate(ROUTES.CONTACT)}
                sx={{
                  borderRadius: '100px',
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '17px',
                  px: 4.5,
                  py: 1.75,
                  borderColor: lunitColors.white,
                  borderWidth: '1.5px',
                  color: lunitColors.white,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    color: lunitColors.teal,
                    borderWidth: '1.5px',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0, 201, 234, 0.12)',
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)',
                    transition: 'all 0.1s ease',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #00C9EA',
                    outlineOffset: '3px',
                    boxShadow: '0 0 0 4px rgba(0, 201, 234, 0.15)',
                  },
                }}
              >
                Schedule a Consultation
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Footer - Enhanced Lunit Style with Gradient Background */}
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
            background: `radial-gradient(12.99% 20.36% at 99.17% 1.65%, rgba(255, 83, 33, 0.8) 0%, rgba(255, 83, 33, 0.1) 62.98%, rgba(255, 83, 33, 0) 99.99%), 
                         radial-gradient(17.32% 24.96% at 0% 100%, #FFE205 21.82%, rgba(255, 194, 5, 0) 100%), 
                         radial-gradient(24.05% 48.99% at 0% 100%, #56C14D 30%, rgba(86, 193, 77, 0) 100%), 
                         radial-gradient(36.63% 58.37% at 0% 102.08%, #00C9EA 57.5%, rgba(0, 201, 234, 0.4) 78.36%, rgba(0, 201, 234, 0) 100%), 
                         #EFF0F4`,
            bottom: 0,
            right: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '100% 0%',
            zIndex: -1,
          },
        }}
      >
        <Box sx={{ maxWidth: '1440px', mx: 'auto', px: { xs: '20px', lg: '60px' }, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: '40px', md: '60px' } }}>
            <Box sx={{ flex: '0 0 33%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  component="img"
                  src="/images/clinicalvision-logo.svg?v=11"
                  alt="ClinicalVision AI Logo"
                  sx={{
                    height: 64,
                    width: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: lunitColors.darkGrey, 
                  lineHeight: 1.85,
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '14px',
                  maxWidth: '320px',
                }}
              >
                Explainable diagnostic AI — engineered for clinical verification 
                and institutional trust.
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2.5,
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  color: lunitColors.darkerGray,
                  borderBottom: `1.1px solid ${lunitColors.darkGrey}`,
                  pb: 1.25,
                }}
              >
                Product
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'Breast Cancer Detection', path: ROUTES.SOLUTION_BREAST_CANCER },
                  { label: 'AI Analysis Platform', path: ROUTES.FEATURES },
                  { label: 'Pricing', path: ROUTES.PRICING },
                  { label: 'Request a Demo', path: ROUTES.DEMO },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    onClick={() => navigate(item.path)}
                    sx={{
                      color: lunitColors.darkGrey,
                      fontFamily: '"Lexend", sans-serif',
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
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2.5,
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  color: lunitColors.darkerGray,
                  borderBottom: `1.1px solid ${lunitColors.darkGrey}`,
                  pb: 1.25,
                }}
              >
                Company
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'About ClinicalVision', path: ROUTES.ABOUT },
                  { label: 'Careers', path: ROUTES.CAREERS },
                  { label: 'Partners', path: ROUTES.PARTNERS },
                  { label: 'Events', path: ROUTES.EVENTS },
                  { label: 'Contact Us', path: ROUTES.CONTACT },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    onClick={() => navigate(item.path)}
                    sx={{
                      color: lunitColors.darkGrey,
                      fontFamily: '"Lexend", sans-serif',
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
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2.5,
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  color: lunitColors.darkerGray,
                  borderBottom: `1.1px solid ${lunitColors.darkGrey}`,
                  pb: 1.25,
                }}
              >
                Resources
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'Documentation', path: ROUTES.DOCUMENTATION },
                  { label: 'API Reference', path: ROUTES.API },
                  { label: 'Insights', path: ROUTES.BLOG },
                  { label: 'Support Center', path: ROUTES.SUPPORT },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    onClick={() => navigate(item.path)}
                    sx={{
                      color: lunitColors.darkGrey,
                      fontFamily: '"Lexend", sans-serif',
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
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2.5,
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  color: lunitColors.darkerGray,
                  borderBottom: `1.1px solid ${lunitColors.darkGrey}`,
                  pb: 1.25,
                }}
              >
                Legal
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'Privacy', path: ROUTES.PRIVACY },
                  { label: 'Terms', path: ROUTES.TERMS },
                  { label: 'Security', path: ROUTES.SECURITY },
                  { label: 'Compliance', path: ROUTES.COMPLIANCE },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    onClick={() => navigate(item.path)}
                    sx={{
                      color: lunitColors.darkGrey,
                      fontFamily: '"Lexend", sans-serif',
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
          </Box>
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
              variant="body2" 
              sx={{ 
                color: lunitColors.darkerGray,
                fontFamily: '"Lexend", sans-serif',
                fontSize: '12px',
                fontWeight: 300,
              }}
            >
              © 2026 ClinicalVision AI. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={4}>
              {socialLinks.map((social) => (
                <Typography
                  key={social.label}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{
                    color: lunitColors.darkGrey,
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'color 0.3s ease',
                    '&:hover': { color: lunitColors.tealDarker },
                  }}
                >
                  {social.label}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LandingPage;
