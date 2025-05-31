import React from 'react';

/**
 * Game Results View - Shows the results screen at the end of the game
 */
const GameResults = ({
  scores,
  players,
  tieBreakerState,
  isAnimatingTie,
  highlightedPlayerIndex,
  role,
  clientId,
  localPlayerName,
  resetGame,
  hostGame
}) => {
  console.log("[renderGameResults] Scores state:", scores);
  console.log("[renderGameResults] Players state:", players);
  console.log("[renderGameResults] TieBreaker state:", tieBreakerState);

  // --- Tie Breaker UI --- 
  // Show this before regular results if a tie is being broken
  if (tieBreakerState.stage === 'breaking') {
    // Find names of tied players
    const tiedPlayerNamesAndIds = tieBreakerState.tiedPlayerIds
      .map(id => {
        const player = players.find(p => p.clientId === id);
        return { 
          id: id, 
          name: player?.name || `Player ${id.substring(0,4)}` 
        };
      });

    return (
      <div className="game-results tie-breaker-active">
        <h2>Tie Breaker!</h2>
        <p>The following players are tied for first place:</p>
        {/* Apply highlighting based on animation state */} 
        <ul className="tie-player-list">
          {tiedPlayerNamesAndIds.map((player, index) => {
            // --- LOG ADDED --- 
            const highlightClass = isAnimatingTie && index === highlightedPlayerIndex ? 'highlighted-tie-player' : '';
            console.log(`[Render Tie List] Player: ${player.name}, Index: ${index}, Highlight Index: ${highlightedPlayerIndex}, Class: '${highlightClass}'`);
            return (
              <li 
                key={player.id} 
                className={highlightClass}
              >
                {player.name}
              </li>
            );
          })}
        </ul>
        {role === 'host' ? (
          <>
            {/* Message during/after animation */} 
            <p>{isAnimatingTie ? "Selecting winner..." : "Winner selected!"}</p>
            {/* Button removed, animation is automatic */}
          </>
        ) : (
          <p>Waiting for the host to select the winner...</p>
        )}
        {/* Allow leaving even during animation */}
        <button onClick={resetGame} style={{marginTop: '1em'}} disabled={isAnimatingTie}>
          {isAnimatingTie ? 'Please wait...' : 'Back to Lobby'} 
        </button>
      </div>
    );
  }

  // --- Regular Results Logic (or after tie resolved) ---
  if (!scores || Object.keys(scores).length === 0) {
    // Simplified view if no scores (e.g., game ended early)
    return (
      <div className="game-results">
        <h2>Game Finished!</h2>
        <p>No final scores were recorded.</p>
        {role === 'host' && (
          <button onClick={hostGame}>Host New Game</button>
        )}
        <button onClick={resetGame}>Back to Lobby</button>
      </div>
    );
  }

  // Determine the winner ID (either the outright winner or the one chosen in tie-breaker)
  const finalWinnerId = tieBreakerState.stage === 'resolved' 
    ? tieBreakerState.ultimateWinnerId 
    : (Object.entries(scores).sort(([, scoreA], [, scoreB]) => scoreB - scoreA)[0]?.[0] || null);

  // Calculate if there was an initial tie (for trophy display logic)
  const sortedInitialScores = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
  const initialTie = sortedInitialScores.length > 1 && 
                    sortedInitialScores[0][1] > 0 &&
                    sortedInitialScores[0][1] === sortedInitialScores[1][1];

  // Determine player's status based on the final winner
  const isFinalWinner = role === 'player' && clientId === finalWinnerId;
  // Player is a loser if they are not the host AND not the final winner
  const isLoser = role === 'player' && clientId !== finalWinnerId;


  // --- Host View: Show the full scoreboard --- 
  if (role === 'host') {
    // Highlight the ultimate winner if tie was resolved
    const ultimateWinnerName = tieBreakerState.stage === 'resolved' 
      ? (players.find(p => p.clientId === finalWinnerId)?.name || `Player ${finalWinnerId?.substring(0,4)}`)
      : null;

    return (
      <div className="game-results host-results">
        <h2>Game Finished!</h2>
        {tieBreakerState.stage === 'resolved' && (
          <p className="tie-resolved-message">
            Tie resolved! Winner: <strong>{ultimateWinnerName}</strong>
          </p>
        )}
        <h3>Final Scores:</h3>
        <ol className="score-list final-scores">
          {sortedInitialScores.map(([playerId, score], index) => {
            const playerInfo = players.find(p => p.clientId === playerId);
            const playerName = playerInfo?.name || `Player ${playerId.substring(0, 4)}`;
            const isTheChosenWinner = tieBreakerState.stage === 'resolved' && playerId === finalWinnerId;

            return (
              <li key={playerId} className={`${index === 0 ? 'leader' : ''} ${isTheChosenWinner ? 'ultimate-winner' : ''}`}>
                <span className="rank">{index + 1}.</span> 
                <span className="name">{playerName}</span>: 
                <strong className="score">{score}</strong> points
                {/* Show trophy only if index 0 AND no initial tie OR if they are the chosen winner after a tie */}
                {(index === 0 && !initialTie) || isTheChosenWinner ? ' 🏆' : ''} 
              </li>
            );
          })}
        </ol>
        <button onClick={hostGame}>Host New Game</button>
        <button onClick={resetGame}>Back to Lobby</button>
      </div>
    );
  }

  // --- Player View: Winner --- 
  if (isFinalWinner) { // Check against finalWinnerId
    return (
      <div className="game-results player-results winner-screen">
        <h2>VICTORY! 🏆</h2>
        {/* Add message if they won tie-breaker */} 
        {tieBreakerState.stage === 'resolved' && tieBreakerState.tiedPlayerIds.includes(clientId) && (
          <p>You won the tie-breaker!</p>
        )}
        <p>Congratulations, {localPlayerName || 'you'} won!</p> 
        <p>Your Score: {scores[clientId]}</p> 
        <button onClick={resetGame}>Play Again?</button>
      </div>
    );
  }

  // --- Player View: Loser --- 
  if (isLoser) { // Check against finalWinnerId
    // Get final winner name 
    const winnerInfo = players.find(p => p.clientId === finalWinnerId);
    const winnerName = winnerInfo?.name || `Player ${finalWinnerId?.substring(0, 4)}`; 

    return (
      <div className="game-results player-results loser-screen">
        <h2>Game Over</h2>
        {/* Add specific message if they lost a tie-breaker */}
        {tieBreakerState.stage === 'resolved' && tieBreakerState.tiedPlayerIds.includes(clientId) && (
          <p>You were in the tie-breaker, but {winnerName} was chosen as the winner.</p>
        )}
        {/* Standard loser message */} 
        {!(tieBreakerState.stage === 'resolved' && tieBreakerState.tiedPlayerIds.includes(clientId)) && (
          <p>Better luck next time, {localPlayerName || 'player'}!</p>
        )}
        <p>Winner: {winnerName} ({scores[finalWinnerId] || 0} points)</p>
        <p>Your Score: {scores[clientId] || 0}</p> 
        <button onClick={resetGame}>Try Again?</button>
      </div>
    );
  }

  // Fallback (shouldn't generally be reached by host or player after game end)
  return (
    <div className="game-results">
      <h2>Game Finished!</h2>
      <p>Calculating final results...</p> 
      <button onClick={resetGame}>Back to Lobby</button>
    </div>
  );
};

export default GameResults; 