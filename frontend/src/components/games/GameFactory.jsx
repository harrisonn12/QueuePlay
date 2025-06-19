import { gameRegistry } from '../../utils/gameRegistry.js';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../core/LoadingSpinner';

// Import BaseGame as the single persistent component
const BaseGame = lazy(() => import('./core/BaseGame.jsx'));

// Import game modules to trigger registration
// This ensures all games are registered when the factory loads
import './trivia/TriviaGame.jsx';
import './category/CategoryGame.jsx';
import './math/MathGame.jsx';

/**
 * GameFactory - Single persistent authentication and game routing layer
 * 
 * ARCHITECTURE PRINCIPLE: 
 * - BaseGame handles ALL authentication and core infrastructure
 * - Games self-register with the gameRegistry
 * - NO double authentication flows
 * - NO component remounting during game type changes
 * - NO manual game registration needed
 */
const GameFactory = ({ gameType, onGameTypeChange, gameProps = {} }) => {
  // Get all available games from the registry
  const availableGames = gameRegistry.getGameComponents();

  return (
    <div className="game-factory" data-game-type={gameType || 'none'}>
      <Suspense fallback={<LoadingSpinner message="Loading game..." />}>
        {/* 
          SINGLE PERSISTENT COMPONENT ARCHITECTURE:
          - BaseGame stays mounted throughout entire session
          - Handles authentication once
          - Dynamically renders games from registry
          - No remounting = no state loss = no double auth
          - Fully modular - games register themselves
        */}
        <BaseGame 
          currentGameType={gameType} // Pass current game type
          onGameTypeChange={onGameTypeChange}
          availableGames={availableGames} // Pass all registered games
          gameRegistry={gameRegistry} // Pass registry for phase checks
          {...gameProps}
        />
      </Suspense>
    </div>
  );
};

export default GameFactory; 