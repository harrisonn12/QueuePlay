import React from 'react';

/**
 * Generic player list component for displaying players in games
 * @param {Object} props
 * @param {Array} props.players - Array of player objects with {clientId, name}
 * @param {string} [props.currentPlayerId] - ID of current player to highlight
 * @param {Object} [props.scores] - Object mapping player IDs to scores
 * @param {boolean} [props.showScores=false] - Whether to display scores
 * @param {string} [props.className] - Additional CSS classes
 */
const PlayerList = ({ 
  players = [], 
  currentPlayerId, 
  scores = {}, 
  showScores = false, 
  className = '' 
}) => {
  if (!players || players.length === 0) {
    return (
      <div className={`player-list empty ${className}`}>
        <p className="no-players">No players yet...</p>
      </div>
    );
  }

  return (
    <div className={`player-list ${className}`}>
      <h3 className="player-list-title">
        Players ({players.length})
      </h3>
      <ul className="players">
        {players.map((player) => (
          <li 
            key={player.clientId} 
            className={`player ${currentPlayerId === player.clientId ? 'current-player' : ''}`}
          >
            <span className="player-name">{player.name}</span>
            {showScores && scores[player.clientId] !== undefined && (
              <span className="player-score">{scores[player.clientId]}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList; 