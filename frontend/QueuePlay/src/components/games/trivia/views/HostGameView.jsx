import React from 'react';
import Timer from '../components/Timer';

/**
 * Host Game View - Shows the host's view during active gameplay
 */
const HostGameView = ({
  questions,
  currentQuestionIndex,
  timerKey,
  timePerQuestion,
  handleTimerComplete,
  scores,
  players
}) => {
  // Debugging logs
  console.log("Rendering Host View - Index:", currentQuestionIndex);
  console.log("Rendering Host View - Questions Array:", questions);

  // Make sure both questions array is loaded and currentQuestionIndex is valid
  if (!questions.length) {
    console.log("Host View: questions not loaded yet");
    return <p>Loading questions...</p>;
  }
  
  // Ensure we have a valid question index
  if (currentQuestionIndex === undefined || currentQuestionIndex === null || 
      currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
    console.log("Host View: invalid question index:", currentQuestionIndex);
    return <p>Loading question...</p>;
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // Debugging log for currentQuestion
  console.log("Rendering Host View - Current Question Object:", currentQuestion);

  // Check if the specific question object is valid before accessing properties
  if (!currentQuestion || typeof currentQuestion.question === 'undefined') {
    console.error("Host View: currentQuestion is invalid or missing 'question' property.", currentQuestion);
    return <p>Error loading current question.</p>; // Render error state
  }

  // Calculate if score is tied for first
  const sortedCurrentScores = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  return (
    <div className="host-game-view">
      <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
      
      <div className="host-game-content">
        <div className="game-main-section">
          {/* Timer display for host */}
          <div className="timer-container">
            <Timer 
              key={timerKey} 
              seconds={timePerQuestion} 
              onTimerEnd={handleTimerComplete} 
            />
          </div>
          
          <h3>{currentQuestion.question}</h3>
          
          <div className="options">
            {currentQuestion.options.map((option, index) => (
              <div 
                key={index} 
                className="option"
              >
                {option}
              </div>
            ))}
          </div>
        </div>
        
        <div className="game-scores-section">
          <div className="scores">
            <h3>Current Scores:</h3>
            {Object.entries(scores).length > 0 ? (
              <ol className="score-list">
                {sortedCurrentScores // Use pre-sorted list
                  .map(([playerId, score], index) => {
                    const player = players.find(p => p.clientId === playerId);
                    const playerName = player?.name || `Player ${playerId.substring(0, 4)}`; 
                    
                    return (
                      <li key={playerId} className={index === 0 ? 'leader' : ''}>
                        {playerName}: <strong>{score}</strong> points
                      </li>
                    );
                  })
                }
              </ol>
            ) : (
              <p>No scores yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostGameView; 