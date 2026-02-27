/**
 * GlobalSearchBar Component - Industry Standard Search
 * 
 * Features:
 * - Real text input with cursor/blinking caret
 * - Instant search results as you type
 * - Recent searches stored in localStorage
 * - Keyboard navigation (↑↓ arrows, Enter, Escape)
 * - All app pages/features searchable
 * - Click-outside to close dropdown
 * - Fast, accessible, intuitive
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  InputBase,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  alpha,
  useTheme,
  ClickAwayListener,
  Fade,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Science,
  Dashboard,
  History,
  Folder,
  Settings,
  Security,
  Info,
  Close,
  TrendingUp,
  AccessTime,
  LocalHospital,
  KeyboardReturn,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';

// Storage keys
const RECENT_SEARCHES_KEY = 'clinicalvision_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Searchable item definition
interface SearchableItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  keywords: string[];
  category: 'navigation' | 'action' | 'setting' | 'feature' | 'help';
  parent?: string; // For nested items
}

// All searchable items in the application - comprehensive nested search
const SEARCHABLE_ITEMS: SearchableItem[] = [
  // ==========================================
  // CORE NAVIGATION
  // ==========================================
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Overview & metrics',
    path: ROUTES.DASHBOARD,
    icon: <Dashboard />,
    keywords: ['home', 'main', 'overview', 'stats', 'metrics', 'summary', 'start'],
    category: 'navigation',
  },
  {
    id: 'analyze',
    title: 'New Analysis',
    description: 'Upload & analyze mammogram',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['upload', 'new', 'scan', 'mammogram', 'diagnose', 'analyze', 'image', 'dicom', 'breast'],
    category: 'action',
  },
  {
    id: 'cases',
    title: 'Cases',
    description: 'Patient case management',
    path: ROUTES.CASES,
    icon: <LocalHospital />,
    keywords: ['patients', 'records', 'cases', 'manage', 'list', 'patients'],
    category: 'navigation',
  },
  {
    id: 'archive',
    title: 'Case Archive',
    description: 'View saved analyses',
    path: ROUTES.ANALYSIS_ARCHIVE,
    icon: <Folder />,
    keywords: ['saved', 'archive', 'history', 'previous', 'stored', 'results', 'old'],
    category: 'navigation',
  },
  {
    id: 'history',
    title: 'Case History',
    description: 'Previous analysis sessions',
    path: ROUTES.HISTORY,
    icon: <History />,
    keywords: ['history', 'past', 'previous', 'sessions', 'records', 'log', 'timeline'],
    category: 'navigation',
  },
  {
    id: 'workflow',
    title: 'Clinical Workflow',
    description: 'Workflow management',
    path: ROUTES.WORKFLOW,
    icon: <TrendingUp />,
    keywords: ['workflow', 'process', 'clinical', 'pipeline', 'steps', 'queue'],
    category: 'navigation',
  },

  // ==========================================
  // AI MONITORING & FAIRNESS
  // ==========================================
  {
    id: 'fairness',
    title: 'Fairness Monitor',
    description: 'AI bias & compliance tracking',
    path: ROUTES.FAIRNESS,
    icon: <Security />,
    keywords: ['fairness', 'bias', 'compliance', 'ai', 'monitoring', 'ethics', 'equity', 'fda'],
    category: 'navigation',
  },
  {
    id: 'fairness-demographic',
    title: 'Demographic Parity',
    description: 'View demographic fairness metrics',
    path: ROUTES.FAIRNESS,
    icon: <Security />,
    keywords: ['demographic', 'parity', 'age', 'gender', 'race', 'ethnicity', 'population'],
    category: 'feature',
    parent: 'Fairness Monitor',
  },
  {
    id: 'fairness-alerts',
    title: 'Fairness Alerts',
    description: 'View active bias alerts',
    path: ROUTES.FAIRNESS,
    icon: <Security />,
    keywords: ['alerts', 'warnings', 'notifications', 'bias', 'issues', 'problems'],
    category: 'feature',
    parent: 'Fairness Monitor',
  },
  {
    id: 'fairness-compliance',
    title: 'Compliance Status',
    description: 'FDA & regulatory compliance',
    path: ROUTES.FAIRNESS,
    icon: <Security />,
    keywords: ['compliance', 'fda', 'regulatory', 'status', 'audit', 'certification'],
    category: 'feature',
    parent: 'Fairness Monitor',
  },

  // ==========================================
  // SETTINGS - MAIN & NESTED
  // ==========================================
  {
    id: 'settings',
    title: 'Settings',
    description: 'Preferences & configuration',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['settings', 'preferences', 'config', 'options', 'customize'],
    category: 'navigation',
  },
  // Appearance Settings
  {
    id: 'settings-theme',
    title: 'Theme Settings',
    description: 'Dark mode, light mode, system',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['theme', 'dark', 'light', 'mode', 'appearance', 'color', 'contrast'],
    category: 'setting',
    parent: 'Settings',
  },
  {
    id: 'settings-dark-mode',
    title: 'Dark Mode',
    description: 'Enable dark theme',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['dark', 'mode', 'night', 'theme', 'black'],
    category: 'setting',
    parent: 'Settings › Appearance',
  },
  {
    id: 'settings-light-mode',
    title: 'Light Mode',
    description: 'Enable light theme',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['light', 'mode', 'day', 'theme', 'white', 'bright'],
    category: 'setting',
    parent: 'Settings › Appearance',
  },
  {
    id: 'settings-high-contrast',
    title: 'High Contrast Mode',
    description: 'Accessibility high contrast',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['high', 'contrast', 'accessibility', 'vision', 'a11y'],
    category: 'setting',
    parent: 'Settings › Appearance',
  },
  // Notification Settings
  {
    id: 'settings-notifications',
    title: 'Notification Settings',
    description: 'Configure alerts & notifications',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['notifications', 'alerts', 'sounds', 'email', 'push', 'notify'],
    category: 'setting',
    parent: 'Settings',
  },
  {
    id: 'settings-sound',
    title: 'Sound Notifications',
    description: 'Enable/disable notification sounds',
    path: ROUTES.SETTINGS,
    icon: <Settings />,
    keywords: ['sound', 'audio', 'mute', 'volume', 'beep', 'alert'],
    category: 'setting',
    parent: 'Settings › Notifications',
  },
  // AI Settings
  {
    id: 'settings-ai',
    title: 'AI Model Settings',
    description: 'Configure AI analysis parameters',
    path: ROUTES.SETTINGS,
    icon: <Science />,
    keywords: ['ai', 'model', 'confidence', 'threshold', 'sensitivity', 'specificity', 'machine learning'],
    category: 'setting',
    parent: 'Settings',
  },
  {
    id: 'settings-confidence-threshold',
    title: 'Confidence Threshold',
    description: 'Set minimum confidence for predictions',
    path: ROUTES.SETTINGS,
    icon: <Science />,
    keywords: ['confidence', 'threshold', 'minimum', 'cutoff', 'prediction', 'accuracy'],
    category: 'setting',
    parent: 'Settings › AI Model',
  },
  {
    id: 'settings-explainability',
    title: 'Explainability Settings',
    description: 'GradCAM & attention heatmaps',
    path: ROUTES.SETTINGS,
    icon: <Science />,
    keywords: ['explainability', 'gradcam', 'heatmap', 'attention', 'xai', 'interpretability'],
    category: 'setting',
    parent: 'Settings › AI Model',
  },
  {
    id: 'settings-mc-dropout',
    title: 'MC Dropout Samples',
    description: 'Monte Carlo uncertainty estimation',
    path: ROUTES.SETTINGS,
    icon: <Science />,
    keywords: ['mc', 'dropout', 'monte', 'carlo', 'uncertainty', 'samples', 'variance'],
    category: 'setting',
    parent: 'Settings › AI Model',
  },
  // Privacy & Security
  {
    id: 'settings-privacy',
    title: 'Privacy Settings',
    description: 'Data retention & privacy controls',
    path: ROUTES.SETTINGS,
    icon: <Security />,
    keywords: ['privacy', 'data', 'retention', 'delete', 'gdpr', 'hipaa', 'secure'],
    category: 'setting',
    parent: 'Settings',
  },
  {
    id: 'settings-session-timeout',
    title: 'Session Timeout',
    description: 'Auto-logout after inactivity',
    path: ROUTES.SETTINGS,
    icon: <Security />,
    keywords: ['session', 'timeout', 'logout', 'inactivity', 'security', 'auto'],
    category: 'setting',
    parent: 'Settings › Privacy',
  },

  // ==========================================
  // ANALYSIS FEATURES
  // ==========================================
  {
    id: 'feature-upload-dicom',
    title: 'Upload DICOM Image',
    description: 'Upload mammogram for analysis',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['upload', 'dicom', 'image', 'file', 'mammogram', 'import', 'dcm'],
    category: 'action',
    parent: 'New Analysis',
  },
  {
    id: 'feature-gradcam',
    title: 'View GradCAM Heatmap',
    description: 'AI attention visualization',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['gradcam', 'heatmap', 'attention', 'visualization', 'xai', 'explanation'],
    category: 'feature',
    parent: 'Analysis',
  },
  {
    id: 'feature-confidence',
    title: 'Prediction Confidence',
    description: 'View AI confidence scores',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['confidence', 'score', 'probability', 'certainty', 'prediction'],
    category: 'feature',
    parent: 'Analysis',
  },
  {
    id: 'feature-uncertainty',
    title: 'Uncertainty Estimation',
    description: 'MC Dropout uncertainty metrics',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['uncertainty', 'mc', 'dropout', 'variance', 'epistemic', 'aleatoric'],
    category: 'feature',
    parent: 'Analysis',
  },
  {
    id: 'feature-roi',
    title: 'Region of Interest',
    description: 'View detected ROI areas',
    path: ROUTES.WORKFLOW,
    icon: <Science />,
    keywords: ['roi', 'region', 'interest', 'lesion', 'mass', 'calcification', 'finding'],
    category: 'feature',
    parent: 'Analysis',
  },

  // ==========================================
  // DASHBOARD FEATURES
  // ==========================================
  {
    id: 'dashboard-stats',
    title: 'Analysis Statistics',
    description: 'View analysis counts & metrics',
    path: ROUTES.DASHBOARD,
    icon: <Dashboard />,
    keywords: ['statistics', 'stats', 'count', 'total', 'numbers', 'metrics'],
    category: 'feature',
    parent: 'Dashboard',
  },
  {
    id: 'dashboard-recent',
    title: 'Recent Cases',
    description: 'View recently analyzed cases',
    path: ROUTES.DASHBOARD,
    icon: <Dashboard />,
    keywords: ['recent', 'latest', 'new', 'cases', 'today', 'yesterday'],
    category: 'feature',
    parent: 'Dashboard',
  },
  {
    id: 'dashboard-pending',
    title: 'Pending Reviews',
    description: 'Cases awaiting review',
    path: ROUTES.DASHBOARD,
    icon: <Dashboard />,
    keywords: ['pending', 'waiting', 'review', 'queue', 'incomplete'],
    category: 'feature',
    parent: 'Dashboard',
  },
  {
    id: 'dashboard-system-status',
    title: 'System Status',
    description: 'Backend & AI model health',
    path: ROUTES.DASHBOARD,
    icon: <Dashboard />,
    keywords: ['system', 'status', 'health', 'online', 'offline', 'backend', 'api'],
    category: 'feature',
    parent: 'Dashboard',
  },

  // ==========================================
  // HELP & DOCUMENTATION
  // ==========================================
  {
    id: 'about',
    title: 'About',
    description: 'System information & version',
    path: ROUTES.ABOUT,
    icon: <Info />,
    keywords: ['about', 'info', 'version', 'help', 'system'],
    category: 'navigation',
  },
  {
    id: 'help-keyboard',
    title: 'Keyboard Shortcuts',
    description: 'View all keyboard shortcuts',
    path: ROUTES.ABOUT,
    icon: <Info />,
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys', 'commands', 'ctrl', 'cmd'],
    category: 'help',
    parent: 'Help',
  },
  {
    id: 'help-documentation',
    title: 'Documentation',
    description: 'User guides & documentation',
    path: ROUTES.DOCUMENTATION,
    icon: <Info />,
    keywords: ['documentation', 'docs', 'guide', 'manual', 'tutorial', 'help'],
    category: 'help',
  },
  {
    id: 'help-support',
    title: 'Support',
    description: 'Contact support team',
    path: ROUTES.SUPPORT,
    icon: <Info />,
    keywords: ['support', 'help', 'contact', 'issue', 'problem', 'bug', 'ticket'],
    category: 'help',
  },

  // ==========================================
  // QUICK ACTIONS
  // ==========================================
  {
    id: 'action-export',
    title: 'Export Analysis',
    description: 'Export results as PDF/DICOM',
    path: ROUTES.WORKFLOW,
    icon: <Folder />,
    keywords: ['export', 'download', 'pdf', 'report', 'save', 'print'],
    category: 'action',
  },
  {
    id: 'action-share',
    title: 'Share Case',
    description: 'Share with colleagues',
    path: ROUTES.CASES,
    icon: <LocalHospital />,
    keywords: ['share', 'send', 'colleague', 'collaborate', 'team'],
    category: 'action',
  },
  {
    id: 'action-compare',
    title: 'Compare Analyses',
    description: 'Side-by-side comparison',
    path: ROUTES.ANALYSIS_ARCHIVE,
    icon: <Folder />,
    keywords: ['compare', 'comparison', 'diff', 'side', 'by', 'side', 'dual'],
    category: 'action',
  },
];

// Highlight matched text
const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <Box
            key={i}
            component="span"
            sx={{
              bgcolor: 'warning.light',
              color: 'warning.contrastText',
              borderRadius: 0.5,
              px: 0.3,
              fontWeight: 600,
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

interface GlobalSearchBarProps {
  placeholder?: string;
  width?: number | string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  placeholder = 'Search pages, actions, features...',
  width = 380,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== searchTerm.toLowerCase());
      const updated = [searchTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Filter items based on query with smart ranking
  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    // Filter and score items
    const scoredItems = SEARCHABLE_ITEMS.map(item => {
      const searchableText = [
        item.title,
        item.description,
        item.parent || '',
        ...item.keywords,
      ].join(' ').toLowerCase();
      
      const titleMatch = item.title.toLowerCase().includes(query.toLowerCase());
      const keywordMatch = item.keywords.some(k => k.includes(query.toLowerCase()));
      const allTermsMatch = searchTerms.every(term => searchableText.includes(term));
      
      if (!allTermsMatch) return null;
      
      // Score: higher = better match
      let score = 0;
      if (titleMatch) score += 10;
      if (keywordMatch) score += 5;
      if (item.category === 'navigation') score += 3;
      if (item.category === 'action') score += 2;
      if (!item.parent) score += 1; // Top-level items ranked higher
      
      return { item, score };
    }).filter(Boolean) as { item: SearchableItem; score: number }[];
    
    // Sort by score descending and return top results
    return scoredItems
      .sort((a, b) => b.score - a.score)
      .map(s => s.item)
      .slice(0, 12); // Max 12 results for nested items
  }, [query]);

  // Get display items (filtered results or recent searches)
  const displayItems = useMemo(() => {
    if (query.trim()) {
      return filteredItems;
    }
    return [];
  }, [query, filteredItems]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayItems]);

  // Handle navigation to item
  const handleNavigate = useCallback((item: SearchableItem) => {
    saveRecentSearch(item.title);
    setQuery('');
    setIsOpen(false);
    navigate(item.path);
  }, [navigate, saveRecentSearch]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = displayItems.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(totalItems, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayItems[selectedIndex]) {
          handleNavigate(displayItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [displayItems, selectedIndex, handleNavigate]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && displayItems.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, displayItems.length]);

  // Check if current page
  const isCurrentPage = (path: string) => location.pathname === path;

  // Show dropdown when focused and has query or recent searches
  const showDropdown = isOpen && (query.trim().length > 0 || recentSearches.length > 0);

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ position: 'relative', width }}>
        {/* Search Input */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.background.default, 0.7),
            backdropFilter: 'blur(10px)',
            borderRadius: 2.5,
            border: `1px solid ${isOpen ? theme.palette.primary.main : alpha(theme.palette.divider, 0.15)}`,
            boxShadow: isOpen 
              ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}` 
              : 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.background.paper, 0.95),
              borderColor: alpha(theme.palette.primary.main, 0.3),
            },
          }}
        >
          <SearchIcon 
            sx={{ 
              ml: 1.5, 
              color: isOpen ? theme.palette.primary.main : theme.palette.text.disabled,
              fontSize: 20,
              transition: 'color 0.2s ease',
            }} 
          />
          <InputBase
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            sx={{
              flex: 1,
              px: 1.5,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 450,
              '& .MuiInputBase-input': {
                '&::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                },
              },
            }}
          />
          {query && (
            <IconButton
              size="small"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              sx={{ 
                mr: 0.5,
                color: theme.palette.text.disabled,
                '&:hover': {
                  color: theme.palette.text.primary,
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              mr: 1.5,
              px: 0.8,
              py: 0.3,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.text.primary, 0.06),
            }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 500,
                color: theme.palette.text.secondary,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              ⌘K
            </Typography>
          </Box>
        </Box>

        {/* Dropdown Results */}
        <Fade in={showDropdown}>
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: theme.zIndex.modal,
              maxHeight: 480,
              overflow: 'auto',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            {/* Search Results */}
            {query.trim() && (
              <>
                {displayItems.length > 0 ? (
                  <List ref={listRef} disablePadding sx={{ py: 0.5 }}>
                    {displayItems.map((item, index) => (
                      <ListItemButton
                        key={item.id}
                        selected={index === selectedIndex}
                        onClick={() => handleNavigate(item)}
                        sx={{
                          py: 1.25,
                          px: 2,
                          mx: 0.5,
                          my: 0.25,
                          borderRadius: 1.5,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.12),
                            },
                          },
                          '&:hover': {
                            bgcolor: alpha(theme.palette.action.hover, 0.08),
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 36,
                            color: isCurrentPage(item.path) 
                              ? theme.palette.primary.main 
                              : theme.palette.text.secondary,
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                <HighlightedText text={item.title} query={query} />
                              </Typography>
                              {/* Category badge */}
                              <Chip
                                label={item.category}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  fontWeight: 500,
                                  textTransform: 'capitalize',
                                  bgcolor: item.category === 'action' 
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : item.category === 'setting'
                                    ? alpha(theme.palette.warning.main, 0.1)
                                    : item.category === 'feature'
                                    ? alpha(theme.palette.info.main, 0.1)
                                    : item.category === 'help'
                                    ? alpha(theme.palette.secondary.main, 0.1)
                                    : alpha(theme.palette.text.primary, 0.06),
                                  color: item.category === 'action'
                                    ? theme.palette.success.main
                                    : item.category === 'setting'
                                    ? theme.palette.warning.dark
                                    : item.category === 'feature'
                                    ? theme.palette.info.main
                                    : item.category === 'help'
                                    ? theme.palette.secondary.main
                                    : theme.palette.text.secondary,
                                  '& .MuiChip-label': { px: 0.75 },
                                }}
                              />
                              {isCurrentPage(item.path) && (
                                <Chip
                                  label="Current"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.6rem',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                              {/* Parent breadcrumb for nested items */}
                              {item.parent && (
                                <Typography
                                  variant="caption"
                                  sx={{ 
                                    color: theme.palette.text.disabled,
                                    fontSize: '0.65rem',
                                  }}
                                >
                                  {item.parent}
                                </Typography>
                              )}
                              <Typography
                                variant="caption"
                                sx={{ color: theme.palette.text.secondary }}
                              >
                                <HighlightedText text={item.description} query={query} />
                              </Typography>
                            </Box>
                          }
                        />
                        {index === selectedIndex && (
                          <KeyboardReturn 
                            sx={{ 
                              fontSize: 16, 
                              color: theme.palette.text.disabled,
                              ml: 1,
                            }} 
                          />
                        )}
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No results for "{query}"
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                      Try searching for:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                      {['dark mode', 'confidence', 'gradcam', 'upload', 'export'].map(term => (
                        <Chip
                          key={term}
                          label={term}
                          size="small"
                          onClick={() => {
                            setQuery(term);
                            inputRef.current?.focus();
                          }}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}

            {/* Recent Searches (when no query) */}
            {!query.trim() && recentSearches.length > 0 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 14 }} />
                    Recent Searches
                  </Typography>
                  <Typography
                    component="button"
                    onClick={clearRecentSearches}
                    sx={{
                      fontSize: '0.7rem',
                      color: theme.palette.text.disabled,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      '&:hover': {
                        color: theme.palette.primary.main,
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Clear all
                  </Typography>
                </Box>
                <Divider sx={{ mx: 1 }} />
                <List disablePadding sx={{ py: 0.5 }}>
                  {recentSearches.map((searchTerm, index) => (
                    <ListItemButton
                      key={`recent-${index}`}
                      onClick={() => handleRecentSearchClick(searchTerm)}
                      sx={{
                        py: 1,
                        px: 2,
                        mx: 0.5,
                        my: 0.25,
                        borderRadius: 1.5,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.action.hover, 0.08),
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <History sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={searchTerm}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.secondary',
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}

            {/* Quick Actions Footer */}
            {showDropdown && (
              <>
                <Divider />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="kbd" sx={{ 
                        px: 0.5, 
                        py: 0.2, 
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                        borderRadius: 0.5,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                      }}>
                        ↑↓
                      </Box>
                      Navigate
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="kbd" sx={{ 
                        px: 0.5, 
                        py: 0.2, 
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                        borderRadius: 0.5,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                      }}>
                        ↵
                      </Box>
                      Select
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="kbd" sx={{ 
                        px: 0.5, 
                        py: 0.2, 
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                        borderRadius: 0.5,
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                      }}>
                        Esc
                      </Box>
                      Close
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </Fade>
      </Box>
    </ClickAwayListener>
  );
};

export default GlobalSearchBar;
