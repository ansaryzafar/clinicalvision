/**
 * Authentication Context - Production Grade
 * 
 * Manages user authentication state with:
 * - JWT token storage (localStorage with fallback)
 * - Automatic token refresh via interceptors
 * - Secure token handling
 * - Login/logout functionality
 * - User profile management
 * - Detailed error handling with Pydantic error extraction
 * - Session expiry event handling
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  apiClient, 
  TokenManager, 
  extractApiError, 
  retryWithBackoff,
  ApiError,
  STORAGE_KEYS 
} from '../utils/apiClient';
import axios from 'axios';
import { UserTier, getDefaultTier, canAccessFeature, Feature } from '../types/userTier.types';

// ============================================================================
// Type Definitions
// ============================================================================

interface User {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  tier: UserTier;
  is_active: boolean;
  organization_id?: string;
  license_number?: string;
  specialization?: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
  organization_id?: string;
  license_number?: string;
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorDetails: ApiError | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  /** Check if the current user's tier allows a given feature */
  canAccess: (feature: Feature) => boolean;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// User Storage Helper (extends TokenManager for user data)
// ============================================================================

const UserStorage = {
  getUser: (): User | null => {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  saveUser: (user: User): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  },
};

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiError | null>(null);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const clearAuthError = useCallback(() => {
    setError(null);
    setErrorDetails(null);
  }, []);

  /**
   * Check whether the current user's tier allows a given feature.
   * Returns false if not authenticated.
   */
  const canAccess = useCallback(
    (feature: Feature): boolean => {
      if (!user) return false;
      return canAccessFeature(user.tier ?? getDefaultTier(), feature);
    },
    [user],
  );

  // ============================================================================
  // Authentication Functions
  // ============================================================================

  /**
   * Login user with email and password
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    clearAuthError();

    try {
      // Login request — only retry on network/server errors, not auth failures
      const response = await retryWithBackoff(
        async () => {
          return await axios.post<AuthTokens>(
            '/api/v1/auth/login',
            {
              email: credentials.email.trim().toLowerCase(),
              password: credentials.password,
            }
          );
        },
        2, // max 2 retries for login (avoid burning rate limit)
        1000,
        (error) => {
          // Only retry on network errors or 5xx, never on 4xx (wrong credentials, rate limit, etc.)
          if (axios.isAxiosError(error) && error.response) {
            return error.response.status >= 500;
          }
          return true; // Retry network errors
        }
      );

      const tokens = response.data;
      
      // Validate token presence before saving
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Server returned incomplete authentication data. Please try again.');
      }

      // Save tokens
      TokenManager.saveTokens(tokens.access_token, tokens.refresh_token);

      // Fetch user profile with the new token
      try {
        const userResponse = await apiClient.get<User>('/api/v1/auth/me');
        const userData = { ...userResponse.data, tier: userResponse.data.tier ?? getDefaultTier() };
        UserStorage.saveUser(userData);
        setUser(userData);
      } catch (profileErr) {
        // Profile fetch failed but login succeeded — use basic user data from tokens
        // The user is still authenticated and can access the app
        console.warn('Profile fetch failed after login, using token data');
        const basicUser: User = {
          id: '',
          email: credentials.email,
          role: 'viewer',
          tier: getDefaultTier(),
          is_active: true,
        };
        UserStorage.saveUser(basicUser);
        setUser(basicUser);
      }
    } catch (err) {
      // Provide user-friendly error messages
      const apiError = extractApiError(err);
      
      let userMessage: string;
      if (apiError.status === 0) {
        userMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (apiError.status === 401) {
        userMessage = apiError.message || 'Invalid email or password. Please check your credentials and try again.';
      } else if (apiError.status === 429) {
        userMessage = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (apiError.status === 422) {
        userMessage = 'Please check your email format and password (minimum 8 characters).';
      } else if (apiError.status >= 500) {
        userMessage = 'The server is experiencing issues. Please try again in a few moments.';
      } else {
        userMessage = apiError.message || 'Login failed. Please try again.';
      }
      
      setError(userMessage);
      setErrorDetails(apiError);
      throw new Error(userMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthError]);

  /**
   * Register a new user
   */
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    clearAuthError();

    try {
      await retryWithBackoff(
        async () => {
          return await axios.post('/api/v1/auth/register', data);
        },
        2,
        1000,
        (error) => {
          // Only retry on network errors or 5xx
          if (axios.isAxiosError(error) && error.response) {
            return error.response.status >= 500;
          }
          return true;
        }
      );

      // Auto-login after successful registration
      await login({ email: data.email, password: data.password });
    } catch (err) {
      const apiError = extractApiError(err);
      
      let userMessage: string;
      if (apiError.status === 400) {
        userMessage = apiError.message || 'An account with this email already exists.';
      } else if (apiError.status === 422) {
        userMessage = apiError.message || 'Please check your registration details and try again.';
      } else if (apiError.status === 0) {
        userMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (apiError.status >= 500) {
        userMessage = 'Server error during registration. Please try again later.';
      } else {
        userMessage = apiError.message || 'Registration failed. Please try again.';
      }
      
      setError(userMessage);
      setErrorDetails(apiError);
      throw new Error(userMessage);
    } finally {
      setIsLoading(false);
    }
  }, [login, clearAuthError]);

  /**
   * Logout user and clear all auth data
   */
  const logout = useCallback((): void => {
    TokenManager.clearTokens();
    setUser(null);
    clearAuthError();
  }, [clearAuthError]);

  /**
   * Refresh authentication by validating stored tokens
   */
  const refreshAuth = useCallback(async (): Promise<void> => {
    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();

    if (!accessToken || !refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to get user profile with existing access token
      // apiClient will automatically add the auth header
      const userResponse = await apiClient.get<User>('/api/v1/auth/me');

      const userData = { ...userResponse.data, tier: userResponse.data.tier ?? getDefaultTier() };
      UserStorage.saveUser(userData);
      setUser(userData);
    } catch (err) {
      // Extract error details
      const apiError = extractApiError(err);
      
      // If network error, keep tokens and try to use stored user
      // This handles temporary network issues without logging user out
      if (apiError.status === 0) {
        const storedUser = UserStorage.getUser();
        if (storedUser) {
          setUser(storedUser);
          console.warn('Network error during auth refresh, using stored user');
        }
        setIsLoading(false);
        return;
      }
      
      // If 404 (endpoint doesn't exist), this is a server configuration issue
      // Keep the stored user and don't clear tokens
      if (apiError.status === 404) {
        const storedUser = UserStorage.getUser();
        if (storedUser) {
          setUser(storedUser);
        }
        setIsLoading(false);
        return;
      }
      
      // For 401/403, the apiClient interceptor will have already tried to refresh
      // If we still get here, the refresh failed, so clear tokens
      if (apiError.status === 401 || apiError.status === 403) {
        TokenManager.clearTokens();
        setUser(null);
      } else {
        // Other error - clear tokens
        TokenManager.clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
    setErrorDetails(null);
  }, []);

  // ============================================================================
  // Session Expiry Handler
  // ============================================================================

  useEffect(() => {
    const handleSessionExpired = () => {
      TokenManager.clearTokens();
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      // Check for existing user in storage
      const storedUser = UserStorage.getUser();
      const accessToken = TokenManager.getAccessToken();

      if (storedUser && accessToken) {
        setUser(storedUser);
      }

      // Validate tokens with backend
      await refreshAuth();
    };

    initAuth();
  }, [refreshAuth]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    errorDetails,
    login,
    logout,
    register,
    refreshAuth,
    clearError,
    canAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
