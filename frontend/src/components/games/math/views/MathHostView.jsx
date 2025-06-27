import React, { useEffect } from 'react';
import Timer from '../../../core/Timer';

const MathHostView = ({ 
  mathGamePhase, 
  currentRound,
  currentProblem,
  playerAnswers,
  scores, 
  players, 
  timeRemaining,
  roundResults,
  gameSettings,
  sendGameMessage,
  getLeaderboard,
  endCurrentProblem,
  startNewProblem,
  nextRound,
  endGame,
  setScores
}) => {
  
  console.log('[MathHostView] Rendered with mathGamePhase:', mathGamePhase, 'currentProblem:', currentProblem);
  
  // Auto start first problem when game starts (prevent double calls)
  useEffect(() => {
    if (mathGamePhase === 'playing' && !currentProblem && currentRound > 0) {
      console.log('[MathHostView] Auto-starting first problem');
      const timeoutId = setTimeout(() => {
        startNewProblem();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mathGamePhase, currentProblem, currentRound, startNewProblem]);
  
  // Broadcast new problems to players when they change
  useEffect(() => {
    if (currentProblem && mathGamePhase === 'playing') {
      console.log('[MathHostView] Broadcasting new problem to players:', currentProblem);
      sendGameMessage('newProblem', {
        problem: currentProblem,
        round: currentRound,
        totalRounds: gameSettings.totalRounds,
        timeLimit: gameSettings.roundTime
      });
    }
  }, [currentProblem, mathGamePhase, currentRound, gameSettings, sendGameMessage]);
  
  // Broadcast timer updates to players
  useEffect(() => {
    if (mathGamePhase === 'playing' && currentProblem) {
      sendGameMessage('timerUpdate', { timeRemaining });
    }
  }, [timeRemaining, mathGamePhase, currentProblem, sendGameMessage]);
  
  // Handle timer completion (host only)
  const handleTimerComplete = () => {
    console.log(`[MathHostView] Timer completed for problem ${currentProblem?.id}`);
    console.log(`[MathHostView] Current round: ${currentRound}/${gameSettings.totalRounds}`);
    
    // Use the current scores (they're already updated in real-time by submitAnswer)
    const updatedScores = { ...scores };
    
    // Broadcast problem results to players
    sendGameMessage('problemResults', {
      correctAnswer: currentProblem.answer,
      playerAnswers: playerAnswers,
      scores: updatedScores,
      problem: currentProblem
    });
    
    // Brief delay to show results, then continue
    setTimeout(() => {
      const isLastRound = currentRound >= gameSettings.totalRounds;
      if (isLastRound) {
        console.log(`[MathHostView] Game finished, sending gameFinished message`);
        
        // Send message to all players (and host will also receive this)
        sendGameMessage('gameFinished', {
          finalScores: updatedScores,
          players: players
        });
        
        // Message handler will handle BaseGame state transitions
      } else {
        // Move to next round
        console.log(`[MathHostView] Moving to next round`);
        sendGameMessage('nextRound', {
          nextRound: currentRound + 1,
          totalRounds: gameSettings.totalRounds
        });
        nextRound();
      }
    }, 2000);
    
    return { shouldRepeat: false };
  };
  
  // Don't show waiting screen - math game starts immediately
  if (!currentProblem && mathGamePhase === 'playing') {
    return (
      <div className="host-game-view">
        <div className="game-header">
          <h1 className="text-gradient">🧮 Math Challenge</h1>
          <p>Starting first problem...</p>
        </div>
      </div>
    );
  }
  
  if (mathGamePhase === 'playing' && currentProblem) {
    return (
      <div className="host-game-view">
        <div className="game-header">
          <h2>Round {currentRound} of {gameSettings.totalRounds}</h2>
          <div className="timer-container">
            <Timer 
              key={`timer-${currentProblem.id}`}
              seconds={gameSettings.roundTime} 
              size={120}
              onTimerEnd={handleTimerComplete}
            />
          </div>
        </div>
        
        <div className="game-main-content">
          <div className="problem-display">
            <div className="math-problem">
              <h1 className="problem-text neon-text">
                {currentProblem?.problem} = ?
              </h1>
            </div>
          </div>
          
          <div className="player-responses">
            <h3>Player Status</h3>
            <div className="responses-grid">
              {players.map(player => {
                const response = playerAnswers[player.clientId];
                return (
                  <div 
                    key={player.clientId} 
                    className={`player-response ${response ? 'answered' : 'waiting'}`}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="response-status">
                      {response ? (
                        <span className="answered">✓ Answered</span>
                      ) : (
                        <span className="waiting">Thinking...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="current-scores">
            <h3>Current Scores</h3>
            {Object.entries(scores).length > 0 ? (
              <div className="scores-list">
                {getLeaderboard().map((entry, index) => {
                  const player = players.find(p => p.clientId === entry.playerId);
                  const playerName = player?.name || `Player ${entry.playerId.substring(0, 4)}`;
                  
                  return (
                    <div key={entry.playerId} className="score-item">
                      <span className="player-name">{playerName}</span>
                      <span className="player-score">{entry.score} points</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No scores yet</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // No custom views for other phases - let BaseGame handle finished state
  
  return <div>Loading...</div>;
};

export default MathHostView; 