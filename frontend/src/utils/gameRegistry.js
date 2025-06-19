/**
 * Game Registry - Modular game registration system
 * 
 * This allows games to self-register with their metadata,
 * eliminating the need for manual registration in multiple files.
 */

class GameRegistry {
  constructor() {
    this.games = new Map();
  }

  /**
   * Register a game with its metadata
   * @param {string} gameType - Unique identifier for the game
   * @param {Object} gameConfig - Game configuration
   * @param {React.Component} gameConfig.component - Game component
   * @param {string[]} gameConfig.activePhases - List of active game phases
   * @param {Object} gameConfig.metadata - Game metadata (name, description, etc.)
   */
  register(gameType, gameConfig) {
    if (this.games.has(gameType)) {
      console.warn(`[GameRegistry] Game type '${gameType}' is already registered. Overwriting.`);
    }

    console.log(`[GameRegistry] Registering game: ${gameType}`, gameConfig.metadata);
    
    this.games.set(gameType, {
      type: gameType,
      component: gameConfig.component,
      activePhases: gameConfig.activePhases || [],
      metadata: {
        name: gameType,
        description: `${gameType} game`,
        minPlayers: 2,
        maxPlayers: 8,
        defaultSettings: {},
        ...gameConfig.metadata
      }
    });
  }

  /**
   * Get all registered games
   * @returns {Object} Map of gameType -> component for GameFactory
   */
  getGameComponents() {
    const components = {};
    for (const [gameType, config] of this.games) {
      components[gameType] = config.component;
    }
    return components;
  }

  /**
   * Get all active phases for all games
   * @returns {string[]} Array of all active phases
   */
  getAllActivePhases() {
    const phases = ['playing']; // Always include 'playing'
    for (const [, config] of this.games) {
      phases.push(...config.activePhases);
    }
    return [...new Set(phases)]; // Remove duplicates
  }

  /**
   * Check if a phase is active for any game
   * @param {string} phase - Phase to check
   * @returns {boolean}
   */
  isActivePhase(phase) {
    if (phase === 'playing') return true;
    
    for (const [, config] of this.games) {
      if (config.activePhases.includes(phase)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get game metadata
   * @param {string} gameType - Game type
   * @returns {Object|null} Game metadata or null if not found
   */
  getGameMetadata(gameType) {
    const game = this.games.get(gameType);
    return game ? game.metadata : null;
  }

  /**
   * Get all game metadata for game selection
   * @returns {Object} Map of gameType -> metadata
   */
  getAllGameMetadata() {
    const metadata = {};
    for (const [gameType, config] of this.games) {
      metadata[gameType] = config.metadata;
    }
    return metadata;
  }

  /**
   * Get list of all registered game types
   * @returns {string[]} Array of game type strings
   */
  getGameTypes() {
    return Array.from(this.games.keys());
  }

  /**
   * Check if a game type is registered
   * @param {string} gameType - Game type to check
   * @returns {boolean}
   */
  isRegistered(gameType) {
    return this.games.has(gameType);
  }
}

// Global registry instance
export const gameRegistry = new GameRegistry();

/**
 * Decorator function for easy game registration
 * @param {string} gameType - Game type identifier
 * @param {Object} config - Game configuration
 * @returns {Function} Decorator function
 */
export const registerGame = (gameType, config) => {
  return (GameComponent) => {
    // Register the game
    gameRegistry.register(gameType, {
      component: GameComponent,
      ...config
    });
    
    // Add static properties to the component for reference
    GameComponent.gameType = gameType;
    GameComponent.activePhases = config.activePhases || [];
    GameComponent.metadata = config.metadata || {};
    
    return GameComponent;
  };
};

export default gameRegistry; 