// Centralized API configuration
export const getApiBaseUrl = () => {
    // Production: Use environment variable for backend service URL
    if (import.meta.env.PROD) {
      return import.meta.env.VITE_API_URL || 'https://yourapp-backend.herokuapp.com';
    } 
    
    // Development: Check if we're running locally or in Docker
    if (window.location.port === '5173' || window.location.port === '5175') {
      // Local development: Direct connection to backend
      return 'http://localhost:8000';
    } else {
      // Docker development: Use Vite proxy
      return '/api';
    }
};

// Centralized WebSocket configuration
export const getWebSocketUrl = () => {
    // Production: Use environment variable for WebSocket service URL
    if (import.meta.env.PROD) {
      return import.meta.env.VITE_WS_URL || 'wss://yourapp-multiplayer.herokuapp.com';
    } 
    
    // Development: Check if we're running locally or in Docker
    if (window.location.port === '5173' || window.location.port === '5175') {
      // Local development: Direct connection to WebSocket server
      return 'ws://localhost:6789';
    } else {
      // Docker development: Use Vite proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      return `${protocol}//${host}/ws/`;
    }
};

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}; 

// Helper function for making authenticated API requests
export const authenticatedApiRequest = async (endpoint, options = {}, token = null) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
    };
    
    // Add JWT token if provided
    if (token) {
        console.log(`Adding Authorization header for ${endpoint}: Bearer ${token.substring(0, 20)}...`);
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.log(`No token provided for ${endpoint}, using session cookies only`);
    }
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Authenticated API request failed:', error);
        throw error;
    }
};

// Helper function to get guest token for players
export const getGuestToken = async (gameId, playerName = null, phoneNumber = null) => {
    try {
        const response = await apiRequest('/auth/guest-token', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                player_name: playerName,
                phone_number: phoneNumber
            })
        });
        
        return response;
    } catch (error) {
        console.error('Failed to get guest token:', error);
        throw error;
    }
};

// Helper function to join game with authentication
export const joinGameWithAuth = async (gameId, playerName, phoneNumber = null, token) => {
    try {
        const response = await authenticatedApiRequest('/joinGame', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                player_name: playerName,
                phone_number: phoneNumber
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to join game:', error);
        throw error;
    }
};

// Helper function to submit answer with authentication
export const submitAnswerWithAuth = async (gameId, questionIndex, answerIndex, token) => {
    try {
        const response = await authenticatedApiRequest('/submitAnswer', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                question_index: questionIndex,
                answer_index: answerIndex
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to submit answer:', error);
        throw error;
    }
};

// Helper function to leave game with authentication
export const leaveGameWithAuth = async (gameId, token) => {
    try {
        const response = await authenticatedApiRequest('/leaveGame', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to leave game:', error);
        throw error;
    }
};

// Token storage helpers
export const storeToken = (token, expiresIn = null) => {
    localStorage.setItem('jwt_token', token);
    if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem('jwt_expiry', expiryTime.toString());
    }
};

export const getStoredToken = () => {
    const token = localStorage.getItem('jwt_token');
    const expiry = localStorage.getItem('jwt_expiry');
    
    if (token && expiry) {
        if (Date.now() < parseInt(expiry)) {
            return token;
        } else {
            // Token expired, clean up
            clearStoredToken();
            return null;
        }
    }
    
    return token; // Return token even if no expiry info
};

export const clearStoredToken = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_expiry');
    localStorage.removeItem('guest_user_id');
};

export const storeGuestInfo = (userId) => {
    localStorage.setItem('guest_user_id', userId);
};

export const getGuestUserId = () => {
    return localStorage.getItem('guest_user_id');
}; 