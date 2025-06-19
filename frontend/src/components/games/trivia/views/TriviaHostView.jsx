import React from 'react';
import Timer from '../../../core/Timer';

/**
 * Host Game View - Shows the host's view during active gameplay
 */
const TriviaHostView = (combinedState) => {
  const {
    // Core state
    gameId, players,
    // Trivia state
    questions, currentQuestionIndex, timerKey, timePerQuestion, scores,
    // Actions
    sendGameMessage, ensureConnected,
    // Helper functions
    calculateScores, advanceToNextQuestion, setScores, setGamePhase
  } = combinedState;

  // Handle timer completion (host only)
  const handleTimerComplete = () => {
    console.log(`[TriviaHost] Timer completed for question ${currentQuestionIndex}`);
    console.log(`[TriviaHost] Current questions array length: ${questions.length}`);
    console.log(`[TriviaHost] Current timerKey: ${timerKey}`);
    
    const currentSocket = ensureConnected();
    if (!currentSocket) { 
      console.log(`[TriviaHost] WebSocket not available, cannot proceed`);
      return { shouldRepeat: false };
    }
    
    const questionScores = calculateScores(
      currentQuestionIndex, 
      combinedState.currentQuestionAnswers,
      players,
      combinedState.clientId,
      combinedState.role
    );
    setScores(questionScores);
  
    // Send question result
    sendGameMessage('questionResult', {
      questionIndex: currentQuestionIndex,
      scores: questionScores,
      players: players
    });
    
    const isLastQuestion = currentQuestionIndex >= questions.length - 1;
    if (isLastQuestion) {
      console.log(`[TriviaHost] Game finished, sending gameFinished message`);
      sendGameMessage('gameFinished', {
        finalScores: questionScores,
        players: players
      });
      setGamePhase('finished');
    } else {
      const nextIndex = currentQuestionIndex + 1;
      console.log(`[TriviaHost] Advancing to question ${nextIndex}, sending nextQuestion message`);
      sendGameMessage('nextQuestion', {
        questionIndex: nextIndex 
      });
      console.log(`[TriviaHost] Calling advanceToNextQuestion() - current index: ${currentQuestionIndex}`);
      advanceToNextQuestion();
    }
    
    console.log(`[TriviaHost] Timer completion handler finished`);
    return { shouldRepeat: false };
  };
  // Make sure both questions array is loaded and currentQuestionIndex is valid
  if (!questions.length) {
    return <p>Loading questions...</p>;
  }
  
  // Ensure we have a valid question index
  if (currentQuestionIndex === undefined || currentQuestionIndex === null || 
      currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
    return <p>Loading question...</p>;
  }
  
  const currentQuestion = questions[currentQuestionIndex];

  // Check if the specific question object is valid before accessing properties
  if (!currentQuestion || typeof currentQuestion.question === 'undefined') {
    console.error("Host View: currentQuestion is invalid or missing 'question' property.", currentQuestion);
    return <p>Error loading current question.</p>; // Render error state
  }

  // Calculate if score is tied for first
  const sortedCurrentScores = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  console.log(`[TriviaHostView] Rendering question ${currentQuestionIndex + 1}, timerKey: ${timerKey}`);
  
  return (
    <div className="host-game-view">
      <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
      
      <div className="host-game-content">
        <div className="game-main-section">
          {/* Timer display for host */}
          <div className="timer-container">
            <Timer 
              key={`timer-${currentQuestionIndex}-${timerKey}`} 
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

export default TriviaHostView; 