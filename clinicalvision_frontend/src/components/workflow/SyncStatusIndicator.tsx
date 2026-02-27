/**
 * SyncStatusIndicator
 *
 * Phase F, Step F.3 — Compact UI component showing backend sync state.
 *
 * Visual states:
 *   idle    — dim checkmark (nothing pending)
 *   synced  — green checkmark
 *   syncing — animated spinner with pending count
 *   error   — red warning icon with retry button
 *   offline — grey wifi-off icon
 *
 * Props-driven (no context dependency) so it can be tested in isolation.
 * The parent wires it to useClinicalCase().syncStatus / pendingCount / retrySync.
 *
 * @module SyncStatusIndicator
 */

import React from 'react';
import type { SyncStatus } from '../../services/BackendSyncService';

// ============================================================================
// PROPS
// ============================================================================

export interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
  pendingCount: number;
  onRetry: () => void;
}

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

const CONTAINER_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  lineHeight: 1,
  padding: '4px 8px',
  borderRadius: '4px',
};

const ICON_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '16px',
  height: '16px',
  fontSize: '14px',
};

const RETRY_BUTTON_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  padding: '2px 8px',
  border: '1px solid #d32f2f',
  borderRadius: '3px',
  background: 'transparent',
  color: '#d32f2f',
  fontSize: '12px',
  cursor: 'pointer',
  lineHeight: 1.2,
};

const SPINNER_KEYFRAMES = `
@keyframes sync-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

// ============================================================================
// COMPONENT
// ============================================================================

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncStatus,
  pendingCount,
  onRetry,
}) => {
  return (
    <>
      {/* Inject spinner animation (idempotent) */}
      <style>{SPINNER_KEYFRAMES}</style>

      <div
        style={CONTAINER_STYLE}
        data-testid="sync-status-indicator"
      >
        {syncStatus === 'idle' && (
          <span
            aria-label="Idle"
            style={{ ...ICON_STYLE, color: '#9e9e9e' }}
          >
            ●
          </span>
        )}

        {syncStatus === 'synced' && (
          <span
            aria-label="Synced"
            style={{ ...ICON_STYLE, color: '#4caf50' }}
          >
            ✓
          </span>
        )}

        {syncStatus === 'syncing' && (
          <>
            <span
              aria-label="Syncing"
              style={{
                ...ICON_STYLE,
                color: '#1976d2',
                animation: 'sync-spin 1s linear infinite',
              }}
            >
              ⟳
            </span>
            {pendingCount > 0 && (
              <span style={{ color: '#1976d2' }}>
                {pendingCount} pending
              </span>
            )}
          </>
        )}

        {syncStatus === 'error' && (
          <>
            <span
              aria-label="Sync error"
              style={{ ...ICON_STYLE, color: '#d32f2f' }}
            >
              ⚠
            </span>
            {pendingCount > 0 && (
              <span style={{ color: '#d32f2f' }}>
                {pendingCount} failed
              </span>
            )}
            <button
              onClick={onRetry}
              style={RETRY_BUTTON_STYLE}
              aria-label="Retry sync"
              type="button"
            >
              ↻ Retry
            </button>
          </>
        )}

        {syncStatus === 'offline' && (
          <span
            aria-label="Offline"
            style={{ ...ICON_STYLE, color: '#757575' }}
          >
            ⊘
          </span>
        )}
      </div>
    </>
  );
};

export default SyncStatusIndicator;
