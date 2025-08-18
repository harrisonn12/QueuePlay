import { useCallback, useEffect, useRef, useState } from 'react';

// Core hooks (infrastructure provided)
import { useGameCore } from '../../../hooks/core/useGameCore';
import { useGameWebSocket } from '../../../hooks/core/useGameWebSocket';
import { useGameMessageHandler } from '../../../hooks/core/useGameMessageHandler';
import { getApiBaseUrl } from '../../../utils/api/core';

// Shared components (provided by framework)
import FrontPage from '../../core/FrontPage';
import GameLobby from '../../core/GameLobby';
import GameResults from '../../core/GameResults';
import LoadingSpinner from '../../core/LoadingSpinner';
import GameTypeSelector from '../../core/GameTypeSelector';
import MarqueeComponent from '../../core/MarqueeComponent';

/**
 * BaseGame - Single Persistent Authentication & Game Infrastructure Layer
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. SINGLE AUTHENTICATION: Handles all auth flows once, no double login
 * 2. PERSISTENT COMPONENT: Never remounts, maintains state throughout session
 * 3. DYNAMIC GAME RENDERING: Renders specific games after auth is complete
 * 4. SHARED CONTEXT: Passes authenticated context to game components
 * 5. NO GAME REMOUNTING: Game type changes don't cause component switching
 */
const BaseGame = ({
  currentGameType = null,
  onGameTypeChange,
  availableGames = {},
  gameRegistry = null,
  containerClassName = 'game-container'
}) => {
  // ===== STATE =====
  const [authCompleted, setAuthCompleted] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState(currentGameType);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [showGameTypeSelector, setShowGameTypeSelector] = useState(false);
  const gameMessageHandlerRef = useRef(null);
  const [gameData, setGameData] = useState({}); // Store game-specific data from startGame messages

  // ===== CORE INFRASTRUCTURE - PERSISTENT =====
  const gameCore = useGameCore(selectedGameType, null);
  
  // ===== GAME STATE MANAGEMENT =====
  const [couponData, setCouponData] = useState(null);
  
  // Create a stable setGamePhase function that always uses the latest state
  const stableSetGamePhase = useCallback((newPhase) => {
    console.log(`[BaseGame] stableSetGamePhase called: ${newPhase}`);
    setGamePhase(newPhase);
  }, []);
  
  const combinedState = {
    ...gameCore,
    gamePhase,
    setGamePhase: stableSetGamePhase, // Use the stable setter
    gameData,
    setGameData,
    // Add any other BaseGame-specific state here
  };
  
  // ===== MESSAGE HANDLING =====
  const handleCoreMessage = useGameMessageHandler(combinedState);
  
  // Create a stable registerMessageHandler function
  const registerMessageHandler = useCallback((handler) => {
    console.log(`[BaseGame] ${handler ? 'Registering' : 'Unregistering'} game message handler`);
    gameMessageHandlerRef.current = handler;
  }, []);
  
  const handleGameMessage = useCallback((data) => {
    console.log(`[BaseGame] Processing game message: ${data.action}`);
    console.log(`[BaseGame] gameMessageHandler available: ${!!gameMessageHandlerRef.current}`);
    
    // Handle coupon updates for marquee synchronization
    if (data.action === 'couponUpdate') {
      console.log(`[BaseGame] Received coupon update: ${data.coupon}`);
      setCouponData(data.coupon);
      return true;
    }
    
    // Use registered game message handler if available
    if (gameMessageHandlerRef.current && typeof gameMessageHandlerRef.current === 'function') {
      console.log(`[BaseGame] Calling game message handler for: ${data.action}`);
      const result = gameMessageHandlerRef.current(data);
      console.log(`[BaseGame] Game message handler returned: ${result}`);
      return result;
    }
    
    console.log(`[BaseGame] No game message handler available, returning false`);
    // BaseGame doesn't handle game-specific messages by default
    return false;
  }, []);
  
  const handleWebSocketMessage = useCallback((data) => {
    console.log(`[${selectedGameType || 'BaseGame'}] Processing WebSocket message: ${data.action}`);
    
    const handledByCore = handleCoreMessage(data);
    if (!handledByCore) {
      handleGameMessage(data);
    }
  }, [handleCoreMessage, handleGameMessage, selectedGameType]);
  
  // ===== WEBSOCKET CONNECTION =====
  const { ensureConnected } = useGameWebSocket(
    gameCore.gameId, gameCore.clientId, gameCore.role, 
    handleWebSocketMessage, gameCore.token
  );

  const sendGameMessage = useCallback((action, data) => {
    const socket = ensureConnected();
    if (socket) {
      socket.send(JSON.stringify({
        action,
        gameId: gameCore.gameId,
        clientId: gameCore.clientId,
        ...data
      }));
    }
  }, [ensureConnected, gameCore.gameId, gameCore.clientId]);

  // ===== REFS =====
  const announcedPlayerRef = useRef(false);

  // ===== STATE =====
  const [isStartingGame, setIsStartingGame] = useState(false);

  // ===== CALLBACKS =====
  const handleStartGame = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isStartingGame) {
      console.log(`[BaseGame] Game start already in progress, ignoring duplicate call`);
      return;
    }

    setIsStartingGame(true);
    console.log(`[${selectedGameType || 'BaseGame'}] Starting game...`);
    
    try {
      let gameData = {
        gameType: selectedGameType,
        players: gameCore.players
      };
      
      // Load game-specific data before starting
      if (selectedGameType === 'trivia') {
        try {
          console.log(`[BaseGame] Loading trivia questions before starting game...`);
          gameCore.setStatus('Loading questions...');
          
          // Use the same token approach as useGameCore
          const token = localStorage.getItem('jwt_token');
          console.log(`[BaseGame] Direct token check:`, token ? `Token exists (${token.substring(0, 20)}...)` : 'No token found');
          
          if (!token) {
            throw new Error('No authentication token available - please login again');
          }
          
          // Make direct API call similar to how createLobby works
          console.log(`[BaseGame] Making questions API call with gameId: ${gameCore.gameId}`);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const apiBaseUrl = getApiBaseUrl();
          console.log(`[BaseGame] Using API base URL for questions: ${apiBaseUrl}`);
          const response = await fetch(`${apiBaseUrl}/getQuestions?gameId=${gameCore.gameId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[BaseGame] Questions API error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Questions API failed: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          gameData.questions = data.questions;
          console.log(`[BaseGame] Successfully loaded ${data.questions.length} trivia questions`);
        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Questions API request timed out after 10 seconds');
          }
          throw error;
        }
      }
      
      // Send start game message with game-specific data
      sendGameMessage('startGame', gameData);
      
      // Update local game phase
      setGamePhase('playing');
      gameCore.setStatus('Game started!');
      
    } catch (error) {
      console.error('[BaseGame] Error starting game:', error);
      gameCore.setStatus(`Error: Failed to start game. ${error.message}`);
    } finally {
      setIsStartingGame(false);
    }
  }, [selectedGameType, sendGameMessage, gameCore, isStartingGame]);

  const handleGameTypeSelection = useCallback((gameType) => {
    console.log(`🎮 [BaseGame] Game type selected: ${gameType}`);
    setShowGameTypeSelector(false);
    setSelectedGameType(gameType);
    
    // Create lobby with selected game type
    gameCore.hostGame(gameType);
    
    // Notify external state management
    if (onGameTypeChange) {
      onGameTypeChange(gameType);
    }
  }, [gameCore, onGameTypeChange]);

  // ===== EFFECTS =====
  
  // Track gamePhase changes
  useEffect(() => {
    console.log(`[BaseGame] gamePhase changed to: ${gamePhase}`);
  }, [gamePhase]);
  
  // Track authentication completion
  useEffect(() => {
    if (gameCore.isAuthenticated && gameCore.userType) {
      setAuthCompleted(true);
      console.log(`[BaseGame] Authentication completed for ${gameCore.userType}`);
    }
  }, [gameCore.isAuthenticated, gameCore.userType]);

  // Sync external game type changes
  useEffect(() => {
    if (currentGameType !== selectedGameType) {
      console.log(`[BaseGame] Syncing external currentGameType: ${currentGameType} → selectedGameType: ${selectedGameType}`);
      setSelectedGameType(currentGameType);
    }
  }, [currentGameType, selectedGameType]);

  // Sync game type from gameCore when it's detected (for players joining games)
  useEffect(() => {
    // Check if gameCore has a pending game type that we don't know about
    if (gameCore.pendingGameType && gameCore.pendingGameType !== selectedGameType) {
      console.log(`[BaseGame] Syncing gameCore.pendingGameType: ${gameCore.pendingGameType} → selectedGameType: ${selectedGameType}`);
      setSelectedGameType(gameCore.pendingGameType);
      
      // Also notify external state management
      if (onGameTypeChange) {
        onGameTypeChange(gameCore.pendingGameType);
      }
    }
  }, [gameCore.pendingGameType, selectedGameType, onGameTypeChange]);

  // WebSocket connection management
  useEffect(() => {
    if (gameCore.gameId && gameCore.role && gameCore.clientId) {
      if (gameCore.role === 'host' || (gameCore.role === 'player' && (gameCore.playerInfoStage === 'joining' || gameCore.playerInfoStage === 'joined'))) {
        console.log(`[BaseGame] Triggering WebSocket connection for ${gameCore.role}`);
        const socket = ensureConnected();
        if (!socket) {
          console.log(`[BaseGame] WebSocket connection not ready, will retry`);
        }
      }
    }
  }, [gameCore.gameId, gameCore.role, gameCore.clientId, gameCore.playerInfoStage, ensureConnected]);

  // Player announcement
  useEffect(() => {
    if (gameCore.isClientIdentified && gameCore.role === 'player' && !announcedPlayerRef.current) {
      console.log(`[BaseGame] Announcing player presence`);
      const socket = ensureConnected();
      if (socket && socket.readyState === WebSocket.OPEN) {
        const announceMessage = {
          action: "announcePlayer",
          gameId: gameCore.gameId,
          clientId: gameCore.clientId,
          playerName: gameCore.localPlayerName || `Player ${gameCore.clientId.substring(0,4)}`
        };
        socket.send(JSON.stringify(announceMessage));
        announcedPlayerRef.current = true;
      }
    }

    if (!gameCore.isClientIdentified) {
      announcedPlayerRef.current = false;
    }
  }, [gameCore.isClientIdentified, gameCore.role, gameCore.gameId, gameCore.clientId, gameCore.localPlayerName, ensureConnected]);

  // ===== RENDER LOGIC =====

  // Debug logging to understand render path
  console.log(`[BaseGame] Render Debug FULL:`, {
    authCompleted,
    selectedGameType,
    pendingGameType: gameCore.pendingGameType,
    hasAvailableGame: selectedGameType && availableGames[selectedGameType],
    gameId: gameCore.gameId,
    role: gameCore.role,
    userType: gameCore.userType,
    playerInfoStage: gameCore.playerInfoStage,
    gamePhase: gamePhase, // Use BaseGame's gamePhase, not gameState.gamePhase
    status: gameCore.status,
    inputGameId: gameCore.inputGameId,
    joinTargetGameId: gameCore.joinTargetGameId,
    isAuthenticated: gameCore.isAuthenticated,
    // Check the specific condition parts
    frontPageCondition1: !authCompleted,
    frontPageCondition2: !gameCore.gameId && (gameCore.playerInfoStage === 'none' || gameCore.playerInfoStage === 'enterInfo'),
    frontPageConditionFull: !authCompleted || (!gameCore.gameId && (gameCore.playerInfoStage === 'none' || gameCore.playerInfoStage === 'enterInfo'))
  });

  // 1. GAME TYPE SELECTOR (authenticated host, no game created yet)
  if (authCompleted && showGameTypeSelector && gameCore.userType === 'host' && !gameCore.gameId) {
    console.log(`[BaseGame] Rendering: GameTypeSelector`);
    return (
      <div className={containerClassName}>
        <GameTypeSelector 
          onGameTypeSelect={handleGameTypeSelection}
          onBack={() => setShowGameTypeSelector(false)}
        />
      </div>
    );
  }

  // 2. FRONT PAGE (no authentication yet OR player needs to input game ID)
  // Show FrontPage ONLY for:
  // - Not authenticated yet AND player hasn't started join process (playerInfoStage === 'none')
  // EXCLUDE 'enterInfo' so player can progress to GameLobby to enter phone number
  if (!gameCore.gameId && gameCore.playerInfoStage === 'none') {
    console.log(`[BaseGame] Rendering: FrontPage - Reason:`, {
      notAuthenticated: !authCompleted,
      needsGameIdInput: !gameCore.gameId && gameCore.playerInfoStage === 'none',
      playerInfoStage: gameCore.playerInfoStage,
      gameId: gameCore.gameId
    });
    return (
      <div className={containerClassName}>
        <FrontPage 
          onHostLogin={gameCore.handleHostLogin}
          onHostGame={() => {
            if (gameCore.userType === 'host') {
              setShowGameTypeSelector(true);
            } else {
              gameCore.hostGame();
            }
          }}
          onPlayerJoin={gameCore.handlePlayerJoin}
          inputGameId={gameCore.inputGameId}
          setInputGameId={gameCore.setInputGameId}
          isAuthenticated={gameCore.isAuthenticated}
          userType={gameCore.userType}
        />
      </div>
    );
  }

  // 3. LOADING STATES (lobby creation, fetching details, joining)
  if (gameCore.status === 'Creating lobby...' || 
      gameCore.status === 'Fetching lobby details...' ||
      gameCore.playerInfoStage === 'joining') {
    console.log(`[BaseGame] Rendering: LoadingSpinner - ${gameCore.status || 'Processing...'}`);
    return (
      <div className={containerClassName}>
        <LoadingSpinner message={gameCore.status || 'Processing...'} />
      </div>
    );
  }

  // 4. GAME LOBBY (game created, waiting for players/start OR player entering details)
  // This should show the QR code screen and lobby before game starts
  // Also handles player entering details (playerInfoStage === 'enterInfo')
  // IMPORTANT: Don't render lobby if game is already playing or finished
  // Check for game-active phases to avoid showing lobby during gameplay
  // Use game registry for modular phase detection if available
  const isGameActivePhase = gameRegistry 
    ? gameRegistry.isActivePhase(gamePhase)
    : (gamePhase === 'playing' || 
       // Fallback: hardcoded phases for backward compatibility
       ['category-reveal', 'input', 'scoring', 'results', 'questionDisplay', 'answerTime'].includes(gamePhase));
    
  if (!isGameActivePhase && gamePhase !== 'finished' && 
      ((gameCore.gameId && (gamePhase === 'waiting' || gameCore.playerInfoStage === 'enterInfo' || gameCore.playerInfoStage === 'joined')) ||
       (gameCore.playerInfoStage === 'enterInfo'))) {
    console.log(`[BaseGame] Rendering: GameLobby - ${gameCore.gameId ? 'With gameId' : 'Player entering details'}`);
    return (
      <div className={containerClassName}>
        {gameCore.role === 'host' && <MarqueeComponent gameId={gameCore.gameId} role={gameCore.role} sendGameMessage={sendGameMessage} couponData={couponData} />}
        <GameLobby 
          gameId={gameCore.gameId}
          role={gameCore.role}
          players={gameCore.players}
          qrCodeData={gameCore.qrCodeData}
          inputGameId={gameCore.inputGameId}
          setInputGameId={gameCore.setInputGameId}
          playerInfoStage={gameCore.playerInfoStage}
          hostGame={gameCore.hostGame}
          initiateJoinGame={gameCore.initiateJoinGame}
          completePlayerJoin={gameCore.completePlayerJoin}
          startGame={handleStartGame}
          isStartingGame={isStartingGame}
          setPlayerNameInput={gameCore.setPlayerNameInput}
          playerPhoneInput={gameCore.playerPhoneInput}
          setPlayerPhoneInput={gameCore.setPlayerPhoneInput}
          joinTargetGameId={gameCore.joinTargetGameId}
          localPlayerName={gameCore.localPlayerName}
          clientId={gameCore.clientId}
          setPlayerInfoStage={gameCore.setPlayerInfoStage}
          setJoinTargetGameId={gameCore.setJoinTargetGameId}
          setStatus={gameCore.setStatus}
          setGameId={gameCore.setGameId}
          setRole={gameCore.setRole}
          setLocalPlayerName={gameCore.setLocalPlayerName}
          isAuthenticated={gameCore.isAuthenticated}
          userType={gameCore.userType}
        />
      </div>
    );
  }

  // 5. GAME FINISHED (results screen)
  console.log(`[BaseGame] Checking finished condition: authCompleted=${authCompleted}, selectedGameType=${selectedGameType}, gameId=${!!gameCore.gameId}, gamePhase=${gamePhase}`);
  if (authCompleted && selectedGameType && gameCore.gameId && gamePhase === 'finished') {
    console.log(`[BaseGame] Rendering: Game Results - ${selectedGameType} finished`);
    console.log(`[BaseGame] Final scores for results:`, gameData.finalScores);
    return (
      <div className={containerClassName}>
        <GameResults 
          scores={gameData.finalScores || {}}
          players={gameCore.players}
          role={gameCore.role}
          clientId={gameCore.clientId}
          localPlayerName={gameCore.localPlayerName}
          resetGame={gameCore.resetGame}
          hostGame={gameCore.hostGame}
        />
      </div>
    );
  }

  // 6. SPECIFIC GAME RENDERING (after game has actually started)
  // Render specific game component when game phase is 'playing' or any game-specific phase
  // Game-specific phases include: category-reveal, input, scoring, results (for CategoryGame)
  // and questionDisplay, answerTime, results (for TriviaGame)
  const shouldRenderSpecificGame = authCompleted && selectedGameType && availableGames[selectedGameType] && gameCore.gameId && isGameActivePhase;
  
  console.log(`[BaseGame] Specific game render check:`, {
    authCompleted,
    selectedGameType,
    hasAvailableGame: availableGames[selectedGameType],
    gameId: gameCore.gameId,
    gamePhase,
    isGameActivePhase,
    shouldRender: shouldRenderSpecificGame
  });
  
  if (shouldRenderSpecificGame) {
    const GameComponent = availableGames[selectedGameType];
    console.log(`[BaseGame] Rendering: Specific game - ${selectedGameType}`);
    console.log(`[BaseGame] Passing gameData to ${selectedGameType}:`, gameData);
    
    return (
      <div className={containerClassName}>
        {gameCore.role === 'host' && <MarqueeComponent gameId={gameCore.gameId} role={gameCore.role} sendGameMessage={sendGameMessage} couponData={couponData} />}
        <GameComponent 
          gameCore={combinedState} // Pass combinedState which includes stableSetGamePhase
          gameData={gameData}
          sendGameMessage={sendGameMessage}
          ensureConnected={ensureConnected}
          registerMessageHandler={registerMessageHandler}
          skipAuth={true} // CRITICAL: Skip auth in game component
        />
      </div>
    );
  }

  // 7. FALLBACK
  console.log(`[BaseGame] Rendering: FALLBACK - This should not happen often`);
  console.log(`[BaseGame] FALLBACK DEBUG: Conditions that failed:`, {
    condition1_gameTypeSelector: authCompleted && showGameTypeSelector && gameCore.userType === 'host' && !gameCore.gameId,
    condition2_frontPage: !authCompleted || (!gameCore.gameId && (gameCore.playerInfoStage === 'none' || gameCore.playerInfoStage === 'enterInfo')),
    condition3_loading: gameCore.status === 'Creating lobby...' || gameCore.status === 'Fetching lobby details...' || gameCore.playerInfoStage === 'joining',
    condition4_gameLobby: gameCore.gameId && (gamePhase === 'waiting' || gameCore.playerInfoStage === 'enterInfo' || gameCore.playerInfoStage === 'joined'),
    condition5_specificGame: authCompleted && selectedGameType && availableGames[selectedGameType] && gameCore.gameId && isGameActivePhase
  });
  return (
    <div className={containerClassName}>
      <LoadingSpinner message="Initializing game..." />
    </div>
  );
};

export default BaseGame; 