// Generic game helper utilities

/**
 * Generate a unique client ID for game sessions
 */
export const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format player name with fallback
 */
export const formatPlayerName = (name, clientId) => {
  return name || `Player ${clientId.substring(0, 4)}`;
};

/**
 * Calculate game progress percentage
 */
export const calculateGameProgress = (currentIndex, total) => {
  if (total === 0) return 0;
  return Math.round(((currentIndex + 1) / total) * 100);
};

/**
 * Format time remaining
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Determine game status display
 */
export const getGameStatusDisplay = (status) => {
  const statusMap = {
    'waiting': 'Waiting for players...',
    'starting': 'Game starting...',
    'playing': 'Game in progress',
    'paused': 'Game paused',
    'finished': 'Game finished',
    'cancelled': 'Game cancelled',
  };
  
  return statusMap[status] || status;
};

/**
 * Check if a player is the host
 */
export const isHost = (role) => {
  return role === 'host';
};

/**
 * Check if a player is a regular player
 */
export const isPlayer = (role) => {
  return role === 'player';
};

/**
 * Sort players by score (descending)
 */
export const sortPlayersByScore = (players, scores) => {
  return [...players].sort((a, b) => {
    const scoreA = scores[a.clientId] || 0;
    const scoreB = scores[b.clientId] || 0;
    return scoreB - scoreA;
  });
};

/**
 * Get top players from a sorted list
 */
export const getTopPlayers = (players, scores, count = 3) => {
  const sorted = sortPlayersByScore(players, scores);
  return sorted.slice(0, count);
}; 