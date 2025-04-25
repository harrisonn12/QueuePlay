import { useEffect, useCallback } from 'react';
import './TriviaGame.css';

// Custom hooks
import { useGameWebSocket } from '../../../hooks/useGameWebSocket';
import { useGameState } from '../../../hooks/useGameState';
import { useWebSocketMessageHandler } from '../../../hooks/useWebSocketMessageHandler';
import { useTieBreakerAnimation } from '../../../hooks/useTieBreakerAnimation';

// View components
import GameLobby from './views/GameLobby';
import PlayerGameView from './views/PlayerGameView';
import HostGameView from './views/HostGameView';
import GameResults from './views/GameResults';

const TriviaGame = () => {
  // Game configuration
  const timePerQuestion = 5; // seconds per question
  
  // Use game state hook to manage all state
  const gameState = useGameState();
  
  // Destructure what we need from gameState
  const { 
    gameStatus, role, gameId, clientId, tieBreakerState,
    playerInfoStage, players, status, resetGame,
    setStatus, setTieBreakerState
  } = gameState;
  
  // Create websocket message handler with gameState
  const handleWebSocketMessage = useWebSocketMessageHandler(gameState);
  
  // Use WebSocket hook to manage connection
  const { status: webSocketStatus, ensureConnected } = useGameWebSocket(
    gameId, 
    clientId,
    role,
    handleWebSocketMessage
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
      tieBreakerAnimation.resetAnimation();
      setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null });
    }
  }, [ensureConnected, gameId, clientId, setStatus, setTieBreakerState]);
  
  // Use the tie breaker animation hook
  const tieBreakerAnimation = useTieBreakerAnimation(
    tieBreakerState.tiedPlayerIds,
    isTieBreaking,
    handleTieResolved
  );
  
  // --- Action Functions ---
  const hostGame = useCallback(() => {
    resetGame();
    setStatus("Connecting to server...");
    
    // Try to ensure connection before sending
    const currentSocket = ensureConnected(); 
    
    // Check if the socket exists but is not yet open
    if (currentSocket && currentSocket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket connecting, waiting for open state...");
      
      // Set up a one-time event listener for the socket's open event
      const openHandler = () => {
        console.log("WebSocket now open, sending initializeGame message");
        currentSocket.send(JSON.stringify({
          action: "initializeGame",
        }));
        // Remove the event listener once it's used
        currentSocket.removeEventListener('open', openHandler);
      };
      
      // Add the event listener
      currentSocket.addEventListener('open', openHandler);
      return;
    }
    
    // If socket already exists and is open
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      console.log("WebSocket already open, sending initializeGame message");
      currentSocket.send(JSON.stringify({
        action: "initializeGame",
      }));
    } else {
      console.error("Cannot host game: WebSocket not ready.");
      setStatus("Error: Cannot connect to server. Please try again.");
    }
  }, [resetGame, ensureConnected, setStatus]);
  
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
  
  // Handle player info submission for joining a game
  const handlePlayerInfoSubmit = useCallback((event) => {
    event.preventDefault();
    
    if (!gameState.playerNameInput.trim()) {
      setStatus("Error: Please enter a username.");
      return;
    }
    
    if (!gameState.playerPhoneInput.trim()) {
      setStatus("Error: Please enter a phone number.");
      return;
    }
    
    if (!/^\+?[0-9\s\-()]{7,}$/.test(gameState.playerPhoneInput.trim())) {
      setStatus("Error: Please enter a valid phone number.");
      return;
    }
    
    // Store info locally
    localStorage.setItem(`phoneNumber_${gameState.joinTargetGameId}`, gameState.playerPhoneInput);
    localStorage.setItem(`playerName_${gameState.joinTargetGameId}`, gameState.playerNameInput);
    
    gameState.setPlayerInfoStage('joining');
    setStatus(`Joining game ${gameState.joinTargetGameId}...`);
    
    const currentSocket = ensureConnected();
    if (currentSocket && gameState.joinTargetGameId) {
      currentSocket.send(JSON.stringify({
        action: "joinGame",
        gameId: gameState.joinTargetGameId,
        playerName: gameState.playerNameInput
      }));
    } else if (!currentSocket) {
      console.error("Cannot join game: WebSocket not ready.");
      setStatus("Error: Connection lost. Please try again.");
      gameState.setPlayerInfoStage('none');
    } else {
      console.error("Cannot join game: Target Game ID missing.");
      setStatus("Error: Game ID missing. Please try again.");
      gameState.setPlayerInfoStage('none');
    }
  }, [gameState, ensureConnected, setStatus]);
  
  // Start the game (host only)
  const startGame = useCallback(() => {
    const currentSocket = ensureConnected();
    if (currentSocket) {
      currentSocket.send(JSON.stringify({
        action: "startGame",
        gameId: gameId,
        clientId: clientId
      }));
    } else {
      console.error("Cannot start game: WebSocket not ready.");
    }
  }, [ensureConnected, gameId, clientId]);
  
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
  
  // Render the appropriate view based on current game state
  let content;
  
  if (gameStatus === 'loading' || playerInfoStage === 'joining') {
    content = <p>Loading...</p>;
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
        handlePlayerInfoSubmit={handlePlayerInfoSubmit}
        startGame={startGame}
        playerNameInput={gameState.playerNameInput}
        setPlayerNameInput={gameState.setPlayerNameInput}
        playerPhoneInput={gameState.playerPhoneInput}
        setPlayerPhoneInput={gameState.setPlayerPhoneInput}
        joinTargetGameId={gameState.joinTargetGameId}
        localPlayerName={gameState.localPlayerName}
        clientId={clientId}
        setPlayerInfoStage={gameState.setPlayerInfoStage}
        setJoinTargetGameId={gameState.setJoinTargetGameId}
        setStatus={setStatus}
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
