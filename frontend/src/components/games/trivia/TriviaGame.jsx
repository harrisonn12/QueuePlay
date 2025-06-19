import { useCallback, useEffect, useRef } from 'react';
import './TriviaGame.css';

// Game registry for self-registration
import { registerGame } from '../../../utils/gameRegistry';

// Trivia game-specific hooks
import { useTriviaGameState } from '../../../hooks/games/trivia/useTriviaGameState';
import { useTriviaMessageHandler } from '../../../hooks/games/trivia/useTriviaMessageHandler';

// Trivia game-specific views
import TriviaHostView from './views/TriviaHostView';
import TriviaPlayerView from './views/TriviaPlayerView';
import LoadingSpinner from '../../core/LoadingSpinner';

/**
 * TriviaGame - Game-specific component that receives authenticated context
 * 
 * ARCHITECTURE:
 * - Receives authenticated gameCore from BaseGame
 * - NO authentication flows (skipAuth=true)
 * - Focuses purely on trivia game logic
 * - Uses shared WebSocket connection
 */
const TriviaGame = ({ 
  gameCore, 
  gameData,
  sendGameMessage, 
  ensureConnected,
  registerMessageHandler,
  skipAuth = false 
}) => {
  // ===== TRIVIA-SPECIFIC STATE =====
  const triviaState = useTriviaGameState();
  
  // Initialize questions from gameData if available (for both host and players)
  useEffect(() => {
    if (gameData && gameData.questions && gameData.questions.length > 0) {
      triviaState.setQuestions(gameData.questions);
    }
  }, [gameData, triviaState.setQuestions]);
  
  // Combine core infrastructure with trivia-specific state
  // Important: gameCore's setGamePhase should take precedence over triviaState's
  const combinedState = { 
    ...triviaState, 
    ...gameCore, // gameCore comes last to override any conflicting keys
  };
  
  // ===== TRIVIA-SPECIFIC MESSAGE HANDLING =====
  const handleTriviaMessage = useTriviaMessageHandler(combinedState);
  
  // Use a ref to store the current handler to prevent re-registration
  const messageHandlerRef = useRef(handleTriviaMessage);
  messageHandlerRef.current = handleTriviaMessage;
  
  // Create a stable message handler that uses the ref
  const stableMessageHandler = useCallback((data) => {
    return messageHandlerRef.current(data);
  }, []);
  
  // ===== GAME START LOGIC =====
  const handleStartGame = useCallback(() => {
    if (gameCore.role === 'host') {
      // Ensure we have questions before starting
      if (!triviaState.questions || triviaState.questions.length === 0) {
        console.error('[TriviaGame] Cannot start game: Questions not loaded.');
        gameCore.setStatus('Error: Questions failed to load. Cannot start.');
        return;
      }


      
      // Send game start message to all players
      sendGameMessage('startGame', {
        gameType: 'trivia',
        questions: triviaState.questions,
        players: gameCore.players
      });
      
      // Start the game locally
      triviaState.startGame();
    }
  }, [gameCore.role, gameCore.players, gameCore.setStatus, triviaState.questions, triviaState.startGame, sendGameMessage]);
  
  // ===== ALL EFFECTS (MUST BE BEFORE ANY CONDITIONAL RETURNS) =====
  
  // Register message handler - simplified approach
  useEffect(() => {
    if (registerMessageHandler) {
      registerMessageHandler(stableMessageHandler);
    }
  }, [registerMessageHandler, stableMessageHandler]);
  
  // Auto-start effect is no longer needed since we initialize as 'playing'
  // But keeping it for potential edge cases
  useEffect(() => {
    console.log('[TriviaGame] Component mounted, current gamePhase:', triviaState.gamePhase);
  }, [triviaState.gamePhase]);
  
  // ===== RENDER LOGIC =====
  
  // Show loading if questions are still loading for host
  if (gameCore.role === 'host' && (!triviaState.questions || triviaState.questions.length === 0)) {
    return <LoadingSpinner message="Loading trivia questions..." />;
  }
  
  // Render appropriate view based on role
  if (gameCore.role === 'host') {
    return (
      <TriviaHostView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
        onStartGame={handleStartGame}
      />
    );
  } else {
    return (
      <TriviaPlayerView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
      />
    );
  }
};

// Self-register the game with metadata
const TriviaGameWithRegistration = registerGame('trivia', {
  activePhases: ['questionDisplay', 'answerTime', 'results'],
  metadata: {
    name: 'Trivia Game',
    description: 'Test your knowledge with rapid-fire questions!',
    minPlayers: 2,
    maxPlayers: 8,
    defaultSettings: {
      questionsPerRound: 10,
      answerTimeLimit: 15,
      rounds: 1
    }
  }
})(TriviaGame);

export default TriviaGameWithRegistration;
