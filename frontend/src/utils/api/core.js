// Centralized API configuration
export const getApiBaseUrl = () => {
    // Production: Use environment variable for backend service URL
    if (import.meta.env.PROD) {
      return import.meta.env.VITE_API_URL || 'https://queue-play-backend-49545a31800d.herokuapp.com';
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
      return import.meta.env.VITE_WS_URL || 'wss://queue-play-multiplayer-server-9ddcf88d473d.herokuapp.com';
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
            // Try to get the error details from the response body
            let errorDetails = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.text();
                console.error(`API Error Response Body for ${endpoint}:`, errorBody);
                errorDetails += ` - ${errorBody}`;
            } catch (e) {
                console.error('Could not read error response body:', e);
            }
            throw new Error(errorDetails);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Authenticated API request failed:', error);
        throw error;
    }
}; 