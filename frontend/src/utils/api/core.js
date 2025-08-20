// Centralized API configuration
export const getApiBaseUrl = () => {
    console.log(`[getApiBaseUrl] Environment: PROD=${import.meta.env.PROD}, VITE_API_URL=${import.meta.env.VITE_API_URL}`);
    console.log(`[getApiBaseUrl] Window location:`, window.location.href);
    
    // Production: Use nginx proxy in Docker deployment
    if (import.meta.env.PROD) {
      // If custom API URL is set via environment variable, use it
      if (import.meta.env.VITE_API_URL) {
        const url = import.meta.env.VITE_API_URL;
        console.log(`[getApiBaseUrl] Using custom production URL: ${url}`);
        return url;
      }
      
      // Default production behavior: use nginx proxy
      console.log(`[getApiBaseUrl] Using nginx proxy for production: /api`);
      return '/api';
    } 
    
    // Development: Check if we're running locally or in Docker
    if (window.location.port === '5173' || window.location.port === '5175') {
      // Local development: Direct connection to backend
      console.log(`[getApiBaseUrl] Using localhost for development`);
      return 'http://localhost:8000';
    } else {
      // Docker development: Use Vite proxy
      console.log(`[getApiBaseUrl] Using proxy for Docker development`);
      return '/api';
    }
};

// Centralized WebSocket configuration
export const getWebSocketUrl = () => {
    console.log(`[getWebSocketUrl] Environment: PROD=${import.meta.env.PROD}, VITE_WS_URL=${import.meta.env.VITE_WS_URL}`);
    
    // Production: Use nginx proxy in Docker deployment
    if (import.meta.env.PROD) {
      // If custom WebSocket URL is set via environment variable, use it
      if (import.meta.env.VITE_WS_URL) {
        const url = import.meta.env.VITE_WS_URL;
        console.log(`[getWebSocketUrl] Using custom production URL: ${url}`);
        return url;
      }
      
      // Default production behavior: use nginx proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/ws/`;
      console.log(`[getWebSocketUrl] Using nginx proxy for production: ${url}`);
      return url;
    } 
    
    // Development: Check if we're running locally or in Docker
    if (window.location.port === '5173' || window.location.port === '5175') {
      // Local development: Direct connection to WebSocket server
      console.log(`[getWebSocketUrl] Using localhost for development`);
      return 'ws://localhost:6789';
    } else {
      // Docker development: Use Vite proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const url = `${protocol}//${host}/ws/`;
      console.log(`[getWebSocketUrl] Using Docker proxy: ${url}`);
      return url;
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
    console.log(`[authenticatedApiRequest] Making request to: ${url}`);
    
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