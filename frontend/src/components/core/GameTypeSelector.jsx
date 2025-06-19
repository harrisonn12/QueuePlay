import React from 'react';
import { gameRegistry } from '../../utils/gameRegistry';
import { selectRandomGameType } from '../../utils/gameSelection';
import './GameTypeSelector.css';

const GameTypeSelector = ({ onGameTypeSelect, onBack }) => {
  const gameMetadata = gameRegistry.getAllGameMetadata();
  const gameTypes = Object.keys(gameMetadata);

  const handleRandomSelection = () => {
    const randomGame = selectRandomGameType();
    if (randomGame) {
      console.log('🎲 User clicked random selection, selected:', randomGame);
      onGameTypeSelect(randomGame);
    } else {
      console.error('🎲 Random selection failed - no games available');
    }
  };

  if (gameTypes.length === 0) {
    return (
      <div className="game-type-selector">
        <div className="selector-header">
          <h2>Choose Game Type</h2>
          <button className="btn-back" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div className="no-games-message">
          <p>No games are currently registered.</p>
          <p>Please check your game modules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-type-selector">
      <div className="selector-header">
        <h2>Choose Game Type</h2>
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
      </div>
      
      {/* Random Selection Button */}
      <div className="random-selection-section">
        <button 
          className="btn-random-game"
          onClick={handleRandomSelection}
        >
          🎲 Surprise Me! (Random Game)
        </button>
        <p className="random-description">
          Let the system pick a random game for you. All games have equal chance.
        </p>
      </div>
      
      <div className="game-grid">
        {gameTypes.map(gameType => {
          const metadata = gameMetadata[gameType];
          return (
            <div 
              key={gameType}
              className="game-card"
              onClick={() => onGameTypeSelect(gameType)}
            >
              <div className="game-card-header">
                <h3>{metadata.name}</h3>
                <span className="player-count">
                  {metadata.minPlayers}-{metadata.maxPlayers} players
                </span>
              </div>
              
              <div className="game-card-body">
                <p className="game-description">
                  {metadata.description}
                </p>
                
                {metadata.defaultSettings && Object.keys(metadata.defaultSettings).length > 0 && (
                  <div className="game-settings-preview">
                    <h4>Default Settings:</h4>
                    <ul>
                      {Object.entries(metadata.defaultSettings).map(([key, value]) => (
                        <li key={key}>
                          <span className="setting-name">{key}:</span>
                          <span className="setting-value">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="game-card-footer">
                <button className="btn-select">
                  Select Game
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameTypeSelector; 