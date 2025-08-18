import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { createLobby, getQrCode, joinGameWithAuth, getLobbyInfo } from "../../utils/api/game.js";
import { getStoredToken } from "../../utils/api/auth.js";
import { useAuth } from "./useAuth.js";

/**
 * Core game state hook that manages game-agnostic state and functionality
 * This is used as a foundation by all game types
 * 
 * @param {string} gameType - The type of game being played (e.g., 'trivia')
 * @returns {Object} Core game state and methods
 */
export const useGameCore = (gameType = 'trivia', onGameTypeChange = null) => {
  // Core game identifiers and role 
  // ONLY persist for hosts to survive component remounts
  // Players should always start fresh
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState("");
  const [clientId, setClientId] = useState(() => {
    // Always generate a fresh clientId for each component instance
    // This ensures new browser tabs/windows get unique identities
    const newClientId = uuidv4();
    console.log("Generated new clientId for this session:", newClientId);
    return newClientId;
  });

  // Player management
  const [players, setPlayers] = useState([]);
  const [localPlayerName, setLocalPlayerName] = useState("");

  // UI and connection state
  const [status, setStatus] = useState("");
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isClientIdentified, setIsClientIdentified] = useState(false);

  // Player info state for joining games
  const [playerInfoStage, setPlayerInfoStage] = useState("none"); // 'none', 'enterInfo', 'joining', 'joined'
  const [joinTargetGameId, setJoinTargetGameId] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [playerPhoneInput, setPlayerPhoneInput] = useState("");
  const [inputGameId, setInputGameId] = useState("");
  const [pendingGameType, setPendingGameType] = useState(null); // Store game type during join flow

  // Authentication integration
  const { 
    isAuthenticated, 
    userType, 
    login,
    loginAsGuest,
    token
  } = useAuth();

  // Ref to track player announcement
  const announcedPlayerRef = useRef(false);

  // Simple setters - no automatic persistence
  const setGameIdWithPersistence = useCallback((newGameId) => {
    setGameId(newGameId);
  }, []);

  const setRoleWithPersistence = useCallback((newRole) => {
    setRole(newRole);
  }, []);

  // Note: clientId is not persisted - each browser instance gets a unique ID

  // Fresh start on every page load - no persistent game state
  useEffect(() => {
    console.log("useGameCore initialized - fresh start (no persistent state)");
  }, []); // Run once on mount

  // Reset core game state
  const resetGame = useCallback(() => {
    setGameId("");
    setRole("");
    setPlayers([]);
    setQrCodeData(null);
    setInputGameId("");
    setStatus("");
    setIsClientIdentified(false);

    // Reset player info state
    setPlayerInfoStage("none");
    setJoinTargetGameId("");
    setPlayerNameInput("");
    setPlayerPhoneInput("");
    setLocalPlayerName("");
    setPendingGameType(null);
    
    // Reset refs
    announcedPlayerRef.current = false;

    // No persistent state to clear - clientId is not persisted

    console.log("Core game state reset");
  }, []);

  // No persistent state - fresh start on every page load

  // Add a player to the players list
  const addPlayer = useCallback((playerId, playerName) => {
    setPlayers((prevPlayers) => {
      // Avoid duplicates
      if (prevPlayers.some((p) => p.clientId === playerId)) {
        return prevPlayers;
      }

      return [
        ...prevPlayers,
        {
          clientId: playerId,
          name: playerName || `Player ${playerId.substring(0, 4)}`,
        },
      ];
    });
  }, []);

  // Remove a player from the players list
  const removePlayer = useCallback((playerId) => {
    setPlayers((prevPlayers) =>
      prevPlayers.filter((p) => p.clientId !== playerId),
    );
  }, []);

  // API Functions for lobby management
  const createLobbyAPI = useCallback(async (clientId, gameType) => {
    const token = getStoredToken();
    if (!token) {
      throw new Error("Authentication required to create lobby");
    }

    try {
      const gameId = await createLobby(clientId, gameType, token);
      console.log(`Lobby created with ID: ${gameId}`);
      return gameId;
    } catch (error) {
      console.error("Failed to create lobby:", error);
      throw error;
    }
  }, []);

  const getQrCodeAPI = useCallback(async (gameId) => {
    const token = getStoredToken();
    if (!token) {
      throw new Error("Authentication required to get QR code");
    }

    try {
      const qrData = await getQrCode(gameId, token);
      console.log("QR Code fetched successfully");
      return qrData;
    } catch (error) {
      console.error("Failed to get QR code:", error);
      throw error;
    }
  }, []);

  // Host game functionality
  const hostGame = useCallback(async (gameTypeOrCallback = null) => {
    // Handle different parameter types:
    // - string: game type to use
    // - function: callback for when game is created
    // - null/undefined: use default game type
    let actualGameType = gameType;
    let onGameCreated = null;
    
    if (typeof gameTypeOrCallback === 'string') {
      actualGameType = gameTypeOrCallback;
    } else if (typeof gameTypeOrCallback === 'function') {
      onGameCreated = gameTypeOrCallback;
    }
    
    // Check authentication first
    if (!isAuthenticated || userType !== 'host') {
      setStatus("Authentication required. Please log in to host a game.");
      return;
    }

    resetGame();
    setStatus("Creating lobby...");
    
    try {
      const newGameId = await createLobbyAPI(clientId, actualGameType);
      setGameIdWithPersistence(newGameId);
      setRoleWithPersistence('host');
      
      // Host state managed in memory only - fresh start on page refresh
      
      console.log(`Lobby created with ID: ${newGameId}. Role set to host. Client ID: ${clientId}`);

      // Fetch QR code
      setStatus("Fetching lobby details...");
      try {
        const qrData = await getQrCodeAPI(newGameId);
        setQrCodeData(qrData);
        console.log("QR Code fetched successfully.");
      } catch (error) {
        console.error("Error fetching QR Code:", error);
        setStatus("Lobby created, but failed to fetch QR code.");
      }

      // Call game-specific initialization if provided
      if (onGameCreated && typeof onGameCreated === 'function') {
        await onGameCreated(newGameId);
      }

      // WebSocket connection will be handled by the TriviaGame component
      setStatus("Game lobby ready!");

    } catch (error) {
      console.error("Failed to host game:", error);
      setStatus(`Error creating lobby: ${error.message}. Please try again.`);
      resetGame();
    }
  }, [
    resetGame, 
    setStatus, 
    isAuthenticated,
    userType,
    setGameIdWithPersistence, 
    setRoleWithPersistence, 
    setQrCodeData, 
    clientId,
    gameType,
    createLobbyAPI,
    getQrCodeAPI
  ]);

  // Handle host login
  const handleHostLogin = useCallback(async (email, password) => {
    const result = await login(email, password);
    if (result && result.success) {
      setStatus("Welcome! You can now create games.");
    }
    return result;
  }, [login, setStatus]);

  // Initiate player join - shows join form
  const initiateJoinGame = useCallback(async () => {
    if (!inputGameId) {
      setStatus("Error: Please enter a Game ID.");
      return;
    }
    
    try {
      setStatus("Checking game...");
      
      // First, get lobby info to determine game type
      const lobbyInfo = await getLobbyInfo(inputGameId);
      if (!lobbyInfo.success) {
        setStatus("Game not found. Please check the Game ID.");
        return;
      }
      
      // Store game type locally but DON'T change app game type yet
      // This prevents component remounting during join flow
      if (lobbyInfo.gameType) {
        console.log(`Storing game type ${lobbyInfo.gameType} for after join`);
        setPendingGameType(lobbyInfo.gameType);
      }
      
      // Now set up the join flow
      setJoinTargetGameId(inputGameId);
      setPlayerInfoStage('enterInfo');
      setStatus("Please enter your details to join.");
      
    } catch (error) {
      console.error("Failed to get lobby info:", error);
      setStatus("Failed to check game. Please try again.");
    }
  }, [inputGameId, setStatus]);

  // Handle player join from front page (sets up join flow)
  const handlePlayerJoin = useCallback(async (gameId) => {
    try {
      setStatus("Checking game...");
      
      // First, get lobby info to determine game type
      const lobbyInfo = await getLobbyInfo(gameId);
      if (!lobbyInfo.success) {
        setStatus("Game not found. Please check the Game ID.");
        return;
      }
      
      // Store game type locally but DON'T change app game type yet
      // This prevents component remounting during join flow
      if (lobbyInfo.gameType) {
        console.log(`Storing game type ${lobbyInfo.gameType} for after join`);
        setPendingGameType(lobbyInfo.gameType);
      }
      
      // Now set up the join flow
      setInputGameId(gameId);
      setJoinTargetGameId(gameId);
      setPlayerInfoStage('enterInfo');
      setStatus("Please enter your details to join.");
      
    } catch (error) {
      console.error("Failed to get lobby info:", error);
      setStatus("Failed to check game. Please try again.");
    }
  }, [setStatus]);

  // Complete player join process with authentication
  const completePlayerJoin = useCallback(async (gameId, playerName, phoneNumber = null) => {
    try {
      setStatus("Authenticating player...");
      
      // Step 1: Get guest token
      const authResult = await loginAsGuest(gameId, playerName, phoneNumber);
      if (!authResult.success) {
        setStatus(`Authentication failed: ${authResult.error}`);
        return { success: false, error: authResult.error };
      }

      // Step 2: Join the game via API
      setStatus("Joining game...");
      const token = getStoredToken();
      const joinResult = await joinGameWithAuth(gameId, playerName, phoneNumber, token);
      console.log("Join game API result:", joinResult);

      // Step 3: Set game state and persist it to survive component switch
      setGameIdWithPersistence(gameId);
      setRoleWithPersistence('player');
      setLocalPlayerName(playerName);
      setPlayerInfoStage('joining');
      
      // Player state managed in memory only - fresh start on page refresh
      
      // Step 4: Now change game type to switch to correct component
      // This happens AFTER all state is set and persisted to prevent data loss
      if (pendingGameType && onGameTypeChange) {
        console.log(`Switching to ${pendingGameType} game component after successful join`);
        onGameTypeChange(pendingGameType);
        setPendingGameType(null); // Clear pending game type
      }
      
      setStatus("Connecting to game...");
      
      return { success: true };
      
    } catch (error) {
      console.error("Failed to join game:", error);
      setStatus(`Error joining game: ${error.message}`);
      setPlayerInfoStage('enterInfo');
      return { success: false, error: error.message };
    }
  }, [setGameIdWithPersistence, setRoleWithPersistence, setLocalPlayerName, setStatus, onGameTypeChange, pendingGameType]);

  // Start game (host only) - sends startGame message
  const startGame = useCallback((ensureConnected, gameSpecificData = {}) => {
    const currentSocket = ensureConnected();
    if (currentSocket) {
      console.log("Host sending startGame...");
      currentSocket.send(JSON.stringify({
        action: "startGame",
        gameId: gameId,
        clientId: clientId,
        players: players,
        ...gameSpecificData // Allow games to add specific data
      }));
    } else {
      console.error("Cannot start game: WebSocket not ready.");
    }
  }, [gameId, clientId, players]);

  // Announce player presence (called after identification)
  const announcePlayer = useCallback((ensureConnected) => {
    if (role === 'player' && !announcedPlayerRef.current) {
      console.log("[Announce] Announcing player presence...");
      const socket = ensureConnected();
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          action: "announcePlayer",
          gameId: gameId,
          clientId: clientId,
          playerName: localPlayerName || `Player ${clientId.substring(0,4)}`
        }));
        announcedPlayerRef.current = true;
      } else {
        console.error("[Announce] Cannot announce player: WebSocket not ready.");
      }
    }
  }, [role, gameId, clientId, localPlayerName]);

  // Handle player leave
  const handlePlayerLeave = useCallback((ensureConnected) => {
    const currentSocket = ensureConnected();
    if (currentSocket && role === 'player') {
      currentSocket.send(JSON.stringify({
        action: "leaveGame",
        gameId: gameId,
        clientId: clientId
      }));
    }
    resetGame();
  }, [gameId, clientId, role, resetGame]);



  return {
    // Core state
    gameId,
    setGameId: setGameIdWithPersistence,
    role,
    setRole: setRoleWithPersistence,
    clientId,
    setClientId,
    
    // Player management
    players,
    setPlayers,
    addPlayer,
    removePlayer,
    localPlayerName,
    setLocalPlayerName,
    
    // UI and connection state
    status,
    setStatus,
    qrCodeData,
    setQrCodeData,
    isClientIdentified,
    setIsClientIdentified,
    
    // Player info state
    playerInfoStage,
    setPlayerInfoStage,
    joinTargetGameId,
    setJoinTargetGameId,
    playerNameInput,
    setPlayerNameInput,
    playerPhoneInput,
    setPlayerPhoneInput,
    inputGameId,
    setInputGameId,
    pendingGameType,
    setPendingGameType,
    
    // Authentication
    isAuthenticated,
    userType,
    loginAsGuest,
    token,

    // References
    announcedPlayerRef,

    // Methods
    resetGame,
    createLobbyAPI,
    getQrCodeAPI,
    
    // Core game management
    hostGame,
    handleHostLogin,
    initiateJoinGame,
    handlePlayerJoin,
    completePlayerJoin,
    startGame,
    announcePlayer,
    handlePlayerLeave,
  };
}; 