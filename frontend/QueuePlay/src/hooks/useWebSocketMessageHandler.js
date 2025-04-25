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
    // Game state
    setGameStatus, setQuestions, setCurrentQuestionIndex, setTimerKey, 
    setScores, setPlayers, setCurrentQuestionAnswers,

    // Player state
    gameId, role, currentQuestionIndex, players,
    setClientId, setRole, setGameId, localPlayerName, 
    setHasAnswered, setSelectedAnswer,

    // UI state
    setStatus, setQrCodeData,

    // Player info state
    playerInfoStage, playerNameInput, setPlayerInfoStage, setLocalPlayerName,

    // Tie-breaker state
    tieBreakerState, setTieBreakerState,

    // Methods
    resetGame, checkForTie
  } = gameState;

  // Create the message handler function
  const handleWebSocketMessage = useCallback((data) => {
    console.log("[WebSocket Message Received]:", data);
    console.log(`[Debug] handleWebSocketMessage - Current role state: '${role}', GameID: ${gameId}, PlayerInfoStage: ${playerInfoStage}, TieStage: ${tieBreakerState.stage}`);
    
    switch(data.action) {
      // --- Lobby/Join/Reconnect Cases ---
      case "lobbyInitialized": 
      { 
        console.log("Handling action: lobbyInitialized");
        const newClientId = data.clientId;
        const newGameId = data.gameId;
        const newRole = data.role;
        const newQrCodeData = data.qrCodeData;
        // Use a simpler default host name
        const hostName = "Host"; 

        setClientId(newClientId);
        setGameId(newGameId);
        setRole(newRole);
        setQrCodeData(newQrCodeData);
        setScores({});
        // Initialize players with host including their specific name
        setPlayers([{ clientId: newClientId, name: hostName }]); 
        setLocalPlayerName(hostName); // Host sets their own name locally too
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionAnswers({});
        setTimerKey(0);
        setGameStatus('waiting');
        setStatus("Lobby created. Waiting for players...");
        setPlayerInfoStage('joined'); // Host is immediately 'joined'
        break;
      }

      case "joinedLobby": 
      { 
        console.log("Handling action: joinedLobby");
        setClientId(data.clientId);
        setGameId(data.gameId); // Use the gameId confirmed by the server
        setRole('player');
        setGameStatus('waiting');
        setStatus(`Joined Lobby ${data.gameId}. Waiting for host to start.`);
        setPlayerInfoStage('joined'); // Player successfully joined
        // Store the submitted name locally upon successful join
        setLocalPlayerName(playerNameInput); 
        break;
      }

      case "reconnected": 
      {
        console.log("Handling action: reconnected");
        console.log("Reconnection successful:", data);
        setClientId(data.clientId);
        setGameId(data.gameId);
        setRole(data.role);
        setPlayerInfoStage('joined'); // Assume joined state on reconnect
        // If the server sends back the player's name, use it
        if (data.playerName) {
          setLocalPlayerName(data.playerName);
        } else if (data.role === 'player' && !localPlayerName) {
          // Attempt to get name from localStorage if not provided by server
          const storedName = localStorage.getItem(`playerName_${data.gameId}_${data.clientId}`);
          if (storedName) setLocalPlayerName(storedName);
          // If still no name, use a generic default for the local player
          else setLocalPlayerName(`Player ${data.clientId.substring(0,4)}`); 
        } else if (data.role === 'host') {
          // Ensure host name is consistent on reconnect
          setLocalPlayerName("Host"); 
        }

        if (data.gameState) {
          console.log("Restoring game state from server on reconnect");
          if (data.gameState.status) setGameStatus(data.gameState.status);
          if (data.gameState.currentQuestionIndex !== undefined) setCurrentQuestionIndex(data.gameState.currentQuestionIndex);
          if (data.gameState.questions) setQuestions(data.gameState.questions);
          if (data.gameState.scores) setScores(data.gameState.scores);
          if (data.gameState.players) setPlayers(data.gameState.players); // Ensure players list has names if possible
          if (data.gameState.status === 'playing') setTimerKey(prev => prev + 1);
        } else {
          console.log("Reconnect successful, waiting for next state update from host.");
          setStatus(data.role === 'host' ? "Reconnected as Host" : "Reconnected as Player");
        }
        break;
      }

      // --- Game State Update Cases --- 
      case "playerJoined": 
      {
        console.log("Handling action: playerJoined");
        setPlayers(prevPlayers => {
          // Check if player (by clientId) already exists
          if (!prevPlayers.some(p => p.clientId === data.clientId)) {
            // Add the new player with their name from the payload
            const newPlayer = { 
              clientId: data.clientId, 
              // Use provided name, fallback to a clearer default if backend forgets
              name: data.playerName || `Player ${data.clientId.substring(0,4)}` 
            };
            return [...prevPlayers, newPlayer];
          }
          return prevPlayers; // Return existing list if player already present
        });
        break;
      }
              
      case "gameStarted":
      {
        console.log("Handling action: gameStarted");
        console.log("Game started message received:", data);
        setGameStatus("playing");
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionAnswers({});
        setStatus("Game in progress");
        setTimerKey(prev => prev + 1);
        if (data.questions && data.questions.length > 0) {
          console.log("Questions are receieved from backend")
          setQuestions(data.questions);  // Set questions from backend
        } else {
          console.error("No questions received from backend!");
        }
        // Ensure player list includes names if the server sends updated list
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
      {
        console.log("Handling action: gameFinished");
        setGameStatus('finished');
        if (data.finalScores) {
          setScores(data.finalScores);
        }
        // Update player list if server sends it with final results
        if (data.players) {
          setPlayers(data.players);
        }
        // Check for tie immediately after setting final scores
        if (data.finalScores && Object.keys(data.finalScores).length > 1) {
          checkForTie(data.finalScores);
        }
        break;
      }
              
      case "playerLeft":
      {
        console.log("Handling action: playerLeft");
        setPlayers(prev => prev.filter(p => p.clientId !== data.clientId));
        break;
      }
              
      case "playerReconnected":
      {
        console.log("Handling action: playerReconnected");
        // Host should check if the player needs to be re-added (with name)
        if (role === 'host' && !players.some(p => p.clientId === data.clientId)) {
          const reconnectedPlayer = {
            clientId: data.clientId,
            // Use provided name, fallback to a clearer default if backend forgets
            name: data.playerName || `Player ${data.clientId.substring(0,4)}`
          };
          setPlayers(prev => [...prev, reconnectedPlayer]);
        }
        break;
      }

      case "questionTimesUp":
      {
        console.log("Handling action: questionTimesUp");
        setStatus(`Time up for Q${data.questionIndex + 1}! Waiting for results...`);
        break;
      }

      case "finishGame":
      {
        console.log("Handling action: finishGame (received)");
        setGameStatus('finished');
        break;
      }
              
      case "gameEnded":
      {
        console.log("Handling action: gameEnded");
        // Similar logic to finishGame and gameFinished
        setGameStatus('finished');
        
        // If the message includes final scores, update them
        if (data.finalScores) {
          setScores(data.finalScores);
        }
        
        // Update player list if included
        if (data.players) {
          setPlayers(data.players);
        }
        
        setStatus("Game has ended.");
        break;
      }
              
      case "error": 
      { 
        console.error("Received error message from server:", data.message);
        const userFriendlyMessage = data.message || "An error occurred on the server.";
        setStatus(`Error: ${userFriendlyMessage}`);
        // Reset state based on error type
        if (data.message && (data.message.includes("Failed to join lobby") || data.message.includes("Lobby not found"))) {
          // If player was trying to join, reset the info stage
          if (role === '' && playerInfoStage !== 'none') { 
            setPlayerInfoStage('none'); 
          }
          resetGame(); // Consider full reset if join fails fundamentally
        }
        if (data.message && data.message.includes("Reconnect failed")) {
          resetGame(); // Full reset on reconnect failure
        }
        // If the error occurred during the joining stage, revert
        if (playerInfoStage === 'joining') {
          setPlayerInfoStage('enterInfo'); // Allow user to retry input/join
        }
        break;
      }
              
      // --- Tie Resolution --- 
      case "tieResolved":
      {
        console.log("Handling action: tieResolved", data);
        if (data.ultimateWinnerId) {
          setTieBreakerState(prev => ({
            ...prev, // Keep tiedPlayerIds for display if needed
            stage: 'resolved',
            ultimateWinnerId: data.ultimateWinnerId
          }));
          // Update status message
          const winner = players.find(p => p.clientId === data.ultimateWinnerId);
          const winnerName = winner?.name || `Player ${data.ultimateWinnerId.substring(0,4)}`;
          setStatus(`Tie resolved! ${winnerName} is the winner!`);
        } else {
          console.error("tieResolved message received without ultimateWinnerId");
        }
        break;
      }
              
      default:
        console.warn("Unhandled WebSocket message action:", data.action);
    }
  }, [
    // All dependencies
    gameId, role, currentQuestionIndex, players, localPlayerName, playerInfoStage, 
    playerNameInput, tieBreakerState, setGameStatus, setQuestions, setCurrentQuestionIndex, 
    setTimerKey, setScores, setClientId, setRole, setQrCodeData, setPlayers, 
    setStatus, setHasAnswered, setSelectedAnswer, setCurrentQuestionAnswers, 
    setPlayerInfoStage, setLocalPlayerName, resetGame, checkForTie
  ]);
  
  return handleWebSocketMessage;
}; 