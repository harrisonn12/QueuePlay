import React from 'react';
import Timer from '../../../core/Timer';

/**
 * Player Game View - Shows the player's view during active gameplay
 */
const TriviaPlayerView = (combinedState) => {
  const {
    // Core state
    localPlayerName, clientId,
    // Trivia state
    questions, currentQuestionIndex, timerKey, timePerQuestion,
    hasAnswered, selectedAnswer, setHasAnswered, setSelectedAnswer,
    // Actions
    sendGameMessage
  } = combinedState;



  // Submit answer (player only)
  const submitAnswer = (answerIndex) => {
    if (hasAnswered) return;
    
    sendGameMessage('submitAnswer', {
      answerIndex: answerIndex,
      questionIndex: currentQuestionIndex
    });
    
    setHasAnswered(true);
    setSelectedAnswer(answerIndex);
  };
  // For players, show the game interface if we're in playing phase
  // Questions will be populated via WebSocket messages from the host
  if (!questions || !questions.length || currentQuestionIndex >= questions.length) {
    return (
      <div className="player-game-view">
        <p className="player-name-display">
          Playing as: {localPlayerName || `Player ${clientId?.substring(0,4)}`}
        </p>
        <p>Loading next question...</p>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="player-game-view">
      {/* Display player name */}
      <p className="player-name-display">
        Playing as: {localPlayerName || `Player ${clientId?.substring(0,4)}`}
      </p>
      
      {/* Timer display for player */}
      <div className="timer-container">
        <Timer 
          key={timerKey} 
          seconds={timePerQuestion}
          size={80}
        />
      </div>
      
      {/* Question text removed for players */}
      <h2>Answer Now!</h2>
      
      <div className="options">
        {currentQuestion.options.map((option, index) => (
          <button 
            key={index}
            onClick={() => submitAnswer(index)}
            disabled={hasAnswered}
            className={`option-button ${selectedAnswer === index ? 'selected' : ''} ${hasAnswered ? 'answered' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>
      
      {hasAnswered && (
        <p>Answer submitted! Waiting for next question...</p>
      )}
    </div>
  );
};

export default TriviaPlayerView; 