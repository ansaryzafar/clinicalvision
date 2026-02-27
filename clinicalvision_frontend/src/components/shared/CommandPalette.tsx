/**
 * CommandPalette Component - Simplified & User-Friendly
 * 
 * Design Principles Applied:
 * 1. Hick's Law: Reduced choices to top 5 initially
 * 2. Recognition over Recall: Clear action-oriented labels
 * 3. Consistent shortcuts: ⌘/Ctrl + letter format only
 * 4. Real usage tracking: Shows actually used commands
 * 5. Text highlighting: Visual feedback for search matches
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  Box,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search,
  Science,
  Dashboard,
  History,
  Folder,
  Settings,
  Security,
  Info,
  TrendingUp,
  KeyboardReturn,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';

// Storage key for usage tracking
const USAGE_STORAGE_KEY = 'commandPalette_usage';
const MAX_RECENT = 5;

// Command definition
interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  path: string;
  keywords: string[];
  category: 'quick' | 'navigate';
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// Highlight matched text in search results
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
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 0.5,
              px: 0.25,
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

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});

  // Load usage stats from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(USAGE_STORAGE_KEY);
      if (saved) {
        setUsageStats(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load command usage stats');
    }
  }, []);

  // All available commands - mapped to ACTUAL routes
  const commands: Command[] = useMemo(() => [
    // Quick Actions - Most common clinical tasks
    {
      id: 'new-analysis',
      label: 'New Analysis',
      description: 'Upload & analyze mammogram',
      icon: <Science />,
      shortcut: '⌘N',
      path: ROUTES.WORKFLOW,
      keywords: ['upload', 'scan', 'mammogram', 'new', 'diagnose', 'image'],
      category: 'quick',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Overview & statistics',
      icon: <Dashboard />,
      shortcut: '⌘D',
      path: ROUTES.DASHBOARD,
      keywords: ['home', 'main', 'overview', 'stats'],
      category: 'quick',
    },
    {
      id: 'cases',
      label: 'Case Management',
      description: 'View & manage patient cases',
      icon: <Folder />,
      path: ROUTES.CASES,
      keywords: ['patients', 'records', 'manage', 'list'],
      category: 'quick',
    },
    // Navigation - Secondary pages
    {
      id: 'archive',
      label: 'Analysis Archive',
      description: 'Saved analysis sessions',
      icon: <History />,
      path: ROUTES.ANALYSIS_ARCHIVE,
      keywords: ['archive', 'saved', 'previous', 'sessions'],
      category: 'navigate',
    },
    {
      id: 'history',
      label: 'Patient History',
      description: 'Past patient records',
      icon: <History />,
      path: ROUTES.HISTORY,
      keywords: ['history', 'past', 'records', 'previous'],
      category: 'navigate',
    },
    {
      id: 'workflow',
      label: 'Clinical Workflow',
      description: 'Step-by-step workflow',
      icon: <TrendingUp />,
      path: ROUTES.WORKFLOW,
      keywords: ['workflow', 'process', 'steps', 'clinical'],
      category: 'navigate',
    },
    {
      id: 'fairness',
      label: 'Fairness Monitor',
      description: 'AI bias & compliance',
      icon: <Security />,
      path: ROUTES.FAIRNESS,
      keywords: ['fairness', 'bias', 'compliance', 'ethics', 'monitor'],
      category: 'navigate',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'App preferences',
      icon: <Settings />,
      shortcut: '⌘,',
      path: ROUTES.SETTINGS,
      keywords: ['settings', 'preferences', 'config', 'options'],
      category: 'navigate',
    },
    {
      id: 'about',
      label: 'About',
      description: 'System information',
      icon: <Info />,
      path: ROUTES.ABOUT,
      keywords: ['about', 'info', 'version', 'system'],
      category: 'navigate',
    },
  ], []);

  // Track command usage
  const trackUsage = useCallback((commandId: string) => {
    setUsageStats(prev => {
      const updated = { ...prev, [commandId]: (prev[commandId] || 0) + 1 };
      try {
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save command usage stats');
      }
      return updated;
    });
  }, []);

  // Filter and sort commands based on query and usage
  const filteredCommands = useMemo(() => {
    let results = [...commands];
    
    // Filter by query if present
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      results = results.filter(cmd => {
        const searchText = [cmd.label, cmd.description, ...cmd.keywords].join(' ').toLowerCase();
        return searchText.includes(lowerQuery);
      });
      
      // Sort by relevance: label starts with query > label contains > description/keywords
      results.sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        const aStartsWith = aLabel.startsWith(lowerQuery);
        const bStartsWith = bLabel.startsWith(lowerQuery);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        
        const aContains = aLabel.includes(lowerQuery);
        const bContains = bLabel.includes(lowerQuery);
        
        if (aContains && !bContains) return -1;
        if (bContains && !aContains) return 1;
        
        return 0;
      });
    } else {
      // No query: sort by usage frequency, then by category
      results.sort((a, b) => {
        const aUsage = usageStats[a.id] || 0;
        const bUsage = usageStats[b.id] || 0;
        
        if (aUsage !== bUsage) return bUsage - aUsage;
        
        // Quick actions come first
        if (a.category === 'quick' && b.category !== 'quick') return -1;
        if (b.category === 'quick' && a.category !== 'quick') return 1;
        
        return 0;
      });
    }
    
    // Limit to prevent overwhelming the user
    return results.slice(0, query.trim() ? 10 : MAX_RECENT);
  }, [commands, query, usageStats]);

  // Check if current page matches command
  const isCurrentPage = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure dialog is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Execute command
  const executeCommand = useCallback((command: Command) => {
    trackUsage(command.id);
    navigate(command.path);
    onClose();
  }, [navigate, onClose, trackUsage]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        // Tab cycles through like arrow down
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Determine section label
  const getSectionLabel = () => {
    if (query.trim()) {
      return `${filteredCommands.length} result${filteredCommands.length !== 1 ? 's' : ''}`;
    }
    const hasUsage = Object.keys(usageStats).length > 0;
    return hasUsage ? 'Recent' : 'Quick Actions';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '12%',
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          backgroundImage: 'none',
          boxShadow: `0 25px 60px -15px ${alpha(theme.palette.common.black, 0.35)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          overflow: 'hidden',
          maxHeight: '70vh',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: alpha(theme.palette.common.black, 0.6),
            backdropFilter: 'blur(8px)',
          },
        },
      }}
      TransitionProps={{ timeout: 150 }}
    >
      {/* Search Input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 2,
          gap: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Search sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or jump to..."
          fullWidth
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          sx={{
            fontSize: '1.05rem',
            fontWeight: 500,
            '& input::placeholder': {
              color: theme.palette.text.secondary,
              opacity: 0.8,
            },
          }}
        />
        <Chip
          label="ESC"
          size="small"
          onClick={onClose}
          sx={{
            height: 26,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: alpha(theme.palette.divider, 0.3),
            color: theme.palette.text.secondary,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.divider, 0.5),
            },
          }}
        />
      </Box>

      {/* Results Section */}
      <Box sx={{ py: 1 }}>
        {/* Section Label */}
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            display: 'block',
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {getSectionLabel()}
        </Typography>

        {/* Command List */}
        {filteredCommands.length > 0 ? (
          <List ref={listRef} dense sx={{ py: 0, px: 1 }}>
            {filteredCommands.map((cmd, idx) => {
              const isCurrent = isCurrentPage(cmd.path);
              const isSelected = selectedIndex === idx;
              
              return (
                <ListItemButton
                  key={cmd.id}
                  selected={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  disabled={isCurrent}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    py: 1.25,
                    px: 1.5,
                    transition: 'all 0.15s ease',
                    bgcolor: isSelected 
                      ? alpha(theme.palette.primary.main, 0.1) 
                      : 'transparent',
                    opacity: isCurrent ? 0.5 : 1,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isSelected 
                        ? theme.palette.primary.main 
                        : theme.palette.text.secondary,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {cmd.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: theme.palette.text.primary,
                          }}
                        >
                          <HighlightedText text={cmd.label} query={query} />
                        </Typography>
                        {isCurrent && (
                          <Chip
                            label="Current"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: alpha(theme.palette.success.main, 0.15),
                              color: theme.palette.success.main,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.75rem',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        <HighlightedText text={cmd.description} query={query} />
                      </Typography>
                    }
                  />
                  {cmd.shortcut && (
                    <Chip
                      label={cmd.shortcut}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        bgcolor: alpha(theme.palette.divider, 0.3),
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        color: theme.palette.text.secondary,
                      }}
                    />
                  )}
                  {isSelected && !cmd.shortcut && (
                    <KeyboardReturn 
                      sx={{ 
                        fontSize: 16, 
                        color: theme.palette.primary.main,
                        opacity: 0.7,
                      }} 
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          /* Empty State */
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: 'center',
            }}
          >
            <Search 
              sx={{ 
                fontSize: 40, 
                color: theme.palette.text.disabled,
                opacity: 0.4,
                mb: 1.5,
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.text.secondary,
                mb: 0.5,
              }}
            >
              No results for "<strong>{query}</strong>"
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.disabled,
              }}
            >
              Try searching for "dashboard", "analyze", or "settings"
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Hints */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              <KeyboardArrowUp sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
              <KeyboardArrowDown sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            </Box>
            <Typography variant="caption" color="text.secondary">navigate</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <KeyboardReturn sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
            <Typography variant="caption" color="text.secondary">select</Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled">
          ⌘K to open anytime
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
