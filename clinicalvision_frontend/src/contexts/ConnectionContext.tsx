/**
 * API Connection Context
 * 
 * Provides real-time API health monitoring and connection status
 * Features:
 * - Automatic health checks on startup
 * - Periodic health monitoring
 * - Connection recovery detection
 * - Offline mode support
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { checkApiHealth, HealthStatus, API_CONFIG } from '../utils/apiClient';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'degraded';

interface ConnectionContextType {
  status: ConnectionStatus;
  lastHealthCheck: HealthStatus | null;
  latency: number;
  isOnline: boolean;
  checkConnection: () => Promise<void>;
  retryConnection: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ConnectionProviderProps {
  children: ReactNode;
  healthCheckInterval?: number;
  enablePeriodicChecks?: boolean;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
  children,
  healthCheckInterval = API_CONFIG.healthCheckInterval,
  enablePeriodicChecks = true,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastHealthCheck, setLastHealthCheck] = useState<HealthStatus | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // ============================================================================
  // Health Check Logic
  // ============================================================================

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('disconnected');
      setLastHealthCheck({
        isHealthy: false,
        latency: 0,
        timestamp: new Date(),
        error: 'No internet connection',
      });
      return;
    }

    setStatus('checking');

    try {
      const health = await checkApiHealth();
      setLastHealthCheck(health);
      setLatency(health.latency);

      if (health.isHealthy) {
        // Consider degraded if latency > 2 seconds
        setStatus(health.latency > 2000 ? 'degraded' : 'connected');
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      setStatus('disconnected');
      setLastHealthCheck({
        isHealthy: false,
        latency: 0,
        timestamp: new Date(),
        error: 'Health check failed',
      });
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    const maxRetries = 3;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      await checkConnection();
      
      if (status === 'connected' || status === 'degraded') {
        return true;
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    return false;
  }, [checkConnection, status]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initial health check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Periodic health checks
  useEffect(() => {
    if (!enablePeriodicChecks) return;

    const interval = setInterval(() => {
      // Only check if tab is visible
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    }, healthCheckInterval);

    return () => clearInterval(interval);
  }, [checkConnection, healthCheckInterval, enablePeriodicChecks]);

  // Browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Visibility change - check when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'disconnected') {
        checkConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkConnection, status]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: ConnectionContextType = {
    status,
    lastHealthCheck,
    latency,
    isOnline,
    checkConnection,
    retryConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};

export default ConnectionContext;
