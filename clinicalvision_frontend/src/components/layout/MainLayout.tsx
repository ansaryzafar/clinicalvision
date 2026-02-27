import React from 'react';
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
  Container,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
  Chip,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  CloudUpload,
  Assessment,
  History,
  Settings,
  Info,
  LocalHospital,
  Folder,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, LOGOUT_REDIRECT } from '../../routes/paths';
import { useAuth } from '../../contexts/AuthContext';

/**
 * MainLayout Component
 * 
 * Clinical-grade layout with:
 * - Medical-themed header with branding
 * - Responsive navigation drawer
 * - Professional clinical aesthetics
 * - Accessibility compliant
 */

const DRAWER_WIDTH = 260;

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactElement;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Upload & Analyze',
    path: ROUTES.WORKFLOW,
    icon: <CloudUpload />,
    description: 'Upload mammogram for AI analysis',
  },
  {
    title: 'Cases',
    path: ROUTES.CASES,
    icon: <Folder />,
    description: 'Manage all clinical cases',
  },
  {
    title: 'Results',
    path: ROUTES.ANALYSIS_ARCHIVE,
    icon: <Assessment />,
    description: 'View analysis results',
  },
  {
    title: 'Case History',
    path: ROUTES.HISTORY,
    icon: <History />,
    description: 'Previous cases and reports',
  },
  {
    title: 'Settings',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    description: 'Configure preferences',
  },
  {
    title: 'About',
    path: ROUTES.ABOUT,
    icon: <Info />,
    description: 'System information',
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
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);

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

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #0277BD 0%, #01579B 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              width: 48,
              height: 48,
              mr: 2,
            }}
          >
            <LocalHospital sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              ClinicalVision
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              AI Breast Cancer Detection
            </Typography>
          </Box>
        </Box>
        <Chip
          label="Production v1.0.0"
          size="small"
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, py: 2 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 2, mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(2, 119, 189, 0.08)',
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'rgba(2, 119, 189, 0.12)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 44,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9375rem',
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    sx: { mt: 0.25 },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          For clinical use by certified radiologists
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          © 2026 ClinicalVision AI
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <LocalHospital sx={{ mr: 1.5, color: 'primary.main', fontSize: 32 }} />
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0277BD 0%, #00897B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ClinicalVision AI
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Breast Cancer Detection System
            </Typography>
          </Box>

          {/* Status Indicator */}
          <Chip
            icon={<Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%' }} />}
            label="System Active"
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: 'success.light',
              color: 'success.dark',
              mr: 2,
              '& .MuiChip-icon': {
                ml: 1.5,
              },
            }}
          />

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.full_name || user?.email}
            </Typography>
            <IconButton
              onClick={handleUserMenuOpen}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={userMenuAnchor ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={userMenuAnchor ? 'true' : undefined}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Box>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={userMenuAnchor}
            id="user-menu"
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                minWidth: 200,
                mt: 1.5,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
              <Chip
                label={user?.role || 'User'}
                size="small"
                sx={{ mt: 1, fontSize: '0.7rem' }}
              />
            </Box>
            <MenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: 64, // Below AppBar
              height: 'calc(100% - 64px)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          pt: 10, // Space for AppBar
          pl: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          transition: theme.transitions.create(['margin', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
