import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getWebSocketUrl } from '../utils/api';

/**
 * Authentication hook for QueuePlay JWT management
 * 
 * Handles the two-layer security strategy:
 * 1. Session cookies (httpOnly, secure)
 * 2. JWT tokens (15-minute expiry, auto-refresh)
 * 
 * Integration ready for OAuth providers (Auth0, Google, etc.)
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = getApiBaseUrl();

  // Auto-refresh token every 10 minutes (before 15-minute expiry)
  const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get fresh JWT token using session cookie
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        return data.access_token;
      } else {
        // Session expired, clear auth state
        setIsAuthenticated(false);
        setCurrentUser(null);
        setToken(null);
        return null;
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      return null;
    }
  }, [API_BASE_URL]);

  /**
   * Login with user credentials
   * TODO: Replace with OAuth provider integration (Auth0, Google, etc.)
   */
  const login = useCallback(async (userId, username) => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Login to get session cookie
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ user_id: userId, username: username })
      });
      
      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
      }
      
      const loginData = await loginResponse.json();
      console.log('Login successful:', loginData);
      
      // Step 2: Get JWT token using session cookie
      const tokenResponse = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        credentials: 'include' // Include session cookie
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token generation failed: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log('Token received:', tokenData);
      
      // Update state
      setToken(tokenData.access_token);
      setCurrentUser({ user_id: userId, username: username });
      setIsAuthenticated(true);
      
      return tokenData.access_token;
      
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setToken(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  /**
   * Logout and clear session
   */
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Clear state regardless of API call success
    setIsAuthenticated(false);
    setCurrentUser(null);
    setToken(null);
    setError(null);
  }, [API_BASE_URL]);

  /**
   * Make authenticated API request with auto-retry on token expiry
   */
  const apiRequest = useCallback(async (url, options = {}) => {
    let currentToken = token;
    
    // If no token, try to refresh first
    if (!currentToken) {
      currentToken = await refreshToken();
      if (!currentToken) {
        throw new Error('No valid authentication token');
      }
    }

    // Make request with current token
    const requestOptions = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers,
      },
    };

    let response = await fetch(url, requestOptions);

    // If token expired, refresh and retry once
    if (response.status === 401) {
      console.log('Token expired, refreshing...');
      currentToken = await refreshToken();
      
      if (currentToken) {
        requestOptions.headers['Authorization'] = `Bearer ${currentToken}`;
        response = await fetch(url, requestOptions);
      } else {
        throw new Error('Authentication failed');
      }
    }

    return response;
  }, [token, refreshToken]);

  /**
   * Get WebSocket connection with JWT authentication
   */
  const getWebSocketConnection = useCallback(async (gameId, role = 'host') => {
    let currentToken = token;
    
    // Ensure we have a fresh token
    if (!currentToken) {
      currentToken = await refreshToken();
      if (!currentToken) {
        throw new Error('No valid authentication token for WebSocket');
      }
    }

    // Create WebSocket connection using centralized URL
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    
    // Set up authentication flow
    ws.onopen = () => {
      console.log('WebSocket connected, authenticating...');
      ws.send(JSON.stringify({
        action: 'authenticate',
        token: currentToken
      }));
      
      // After authentication, identify as host/player
      setTimeout(() => {
        ws.send(JSON.stringify({
          action: 'identify',
          gameId: gameId,
          role: role
        }));
      }, 100);
    };

    return ws;
  }, [token, refreshToken]);

  /**
   * Check if session exists on app load
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        const newToken = await refreshToken();
        if (newToken) {
          // Session exists, we'll need to get user info from somewhere
          // For now, just mark as authenticated
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log('No existing session');
      }
    };

    checkSession();
  }, [refreshToken]);

  /**
   * Set up automatic token refresh
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing token...');
      refreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken]);

  const getAuthHeaders = useCallback(() => {
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
    return { 'Content-Type': 'application/json' };
  }, [token]);

  return {
    isAuthenticated,
    currentUser,
    token,
    loading,
    error,
    login,
    logout,
    refreshToken,
    getAuthHeaders,
    apiRequest,
    getWebSocketConnection,
  };
}; 