/**
 * Breadcrumbs Component
 * 
 * Implements Nielsen Heuristic #1: Visibility of System Status
 * "The system should always keep users informed about what is going on"
 * 
 * Also implements VoxLogicA UI navigation patterns:
 * - Clear hierarchical context
 * - Clickable path segments for quick navigation
 * - Current location emphasis
 */

import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
  Chip,
  alpha,
  styled,
} from '@mui/material';
import {
  NavigateNext,
  Home,
  CloudUpload,
  Analytics,
  History,
  Settings,
  Person,
  Assessment,
  Science,
  Folder,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

// Styled components
const BreadcrumbContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5, 0),
  marginBottom: theme.spacing(2),
}));

const BreadcrumbLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  padding: theme.spacing(0.5, 1),
  borderRadius: 6,
  transition: 'all 0.2s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    textDecoration: 'none',
  },
}));

const CurrentPage = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  fontWeight: 600,
  padding: theme.spacing(0.5, 1),
}));

const Separator = styled(NavigateNext)(({ theme }) => ({
  fontSize: 18,
  color: theme.palette.text.disabled,
}));

// Route configuration with icons and labels
interface RouteConfig {
  path: string;
  label: string;
  icon: React.ReactNode;
  parent?: string;
}

const routeConfig: Record<string, RouteConfig> = {
  '/': {
    path: '/',
    label: 'Dashboard',
    icon: <Home fontSize="small" />,
  },
  '/dashboard': {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <Home fontSize="small" />,
  },
  '/workflow': {
    path: '/workflow',
    label: 'Clinical Workflow',
    icon: <CloudUpload fontSize="small" />,
    parent: '/',
  },
  '/analysis-suite': {
    path: '/analysis-suite',
    label: 'Analysis Suite',
    icon: <Analytics fontSize="small" />,
    parent: '/workflow',
  },
  '/cases': {
    path: '/cases',
    label: 'Cases',
    icon: <Science fontSize="small" />,
    parent: '/',
  },
  '/analysis-archive': {
    path: '/analysis-archive',
    label: 'Archive',
    icon: <Assessment fontSize="small" />,
    parent: '/',
  },
  '/history': {
    path: '/history',
    label: 'History',
    icon: <History fontSize="small" />,
    parent: '/',
  },
  '/fairness': {
    path: '/fairness',
    label: 'Fairness Monitor',
    icon: <Assessment fontSize="small" />,
    parent: '/',
  },
  '/settings': {
    path: '/settings',
    label: 'Settings',
    icon: <Settings fontSize="small" />,
    parent: '/',
  },
  '/about': {
    path: '/about',
    label: 'About',
    icon: <Person fontSize="small" />,
    parent: '/',
  },
};

// Build breadcrumb trail from current path
const buildBreadcrumbTrail = (pathname: string): RouteConfig[] => {
  const trail: RouteConfig[] = [];
  
  // Handle dynamic routes (e.g., /analysis/123)
  let currentPath = pathname;
  
  // Find matching route config
  let config = routeConfig[currentPath];
  
  // If not found, try to match parent path
  if (!config) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const basePath = '/' + segments[0];
      config = routeConfig[basePath];
      
      // Add dynamic segment
      if (config && segments.length > 1) {
        trail.unshift({
          path: pathname,
          label: `#${segments[segments.length - 1].slice(0, 8)}...`,
          icon: <Folder fontSize="small" />,
          parent: basePath,
        });
      }
    }
  }
  
  // Build trail by following parent links
  while (config) {
    trail.unshift(config);
    config = config.parent ? routeConfig[config.parent] : undefined;
  }
  
  // Always ensure home is first
  if (trail.length === 0 || trail[0].path !== '/') {
    trail.unshift(routeConfig['/']);
  }
  
  return trail;
};

interface BreadcrumbsProps {
  /** Custom title override for current page */
  customTitle?: string;
  /** Additional context chip */
  contextChip?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  /** Show home icon only (no label) */
  compactHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  customTitle,
  contextChip,
  compactHome = true,
}) => {
  const location = useLocation();
  const trail = buildBreadcrumbTrail(location.pathname);
  
  // Don't show breadcrumbs on home page
  if (location.pathname === '/' && !customTitle) {
    return null;
  }

  return (
    <BreadcrumbContainer>
      <MuiBreadcrumbs
        separator={<Separator />}
        aria-label="breadcrumb"
      >
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          const isHome = item.path === '/';
          
          if (isLast) {
            // Current page - not clickable
            return (
              <CurrentPage key={item.path}>
                {item.icon}
                {customTitle || item.label}
              </CurrentPage>
            );
          }
          
          // Clickable parent links - use RouterLink directly
          return (
            <RouterLink
              key={item.path}
              to={item.path}
              style={{ textDecoration: 'none' }}
            >
              <BreadcrumbLink as="span">
                {item.icon}
                {(!compactHome || !isHome) && item.label}
              </BreadcrumbLink>
            </RouterLink>
          );
        })}
      </MuiBreadcrumbs>
      
      {/* Optional context chip */}
      {contextChip && (
        <Chip
          label={contextChip.label}
          size="small"
          color={contextChip.color || 'primary'}
          sx={{ ml: 2, height: 24 }}
        />
      )}
    </BreadcrumbContainer>
  );
};

/**
 * PageHeader Component
 * 
 * Combines breadcrumbs with page title for consistent header layout
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbTitle?: string;
  contextChip?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbTitle,
  contextChip,
  actions,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs 
        customTitle={breadcrumbTitle} 
        contextChip={contextChip}
      />
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom={!!subtitle}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Breadcrumbs;
