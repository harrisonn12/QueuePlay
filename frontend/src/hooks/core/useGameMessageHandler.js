import { useCallback } from 'react';

/**
 * Core message handler for game-agnostic WebSocket messages
 * Handles universal messages like player management, connection events, game lifecycle, etc.
 * 
 * @param {Object} gameState - Combined game state (core + game-specific)
 * @returns {Function} Message handler function that returns true if message was handled
 */
export const useGameMessageHandler = (gameState) => {
  const {
    // Core state
    role,
    gameId,
    playerInfoStage,
    localPlayerName,
    clientId,
    setStatus,
    setIsClientIdentified,
    setClientId,
    setPlayerInfoStage,
    addPlayer,
    removePlayer,
    resetGame,
    setPlayers,
    
    // Game-specific state that core might need
    setGameStatus,
    tieBreakerState,
    setTieBreakerState,
    checkForTie,
  } = gameState;

  const handleCoreMessage = useCallback((data) => {
    console.log("[Core Message Handler] Processing:", data.action);
    
    switch(data.action) {
      // --- Connection/Identification Cases ---
      case "identified":
      {
        console.log("Handling core action: identified");
        console.log("DEBUG - identification data:", data);
        console.log("DEBUG - current role:", role);
        
        // Check if identification was successful
        if (data.clientId && data.gameId) {
          console.log("Successfully identified with the server.");
          setStatus("Connected & Identified");
          setIsClientIdentified(true);

          // Update the clientId if the server assigned a new one
          if (data.clientId !== clientId) {
            console.log(`Server assigned new clientId: ${data.clientId} (was: ${clientId})`);
            setClientId(data.clientId);
          }

          // Host should not be added to player list
          if (role === 'host') {
            console.log("Identified as host. Host is not added to player list.");
          }
          
          // If player, set joined status
          if (role === 'player') {
            console.log("Identified as player. Setting playerInfoStage to 'joined'.");
            setPlayerInfoStage('joined');
          }
        } else {
          console.error("Server identification failed.", data.message || "Missing clientId or gameId");
          setStatus(`Error: Identification failed. ${data.message || 'Invalid response format'}`);
          setIsClientIdentified(false);
        }
        return true; // Message handled
      }

      // --- Player Management Cases ---
      case "announcePlayer": 
      {
        // Host receives this message when a player joins AFTER identifying
        if (role === 'host') {
          console.log(`Host handling announcePlayer from ${data.clientId} (${data.playerName})`);
          addPlayer(data.clientId, data.playerName);
        }
        return true; // Message handled
      }

      case "playerJoined": 
      {
        console.log("Handling core action: playerJoined");
        addPlayer(data.clientId, data.playerName || `Player ${data.clientId.substring(0,4)}`);
        return true; // Message handled
      }

      case "playerLeft":
      {
        console.log("Handling core action: playerLeft");
        if (removePlayer) {
          removePlayer(data.clientId);
        } else {
          // Fallback: remove from players list directly
          setPlayers(prev => prev.filter(p => p.clientId !== data.clientId));
        }
        return true; // Message handled
      }

      case "playerReconnected":
      {
        console.log("Handling core action: playerReconnected");
        // Host should check if the player needs to be re-added (with name)
        if (role === 'host') {
          const reconnectedPlayer = {
            clientId: data.clientId,
            name: data.playerName || `Player ${data.clientId.substring(0,4)}`
          };
          addPlayer(data.clientId, reconnectedPlayer.name);
        }
        return true; // Message handled
      }

      // --- Game Lifecycle Cases ---
      case "startGame":
      {
        console.log("Handling core action: startGame");
        console.log("DEBUG - startGame data:", data);
        
        // Store game data for game components to use
        if (gameState.setGameData) {
          console.log("Storing game data from startGame message");
          gameState.setGameData(data);
        }
        
        // For players, this message signals that the game has started
        // The host already set their game phase when they clicked start
        if (role === 'player') {
          console.log("Player received startGame message, updating game phase");
          console.log("DEBUG - current gamePhase:", gameState.gamePhase);
          console.log("DEBUG - setGamePhase function available:", !!gameState.setGamePhase);
          // This will trigger BaseGame to render the specific game component
          if (gameState.setGamePhase) {
            console.log("Calling setGamePhase('playing')");
            gameState.setGamePhase('playing');
            // Add a timeout to check if the state actually updated
            setTimeout(() => {
              console.log("DEBUG - gamePhase after setState:", gameState.gamePhase);
            }, 100);
          } else {
            console.error("setGamePhase function not found in gameState!");
          }
        }
        // Let the game-specific handler also process this message
        return false; // Allow game-specific handler to also process
      }

      // --- Tie Resolution (Generic for any scoring game) ---
      case "resolveTie":
      {
        console.log("Handling core action: resolveTie", data);
        if (data.ultimateWinnerId && setTieBreakerState) {
          setTieBreakerState(prev => ({
            ...prev,
            stage: 'resolved',
            ultimateWinnerId: data.ultimateWinnerId
          }));
        } else {
          console.error("resolveTie message received without ultimateWinnerId or setTieBreakerState");
        }
        return true; // Message handled
      }

      case "tieResolved":
      {
        console.log("Handling core action: tieResolved", data);
        if (data.ultimateWinnerId && setTieBreakerState) {
          setTieBreakerState(prev => ({
            ...prev,
            stage: 'resolved',
            ultimateWinnerId: data.ultimateWinnerId
          }));
        }
        return true; // Message handled
      }

      // --- Error Cases ---
      case "error":
      {
        console.error("Core error message:", data.message);
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
        return true; // Message handled
      }

      // --- Connection Status Cases ---
      case "connectionStatus":
      {
        console.log("Connection status update:", data.status);
        setStatus(data.status);
        return true; // Message handled
      }

      default:
        // Message not handled by core, let game-specific handler process it
        return false;
    }
  }, [
    role,
    gameId,
    playerInfoStage,
    localPlayerName,
    clientId,
    setStatus,
    setIsClientIdentified,
    setClientId,
    setPlayerInfoStage,
    addPlayer,
    removePlayer,
    resetGame,
    setPlayers,
    setGameStatus,
    setTieBreakerState
  ]);

  return handleCoreMessage;
}; 