/**
 * Production-Grade API Client
 * 
 * Features:
 * - Centralized axios configuration
 * - Automatic token refresh with interceptors
 * - Detailed error extraction (including Pydantic 422 errors)
 * - Request/response logging in development
 * - Health check functionality
 * - Retry logic with exponential backoff
 * - Connection status monitoring
 */
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  healthCheckInterval: 30000,
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'clinicalvision_access_token',
  REFRESH_TOKEN: 'clinicalvision_refresh_token',
  USER: 'clinicalvision_user',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export interface ApiError {
  status: number;
  message: string;
  details?: ValidationError[];
  raw?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
}

export interface HealthStatus {
  isHealthy: boolean;
  latency: number;
  timestamp: Date;
  error?: string;
}

interface PydanticValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

// ============================================================================
// Token Manager
// ============================================================================

export const TokenManager = {
  getAccessToken: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  getRefreshToken: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  saveTokens: (accessToken: string, refreshToken: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  },

  clearTokens: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },

  hasValidTokens: (): boolean => {
    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();
    return !!(accessToken && refreshToken);
  },
};

// ============================================================================
// Error Extraction Utilities
// ============================================================================

/**
 * Extract detailed error information from Axios errors
 * Handles Pydantic 422 validation errors specifically
 */
export function extractApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      status: 0,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      raw: error,
    };
  }

  const axiosError = error as AxiosError<{ detail?: string | PydanticValidationError[] }>;

  // No response - network error
  if (!axiosError.response) {
    return {
      status: 0,
      message: axiosError.code === 'ECONNABORTED' 
        ? 'Request timed out. Please check your connection.'
        : 'Cannot connect to server. Please check your network connection.',
      raw: error,
    };
  }

  const { status, data } = axiosError.response;

  // Handle 422 Validation Errors (Pydantic)
  if (status === 422 && data?.detail) {
    if (Array.isArray(data.detail)) {
      const validationErrors: ValidationError[] = data.detail.map((err: PydanticValidationError) => ({
        field: err.loc.slice(1).join('.') || err.loc[0]?.toString() || 'unknown',
        message: err.msg,
        type: err.type,
      }));

      // Create human-readable message
      const messages = validationErrors.map(e => {
        const fieldName = e.field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return `${fieldName}: ${e.message}`;
      });

      return {
        status,
        message: messages.join('\n'),
        details: validationErrors,
        raw: data,
      };
    }
  }

  // Standard error responses
  const errorMessages: Record<number, string> = {
    400: data?.detail as string || 'Invalid request',
    401: 'Invalid credentials or session expired',
    403: 'You do not have permission to perform this action',
    404: 'The requested resource was not found',
    409: data?.detail as string || 'Conflict with existing data',
    429: 'Too many requests. Please wait before trying again.',
    500: 'Server error. Our team has been notified.',
    502: 'Server temporarily unavailable. Please try again.',
    503: 'Service temporarily unavailable. Please try again later.',
  };

  return {
    status,
    message: typeof data?.detail === 'string' 
      ? data.detail 
      : errorMessages[status] || `Request failed with status ${status}`,
    raw: data,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(e => `• ${e.field.replace(/_/g, ' ')}: ${e.message}`)
    .join('\n');
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = API_CONFIG.retryAttempts,
  baseDelay: number = API_CONFIG.retryDelay,
  shouldRetry?: (error: unknown) => boolean
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Default: Don't retry on client errors (4xx except 408, 429)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw error;
        }
      }

      // Retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        if (IS_DEVELOPMENT) {
          console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// API Client Factory
// ============================================================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeToTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Create a configured axios instance with interceptors
 */
export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor - Add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = TokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Development logging
      if (IS_DEVELOPMENT) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor - Handle token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (IS_DEVELOPMENT) {
        console.log(`[API] Response ${response.status}`, response.data);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Don't try to refresh if this was the login or refresh endpoint itself
        const url = originalRequest.url || '';
        if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Wait for the refresh to complete
          return new Promise((resolve) => {
            subscribeToTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        isRefreshing = true;

        try {
          const refreshToken = TokenManager.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post<{
            access_token: string;
            refresh_token: string;
          }>(`${API_CONFIG.baseURL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          TokenManager.saveTokens(access_token, refresh_token);

          onTokenRefreshed(access_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          TokenManager.clearTokens();
          refreshSubscribers = [];
          
          // Dispatch custom event for auth failure
          window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check API health status
 */
export async function checkApiHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_CONFIG.baseURL}/health/`, {
      timeout: 5000,
    });

    return {
      isHealthy: response.status === 200,
      latency: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      isHealthy: false,
      latency: Date.now() - startTime,
      timestamp: new Date(),
      error: extractApiError(error).message,
    };
  }
}

/**
 * Wait for API to become available
 */
export async function waitForApi(
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const health = await checkApiHealth();
    if (health.isHealthy) {
      return true;
    }
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return false;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const apiClient = createApiClient();

export default apiClient;
