import React, { useState, useEffect } from 'react';
import Timer from '../../../core/Timer';

const MathPlayerView = ({ 
  mathGamePhase, 
  currentRound,
  currentProblem,
  localPlayerName,
  timeRemaining,
  gameSettings,
  sendGameMessage,
  clientId,
  scores
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  
  // Reset submission state when new problem starts
  useEffect(() => {
    if (mathGamePhase === 'playing' && currentProblem) {
      console.log('[MathPlayerView] New problem received, resetting submission state');
      setHasSubmitted(false);
      setCurrentAnswer('');
      setSubmittedAnswer(null);
    }
  }, [currentProblem, mathGamePhase]);
  
  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim() || hasSubmitted || mathGamePhase !== 'playing') return;
    
    const answer = parseInt(currentAnswer.trim());
    if (isNaN(answer)) {
      alert('Please enter a valid number');
      return;
    }
    
    sendGameMessage('playerAnswer', {
      playerId: clientId,
      answer: answer
    });
    
    setHasSubmitted(true);
    setSubmittedAnswer(answer);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmitAnswer();
    }
  };
  
  // Handle number pad input
  const handleNumberInput = (num) => {
    if (hasSubmitted) return;
    setCurrentAnswer(prev => prev + num);
  };
  
  const handleBackspace = () => {
    if (hasSubmitted) return;
    setCurrentAnswer(prev => prev.slice(0, -1));
  };
  
  const handleClear = () => {
    if (hasSubmitted) return;
    setCurrentAnswer('');
  };
  
  // Show loading state when game is playing but no problem received yet
  if (mathGamePhase === 'playing' && !currentProblem) {
    return (
      <div className="player-game-view">
        <div className="game-header">
          <h2 className="text-gradient">🧮 Math Challenge</h2>
          <p className="player-name-display">
            Playing as: <strong>{localPlayerName}</strong>
          </p>
        </div>
        
        <div className="waiting-info">
          <div className="waiting-message">
            <p>Waiting for next problem...</p>
            <div className="pulse-glow">Get Ready!</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (mathGamePhase === 'playing' && currentProblem) {
    return (
      <div className="player-game-view">
        <div className="game-header">
          <p className="player-name-display">
            Playing as: <strong>{localPlayerName}</strong>
          </p>
          <div className="round-info">
            Round {currentRound} of {gameSettings?.totalRounds || 5}
          </div>
        </div>
        
        <div className="timer-container">
          <Timer 
            key={`timer-${currentProblem?.id}`}
            seconds={timeRemaining} 
            size={80} 
          />
        </div>
        
        <div className="problem-section">
          <div className="math-problem-display">
            <h2 className="problem-text">
              {currentProblem?.problem} = ?
            </h2>
          </div>
        </div>
        
        <div className="answer-section">
          {!hasSubmitted ? (
            <>
              <div className="answer-input">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value.replace(/[^-0-9]/g, ''))}
                  onKeyPress={handleKeyPress}
                  placeholder="Your answer"
                  className="answer-field"
                  autoFocus
                />
              </div>
              
              <div className="number-pad">
                <div className="number-row">
                  {[1, 2, 3].map(num => (
                    <button 
                      key={num}
                      className="number-btn" 
                      onClick={() => handleNumberInput(num.toString())}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="number-row">
                  {[4, 5, 6].map(num => (
                    <button 
                      key={num}
                      className="number-btn" 
                      onClick={() => handleNumberInput(num.toString())}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="number-row">
                  {[7, 8, 9].map(num => (
                    <button 
                      key={num}
                      className="number-btn" 
                      onClick={() => handleNumberInput(num.toString())}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="number-row">
                  <button 
                    className="number-btn special" 
                    onClick={() => handleNumberInput('-')}
                  >
                    +/-
                  </button>
                  <button 
                    className="number-btn" 
                    onClick={() => handleNumberInput('0')}
                  >
                    0
                  </button>
                  <button 
                    className="number-btn special" 
                    onClick={handleBackspace}
                  >
                    ⌫
                  </button>
                </div>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="btn-secondary" 
                  onClick={handleClear}
                >
                  Clear
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSubmitAnswer}
                  disabled={!currentAnswer.trim()}
                >
                  Submit Answer
                </button>
              </div>
            </>
          ) : (
            <div className="submitted-state">
              <div className="submitted-answer">
                <h3>Your Answer: {submittedAnswer}</h3>
                <p className="success-message">✓ Answer submitted!</p>
                <p>Waiting for other players and results...</p>
              </div>
            </div>
          )}
        </div>
        
        {scores && scores[clientId] !== undefined && (
          <div className="current-score">
            <p>Your Score: <strong>{scores[clientId]}</strong></p>
          </div>
        )}
      </div>
    );
  }
  
  // No custom scoring views - let the game flow directly to next round or results
  
  // Finished state is handled by BaseGame's GameResults component
  
  return <div>Loading...</div>;
};

export default MathPlayerView; 