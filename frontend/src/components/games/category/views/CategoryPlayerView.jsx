import React, { useState, useCallback, useEffect, useRef } from 'react';
import Timer from '../../../core/Timer';

const CategoryPlayerView = ({ 
  // Game state
  gamePhase, currentRound, totalRounds, currentCategory, timeRemaining,
  // Player data
  localPlayerName, playerScores, roundResults,
  // Actions
  sendGameMessage,
  // Core state
  gameId, clientId,
}) => {
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState('');
  const inputRef = useRef(null);

  // Reset state on new round
  useEffect(() => {
    if (gamePhase === 'input') {
      setPlayerAnswer('');
      setHasSubmitted(false);
      setSubmissionFeedback('');
    }
  }, [gamePhase, currentRound]);

  // Focus input when input phase starts
  useEffect(() => {
    if (gamePhase === 'input' && inputRef.current && !hasSubmitted) {
      inputRef.current.focus();
    }
  }, [gamePhase, hasSubmitted]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (!playerAnswer.trim() || hasSubmitted || gamePhase !== 'input') {
      return;
    }

    sendGameMessage('submitAnswer', {
      playerId: clientId,
      answer: playerAnswer.trim(),
      timestamp: Date.now(),
    });

    setHasSubmitted(true);
    setSubmissionFeedback('Answer submitted! ✓');
    
    console.log(`[CategoryPlayer] Submitted answer: "${playerAnswer.trim()}"`);
  }, [playerAnswer, hasSubmitted, gamePhase, sendGameMessage, clientId]);

  // Handle input key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      submitAnswer();
    }
  }, [submitAnswer]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    if (!hasSubmitted) {
      setPlayerAnswer(e.target.value);
    }
  }, [hasSubmitted]);

  // Get player's score
  const getPlayerScore = () => {
    return playerScores[clientId] || 0;
  };

  // Get player's result for current round
  const getPlayerRoundResult = () => {
    if (!roundResults?.playerResults) return null;
    return roundResults.playerResults[clientId];
  };

  // Get phase display text
  const getPhaseDisplayText = () => {
    switch (gamePhase) {
      case 'category-reveal':
        return 'Get ready to type!';
      case 'input':
        return hasSubmitted ? 'Waiting for other players...' : 'Type your answer!';
      case 'scoring':
        return 'Checking answers...';
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
        return hasSubmitted ? 'phase-submitted' : 'phase-input';
      case 'scoring':
        return 'phase-scoring';
      case 'results':
        return 'phase-results';
      default:
        return '';
    }
  };

  const playerResult = getPlayerRoundResult();

  return (
    <div className={`category-player-view ${getPhaseClass()}`}>
      {/* Header */}
      <div className="game-header">
        <div className="player-info">
          <span className="player-name">Playing as: <strong>{localPlayerName}</strong></span>
          <span className="player-score">Score: {getPlayerScore()}</span>
        </div>
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
              <span>Waiting for next category...</span>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="timer-section">
          {gamePhase === 'input' && (
            <Timer 
              key={`timer-${currentRound}`}
              seconds={timeRemaining} 
              size={100}
              showLabel={true}
              label="Time Left"
              onTimerEnd={() => {
                // Timer ended, but don't handle state changes here
                // Let the host manage the game state
                console.log(`[CategoryPlayer] Timer ended for input phase`);
              }}
            />
          )}
        </div>

        {/* Input Section */}
        {gamePhase === 'input' && (
          <div className="input-section">
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                value={playerAnswer}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={`Type a word in category: ${currentCategory?.name}`}
                disabled={hasSubmitted}
                className={`answer-input ${hasSubmitted ? 'submitted' : ''}`}
                maxLength={50}
              />
              <button
                onClick={submitAnswer}
                disabled={!playerAnswer.trim() || hasSubmitted}
                className="submit-btn"
              >
                {hasSubmitted ? 'Submitted ✓' : 'Submit'}
              </button>
            </div>
            
            {submissionFeedback && (
              <div className="submission-feedback">
                {submissionFeedback}
              </div>
            )}
            
            <div className="input-help">
              Press Enter or click Submit to send your answer
            </div>
          </div>
        )}

        {/* Waiting States */}
        {gamePhase === 'category-reveal' && (
          <div className="waiting-section">
            <div className="waiting-message">
              <h3>Category revealed!</h3>
              <p>Get ready to type a word in this category...</p>
            </div>
          </div>
        )}

        {gamePhase === 'scoring' && (
          <div className="waiting-section">
            <div className="waiting-message">
              <h3>Calculating scores...</h3>
              <p>Checking all answers for duplicates and validity</p>
            </div>
          </div>
        )}

        {/* Fallback for 'playing' phase when waiting for category phases */}
        {gamePhase === 'playing' && !currentCategory && (
          <div className="waiting-section">
            <div className="waiting-message">
              <h3>Game starting...</h3>
              <p>Waiting for the first category...</p>
            </div>
          </div>
        )}

        {/* Fallback for unknown phases */}
        {!['category-reveal', 'input', 'scoring', 'results', 'playing'].includes(gamePhase) && (
          <div className="waiting-section">
            <div className="waiting-message">
              <h3>Category Game</h3>
              <p>Phase: {gamePhase}</p>
              <p>Waiting for game to continue...</p>
            </div>
          </div>
        )}

        {/* Round Results */}
        {gamePhase === 'results' && (
          <div className="results-section">
            <h3>Round {currentRound} Results</h3>
            
            {/* Player's Answer Result */}
            {playerResult && (
              <div className="player-result">
                <h4>Your Answer</h4>
                <div className={`answer-result ${playerResult.isValid ? 'valid' : 'invalid'}`}>
                  <span className="answer-text">"{playerResult.answer}"</span>
                  <span className="answer-status">
                    {playerResult.isValid ? '✅ Valid' : '❌ Invalid'}
                  </span>
                  <span className="answer-points">
                    +{playerResult.score} points
                  </span>
                </div>
                
                {!playerResult.isValid && (
                  <div className="invalid-reason">
                    This word is not in our {currentCategory?.name} dictionary or was left blank.
                  </div>
                )}
                
                {playerResult.isValid && playerResult.score === 1 && (
                  <div className="duplicate-notice">
                    Someone else gave the same answer! (1 point instead of 3)
                  </div>
                )}
                
                {playerResult.score > 3 && (
                  <div className="bonus-notice">
                    🎉 Speed bonus! ({playerResult.score - (playerResult.isValid && roundResults?.duplicates?.includes(playerResult.cleanAnswer) ? 1 : 3)} extra points)
                  </div>
                )}
              </div>
            )}
            
            {/* All Valid Answers */}
            {roundResults?.validAnswers && roundResults.validAnswers.length > 0 && (
              <div className="all-answers">
                <h4>All Valid Answers This Round</h4>
                <div className="answers-list">
                  {roundResults.validAnswers.map(answer => (
                    <span 
                      key={answer} 
                      className={`answer-badge ${
                        roundResults.duplicates.includes(answer) ? 'duplicate' : 'unique'
                      }`}
                    >
                      {answer}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Next Round Info */}
            <div className="next-round-info">
              {currentRound < totalRounds ? (
                <p>Next round starting soon...</p>
              ) : (
                <p>Final results coming up!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPlayerView;
