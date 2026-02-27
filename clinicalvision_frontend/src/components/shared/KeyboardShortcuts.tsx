/**
 * KeyboardShortcuts Component
 * 
 * Implements KLM (Keystroke-Level Model) optimization from Paton et al.
 * "Improving the Usability and Safety of Digital Health Systems"
 * 
 * Key insight: The Danish whiteboard study showed 44.6% reduction in task
 * completion time by reducing H+M+P+K (Hand+Mental+Point+Keystroke) operations.
 * 
 * This component provides:
 * - Global keyboard shortcuts for common actions
 * - Shortcut hints overlay (press ? to show)
 * - Reduces mouse travel (Fitts' Law optimization)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Divider,
  IconButton,
  alpha,
  styled,
  Grid,
} from '@mui/material';
import {
  Close,
  Keyboard,
  CloudUpload,
  Search,
  Home,
  Analytics,
  Help,
  Settings,
  Logout,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Styled components
const ShortcutKey = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 28,
  height: 28,
  padding: '0 8px',
  borderRadius: 6,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  color: theme.palette.primary.main,
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  fontWeight: 600,
}));

const ShortcutRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5, 0),
  '&:hover': {
    backgroundColor: alpha(theme.palette.action.hover, 0.5),
    borderRadius: 8,
    marginLeft: -8,
    marginRight: -8,
    paddingLeft: 8,
    paddingRight: 8,
  },
}));

// Shortcut definitions - optimized based on KLM analysis
interface ShortcutDefinition {
  keys: string[];
  description: string;
  action: string;
  category: 'navigation' | 'actions' | 'analysis' | 'general';
  icon?: React.ReactNode;
}

const shortcuts: ShortcutDefinition[] = [
  // Navigation - reduce H+P operations (no mouse needed)
  { keys: ['G', 'H'], description: 'Go to Dashboard', action: 'navigate:/', category: 'navigation', icon: <Home fontSize="small" /> },
  { keys: ['G', 'U'], description: 'Go to Upload', action: 'navigate:/upload', category: 'navigation', icon: <CloudUpload fontSize="small" /> },
  { keys: ['G', 'A'], description: 'Go to Analysis', action: 'navigate:/analysis', category: 'navigation', icon: <Analytics fontSize="small" /> },
  { keys: ['G', 'S'], description: 'Go to Settings', action: 'navigate:/settings', category: 'navigation', icon: <Settings fontSize="small" /> },
  
  // Actions - minimize M (mental preparation) by consistent shortcuts
  { keys: ['Ctrl', 'K'], description: 'Open Command Palette', action: 'command-palette', category: 'actions', icon: <Search fontSize="small" /> },
  { keys: ['Ctrl', 'U'], description: 'Quick Upload', action: 'quick-upload', category: 'actions', icon: <CloudUpload fontSize="small" /> },
  { keys: ['Ctrl', 'N'], description: 'New Analysis', action: 'new-analysis', category: 'actions', icon: <Analytics fontSize="small" /> },
  
  // Analysis - reduce K operations with single-key actions
  { keys: ['Enter'], description: 'Run Analysis', action: 'run-analysis', category: 'analysis' },
  { keys: ['Escape'], description: 'Cancel / Close', action: 'cancel', category: 'analysis' },
  { keys: ['R'], description: 'Refresh Results', action: 'refresh', category: 'analysis' },
  
  // General
  { keys: ['?'], description: 'Show Shortcuts', action: 'show-shortcuts', category: 'general', icon: <Help fontSize="small" /> },
  { keys: ['Ctrl', 'L'], description: 'Logout', action: 'logout', category: 'general', icon: <Logout fontSize="small" /> },
];

interface KeyboardShortcutsProps {
  onAction?: (action: string) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onAction }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAction = useCallback((action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.replace('navigate:', ''));
    } else if (action === 'show-shortcuts') {
      setShowHelp(true);
    } else if (onAction) {
      onAction(action);
    }
  }, [navigate, onAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      
      // Handle two-key sequences (G + letter)
      if (pendingKey === 'G') {
        const shortcut = shortcuts.find(
          s => s.keys[0] === 'G' && s.keys[1] === key
        );
        if (shortcut) {
          e.preventDefault();
          handleAction(shortcut.action);
        }
        setPendingKey(null);
        return;
      }

      // Start two-key sequence
      if (key === 'G' && !isCtrl) {
        setPendingKey('G');
        // Clear pending after 1.5s (KLM mental preparation time)
        setTimeout(() => setPendingKey(null), 1500);
        return;
      }

      // Handle Ctrl + key shortcuts
      if (isCtrl) {
        const shortcut = shortcuts.find(
          s => s.keys[0] === 'Ctrl' && s.keys[1] === key
        );
        if (shortcut) {
          e.preventDefault();
          handleAction(shortcut.action);
          return;
        }
      }

      // Handle single-key shortcuts
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Handle Escape
      if (key === 'ESCAPE') {
        if (showHelp) {
          setShowHelp(false);
        } else if (onAction) {
          onAction('cancel');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingKey, showHelp, handleAction, onAction]);

  // Render shortcut key combination
  const renderKeys = (keys: string[]) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {keys.map((key, i) => (
        <React.Fragment key={key}>
          <ShortcutKey>{key}</ShortcutKey>
          {i < keys.length - 1 && (
            <Typography variant="caption" color="text.secondary">
              +
            </Typography>
          )}
        </React.Fragment>
      ))}
    </Stack>
  );

  // Group shortcuts by category
  const groupedShortcuts = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    actions: shortcuts.filter(s => s.category === 'actions'),
    analysis: shortcuts.filter(s => s.category === 'analysis'),
    general: shortcuts.filter(s => s.category === 'general'),
  };

  return (
    <>
      {/* Pending key indicator */}
      {pendingKey && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'primary.main',
            borderRadius: 2,
            px: 3,
            py: 1.5,
            boxShadow: 4,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Keyboard color="primary" fontSize="small" />
            <Typography variant="body2">
              Pressed <ShortcutKey>{pendingKey}</ShortcutKey> — waiting for next key...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Shortcuts help dialog */}
      <Dialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Keyboard />
            <Typography variant="h6" fontWeight={600}>
              Keyboard Shortcuts
            </Typography>
          </Stack>
          <IconButton onClick={() => setShowHelp(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Optimized for efficiency — reduce clicks and mouse movement (KLM/Fitts' Law)
          </Typography>
          
          <Grid container spacing={3}>
            {/* Navigation */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Navigation
              </Typography>
              {groupedShortcuts.navigation.map(shortcut => (
                <ShortcutRow key={shortcut.action}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {shortcut.icon}
                    <Typography variant="body2">{shortcut.description}</Typography>
                  </Stack>
                  {renderKeys(shortcut.keys)}
                </ShortcutRow>
              ))}
            </Grid>
            
            {/* Actions */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Quick Actions
              </Typography>
              {groupedShortcuts.actions.map(shortcut => (
                <ShortcutRow key={shortcut.action}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {shortcut.icon}
                    <Typography variant="body2">{shortcut.description}</Typography>
                  </Stack>
                  {renderKeys(shortcut.keys)}
                </ShortcutRow>
              ))}
            </Grid>
            
            {/* Analysis */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Analysis
              </Typography>
              {groupedShortcuts.analysis.map(shortcut => (
                <ShortcutRow key={shortcut.action}>
                  <Typography variant="body2">{shortcut.description}</Typography>
                  {renderKeys(shortcut.keys)}
                </ShortcutRow>
              ))}
            </Grid>
            
            {/* General */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                General
              </Typography>
              {groupedShortcuts.general.map(shortcut => (
                <ShortcutRow key={shortcut.action}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {shortcut.icon}
                    <Typography variant="body2">{shortcut.description}</Typography>
                  </Stack>
                  {renderKeys(shortcut.keys)}
                </ShortcutRow>
              ))}
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="caption" color="text.secondary">
            💡 Tip: Two-key sequences (like G+H) have a 1.5s window between keys
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KeyboardShortcuts;
