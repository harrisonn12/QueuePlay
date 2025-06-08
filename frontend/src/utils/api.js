// Centralized API configuration
export const getApiBaseUrl = () => {
    // Production: Use environment variable for backend service URL
    if (import.meta.env.PROD) {
      return import.meta.env.VITE_API_URL || 'https://yourapp-backend.herokuapp.com';
    } 
    
    // Development: Check if we're running locally or in Docker
    if (window.location.port === '5173') {
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
    if (window.location.port === '5173') {
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