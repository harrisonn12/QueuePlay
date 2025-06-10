import React, { lazy, Suspense } from 'react';
import { GAME_TYPES, getGameMetadata } from '../../utils/constants/gameTypes.js';
import LoadingSpinner from '../core/LoadingSpinner.jsx';

// Lazy load game components for better performance
const TriviaGame = lazy(() => import('./trivia/TriviaGame.jsx'));

// Future games can be added here:
// const WordGame = lazy(() => import('./wordgame/WordGame.jsx'));
// const MathQuiz = lazy(() => import('./mathquiz/MathQuiz.jsx'));

/**
 * Game factory component that routes to the appropriate game based on game type
 * @param {Object} props
 * @param {string} [props.gameType='trivia'] - Type of game to render
 * @param {Object} [props.gameProps={}] - Props to pass to the game component
 */
const GameFactory = ({ gameType = GAME_TYPES.TRIVIA, gameProps = {} }) => {
  // Game component mapping
  const gameComponents = {
    [GAME_TYPES.TRIVIA]: TriviaGame,
    // Future games:
    // [GAME_TYPES.WORD_GAME]: WordGame,
    // [GAME_TYPES.MATH_QUIZ]: MathQuiz,
  };

  // Get the game component
  const GameComponent = gameComponents[gameType];

  // Handle unknown game type
  if (!GameComponent) {
    console.error(`Unknown game type: ${gameType}`);
    return (
      <div className="game-error">
        <h2>Game Not Found</h2>
        <p>The requested game type "{gameType}" is not available.</p>
        <p>Available games: {Object.values(GAME_TYPES).join(', ')}</p>
      </div>
    );
  }

  // Get game metadata for additional props
  const gameMetadata = getGameMetadata(gameType);

  return (
    <div className="game-factory" data-game-type={gameType}>
      <Suspense 
        fallback={
          <LoadingSpinner 
            message={`Loading ${gameMetadata?.name || 'game'}...`} 
            size="large" 
          />
        }
      >
        <GameComponent 
          gameType={gameType}
          gameMetadata={gameMetadata}
          {...gameProps}
        />
      </Suspense>
    </div>
  );
};

export default GameFactory; 