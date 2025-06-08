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
    setClientId, setRole, localPlayerName, 
    setHasAnswered, setSelectedAnswer,

    // UI state
    setStatus, setQrCodeData,

    // Player info state
    playerInfoStage, playerNameInput, setPlayerInfoStage, setLocalPlayerName,

    // Tie-breaker state
    tieBreakerState, setTieBreakerState,

    // Identification state setter
    setIsClientIdentified,

    // Methods
    resetGame, checkForTie, addPlayer
  } = gameState;

  // Create the message handler function
  const handleWebSocketMessage = useCallback((data) => {
    console.log("[WebSocket Message Received]:", data);
    console.log(`[Debug] handleWebSocketMessage - Current role state: '${role}', GameID: ${gameId}, PlayerInfoStage: ${playerInfoStage}, TieStage: ${tieBreakerState.stage}`);
    
    switch(data.action) {
      // --- Connection/Identification Cases ---
      case "identified":
      {
        console.log("Handling action: identified");
        // Check if identification was successful by presence of clientId and gameId
        if (data.clientId && data.gameId) {
          console.log("Successfully identified with the server.");
          setStatus("Connected & Identified");
          setIsClientIdentified(true); // Set identification flag

          // Update the clientId if the server assigned a new one
          if (data.clientId !== gameState.clientId) {
            console.log(`Server assigned new clientId: ${data.clientId} (was: ${gameState.clientId})`);
            setClientId(data.clientId);
          }

          // If host, add self to player list
          if (role === 'host' && !players.some(p => p.clientId === data.clientId)) {
            console.log("Identified as host. Adding self to player list.");
            // Ensure host isn't added multiple times if message is somehow duplicated
            addPlayer(data.clientId, localPlayerName || "Host");
          }
          // If player, set joined status
          if (role === 'player') {
            console.log("Identified as player. Setting playerInfoStage to 'joined'.");
            setPlayerInfoStage('joined');
          }
        } else {
          console.error("Server identification failed.", data.message || "Missing clientId or gameId");
          setStatus(`Error: Identification failed. ${data.message || 'Invalid response format'}`);
          setIsClientIdentified(false); // Ensure flag is false on failure
        }
        break;
      }

      // --- Lobby/Join/Reconnect Cases ---
      // REMOVE: case "lobbyInitialized" - This logic is now handled by the API calls + identify flow
      // case "lobbyInitialized": ...

      // REMOVE: case "joinedLobby" - This logic is now handled by the API calls + identify flow
      // case "joinedLobby": ...

      // REMOVE: case "reconnected" - This logic is now handled by the identify flow on connection open
      // case "reconnected": ...

      // --- Game State Update Cases --- 
      case "announcePlayer": 
      {
        // Host receives this message when a player joins AFTER identifying
        if (role === 'host') {
          console.log(`Host handling announcePlayer from ${data.clientId} (${data.playerName})`);
          addPlayer(data.clientId, data.playerName);
        }
        break;
      }

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
      case "resolveTie":
      {
        console.log("Handling action: resolveTie", data);
        if (data.ultimateWinnerId) {
          setTieBreakerState(prev => ({
            ...prev,
            stage: 'resolved',
            ultimateWinnerId: data.ultimateWinnerId
          }));
          // Update status message maybe?
          // const winner = players.find(p => p.clientId === data.ultimateWinnerId);
          // const winnerName = winner?.name || `Player ${data.ultimateWinnerId.substring(0,4)}`;
          // setStatus(`Tie resolved! ${winnerName} is the winner!`);
        } else {
          console.error("resolveTie message received without ultimateWinnerId");
          // Maybe reset the tie state?
          // setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null });
        }
        break;
      }

      case "tieResolved":
      {
        console.log("Handling action: tieResolved", data);
        if (data.ultimateWinnerId) {
          setTieBreakerState(prev => ({
            ...prev,
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

      case "startGame":
      {
        console.log("Handling action: startGame");
        setGameStatus("playing");
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionAnswers({});
        setStatus("Game in progress - Question 1");
        setTimerKey(prev => prev + 1); // Reset timer for the first question

        if (data.questions && data.questions.length > 0) {
          console.log("Setting questions received with startGame:", data.questions);
          setQuestions(data.questions);
        } else {
          // This might happen if questions were fetched earlier by host
          // and not included in the startGame broadcast. Ensure questions aren't empty.
          if (gameState.questions.length === 0) {
            console.error("startGame received, but no questions found in payload or state!");
            setStatus("Error: Missing questions!");
            // Maybe reset to waiting?
            // setGameStatus('waiting');
          } else {
            console.log("Using questions already present in state.");
          }
        }

        // Update player list if included (might have latest names)
        if (data.players) {
          setPlayers(data.players);
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
    setPlayerInfoStage, setLocalPlayerName, resetGame, checkForTie, addPlayer,
    setIsClientIdentified,
    gameState.clientId, gameState.questions,
    setTieBreakerState
  ]);
  
  return handleWebSocketMessage;
}; 