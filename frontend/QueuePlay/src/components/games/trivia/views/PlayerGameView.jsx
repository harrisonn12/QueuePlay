import React from 'react';

/**
 * Player Game View - Shows the player's view during active gameplay
 */
const PlayerGameView = ({
  questions,
  currentQuestionIndex,
  submitAnswer,
  hasAnswered,
  selectedAnswer,
  localPlayerName,
  clientId
}) => {
  if (!questions.length || currentQuestionIndex >= questions.length) {
    return <p>Waiting for question...</p>;
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="player-game-view">
      {/* Display player name */}
      <p className="player-name-display">
        Playing as: {localPlayerName || `Player ${clientId?.substring(0,4)}`}
      </p>
      
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

export default PlayerGameView; 