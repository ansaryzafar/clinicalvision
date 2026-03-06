import React, { useState, useEffect, useRef } from 'react';
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
  Popper,
  Paper,
  Fade,
  Chip,
  ClickAwayListener,
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
  FiberManualRecord,
  NotificationsActive,
} from '@mui/icons-material';
import {
  lunitColors,
  lunitTypography,
  lunitGradients,
  lunitSpacing,
  lunitShadows,
} from '../../styles/lunitDesignSystem';
import { lunitRadius } from '../../styles/lunitDesignSystem';
import { useScrollReveal } from '../../hooks/useScrollReveal';

// Footer Link Data
const footerLinks = {
  solutions: [
    { label: 'Breast Cancer Detection', path: ROUTES.SOLUTION_BREAST_CANCER },
    { label: 'AI Analysis Platform', path: ROUTES.FEATURES },
    { label: 'Pricing & Plans', path: ROUTES.PRICING },
    { label: 'Request a Demo', path: ROUTES.DEMO },
  ],
  company: [
    { label: 'About ClinicalVision', path: ROUTES.ABOUT },
    { label: 'Careers', path: ROUTES.CAREERS },
    { label: 'Partners', path: ROUTES.PARTNERS },
    { label: 'Events', path: ROUTES.EVENTS },
    { label: 'Contact Us', path: ROUTES.CONTACT },
  ],
  resources: [
    { label: 'Documentation', path: ROUTES.DOCUMENTATION },
    { label: 'Developer API', path: ROUTES.API },
    { label: 'Blog & Insights', path: ROUTES.BLOG },
    { label: 'Support Center', path: ROUTES.SUPPORT },
  ],
  legal: [
    { label: 'Privacy', path: ROUTES.PRIVACY },
    { label: 'Terms', path: ROUTES.TERMS },
    { label: 'Security', path: ROUTES.SECURITY },
    { label: 'Compliance', path: ROUTES.COMPLIANCE },
  ],
};

// ── Solutions mega-dropdown data ──────────────────────────────────────────
const solutionsClinicalItems = [
  {
    label: 'Breast Cancer Detection',
    description: 'AI-powered mammography analysis',
    path: ROUTES.SOLUTION_BREAST_CANCER,
    status: 'live' as const,
    icon: '🔬',
  },
  {
    label: 'Lung Cancer Detection',
    description: 'Thoracic imaging AI',
    path: ROUTES.SOLUTION_LUNG_CANCER,
    status: 'coming' as const,
    icon: '🫁',
  },
  {
    label: 'Prostate Cancer Detection',
    description: 'Histopathology grading AI',
    path: ROUTES.SOLUTION_PROSTATE_CANCER,
    status: 'coming' as const,
    icon: '🔎',
  },
  {
    label: 'Colorectal Cancer Detection',
    description: 'Colorectal pathology AI',
    path: ROUTES.SOLUTION_COLORECTAL_CANCER,
    status: 'coming' as const,
    icon: '🧬',
  },
];

const solutionsPlatformItems = [
  {
    label: 'AI Analysis Platform',
    description: 'End-to-end clinical workflow',
    path: ROUTES.FEATURES,
  },
  {
    label: 'Pricing & Plans',
    description: 'Transparent pricing',
    path: ROUTES.PRICING,
  },
];

// ── Standard dropdown data ───────────────────────────────────────────────
type NavChild = { label: string; description?: string; path: string };
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
      { label: 'AI Models & Architecture', description: 'Core technology deep-dive', path: ROUTES.TECHNOLOGY },
      { label: 'Research & Publications', description: 'Peer-reviewed work', path: ROUTES.RESEARCH },
      { label: 'Security & Compliance', description: 'Trust & regulatory', path: ROUTES.SECURITY },
    ],
  },
  {
    label: 'Resources',
    type: 'dropdown',
    children: [
      { label: 'Documentation', description: 'Guides & references', path: ROUTES.DOCUMENTATION },
      { label: 'Developer API', description: 'Integration tools', path: ROUTES.API },
      { label: 'Blog & Insights', description: 'Thought leadership', path: ROUTES.BLOG },
      { label: 'Support Center', description: 'Help & FAQs', path: ROUTES.SUPPORT },
    ],
  },
  {
    label: 'Company',
    type: 'dropdown',
    children: [
      { label: 'About ClinicalVision', description: 'Our mission & team', path: ROUTES.ABOUT },
      { label: 'Careers', description: 'Join us', path: ROUTES.CAREERS },
      { label: 'Partners', description: 'Collaborate with us', path: ROUTES.PARTNERS },
      { label: 'Events', description: 'Conferences & webinars', path: ROUTES.EVENTS },
      { label: 'Contact Us', description: 'Get in touch', path: ROUTES.CONTACT },
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
                              borderRadius: lunitRadius.lg,
                              border: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                              boxShadow: lunitShadows.card,
                              overflow: 'hidden',
                              display: 'flex',
                              minWidth: 560,
                            }}
                          >
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
                                {solutionsClinicalItems.map((sol) => (
                                  <Box
                                    key={sol.label}
                                    onClick={() => { navigate(sol.path); handleNavClose(item.label); }}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 1.5,
                                      px: 1.5,
                                      py: 1.25,
                                      borderRadius: lunitRadius.sm,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': { bgcolor: alpha(lunitColors.teal, 0.06) },
                                    }}
                                  >
                                    <Typography sx={{ fontSize: '20px', lineHeight: 1.4, mt: '1px' }}>{sol.icon}</Typography>
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
                                            icon={<FiberManualRecord sx={{ fontSize: '8px !important' }} />}
                                            label="Live"
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
                                            label="Coming Soon"
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
                                      borderRadius: lunitRadius.sm,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': { bgcolor: alpha(lunitColors.teal, 0.08) },
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
                          borderRadius: lunitRadius.lg,
                          boxShadow: lunitShadows.card,
                          border: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
                          py: 1,
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
                          py: 1.5,
                          px: 2.5,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha(lunitColors.teal, 0.06),
                          },
                        }}
                      >
                        <Box>
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
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </React.Fragment>
            ))}
          </Stack>

          {/* Right Actions — Login + Request a Demo + Mobile Hamburger */}
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
                Login
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.DEMO)}
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
                Request a Demo
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
        {/* Solutions section */}
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
                    <Chip label="Live" size="small" sx={{ height: 18, fontSize: '9px', fontWeight: 700, fontFamily: '"Lexend", sans-serif', bgcolor: alpha('#22C55E', 0.1), color: '#16A34A' }} />
                  ) : (
                    <Chip label="Soon" size="small" sx={{ height: 18, fontSize: '9px', fontWeight: 700, fontFamily: '"Lexend", sans-serif', bgcolor: alpha('#F97316', 0.1), color: '#EA580C' }} />
                  )}
                </Box>
              }
              primaryTypographyProps={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                color: lunitColors.text,
              }}
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

        {/* Standard dropdown sections (Technology / Resources / Company) */}
        {navItems.filter((item): item is Extract<NavItem, { type: 'dropdown' }> => item.type === 'dropdown').map((item) => (
          <React.Fragment key={item.label}>
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
                onClick={() => { navigate(child.path); setMobileDrawerOpen(false); }}
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
          </React.Fragment>
        ))}

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
            Login
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => { navigate(ROUTES.DEMO); setMobileDrawerOpen(false); }}
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
            Request a Demo
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
          <FooterLinkSection title="Solutions" links={footerLinks.solutions} />
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
