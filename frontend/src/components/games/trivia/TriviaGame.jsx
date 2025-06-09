import { useEffect, useCallback, useRef, useState } from 'react';
import './TriviaGame.css';

// Custom hooks
import { useGameWebSocket } from '../../../hooks/useGameWebSocket';
import { useGameState } from '../../../hooks/useGameState';
import { useWebSocketMessageHandler } from '../../../hooks/useWebSocketMessageHandler';
import { useTieBreakerAnimation } from '../../../hooks/useTieBreakerAnimation';
import { useAuth } from '../../../hooks/useAuth';

// API functions
import { joinGameWithAuth } from '../../../utils/api';

// View components
import FrontPage from './views/FrontPage';
import GameLobby from './views/GameLobby';
import PlayerGameView from './views/PlayerGameView';
import HostGameView from './views/HostGameView';
import GameResults from './views/GameResults';
import LoadingSpinner from './components/LoadingSpinner';

const TriviaGame = () => {
  // Game configuration
  const timePerQuestion = 10; // seconds per question
  
  // Authentication hook
  const { isAuthenticated, userType, getCurrentToken, login, loginAsGuest } = useAuth();
  
  // Use game state hook to manage all state
  const gameState = useGameState();
  
  // Destructure what we need from gameState
  const {
    gameStatus, role, gameId, clientId, tieBreakerState,
    playerInfoStage, players, status, resetGame,
    setStatus, setTieBreakerState, setGameId, setRole,
    setQrCodeData, setQuestions,
    createLobbyAPI, getQrCodeAPI, getQuestionsAPI,
    localPlayerName, setLocalPlayerName,
    isClientIdentified
  } = gameState;
  
  // Initialize message handler (no circular dependency anymore)
  const handleWebSocketMessage = useWebSocketMessageHandler(gameState);
  
  // Get current JWT token for WebSocket authentication
  const currentToken = getCurrentToken();
  
  // Initialize WebSocket connection management with JWT authentication
  const { status: webSocketStatus, ensureConnected } = useGameWebSocket(
    gameId, clientId, role, handleWebSocketMessage, currentToken
  );
  
  // Update local status based on hook status
  useEffect(() => {
    // Don't override specific statuses set by the handler
    if (status === '' || 
        status.startsWith('Connecting') || 
        status.startsWith('Connected') || 
        status.startsWith('Disconnected') || 
        status.startsWith('Error')) {
      setStatus(webSocketStatus);
    }
  }, [webSocketStatus, status, setStatus]);
  
  // Set up the tie-breaker animation handler
  const isTieBreaking = role === 'host' && tieBreakerState.stage === 'breaking';
  
  // Handler for when tie breaker animation completes
  const handleTieResolved = useCallback((winnerId) => {
    const currentSocket = ensureConnected();
    if (currentSocket && winnerId) {
      console.log(`Sending resolveTie message for winner: ${winnerId}`);
      currentSocket.send(JSON.stringify({
        action: "resolveTie",
        gameId: gameId,
        clientId: clientId,
        ultimateWinnerId: winnerId
      }));
    } else {
      console.error("Cannot send resolveTie message: WebSocket not ready or winnerId missing.");
      setStatus("Error: Connection lost. Cannot resolve tie.");
      // Reset state if sending fails
      // tieBreakerAnimation.resetAnimation(); // Let the hook manage its own reset
      setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null }); // Reset gameState
    }
  }, [ensureConnected, gameId, clientId, setStatus, setTieBreakerState]);
  
  // Use the tie breaker animation hook
  const tieBreakerAnimation = useTieBreakerAnimation(
    tieBreakerState.tiedPlayerIds,
    isTieBreaking,
    handleTieResolved
  );

  // Ref to track if announcePlayer has been sent for this session/identification
  const announcedPlayerRef = useRef(false);

  // Effect to announce player presence AFTER successful identification
  useEffect(() => {
    if (isClientIdentified && role === 'player' && !announcedPlayerRef.current) {
      console.log("[Announce Effect] Client identified as player. Announcing presence...");
      const socket = ensureConnected(); // Get the socket instance
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          action: "announcePlayer",
          gameId: gameId,
          clientId: clientId,
          playerName: localPlayerName || `Player ${clientId.substring(0,4)}`
        }));
        announcedPlayerRef.current = true; // Mark as announced for this identification cycle
      } else {
        console.error("[Announce Effect] Cannot announce player: WebSocket not ready or available.", { readyState: socket?.readyState });
        // Maybe try again later? Or set an error status?
      }
    }

    // Reset the ref if identification status becomes false (e.g., on disconnect/reset)
    if (!isClientIdentified) {
      announcedPlayerRef.current = false;
    }
  }, [isClientIdentified, role, gameId, clientId, localPlayerName, ensureConnected]);

  // --- Action Functions --- 
  // Handle host login from front page
  const handleHostLogin = useCallback(async (email, password) => {
    const result = await login(email, password);
    if (result && result.success) {
      setStatus("Welcome! You can now create games.");
    }
    return result;
  }, [login, setStatus]);

  // Handle player join from front page
  const handlePlayerJoin = useCallback((gameId) => {
    gameState.setInputGameId(gameId);
    gameState.setJoinTargetGameId(gameId);
    gameState.setPlayerInfoStage('enterInfo');
    setStatus("Please enter your details to join.");
  }, [gameState, setStatus]);

  const hostGame = useCallback(async () => {
    // Check authentication first - if not authenticated, show error
    if (!isAuthenticated || userType !== 'host') {
      setStatus("Authentication required. Please log in to host a game.");
      return;
    }

    resetGame();
    setStatus("Creating lobby...");
    
    try {
      const newGameId = await createLobbyAPI(clientId, "trivia");
      setGameId(newGameId);
      setRole('host');
      console.log(`Lobby created with ID: ${newGameId}. Role set to host. Client ID: ${clientId}`);

      // Optionally fetch QR code and questions now
      setStatus("Fetching lobby details...");
      try {
        const [qrData, questionsData] = await Promise.all([
          getQrCodeAPI(newGameId),
          getQuestionsAPI(newGameId)
        ]);
        setQrCodeData(qrData);
        setQuestions(questionsData);
        console.log("QR Code and Questions fetched successfully.");
      } catch (error) {
        console.error("Error fetching QR/Questions:", error);
        setStatus("Lobby created, but failed to fetch details. Connecting...");
      }

      // Now that gameId, clientId, and role are set, ensure connection.
      setStatus("Connecting to WebSocket...");
      ensureConnected();

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
    getQrCodeAPI, 
    getQuestionsAPI,
    setGameId, 
    setRole, 
    setQrCodeData, 
    setQuestions, 
    ensureConnected,
    clientId,
    createLobbyAPI
  ]);
  
  // Initiate joining a game - shows the join form
  const initiateJoinGame = useCallback(() => {
    if (!gameState.inputGameId) {
      setStatus("Error: Please enter a Game ID.");
      return;
    }
    gameState.setJoinTargetGameId(gameState.inputGameId);
    gameState.setPlayerInfoStage('enterInfo');
    setStatus("Please enter your details to join.");
  }, [gameState, setStatus]);

  // Complete player join process with authentication
  const completePlayerJoin = useCallback(async (gameId, playerName, phoneNumber = null) => {
    try {
      setStatus("Authenticating player...");
      
      // Step 1: Get guest token
      const authResult = await loginAsGuest(gameId, playerName, phoneNumber);
      if (!authResult.success) {
        setStatus(`Authentication failed: ${authResult.error}`);
        return;
      }

      // Step 2: Join the game via API
      setStatus("Joining game...");
      const token = getCurrentToken();
      const joinResult = await joinGameWithAuth(gameId, playerName, phoneNumber, token);
      console.log("Join game API result:", joinResult);

      // Step 3: Set game state
      setGameId(gameId);
      setRole('player');
      setLocalPlayerName(playerName);
      gameState.setPlayerInfoStage('joining');
      
      setStatus("Connecting to game...");
      
      // Step 4: Connect to WebSocket (will happen in effect below)
      
    } catch (error) {
      console.error("Failed to join game:", error);
      setStatus(`Error joining game: ${error.message}`);
      gameState.setPlayerInfoStage('enterInfo');
    }
  }, [loginAsGuest, getCurrentToken, setGameId, setRole, setLocalPlayerName, setStatus, gameState]);

  // Effect to connect WebSocket *after* authentication and state is set for joining
  useEffect(() => {
    // Only run this if the user is a player and has just submitted their info
    if (role === 'player' && playerInfoStage === 'joining' && isAuthenticated && userType === 'guest') {
      console.log("[Player Join Effect] Role and playerInfoStage match, ensuring connection...");
      ensureConnected();
    }
  }, [role, playerInfoStage, isAuthenticated, userType, ensureConnected]);

  // Start the game (host only)
  const startGame = useCallback(() => {
    // Ensure we have questions before starting
    if (!gameState.questions || gameState.questions.length === 0) {
      console.error("Cannot start game: Questions not loaded.");
      setStatus("Error: Questions failed to load. Cannot start.");
      return;
    }

    const currentSocket = ensureConnected();
    if (currentSocket) {
      console.log("Host sending startGame including questions and players...");
      currentSocket.send(JSON.stringify({
        action: "startGame",
        gameId: gameId,
        clientId: clientId, // Sender ID (host)
        questions: gameState.questions, // Include the questions
        players: gameState.players // Include the current player list
      }));
    } else {
      console.error("Cannot start game: WebSocket not ready.");
    }
  }, [ensureConnected, gameId, clientId, gameState.questions, gameState.players, setStatus]); // Add questions, players, setStatus to dependencies

  // Submit answer (player only)
  const submitAnswer = useCallback((answerIndex) => {
    const currentSocket = ensureConnected();
    if (currentSocket && role === 'player' && !gameState.hasAnswered) {
      currentSocket.send(JSON.stringify({
        action: "submitAnswer",
        gameId: gameId,
        clientId: clientId,
        answerIndex: answerIndex,
        questionIndex: gameState.currentQuestionIndex
      }));
      gameState.setHasAnswered(true);
      gameState.setSelectedAnswer(answerIndex);
    } else if (!currentSocket) {
      console.error("Cannot submit answer: WebSocket not ready.");
    } else if (role !== 'player') {
      console.warn("submitAnswer called by non-player role");
    } else if (gameState.hasAnswered) {
      console.warn("submitAnswer called but player has already answered.");
    }
  }, [ensureConnected, role, gameState, gameId, clientId]);
  
  // Handle timer completion (host only)
  const handleTimerComplete = useCallback(() => {
    const currentSocket = ensureConnected();
    if (role !== 'host' || !currentSocket) { 
      return { shouldRepeat: false };
    }
    
    const questionScores = gameState.calculateScores(
      gameState.currentQuestionIndex, 
      gameState.currentQuestionAnswers
    );
    gameState.setScores(questionScores);
    
    // Send question result
    const resultPayload = { 
      action: "questionResult", 
      gameId, 
      clientId, 
      questionIndex: gameState.currentQuestionIndex,
      scores: questionScores,
      players: players
    };
    currentSocket.send(JSON.stringify(resultPayload));
    
    const isLastQuestion = gameState.currentQuestionIndex >= gameState.questions.length - 1;
    if (isLastQuestion) {
      const finishPayload = { 
        action: "gameFinished", 
        gameId, 
        clientId, 
        finalScores: questionScores,
        players: players
      };
      currentSocket.send(JSON.stringify(finishPayload));
      gameState.setGameStatus('finished');
    } else {
      const nextIndex = gameState.currentQuestionIndex + 1;
      const nextQPayload = { 
        action: "nextQuestion", 
        gameId, 
        clientId, 
        questionIndex: nextIndex 
      };
      currentSocket.send(JSON.stringify(nextQPayload));
      gameState.advanceToNextQuestion();
    }
    
    // Reset tie-breaker state
    setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null }); 
    return { shouldRepeat: false };
  }, [
    ensureConnected, role, gameState, gameId, clientId, players, setTieBreakerState
  ]);
  


  // Show FrontPage when no active game or join flow is happening
  if (!gameId && playerInfoStage === 'none') {
    return (
      <div className="trivia-game-container">
        <FrontPage 
          onHostLogin={handleHostLogin}
          onHostGame={hostGame}
          onPlayerJoin={handlePlayerJoin}
          inputGameId={gameState.inputGameId}
          setInputGameId={gameState.setInputGameId}
          isAuthenticated={isAuthenticated}
          userType={userType}
        />
      </div>
    );
  }

  // Render the appropriate view based on current game state
  let content;
  
  if (gameStatus === 'loading' || playerInfoStage === 'joining') {
    content = <LoadingSpinner message={playerInfoStage === 'joining' ? 'Joining game...' : 'Loading game...'} />;
  } else if (gameStatus === 'waiting' || playerInfoStage === 'enterInfo') {
    content = (
      <GameLobby 
        gameId={gameId}
        role={role}
        players={players}
        qrCodeData={gameState.qrCodeData}
        inputGameId={gameState.inputGameId}
        setInputGameId={gameState.setInputGameId}
        playerInfoStage={playerInfoStage}
        hostGame={hostGame}
        initiateJoinGame={initiateJoinGame}
        completePlayerJoin={completePlayerJoin}
        startGame={startGame}
        setPlayerNameInput={gameState.setPlayerNameInput}
        playerPhoneInput={gameState.playerPhoneInput}
        setPlayerPhoneInput={gameState.setPlayerPhoneInput}
        joinTargetGameId={gameState.joinTargetGameId}
        localPlayerName={gameState.localPlayerName}
        clientId={clientId}
        setPlayerInfoStage={gameState.setPlayerInfoStage}
        setJoinTargetGameId={gameState.setJoinTargetGameId}
        setStatus={setStatus}
        setGameId={setGameId}
        setRole={setRole}
        setLocalPlayerName={setLocalPlayerName}
        isAuthenticated={isAuthenticated}
        userType={userType}
      />
    );
  } else if (gameStatus === 'playing') {
    content = role === 'host' 
      ? (
        <HostGameView 
          questions={gameState.questions}
          currentQuestionIndex={gameState.currentQuestionIndex}
          timerKey={gameState.timerKey}
          timePerQuestion={timePerQuestion}
          handleTimerComplete={handleTimerComplete}
          scores={gameState.scores}
          players={players}
        />
      ) 
      : (
        <PlayerGameView 
          questions={gameState.questions}
          currentQuestionIndex={gameState.currentQuestionIndex}
          timerKey={gameState.timerKey}
          timePerQuestion={timePerQuestion}
          submitAnswer={submitAnswer}
          hasAnswered={gameState.hasAnswered}
          selectedAnswer={gameState.selectedAnswer}
          localPlayerName={gameState.localPlayerName}
          clientId={clientId}
        />
      );
  } else if (gameStatus === 'finished') {
    content = (
      <GameResults 
        scores={gameState.scores}
        players={players}
        tieBreakerState={tieBreakerState}
        isAnimatingTie={tieBreakerAnimation.isAnimating}
        highlightedPlayerIndex={tieBreakerAnimation.highlightedIndex}
        role={role}
        clientId={clientId}
        localPlayerName={gameState.localPlayerName}
        resetGame={resetGame}
        hostGame={hostGame}
      />
    );
  }
  
  // Main component render
  return (
    <div className="trivia-game-container">
      {/* Status display could be a small component at the top */}
      {status && <div className="status-message">{status}</div>}
      {content}
    </div>
  );
};

export default TriviaGame;
