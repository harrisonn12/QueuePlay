import React, { useEffect, useCallback } from 'react';
import Timer from '../../../core/Timer';

const CategoryHostView = ({ 
  // Game state
  gamePhase, currentRound, totalRounds, currentCategory, timeRemaining,
  // Player data
  players, playerAnswers, playerScores, roundResults,
  // Actions
  sendGameMessage, handleTimerEnd,
  // Core state
  clientId,
  // Timer reference for speed calculations
  roundStartTimeRef,
}) => {

  // Send game state updates to players
  const broadcastGameState = useCallback((phase, data = {}) => {
    sendGameMessage('gamePhaseChanged', {
      phase,
      roundNumber: currentRound,
      category: currentCategory?.name,
      ...data
    });
  }, [sendGameMessage, currentRound, currentCategory]); // Removed timeRemaining to prevent duplicate messages

  // Send category reveal to players
  useEffect(() => {
    if (gamePhase === 'category-reveal' && currentCategory) {
      sendGameMessage('categoryRevealed', {
        category: currentCategory.name,
        roundNumber: currentRound,
        examples: currentCategory.examples,
      });
    }
  }, [gamePhase, currentCategory, currentRound, sendGameMessage]);

  // Send input phase start to players (only once when phase changes)
  useEffect(() => {
    if (gamePhase === 'input') {
      sendGameMessage('inputPhaseStarted', {
        timeLimit: timeRemaining,
        roundNumber: currentRound,
      });
    }
  }, [gamePhase, currentRound, sendGameMessage]); // Removed timeRemaining to prevent duplicate messages

  // Send round results to players
  useEffect(() => {
    if (gamePhase === 'results' && roundResults) {
      sendGameMessage('roundResults', {
        results: roundResults,
        roundNumber: currentRound,
        scores: playerScores,
      });
    }
  }, [gamePhase, roundResults, currentRound, playerScores, sendGameMessage]);

  // Broadcast phase changes to players
  useEffect(() => {
    if (gamePhase === 'finished') {
      // Don't broadcast 'finished' phase - the endGame function handles gameFinished message
      console.log('[CategoryHostView] Game finished - not broadcasting phase change (endGame handles this)');
    } else {
      broadcastGameState(gamePhase);
    }
  }, [gamePhase, broadcastGameState]);

  // Get phase display text
  const getPhaseDisplayText = () => {
    switch (gamePhase) {
      case 'category-reveal':
        return 'Revealing Category...';
      case 'input':
        return 'Players are typing...';
      case 'scoring':
        return 'Calculating scores...';
      case 'results':
        return 'Round Results';
      default:
        return 'Category Game';
    }
  };

  // Get phase-specific styling
  const getPhaseClass = () => {
    switch (gamePhase) {
      case 'category-reveal':
        return 'phase-reveal';
      case 'input':
        return 'phase-input';
      case 'scoring':
        return 'phase-scoring';
      case 'results':
        return 'phase-results';
      default:
        return '';
    }
  };

  return (
    <div className={`category-host-view ${getPhaseClass()}`}>
      {/* Header */}
      <div className="game-header">
        <div className="game-info">
          <span className="round-indicator">Round {currentRound} of {totalRounds}</span>
          <span className="phase-indicator">{getPhaseDisplayText()}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-main">
        {/* Category Display */}
        <div className="category-section">
          {currentCategory ? (
            <div className="category-display">
              <h2 className="category-title">{currentCategory.name}</h2>
            </div>
          ) : (
            <div className="category-placeholder">
              <span>Preparing next category...</span>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="timer-section">
          {gamePhase === 'input' && (
            <Timer 
              key={`host-timer-${currentRound}`}
              seconds={timeRemaining} 
              size={120}
              showLabel={true}
              label="Time Left"
              onTimerEnd={() => {
                console.log(`[CategoryHost] Timer ended for input phase`);
                handleTimerEnd();
              }}
            />
          )}
        </div>

        {/* Player Answers Section */}
        <div className="players-section">
          <h3>Player Progress</h3>
          <div className="players-grid">
            {players
              .filter(player => player.clientId !== clientId) // Exclude host
              .map(player => {
                const hasSubmitted = playerAnswers[player.clientId];
                const answer = hasSubmitted?.answer || '';
                const score = playerScores[player.clientId] || 0;
                
                return (
                  <div 
                    key={player.clientId} 
                    className={`player-card ${hasSubmitted ? 'submitted' : 'waiting'}`}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-status">
                      {gamePhase === 'input' && (
                        hasSubmitted ? (
                          <span className="status-done">Submitted</span>
                        ) : (
                          <span className="status-waiting">Typing...</span>
                        )
                      )}
                      {(gamePhase === 'results' || gamePhase === 'scoring') && hasSubmitted && (
                        <div className="player-answer">
                          <span className="answer-text">"{answer}"</span>
                          {roundResults?.playerResults[player.clientId] && (
                            <span className={`answer-status ${
                              roundResults.playerResults[player.clientId].isValid ? 'valid' : 'invalid'
                            }`}>
                              {roundResults.playerResults[player.clientId].isValid ? 'Valid' : 'Invalid'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="player-score">Score: {score}</div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Round Results */}
        {gamePhase === 'results' && roundResults && (
          <div className="results-section">
            <h3>Round {currentRound} Results</h3>
            
            {/* Valid Answers */}
            {roundResults.validAnswers.length > 0 && (
              <div className="valid-answers">
                <h4>Valid Answers</h4>
                <div className="answers-list">
                  {roundResults.validAnswers.map(answer => (
                    <span key={answer} className="answer-badge valid">{answer}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Duplicates */}
            {roundResults.duplicates.length > 0 && (
              <div className="duplicate-answers">
                <h4>Duplicate Answers (1 point each)</h4>
                <div className="answers-list">
                  {roundResults.duplicates.map(answer => (
                    <span key={answer} className="answer-badge duplicate">{answer}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Round Scores with Speed Ranking */}
            <div className="round-scores">
              <h4>Points This Round </h4>
              <div className="scores-list">
                {Object.entries(roundResults.playerResults || {})
                  .filter(([playerId, result]) => result.isValid) // Only show valid answers
                  .sort(([,a], [,b]) => {
                    // Sort by score first, then by speed (lower timestamp = faster)
                    if (a.score !== b.score) return b.score - a.score;
                    return a.timestamp - b.timestamp;
                  })
                  .map(([playerId, result], index) => {
                    const player = players.find(p => p.clientId === playerId);
                    const timeUsed = roundStartTimeRef.current 
                      ? ((result.timestamp - roundStartTimeRef.current) / 1000).toFixed(1)
                      : 'N/A';
                    
                    return (
                      <div 
                        key={playerId} 
                        className={`score-item fade-in speed-ranked ${index === 0 ? 'fastest' : ''}`}
                        style={{ animationDelay: `${index * 0.3}s` }}
                      >
                        <div className="player-info">
                          <span className="player-name">
                            {player?.name || 'Unknown'}
                          </span>
                          <span className="submission-time">{timeUsed}s</span>
                        </div>
                        <div className="score-info">
                          <span className="answer-preview">"{result.answer}"</span>
                          <span className={`score-points ${result.score > 3 ? 'bonus-score' : 'good-score'}`}>
                            +{result.score} pts
                            {result.score > 3 && <span className="bonus-indicator"></span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Show invalid answers separately */}
              {Object.entries(roundResults.playerResults || {})
                .filter(([playerId, result]) => !result.isValid)
                .length > 0 && (
                <div className="invalid-answers">
                  <h5>Invalid Answers</h5>
                  <div className="invalid-list">
                    {Object.entries(roundResults.playerResults || {})
                      .filter(([playerId, result]) => !result.isValid)
                      .map(([playerId, result]) => {
                        const player = players.find(p => p.clientId === playerId);
                        return (
                          <div key={playerId} className="invalid-item">
                            <span className="player-name">{player?.name || 'Unknown'}</span>
                            <span className="invalid-answer">"{result.answer || 'No answer'}"</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default CategoryHostView;
