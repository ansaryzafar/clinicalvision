import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
  Button,
  Menu,
  MenuItem,
  Stack,
  alpha,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LocalHospital,
  Folder,
  Settings,
  Logout,
  Dashboard,
  Close,
  NotificationsNone,
  HelpOutline,
  History,
  Science,
  Info,
  Security,
  Assignment,
  Biotech,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SystemStatus } from '../shared/SystemStatus';
import { GlobalSearchBar } from '../shared/GlobalSearchBar';
import { ROUTES, LOGOUT_REDIRECT } from '../../routes/paths';

/**
 * ModernMainLayout Component
 * 
 * Professional layout inspired by Lunit:
 * - Clean, modern navigation
 * - Intuitive iconography
 * - Smooth transitions
 * - Professional medical aesthetic
 * 
 * UI Improvements v2:
 * - Reduced sidebar width for more content space
 * - Custom SVG logo replacing Assessment icon
 * - Global search in header
 * - Improved visual hierarchy
 * - Micro-interactions and hover states
 */

const DRAWER_WIDTH = 260;

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactElement;
  badge?: number;
  description?: string;
  /** Optional subtle label rendered above this item as a sub-section divider */
  dividerLabel?: string;
}

// Organized navigation following Nielsen's "Recognition over Recall" heuristic
// Grouped by clinical workflow stages for intuitive navigation
const navigationSections: NavigationSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        path: ROUTES.DASHBOARD,
        icon: <Dashboard />,
        description: 'Overview & quick stats',
      },
    ],
  },
  {
    title: 'Clinical Workflow',
    items: [
      {
        title: 'New Analysis',
        path: ROUTES.WORKFLOW,
        icon: <LocalHospital />,
        description: 'Upload & analyze mammogram',
      },
      {
        title: 'Active Cases',
        path: ROUTES.CASES,
        icon: <Assignment />,
        description: 'Cases currently being worked on',
      },
      {
        title: 'Analysis Suite',
        path: ROUTES.ANALYSIS_SUITE,
        icon: <Biotech />,
        description: 'Advanced image analysis',
      },
      {
        title: 'Case History',
        path: ROUTES.HISTORY,
        icon: <History />,
        description: 'Completed clinical records',
        dividerLabel: 'Records',
      },
      {
        title: 'AI Analysis Log',
        path: ROUTES.ANALYSIS_ARCHIVE,
        icon: <Folder />,
        description: 'View saved AI analyses',
      },
    ],
  },
  {
    title: 'AI Monitoring',
    items: [
      {
        title: 'Fairness Monitor',
        path: ROUTES.FAIRNESS,
        icon: <Security />,
        description: 'AI bias & compliance',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Settings',
        path: ROUTES.SETTINGS,
        icon: <Settings />,
        description: 'Preferences & config',
      },
      {
        title: 'About',
        path: ROUTES.ABOUT,
        icon: <Info />,
        description: 'System information',
      },
    ],
  },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.isContentEditable;
      
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            // ⌘K - Focus search bar
            e.preventDefault();
            // Focus the search input - use query selector as a fallback
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case 'n':
            // ⌘N - New Analysis (only if not in input)
            if (!isInputFocused) {
              e.preventDefault();
              navigate(ROUTES.WORKFLOW);
            }
            break;
          case 'd':
            // ⌘D - Dashboard (only if not in input, avoid bookmark conflict)
            if (!isInputFocused && !e.shiftKey) {
              e.preventDefault();
              navigate(ROUTES.DASHBOARD);
            }
            break;
          case ',':
            // ⌘, - Settings
            e.preventDefault();
            navigate(ROUTES.SETTINGS);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate(LOGOUT_REDIRECT, { replace: true });
  };

  // Sidebar content
  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Logo Section - Using custom SVG logo */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        {/* Full Logo (Dotted C + Vision AI) */}
        <Box
          component="img"
          src="/images/clinicalvision-logo.svg?v=11"
          alt="ClinicalVision Logo"
          sx={{
            height: 56,
            width: 'auto',
            maxWidth: 220,
            display: 'block',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.10))',
          }}
        />
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items - Organized by Section */}
      <Box sx={{ flexGrow: 1, px: 2, py: 2.5, overflow: 'auto' }}>
        {navigationSections.map((section, sectionIndex) => (
          <Box key={section.title} sx={{ mb: sectionIndex < navigationSections.length - 1 ? 2.5 : 0 }}>
            {/* Section Title - Enhanced visibility */}
            <Typography
              variant="overline"
              sx={{
                px: 1.5,
                py: 0.5,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: '0.68rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                '&::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  bgcolor: alpha(theme.palette.divider, 0.08),
                  ml: 1,
                },
              }}
            >
              {section.title}
            </Typography>
            
            {/* Section Items */}
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <React.Fragment key={item.path}>
                    {/* Sub-section divider label (Phase 3.3) */}
                    {item.dividerLabel && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          px: 1.5,
                          pt: 1.5,
                          pb: 0.5,
                          color: alpha(theme.palette.text.secondary, 0.6),
                          fontWeight: 600,
                          fontSize: '0.62rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.dividerLabel}
                      </Typography>
                    )}
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <Tooltip
                      title={item.description || ''}
                      placement="right"
                      arrow
                      enterDelay={500}
                    >
                      <ListItemButton
                        onClick={() => handleNavigation(item.path)}
                        selected={isActive}
                        sx={{
                          borderRadius: 2,
                          py: 1.25,
                          px: 1.5,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '20%',
                              bottom: '20%',
                              width: 3,
                              borderRadius: '0 2px 2px 0',
                              bgcolor: theme.palette.primary.main,
                            },
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.14),
                            },
                            '& .MuiListItemIcon-root': {
                              color: theme.palette.primary.main,
                            },
                          },
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            transform: 'translateX(3px)',
                            '& .MuiListItemIcon-root': {
                              transform: 'scale(1.1)',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 38,
                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                            transition: 'transform 0.2s ease, color 0.2s ease',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.title}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.9rem',
                            letterSpacing: '-0.01em',
                          }}
                        />
                        {item.badge && (
                          <Box
                            sx={{
                              bgcolor: theme.palette.error.main,
                              color: 'white',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {item.badge}
                          </Box>
                        )}
                      </ListItemButton>
                    </Tooltip>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ opacity: 0.08 }} />

      {/* User Profile Section - Enhanced */}
      <Box sx={{ p: 1.5 }}>
        <Box
          onClick={handleUserMenuOpen}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              borderColor: alpha(theme.palette.primary.main, 0.15),
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}, #60A5FA)`,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, #60A5FA)`,
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email?.split('@')[0] || 'User'}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '0.7rem',
                }}
              >
                Radiologist
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar - Modern & Clean */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton
                edge="start"
                color="default"
                onClick={handleDrawerToggle}
                sx={{ 
                  mr: 1,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Global Search Bar - Industry Standard with Real Input */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, ml: 1 }}>
              <GlobalSearchBar width={380} />
            </Box>
          </Box>

          {/* Right Side Actions */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Mobile Search Button - Shows search in a different way on mobile */}
            
            {/* System Status Indicator */}
            <SystemStatus variant="compact" pollingInterval={60000} />
            
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: 'center' }} />
            
            <Tooltip title="Help & Documentation">
              <IconButton 
                size="medium" 
                onClick={() => navigate(ROUTES.DOCUMENTATION)}
                sx={{ 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                  }
                }}
              >
                <HelpOutline />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton 
                size="medium" 
                onClick={(e) => setNotifAnchor(e.currentTarget)}
                sx={{ 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                  }
                }}
              >
                <Badge badgeContent={0} color="error" variant="dot">
                  <NotificationsNone />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: { minWidth: 280, mt: 1, borderRadius: 2 },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
              </Box>
              <MenuItem disabled sx={{ py: 3, justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No new notifications
                </Typography>
              </MenuItem>
            </Menu>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: 'center' }} />
            <Button
              onClick={handleUserMenuOpen}
              startIcon={
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              }
              sx={{
                textTransform: 'none',
                color: theme.palette.text.primary,
                fontWeight: 600,
                borderRadius: 2.5,
                px: 2,
                py: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {isMobile ? '' : user?.email?.split('@')[0] || 'User'}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="body2" fontWeight={700}>
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Professional Account
          </Typography>
        </Box>
        <MenuItem onClick={() => { handleUserMenuClose(); navigate(ROUTES.SETTINGS); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleUserMenuClose(); navigate(ROUTES.ABOUT); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Info fontSize="small" />
          </ListItemIcon>
          <ListItemText>About</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: theme.palette.error.main }}>
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>

      {/* Sidebar Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>
    </Box>
  );
};
