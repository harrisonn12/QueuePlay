import { useCallback, useEffect, useRef } from 'react';
import './CategoryGame.css';

// Game registry for self-registration
import { registerGame } from '../../../utils/gameRegistry';

// Category game-specific hooks
import { useCategoryGameState } from '../../../hooks/games/category/useCategoryGameState';
import { useCategoryMessageHandler } from '../../../hooks/games/category/useCategoryMessageHandler';

// Category game-specific views
import CategoryHostView from './views/CategoryHostView';
import CategoryPlayerView from './views/CategoryPlayerView';
import LoadingSpinner from '../../core/LoadingSpinner';

/**
 * CategoryGame - Game-specific component that receives authenticated context
 * 
 * ARCHITECTURE:
 * - Receives authenticated gameCore from BaseGame
 * - NO authentication flows (skipAuth=true)  
 * - Focuses purely on category game logic
 * - Uses shared WebSocket connection
 */
const CategoryGame = ({ 
  gameCore, 
  gameData,
  sendGameMessage, 
  ensureConnected,
  registerMessageHandler,
  skipAuth = false 
}) => {
  // ===== CATEGORY-SPECIFIC STATE =====
  const categoryState = useCategoryGameState();
  
  // Track if game has been initialized to prevent infinite loops
  const gameInitializedRef = useRef(false);
  
  // ===== GAME CONTROL WRAPPERS =====
  
  // Wrap endGame to include sendGameMessage
  const wrappedEndGame = useCallback(() => {
    return categoryState.endGame(sendGameMessage);
  }, [categoryState.endGame, sendGameMessage]);
  
  // Wrap forceNextRound to handle game end properly
  const wrappedForceNextRound = useCallback(() => {
    if (categoryState.gamePhase === 'results' && categoryState.currentRound >= categoryState.totalRounds) {
      // Game should end
      wrappedEndGame();
    } else {
      categoryState.forceNextRound();
    }
  }, [categoryState.gamePhase, categoryState.currentRound, categoryState.totalRounds, categoryState.forceNextRound, wrappedEndGame]);
  
  // Combine core infrastructure with category-specific state
  // HYBRID APPROACH: BaseGame controls overall flow, CategoryGame controls internal phases
  const combinedState = { 
    ...gameCore, // gameCore comes first (has overall gamePhase control)
    ...categoryState, // categoryState overrides most things
    // Hybrid gamePhase: Use BaseGame's phase unless we're in 'playing' and have category phases
    gamePhase: gameCore.gamePhase === 'playing' && categoryState.gamePhase !== 'waiting' 
      ? categoryState.gamePhase  // Use category phases when game is active
      : gameCore.gamePhase,      // Use BaseGame phases for overall flow (waiting, playing, finished)
    // Override with wrapped functions
    endGame: wrappedEndGame,
    forceNextRound: wrappedForceNextRound,
    sendGameMessage, // Ensure sendGameMessage is available
    // Preserve important BaseGame functions
    setGamePhase: gameCore.setGamePhase, // Keep BaseGame's setGamePhase for results screen
  };
  
  // Debug logging for phase logic
  if (gameCore.role === 'player') {
    console.log(`[CategoryGame] Phase Debug - BaseGame: ${gameCore.gamePhase}, Category: ${categoryState.gamePhase}, Combined: ${combinedState.gamePhase}`);
  }
  
  // ===== CATEGORY-SPECIFIC MESSAGE HANDLING =====
  const handleCategoryMessage = useCategoryMessageHandler(combinedState);
  
  // Use a ref to store the current handler to prevent re-registration
  const messageHandlerRef = useRef(handleCategoryMessage);
  messageHandlerRef.current = handleCategoryMessage;
  
  // Create a stable message handler that uses the ref
  const stableMessageHandler = useCallback((data) => {
    return messageHandlerRef.current(data);
  }, []);
  
  // ===== GAME START LOGIC =====
  const handleStartGame = useCallback(() => {
    if (gameCore.role === 'host') {
      console.log('[CategoryGame] Host starting category game...');
      
      // Send game start message to all players
      sendGameMessage('gameStarted', {
        gameType: 'category',
        gameSettings: categoryState.gameSettings,
        players: gameCore.players
      });
      
      // Start the game locally
      categoryState.startGame();
    }
  }, [gameCore.role, gameCore.players, categoryState.gameSettings, categoryState.startGame, sendGameMessage]);
  
  // ===== ALL EFFECTS (MUST BE BEFORE ANY CONDITIONAL RETURNS) =====
  
  // Register message handler - simplified approach
  useEffect(() => {
    if (registerMessageHandler) {
      console.log('[CategoryGame] Registering message handler');
      registerMessageHandler(stableMessageHandler);
    }
  }, [registerMessageHandler, stableMessageHandler]);
  
  // Process initial game data if available (for when CategoryGame mounts after startGame message)
  useEffect(() => {
    if (gameData && gameData.action === 'startGame' && gameData.gameType === 'category' && !gameInitializedRef.current) {
      console.log('[CategoryGame] Processing initial startGame data:', gameData);
      gameInitializedRef.current = true;
      
      if (gameData.gameSettings) {
        categoryState.initializeGame(gameData.gameSettings);
      }
      // Start the category game with proper phase flow
      categoryState.startGame();
    }
  }, [gameData?.action, gameData?.gameType, categoryState.initializeGame, categoryState.startGame]);
  
  // Track game phase changes
  useEffect(() => {
    console.log('[CategoryGame] Component mounted, current gamePhase:', categoryState.gamePhase);
  }, [categoryState.gamePhase]);
  
  // ===== RENDER LOGIC =====
  
  // Render appropriate view based on role (no waiting check needed - BaseGame handles lobby)
  if (gameCore.role === 'host') {
    return (
      <CategoryHostView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
        onStartGame={handleStartGame}
      />
    );
  } else {
    return (
      <CategoryPlayerView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
      />
    );
  }
};

// Self-register the game with metadata
const CategoryGameWithRegistration = registerGame('category', {
  activePhases: ['category-reveal', 'input', 'scoring', 'results'],
  metadata: {
    name: 'Category Game',
    description: 'Name items in categories as fast as you can!',
    minPlayers: 2,
    maxPlayers: 8,
    defaultSettings: {
      rounds: 3,
      timePerRound: 15,
      categoriesPerRound: 1
    }
  }
})(CategoryGame);

export default CategoryGameWithRegistration; 