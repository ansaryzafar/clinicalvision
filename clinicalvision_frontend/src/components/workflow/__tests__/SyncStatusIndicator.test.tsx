/**
 * SyncStatusIndicator TDD Tests
 *
 * Phase F, Step F.3 — UI component showing backend sync state.
 *
 * Renders: ✅ Synced | 🔄 Syncing | ⏳ Pending (N) | ❌ Error | 📴 Offline
 * Includes a retry button on error state.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SyncStatusIndicator } from '../SyncStatusIndicator';
import type { SyncStatus } from '../../../services/BackendSyncService';

// ============================================================================
// TESTS
// ============================================================================

describe('SyncStatusIndicator', () => {
  const noop = jest.fn();

  afterEach(() => {
    noop.mockClear();
  });

  // --------------------------------------------------------------------------
  // Test 23: renders "Synced" when status is synced
  // --------------------------------------------------------------------------
  it('should render synced state with check indicator', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'synced' as SyncStatus}
        pendingCount={0}
        onRetry={noop}
      />
    );

    const indicator = screen.getByLabelText(/synced/i);
    expect(indicator).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Test 24: renders "Syncing" with spinner
  // --------------------------------------------------------------------------
  it('should render syncing state with spinner indicator', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'syncing' as SyncStatus}
        pendingCount={1}
        onRetry={noop}
      />
    );

    const indicator = screen.getByLabelText(/syncing/i);
    expect(indicator).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Test 25: renders pending count
  // --------------------------------------------------------------------------
  it('should render pending count when items are pending', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'syncing' as SyncStatus}
        pendingCount={3}
        onRetry={noop}
      />
    );

    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Test 26: renders error state with retry button
  // --------------------------------------------------------------------------
  it('should render error state with retry button', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'error' as SyncStatus}
        pendingCount={1}
        onRetry={noop}
      />
    );

    const indicator = screen.getByLabelText(/error/i);
    expect(indicator).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Test 27: renders offline indicator
  // --------------------------------------------------------------------------
  it('should render offline indicator', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'offline' as SyncStatus}
        pendingCount={0}
        onRetry={noop}
      />
    );

    const indicator = screen.getByLabelText(/offline/i);
    expect(indicator).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Test 28: retry button calls onRetry
  // --------------------------------------------------------------------------
  it('should call onRetry when retry button is clicked', () => {
    render(
      <SyncStatusIndicator
        syncStatus={'error' as SyncStatus}
        pendingCount={2}
        onRetry={noop}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(noop).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Test 29: idle state renders nothing visible (hidden indicator)
  // --------------------------------------------------------------------------
  it('should render idle state as minimal indicator', () => {
    const { container } = render(
      <SyncStatusIndicator
        syncStatus={'idle' as SyncStatus}
        pendingCount={0}
        onRetry={noop}
      />
    );

    // Idle state should still render the component (for accessibility)
    expect(container.firstChild).toBeTruthy();
  });
});
