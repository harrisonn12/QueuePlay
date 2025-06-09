import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getWebSocketUrl, getStoredToken, storeToken, clearStoredToken, getGuestToken, storeGuestInfo, getGuestUserId } from '../utils/api';

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
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userType, setUserType] = useState(null); // 'host' or 'guest'



  // Auto-refresh token every 10 minutes (before 15-minute expiry)
  const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

  /**
   * Login function for hosts (OAuth integration point)
   */
  const login = useCallback(async (email = "test@example.com", password = "password") => {
    try {
      console.log('useAuth: Starting login process for:', email);
      // Step 1: Host authentication via OAuth would go here
      // For now, using the existing test flow
      
      // Step 2: Create session with backend
      console.log('useAuth: Creating session with backend...');
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: email,
          username: email.split('@')[0]
        })
      });

      console.log('useAuth: Login response status:', response.status);

      if (response.ok) {
        // Step 3: Get JWT token
        console.log('useAuth: Fetching JWT token...');
        const tokenResponse = await fetch(`${getApiBaseUrl()}/auth/token`, {
          method: 'POST',
          credentials: 'include'
        });

        console.log('useAuth: Token response status:', tokenResponse.status);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          console.log('useAuth: Token response data:', tokenData);
          
          // Backend returns 'access_token', not 'token'
          const jwtToken = tokenData.access_token;
          setToken(jwtToken);
          storeToken(jwtToken, tokenData.expires_in || 900); // Use expires_in from response
          setIsAuthenticated(true);
          setUser({ id: email, email, name: email.split('@')[0] });
          setUserType('host');
          
          console.log('useAuth: Login successful, authentication set');
          return { success: true };
        } else {
          console.error('useAuth: Token fetch failed with status:', tokenResponse.status);
        }
      } else {
        console.error('useAuth: Session creation failed with status:', response.status);
      }
      
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Guest authentication for players
   */
  const loginAsGuest = useCallback(async (gameId, playerName = null, phoneNumber = null) => {
    try {
      const response = await getGuestToken(gameId, playerName, phoneNumber);
      
      setToken(response.token);
      storeToken(response.token, response.expires_in);
      storeGuestInfo(response.user_id);
      setIsAuthenticated(true);
      setUser({ 
        id: response.user_id, 
        name: playerName || 'Guest Player',
        type: 'guest',
        gameId: gameId
      });
      setUserType('guest');
      
      return { success: true, userId: response.user_id };
    } catch (error) {
      console.error('Guest login error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Refresh JWT token for hosts
   */
  const refreshToken = useCallback(async () => {
    try {
      if (userType === 'guest') {
        // Guest tokens can't be refreshed, return existing token
        return token;
      }

      // Prevent multiple simultaneous refresh attempts
      if (refreshToken._inProgress) {
        console.log('Token refresh already in progress, waiting...');
        return refreshToken._promise;
      }

      refreshToken._inProgress = true;
      refreshToken._promise = (async () => {
        try {
          const response = await fetch(`${getApiBaseUrl()}/auth/token`, {
            method: 'POST',
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Token refresh successful');
            
            // Backend returns 'access_token', not 'token'
            const jwtToken = data.access_token;
            setToken(jwtToken);
            storeToken(jwtToken, data.expires_in || 900); // Use expires_in from response
            return jwtToken;
          } else if (response.status === 429) {
            console.warn('Rate limit hit during token refresh, using existing token');
            const existingToken = getStoredToken();
            if (existingToken) {
              return existingToken;
            }
            throw new Error('Rate limited and no existing token');
          } else {
            throw new Error(`Token refresh failed: ${response.status}`);
          }
        } finally {
          refreshToken._inProgress = false;
          refreshToken._promise = null;
        }
      })();

      return await refreshToken._promise;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Don't logout on rate limit - use existing token if available
      if (error.message.includes('Rate limited')) {
        const existingToken = getStoredToken();
        if (existingToken) {
          console.log('Using existing token after rate limit');
          return existingToken;
        }
      }
      
      // On other failures, clear authentication
      logout();
      return null;
    }
  }, [userType, token]);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      if (userType === 'host') {
        // For hosts, call logout endpoint
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      }
      // For guests, just clear local state
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setUserType(null);
      clearStoredToken();
    }
  }, [userType]);

  /**
   * Get current JWT token (from state or storage)
   */
  const getCurrentToken = useCallback(() => {
    return token || getStoredToken();
  }, [token]);

  /**
   * Get WebSocket connection with JWT authentication
   */
  const getWebSocketConnection = useCallback(async (gameId, role = 'host') => {
    let currentToken = getCurrentToken();
    
    // Ensure we have a fresh token for hosts
    if (!currentToken && userType === 'host') {
      currentToken = await refreshToken();
      if (!currentToken) {
        throw new Error('No valid authentication token for WebSocket');
      }
    }

    if (!currentToken) {
      throw new Error('No authentication token available');
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
  }, [getCurrentToken, userType, refreshToken]);

  /**
   * Check for existing authentication on app load (OAuth-ready)
   * No automatic login - only restore existing valid sessions
   */
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const storedToken = getStoredToken();
        const guestUserId = getGuestUserId();
        
        if (storedToken) {
          // Only restore if we have a valid stored token
          setToken(storedToken);
          setIsAuthenticated(true);
          
          if (guestUserId) {
            // Restore guest session
            setUserType('guest');
            setUser({ 
              id: guestUserId, 
              name: 'Guest Player',
              type: 'guest'
            });
            console.log('Restored guest session');
          } else {
            // Restore host session from valid JWT
            try {
              if (storedToken.includes('.') && storedToken.split('.').length === 3) {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                setUserType('host');
                setUser({ 
                  id: payload.user_id || 'host', 
                  name: payload.username || 'Host',
                  type: 'host'
                });
                console.log('Restored host session from JWT');
              }
            } catch (e) {
              console.log('Invalid stored token, clearing auth state');
              logout();
            }
          }
        } else {
          // No stored token - user needs to login
          setIsAuthenticated(false);
          console.log('No stored authentication - login required');
        }
      } catch (error) {
        console.log('Error checking existing auth:', error);
        setIsAuthenticated(false);
      }
    };

    checkExistingAuth();
  }, []); // No dependencies - only run once on mount

  /**
   * Set up automatic token refresh for hosts only
   * TEMPORARILY DISABLED to prevent rate limiting
   */
  useEffect(() => {
    if (!isAuthenticated || userType !== 'host') return;

    // TEMPORARILY DISABLED automatic refresh to prevent rate limiting
    console.log('Auto token refresh disabled to prevent rate limiting');
    return;

    /* const interval = setInterval(async () => {
      // Only auto-refresh if we have a valid stored token that's close to expiry
      const storedToken = getStoredToken();
      if (storedToken) {
        console.log('Auto-refreshing host token...');
        try {
          await refreshToken();
        } catch (error) {
          console.log('Auto-refresh failed, will retry next interval');
        }
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval); */
  }, [isAuthenticated, userType]);

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
    user,
    token: getCurrentToken(),
    userType,
    login,
    loginAsGuest,
    logout,
    refreshToken,
    getCurrentToken,
    getWebSocketConnection
  };
}; 