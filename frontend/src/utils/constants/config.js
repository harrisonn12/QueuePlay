// Environment configuration
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
};

// Current environment
export const CURRENT_ENV = import.meta.env.PROD ? ENV.PRODUCTION : ENV.DEVELOPMENT;

// API configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// WebSocket configuration
export const WS_CONFIG = {
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000, // 2 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
};

// Game configuration
export const GAME_CONFIG = {
  DEFAULT_LOBBY_TIMEOUT: 1800000, // 30 minutes
  MAX_PLAYERS_DEFAULT: 20,
  MIN_PLAYERS_DEFAULT: 1,
};

// UI configuration
export const UI_CONFIG = {
  TOAST_DURATION: 3000, // 3 seconds
  LOADING_DELAY: 200, // Show loading after 200ms
  ANIMATION_DURATION: 300, // Default animation duration
}; 