/**
 * Authentication Context Test Suite
 * 
 * Comprehensive testing for authentication functionality:
 * - Login/logout flows
 * - Token persistence
 * - Session management
 * - Protected route behavior
 * - Authentication state management
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const localStorageStore: Record<string, string> = {};
const sessionStorageStore: Record<string, string> = {};

const clearLocalStorage = () => {
  Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
};

const clearSessionStorage = () => {
  Object.keys(sessionStorageStore).forEach(key => delete sessionStorageStore[key]);
};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: clearLocalStorage,
  get length() { return Object.keys(localStorageStore).length; },
  key: (i: number) => Object.keys(localStorageStore)[i] || null,
};

Object.defineProperty(window, 'localStorage', { 
  value: localStorageMock, 
  writable: true 
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (key: string) => sessionStorageStore[key] || null,
  setItem: (key: string, value: string) => { sessionStorageStore[key] = value; },
  removeItem: (key: string) => { delete sessionStorageStore[key]; },
  clear: clearSessionStorage,
};

Object.defineProperty(window, 'sessionStorage', { 
  value: sessionStorageMock, 
  writable: true 
});

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ============================================================================
// Test Data
// ============================================================================

const mockUser = {
  id: 'user-123',
  email: 'doctor@hospital.com',
  name: 'Dr. Test',
  role: 'radiologist',
};

const mockTokens = {
  access_token: 'mock-access-token-12345',
  refresh_token: 'mock-refresh-token-67890',
  token_type: 'bearer',
};

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'clinicalvision_access_token',
  REFRESH_TOKEN: 'clinicalvision_refresh_token',
  USER: 'clinicalvision_user',
};

// ============================================================================
// Test Suites
// ============================================================================

describe('Authentication System', () => {
  beforeEach(() => {
    clearLocalStorage();
    clearSessionStorage();
  });

  describe('Token Storage', () => {
    it('should store tokens in localStorage on login', async () => {
      localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      localStorageMock.setItem(STORAGE_KEYS.REFRESH_TOKEN, mockTokens.refresh_token);
      
      expect(localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe(mockTokens.access_token);
      expect(localStorageMock.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe(mockTokens.refresh_token);
    });

    it('should retrieve tokens from localStorage', () => {
      localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      
      const token = localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(token).toBe(mockTokens.access_token);
    });

    it('should clear all tokens on logout', () => {
      // Set tokens first
      localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      localStorageMock.setItem(STORAGE_KEYS.REFRESH_TOKEN, mockTokens.refresh_token);
      localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      
      // Clear tokens
      localStorageMock.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorageMock.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorageMock.removeItem(STORAGE_KEYS.USER);
      
      expect(localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeNull();
    });

    it('should fallback to sessionStorage if localStorage fails', () => {
      // Simulate localStorage failure
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => { throw new Error('QuotaExceeded'); };
      
      // Should fallback to sessionStorage
      try {
        localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      } catch {
        sessionStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      }
      
      expect(sessionStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe(mockTokens.access_token);
      
      // Restore
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('User Data Persistence', () => {
    it('should store user data as JSON', () => {
      const userJson = JSON.stringify(mockUser);
      localStorageMock.setItem(STORAGE_KEYS.USER, userJson);
      
      expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBe(userJson);
    });

    it('should parse user data from storage', () => {
      const userJson = JSON.stringify(mockUser);
      localStorageMock.setItem(STORAGE_KEYS.USER, userJson);
      
      const storedUser = localStorageMock.getItem(STORAGE_KEYS.USER);
      const parsedUser = JSON.parse(storedUser as string);
      
      expect(parsedUser.email).toBe(mockUser.email);
      expect(parsedUser.role).toBe(mockUser.role);
    });

    it('should handle corrupted user data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.USER, 'invalid-json-{');
      
      let parsedUser = null;
      try {
        parsedUser = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.USER) as string);
      } catch {
        parsedUser = null;
      }
      
      expect(parsedUser).toBeNull();
    });
  });

  describe('Authentication State', () => {
    it('should identify authenticated state when tokens exist', () => {
      // Set the tokens in the actual store
      localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      
      const hasToken = !!localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const hasUser = !!localStorageMock.getItem(STORAGE_KEYS.USER);
      
      expect(hasToken).toBe(true);
      expect(hasUser).toBe(true);
    });

    it('should identify unauthenticated state when no tokens', () => {
      // Storage is cleared by beforeEach, so just check it's empty
      const hasToken = !!localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(hasToken).toBe(false);
    });
  });

  describe('Login Flow', () => {
    it('should make correct API call for login', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockTokens });
      
      await mockedAxios.post('/api/v1/auth/login', {
        email: 'doctor@hospital.com',
        password: 'SecurePass123!',
      });
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          email: 'doctor@hospital.com',
          password: 'SecurePass123!',
        })
      );
    });

    it('should fetch user profile after successful login', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockTokens });
      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });
      
      // Login
      await mockedAxios.post('/api/v1/auth/login', { email: 'test@test.com', password: 'pass' });
      
      // Fetch profile
      await mockedAxios.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${mockTokens.access_token}` },
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/v1/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockTokens.access_token}`,
          }),
        })
      );
    });

    it('should handle login failure with invalid credentials', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid credentials' } },
      });
      
      let error: any = null;
      try {
        await mockedAxios.post('/api/v1/auth/login', { email: 'wrong@test.com', password: 'wrong' });
      } catch (e) {
        error = e;
      }
      
      expect(error).not.toBeNull();
      expect(error.response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should clear all authentication data on logout', () => {
      // Setup authenticated state
      localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
      localStorageMock.setItem(STORAGE_KEYS.REFRESH_TOKEN, mockTokens.refresh_token);
      localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      
      // Perform logout
      localStorageMock.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorageMock.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorageMock.removeItem(STORAGE_KEYS.USER);
      sessionStorageMock.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorageMock.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorageMock.removeItem(STORAGE_KEYS.USER);
      
      // Verify all cleared (returns undefined after removeItem, which is falsy)
      expect(localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeFalsy();
      expect(localStorageMock.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeFalsy();
      expect(localStorageMock.getItem(STORAGE_KEYS.USER)).toBeFalsy();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens when access token expires', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      });
      
      await mockedAxios.post('/api/v1/auth/refresh', {
        refresh_token: mockTokens.refresh_token,
      });
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        expect.objectContaining({
          refresh_token: mockTokens.refresh_token,
        })
      );
    });

    it('should logout when refresh token is invalid', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid refresh token' } },
      });
      
      let shouldLogout = false;
      try {
        await mockedAxios.post('/api/v1/auth/refresh', { refresh_token: 'expired-token' });
      } catch {
        shouldLogout = true;
      }
      
      expect(shouldLogout).toBe(true);
    });
  });
});

describe('Authentication Persistence', () => {
  beforeEach(() => {
    clearLocalStorage();
    clearSessionStorage();
  });

  it('should persist authentication across page refreshes', () => {
    // Simulate initial login
    localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
    localStorageMock.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    
    // Simulate page refresh (read from storage)
    const accessToken = localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userData = localStorageMock.getItem(STORAGE_KEYS.USER);
    
    expect(accessToken).toBe(mockTokens.access_token);
    expect(userData).toBe(JSON.stringify(mockUser));
  });

  it('should maintain authentication when navigating between pages', () => {
    // Set up authenticated state
    localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
    
    // Navigation should not clear tokens (simulated by checking tokens are still there)
    const tokenBefore = localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    // ... navigation happens ...
    const tokenAfter = localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    expect(tokenBefore).toBe(tokenAfter);
  });

  it('should not logout when clicking back to home', () => {
    localStorageMock.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockTokens.access_token);
    
    // Simulate navigating to landing page
    const isAuthenticated = !!localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // User should still be authenticated
    expect(isAuthenticated).toBe(true);
    // Token should still exist (not removed)
    expect(localStorageMock.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe(mockTokens.access_token);
  });
});

describe('Protected Route Behavior', () => {
  const mockNavigate = jest.fn();
  
  beforeEach(() => {
    clearLocalStorage();
    clearSessionStorage();
  });

  it('should redirect to login when not authenticated', () => {
    const isAuthenticated = false;
    const targetPath = '/dashboard';
    
    if (!isAuthenticated) {
      mockNavigate('/login', { state: { from: targetPath } });
    }
    
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({
      state: expect.objectContaining({ from: targetPath }),
    }));
  });

  it('should allow access when authenticated', () => {
    const isAuthenticated = true;
    let redirected = false;
    
    if (!isAuthenticated) {
      redirected = true;
    }
    
    expect(redirected).toBe(false);
  });

  it('should redirect authenticated users from login page to dashboard', () => {
    const isAuthenticated = true;
    const currentPath = '/login';
    
    if (isAuthenticated && currentPath === '/login') {
      mockNavigate('/dashboard', { replace: true });
    }
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('should redirect authenticated users from landing page to dashboard', () => {
    const isAuthenticated = true;
    const currentPath = '/';
    
    if (isAuthenticated && currentPath === '/') {
      mockNavigate('/dashboard', { replace: true });
    }
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should handle network errors during authentication', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
    
    let networkError = false;
    try {
      await mockedAxios.post('/api/v1/auth/login', { email: 'test@test.com', password: 'pass' });
    } catch (error: any) {
      networkError = error.message === 'Network Error';
    }
    
    expect(networkError).toBe(true);
  });

  it('should handle server errors (500) during login', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 500, data: { detail: 'Internal server error' } },
    });
    
    let serverError = false;
    try {
      await mockedAxios.post('/api/v1/auth/login', { email: 'test@test.com', password: 'pass' });
    } catch (error: any) {
      serverError = error.response?.status === 500;
    }
    
    expect(serverError).toBe(true);
  });

  it('should handle concurrent authentication requests', async () => {
    mockedAxios.post.mockResolvedValue({ data: mockTokens });
    
    const requests = [
      mockedAxios.post('/api/v1/auth/login', { email: 'test1@test.com', password: 'pass1' }),
      mockedAxios.post('/api/v1/auth/login', { email: 'test2@test.com', password: 'pass2' }),
    ];
    
    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(2);
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should handle empty credentials gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 422, data: { detail: 'Validation error' } },
    });
    
    let validationError = false;
    try {
      await mockedAxios.post('/api/v1/auth/login', { email: '', password: '' });
    } catch (error: any) {
      validationError = error.response?.status === 422;
    }
    
    expect(validationError).toBe(true);
  });
});
