import { useCallback } from 'react';

/**
 * Custom hook to handle WebSocket message processing
 * 
 * @param {Object} gameState - All game state properties and setter functions
 * @returns {Function} The message handler function
 */
export const useWebSocketMessageHandler = (gameState) => {
  // Destructure all the state and setters we need from gameState
  const {
    // Trivia-specific game state
    setGameStatus, setQuestions, setCurrentQuestionIndex, setTimerKey, 
    setScores, setCurrentQuestionAnswers,
    setHasAnswered, setSelectedAnswer,

    // Core state needed for trivia logic
    gameId, role, currentQuestionIndex, players, setPlayers,
    localPlayerName, playerInfoStage, setPlayerInfoStage,

    // Tie-breaker state
    tieBreakerState, setTieBreakerState,

    // UI state
    setStatus,

    // Methods
    resetGame, checkForTie
  } = gameState;

  // Create the message handler function
  const handleWebSocketMessage = useCallback((data) => {
    console.log("[Trivia WebSocket Message Received]:", data);
    console.log(`[Trivia Debug] handleWebSocketMessage - Current role state: '${role}', GameID: ${gameId}, PlayerInfoStage: ${playerInfoStage}, TieStage: ${tieBreakerState.stage}`);
    
    switch(data.action) {
      // --- Trivia-Specific Game Messages Only ---
      
      case "startGame":
      case "gameStarted":
      {
        console.log(`[Trivia Handler] Processing ${data.action} for role: ${role}`);
        // Set generic game state
        setGameStatus("playing");
        setStatus("Game in progress");
        
        // For players, update playerInfoStage so they can see the game view
        if (role === 'player') {
          setPlayerInfoStage('gameStarted');
        }
        
        // Handle trivia-specific initialization
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionAnswers({});
        setTimerKey(prev => prev + 1);
        
        if (data.questions && data.questions.length > 0) {
          console.log("Questions received from backend for trivia");
          setQuestions(data.questions);
        } else {
          console.error("No questions received from backend!");
        }
        
        // Update player list if server sends it with game start
        if (data.players) {
          setPlayers(data.players);
        }
        break;
      }

      case "submitAnswer":
      {
        // Host receives relayed answer from a player
        if (role === 'host' && data.senderId) {
          console.log(`Host Handling relayed 'submitAnswer' from player ${data.senderId}`);
          if (data.questionIndex === currentQuestionIndex) {
            setCurrentQuestionAnswers(prevAnswers => {
              if (!prevAnswers[data.senderId]) {
                console.log(`Storing answer ${data.answerIndex} from ${data.senderId}`);
                return { ...prevAnswers, [data.senderId]: data.answerIndex };
              }
              return prevAnswers;
            });
          } else {
            console.log(`Ignoring answer for wrong question index (${data.questionIndex} vs ${currentQuestionIndex})`);
          }
        } else if (role === 'player') {
          console.log("Player ignoring submitAnswer confirmation/broadcast.");
        } else {
          console.log(`Ignoring 'submitAnswer' message. Role: '${role}', Sender: ${data.senderId}`);
        }
        break;
      }

      case "questionResult":
      {
        console.log("Handling action: questionResult");
        if (data.scores) {
          setScores(data.scores);
        }
        // Update player list if server sends it with results (might have updated names/scores)
        if (data.players) {
          setPlayers(data.players);
        }
        setStatus(`Q${data.questionIndex + 1} results received.`);
        break;
      }

      case "nextQuestion":
      {
        console.log("Handling action: nextQuestion");
        setCurrentQuestionIndex(data.questionIndex);
        setCurrentQuestionAnswers({});
        setHasAnswered(false); 
        setSelectedAnswer(null);
        setStatus(`Game in progress - Question ${data.questionIndex + 1}`);
        setTimerKey(prev => prev + 1);
        break;
      }

      case "gameFinished":
      case "gameEnded": 
      case "finishGame":
      {
        console.log(`Handling action: ${data.action}`);
        // Set generic game state
        setGameStatus('finished');
        setStatus("Game has ended.");
        
        // Handle trivia-specific final scoring
        if (data.finalScores) {
          setScores(data.finalScores);
          // Check for tie immediately after setting final scores
          if (Object.keys(data.finalScores).length > 1) {
            checkForTie(data.finalScores);
          }
        }
        
        // Update player list if server sends it with final results
        if (data.players) {
          setPlayers(data.players);
        }
        break;
      }

      case "questionTimesUp":
      {
        console.log("Handling action: questionTimesUp");
        setStatus(`Time up for Q${data.questionIndex + 1}! Waiting for results...`);
        break;
      }





      default:
        console.warn("Unhandled WebSocket message action:", data.action);
    }
  }, [
    // Dependencies for trivia message handling
    gameId, role, currentQuestionIndex, players, 
    tieBreakerState, setGameStatus, setQuestions, setCurrentQuestionIndex, 
    setTimerKey, setScores, setPlayers, setStatus, 
    setHasAnswered, setSelectedAnswer, setCurrentQuestionAnswers, 
    checkForTie
  ]);
  
  return handleWebSocketMessage;
}; 