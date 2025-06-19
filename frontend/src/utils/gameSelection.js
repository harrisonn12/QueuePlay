import { gameRegistry } from './gameRegistry';

/**
 * Randomly selects a game type from all registered games
 * No manual weights needed - all games have equal probability
 * New games are automatically included without configuration
 * @returns {string} Selected game type
 */
export const selectRandomGameType = () => {
  // Get all registered game types automatically
  const registeredGameTypes = gameRegistry.getGameTypes();
  
  if (registeredGameTypes.length === 0) {
    console.warn('🎲 No games registered for random selection');
    return null;
  }
  
  // Simple random selection - all games have equal weight
  const randomIndex = Math.floor(Math.random() * registeredGameTypes.length);
  const selectedGame = registeredGameTypes[randomIndex];
  
  console.log(`🎲 Random game selection: ${selectedGame} (${randomIndex + 1}/${registeredGameTypes.length})`);
  console.log(`🎲 Available games: ${registeredGameTypes.join(', ')}`);
  
  return selectedGame;
};

/**
 * Gets all available games for selection (for debugging/testing)
 * @returns {string[]} Array of available game types
 */
export const getAvailableGames = () => {
  return gameRegistry.getGameTypes();
};

/**
 * Gets game selection statistics (for debugging/testing)
 * @returns {Object} Selection statistics
 */
export const getSelectionStats = () => {
  const games = gameRegistry.getGameTypes();
  const probability = games.length > 0 ? (100 / games.length).toFixed(1) : 0;
  
  return {
    totalGames: games.length,
    games: games,
    probabilityPerGame: `${probability}%`
  };
}; 