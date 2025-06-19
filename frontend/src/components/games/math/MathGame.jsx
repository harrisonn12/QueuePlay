import { useCallback, useEffect, useRef } from 'react';
import { registerGame } from '../../../utils/gameRegistry';
import { useMathGameState } from '../../../hooks/games/math/useMathGameState';
import { useMathMessageHandler } from '../../../hooks/games/math/useMathMessageHandler';
import MathHostView from './views/MathHostView';
import MathPlayerView from './views/MathPlayerView';
import './MathGame.css';

const MathGame = ({ 
  gameCore, 
  gameData,
  sendGameMessage, 
  ensureConnected,
  registerMessageHandler,
  skipAuth = false 
}) => {
  // Math game-specific state
  const gameState = useMathGameState();
  
  // Combine core + game state
  const combinedState = { ...gameCore, ...gameState };
  
  // Message handling
  const handleMathMessage = useMathMessageHandler(combinedState);
  const messageHandlerRef = useRef(handleMathMessage);
  messageHandlerRef.current = handleMathMessage;
  
  const stableMessageHandler = useCallback((data) => {
    return messageHandlerRef.current(data);
  }, []);
  
  // Register message handler
  useEffect(() => {
    if (registerMessageHandler) {
      registerMessageHandler(stableMessageHandler);
    }
  }, [registerMessageHandler, stableMessageHandler]);
  
  // Math game should start automatically when BaseGame triggers it
  
  // Render based on role
  if (gameCore.role === 'host') {
    return (
      <MathHostView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
        gameState={gameState}
      />
    );
  } else {
    return (
      <MathPlayerView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
      />
    );
  }
};

// Self-register the game
const MathGameWithRegistration = registerGame('math', {
  activePhases: ['playing', 'scoring'],
  metadata: {
    name: 'Math Challenge',
    description: 'Solve math problems quickly and accurately!',
    minPlayers: 2,
    maxPlayers: 8,
    defaultSettings: { 
      roundTime: 15,
      totalRounds: 5,
      difficulty: 'medium',
      operations: ['addition', 'subtraction', 'multiplication']
    }
  }
})(MathGame);

export default MathGameWithRegistration; 