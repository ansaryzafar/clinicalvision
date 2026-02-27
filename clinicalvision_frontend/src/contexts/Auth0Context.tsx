/**
 * Auth0 Integration for ClinicalVision
 * 
 * This module provides Auth0 authentication support alongside the existing JWT auth.
 * Organizations can choose between local auth and Auth0 based on their requirements.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ==================== Types ====================

interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  scope?: string;
}

interface Auth0User {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  organizationId?: string;
  role?: string;
  licenseNumber?: string;
  specialization?: string;
}

interface Auth0Tokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

interface Auth0State {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Auth0User | null;
  tokens: Auth0Tokens | null;
  error: string | null;
}

interface Auth0ContextType extends Auth0State {
  login: () => void;
  loginWithRedirect: (returnTo?: string) => void;
  logout: (returnTo?: string) => void;
  handleCallback: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getAccessToken: () => string | null;
  isAuth0Enabled: boolean;
}

// ==================== Configuration ====================

const AUTH0_CONFIG: Auth0Config = {
  domain: process.env.REACT_APP_AUTH0_DOMAIN || '',
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || '',
  audience: process.env.REACT_APP_AUTH0_AUDIENCE || '',
  redirectUri: process.env.REACT_APP_AUTH0_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  scope: 'openid profile email',
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ==================== Storage Keys ====================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth0_access_token',
  REFRESH_TOKEN: 'auth0_refresh_token',
  USER: 'auth0_user',
  EXPIRES_AT: 'auth0_expires_at',
  STATE: 'auth0_state',
};

// ==================== Context ====================

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

// ==================== Provider ====================

interface Auth0ProviderProps {
  children: ReactNode;
}

export const Auth0Provider: React.FC<Auth0ProviderProps> = ({ children }) => {
  const [state, setState] = useState<Auth0State>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    tokens: null,
    error: null,
  });

  const isAuth0Enabled = Boolean(AUTH0_CONFIG.domain && AUTH0_CONFIG.clientId);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);

        if (accessToken && expiresAt && userStr) {
          const expiresAtDate = new Date(expiresAt);
          
          if (expiresAtDate > new Date()) {
            // Token is still valid
            const user = JSON.parse(userStr) as Auth0User;
            setState({
              isAuthenticated: true,
              isLoading: false,
              user,
              tokens: {
                accessToken,
                refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || undefined,
                tokenType: 'Bearer',
                expiresIn: Math.floor((expiresAtDate.getTime() - Date.now()) / 1000),
              },
              error: null,
            });
            return;
          } else {
            // Token expired, try to refresh
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const refreshed = await refreshTokenInternal(refreshToken);
              if (refreshed) {
                setState(prev => ({ ...prev, isLoading: false }));
                return;
              }
            }
          }
        }

        // Not authenticated
        clearAuthStorage();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        });
      } catch (error) {
        console.error('Auth0 initialization error:', error);
        clearAuthStorage();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: 'Failed to initialize authentication',
        });
      }
    };

    if (isAuth0Enabled) {
      initializeAuth();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuth0Enabled]);

  const clearAuthStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.STATE);
  };

  const saveAuthData = (tokens: Auth0Tokens, user: Auth0User) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toISOString());
  };

  const refreshTokenInternal = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth0/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      const user = userStr ? JSON.parse(userStr) : null;

      if (user) {
        const tokens: Auth0Tokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          tokenType: data.token_type,
          expiresIn: data.expires_in,
        };

        saveAuthData(tokens, user);
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          tokens,
          error: null,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const login = useCallback(() => {
    loginWithRedirect();
  }, []);

  const loginWithRedirect = useCallback((returnTo?: string) => {
    if (!isAuth0Enabled) {
      console.warn('Auth0 is not enabled');
      return;
    }

    // Generate and store state for CSRF protection
    const state = generateRandomState();
    localStorage.setItem(STORAGE_KEYS.STATE, state);

    if (returnTo) {
      sessionStorage.setItem('auth0_return_to', returnTo);
    }

    // Redirect to backend's Auth0 login endpoint
    window.location.href = `${API_BASE_URL}/api/v1/auth0/login?redirect_uri=${encodeURIComponent(AUTH0_CONFIG.redirectUri)}`;
  }, [isAuth0Enabled]);

  const handleCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorDescription || error,
      }));
      return;
    }

    if (!code) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Missing authorization code',
      }));
      return;
    }

    try {
      // Exchange code for tokens via backend
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth0/callback?code=${code}&state=${state || ''}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const data = await response.json();

      const tokens: Auth0Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
      };

      const user: Auth0User = {
        id: data.user.id,
        email: data.user.email,
        emailVerified: data.user.email_verified,
        name: data.user.name,
        givenName: data.user.given_name,
        familyName: data.user.family_name,
        picture: data.user.picture,
        organizationId: data.user.organization_id,
        role: data.user.role,
      };

      saveAuthData(tokens, user);

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        tokens,
        error: null,
      });

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Redirect to return URL if set
      const returnTo = sessionStorage.getItem('auth0_return_to');
      if (returnTo) {
        sessionStorage.removeItem('auth0_return_to');
        window.location.href = returnTo;
      }
    } catch (error) {
      console.error('Auth0 callback error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }));
    }
  }, []);

  const logout = useCallback((returnTo?: string) => {
    clearAuthStorage();
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    });

    if (isAuth0Enabled) {
      const returnUrl = returnTo || window.location.origin;
      window.location.href = `${API_BASE_URL}/api/v1/auth0/logout?return_to=${encodeURIComponent(returnUrl)}`;
    }
  }, [isAuth0Enabled]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!storedRefreshToken) {
      return false;
    }
    return refreshTokenInternal(storedRefreshToken);
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return state.tokens?.accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }, [state.tokens]);

  const contextValue: Auth0ContextType = {
    ...state,
    login,
    loginWithRedirect,
    logout,
    handleCallback,
    refreshToken,
    getAccessToken,
    isAuth0Enabled,
  };

  return (
    <Auth0Context.Provider value={contextValue}>
      {children}
    </Auth0Context.Provider>
  );
};

// ==================== Hook ====================

export const useAuth0 = (): Auth0ContextType => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
};

// ==================== Utilities ====================

function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ==================== Auth0 Callback Component ====================

export const Auth0Callback: React.FC = () => {
  const { handleCallback, isLoading, error } = useAuth0();

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <div style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0277BD',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '20px', color: '#666' }}>
          Completing authentication...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#0277BD',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// ==================== Protected Route HOC ====================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export const Auth0ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect(window.location.pathname);
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default Auth0Provider;
