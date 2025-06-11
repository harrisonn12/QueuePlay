import { useEffect, useCallback, useRef, useState } from 'react';
import './TriviaGame.css';

// Custom hooks
import { useGameWebSocket } from '../../../hooks/core/useGameWebSocket';
import { useGameCore } from '../../../hooks/core/useGameCore';
import { useGameMessageHandler } from '../../../hooks/core/useGameMessageHandler';
import { useWebSocketMessageHandler } from '../../../hooks/games/trivia/useTriviaWebSocketMessageHandler';
import { useTieBreakerAnimation } from '../../../hooks/games/trivia/useTieBreakerAnimation';

// API functions
import { joinGameWithAuth } from '../../../utils/api';
import { getStoredToken } from '../../../utils/api/auth';
import { getQuestions } from '../../../utils/api/trivia';

// View components
import FrontPage from '../../core/FrontPage';
import GameLobby from '../../core/GameLobby.jsx';
import TriviaPlayerView from './views/TriviaPlayerView';
import TriviaHostView from './views/TriviaHostView';
import GameResults from '../../core/GameResults.jsx';
import LoadingSpinner from '../../core/LoadingSpinner';

const TriviaGame = () => {
  // Game configuration
  const timePerQuestion = 10; // seconds per question
  
  // Core game state hook (game-agnostic)
  const gameCore = useGameCore('trivia');
  
  // Destructure core state
  const {
    gameId, role, clientId, players, status, qrCodeData,
    playerInfoStage, localPlayerName, isClientIdentified,
    setStatus, setGameId, setRole, setLocalPlayerName,
    inputGameId, setInputGameId, joinTargetGameId, setJoinTargetGameId,
    playerNameInput, setPlayerNameInput, playerPhoneInput, setPlayerPhoneInput,
    setPlayerInfoStage, resetGame, addPlayer, removePlayer,
         isAuthenticated, userType, handleHostLogin, 
     hostGame, initiateJoinGame, handlePlayerJoin, completePlayerJoin
  } = gameCore;

  // Trivia-specific state (questions, scores, game status)
  const [gameStatus, setGameStatus] = useState("waiting");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [scores, setScores] = useState({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState({});
  const [tieBreakerState, setTieBreakerState] = useState({
    stage: "none",
    tiedPlayerIds: [],
    ultimateWinnerId: null,
  });

  // Calculate scores based on answers (trivia-specific logic)
  const calculateScores = useCallback(
    (questionIndex, receivedAnswers) => {
      if (questionIndex < 0 || questionIndex >= questions.length) {
        console.error(`Invalid questionIndex ${questionIndex} for score calculation.`);
        return {};
      }

      const currentQuestion = questions[questionIndex];
      const correctAnswerIndex = currentQuestion.answerIndex;

      // Calculate new points for this round
      const roundScores = {};
      for (const [playerId, submittedAnswerIndex] of Object.entries(receivedAnswers)) {
        if (submittedAnswerIndex === correctAnswerIndex) {
          roundScores[playerId] = (roundScores[playerId] || 0) + 1;
        } else {
          roundScores[playerId] = roundScores[playerId] || 0;
        }
      }

      // Merge with existing scores
      const updatedScores = { ...scores };

      // Add all players to scores EXCEPT the host
      players.forEach((player) => {
        if (player.clientId === clientId && role === "host") {
          return; // Skip host
        }
        if (updatedScores[player.clientId] === undefined) {
          updatedScores[player.clientId] = 0;
        }
      });

      // Then add points for correct answers
      for (const [playerId, points] of Object.entries(roundScores)) {
        if (playerId === clientId && role === "host") {
          continue;
        }
        updatedScores[playerId] = (updatedScores[playerId] || 0) + points;
      }

      console.log(`Scores calculated for Q${questionIndex}:`, updatedScores);
      return updatedScores;
    },
    [questions, scores, players, clientId, role],
  );

  // Advance to next question
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setCurrentQuestionAnswers({});
    setTimerKey((prev) => prev + 1);
  }, []);

  // Check if there's a tie among top scorers
  const checkForTie = useCallback((finalScores) => {
    if (!finalScores || Object.keys(finalScores).length === 0) {
      console.log("No scores or empty scores, skipping tie check.");
      return false;
    }

    const sortedScores = Object.entries(finalScores).sort(
      ([, scoreA], [, scoreB]) => scoreB - scoreA,
    );

    const topScore = sortedScores[0][1];
    const tiedIds = sortedScores
      .filter(([, score]) => score === topScore)
      .map(([id]) => id);

    if (tiedIds.length > 1) {
      console.log("Tie detected! Tied IDs:", tiedIds);
      setTieBreakerState({
        stage: "breaking",
        tiedPlayerIds: tiedIds,
        ultimateWinnerId: null,
      });
      return true;
    }

    return false;
  }, []);

  // Combine core and trivia state for message handlers
  const combinedGameState = {
    ...gameCore,
    gameStatus, setGameStatus, questions, setQuestions,
    currentQuestionIndex, setCurrentQuestionIndex, timerKey, setTimerKey,
    scores, setScores, hasAnswered, setHasAnswered,
    selectedAnswer, setSelectedAnswer, currentQuestionAnswers, setCurrentQuestionAnswers,
    tieBreakerState, setTieBreakerState, checkForTie
  };

  // Core message handler (handles generic messages)
  const handleCoreMessage = useGameMessageHandler(combinedGameState);
  
  // Trivia-specific message handler  
  const handleTriviaMessage = useWebSocketMessageHandler(combinedGameState);
  
  // Combined message handler (try core first, then trivia-specific)
  const handleWebSocketMessage = useCallback((data) => {
    const handledByCore = handleCoreMessage(data);
    if (!handledByCore) {
      handleTriviaMessage(data);
    }
  }, [handleCoreMessage, handleTriviaMessage]);
  
  // Initialize WebSocket connection management with JWT authentication
  // Let the hook get the token dynamically when needed
  const { status: webSocketStatus, ensureConnected } = useGameWebSocket(
    gameId, clientId, role, handleWebSocketMessage, null
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

  // Effect to ensure WebSocket connection when player joins or host creates game
  useEffect(() => {
    // For hosts: trigger connection after game is created and we have gameId
    // For players: trigger connection after joining (when playerInfoStage is 'joining' or 'joined')
    if (gameId && role && clientId) {
      if (role === 'host' || (role === 'player' && (playerInfoStage === 'joining' || playerInfoStage === 'joined'))) {
        console.log("[Connection Effect] Triggering WebSocket connection for", role);
        const socket = ensureConnected();
        if (!socket) {
          console.log("[Connection Effect] WebSocket connection not ready yet, will retry automatically");
        }
      }
    }
  }, [gameId, role, clientId, playerInfoStage, ensureConnected]);

  // Effect to announce player presence AFTER successful identification
  useEffect(() => {
    if (isClientIdentified && role === 'player' && !announcedPlayerRef.current) {
      console.log("[Announce Effect] Client identified as player. Announcing presence...");
      console.log("[Announce Effect] Current clientId:", clientId);
      console.log("[Announce Effect] Current playerName:", localPlayerName);
      const socket = ensureConnected(); // Get the socket instance
      if (socket && socket.readyState === WebSocket.OPEN) {
        const announceMessage = {
          action: "announcePlayer",
          gameId: gameId,
          clientId: clientId,
          playerName: localPlayerName || `Player ${clientId.substring(0,4)}`
        };
        console.log("[Announce Effect] Sending announcePlayer message:", announceMessage);
        socket.send(JSON.stringify(announceMessage));
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

  // Load questions for the host
  const loadQuestions = useCallback(async () => {
    if (role !== 'host' || !gameId) return;
    
    try {
      setStatus('Loading questions...');
      const token = getStoredToken();
      const questionsData = await getQuestions(gameId, token);
      console.log('Questions loaded:', questionsData);
      setQuestions(questionsData);
      setStatus('Questions loaded successfully');
    } catch (error) {
      console.error('Failed to load questions:', error);
      setStatus('Failed to load questions');
    }
  }, [role, gameId, setStatus]);

  // Effect to load questions when host is identified
  useEffect(() => {
    if (isClientIdentified && role === 'host' && questions.length === 0) {
      console.log('[Load Questions Effect] Host identified, loading questions...');
      loadQuestions();
    }
  }, [isClientIdentified, role, questions.length, loadQuestions]);

  // --- Action Functions ---

      // Start the game (host only)
    const startGame = useCallback(() => {
      // Ensure we have questions before starting
      if (!questions || questions.length === 0) {
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
          questions: questions, // Include the questions
          players: players // Include the current player list
        }));
      } else {
        console.error("Cannot start game: WebSocket not ready.");
      }
    }, [ensureConnected, gameId, clientId, questions, players, setStatus]); // Add questions, players, setStatus to dependencies

  // Submit answer (player only)
      const submitAnswer = useCallback((answerIndex) => {
      const currentSocket = ensureConnected();
      if (currentSocket && role === 'player' && !hasAnswered) {
        currentSocket.send(JSON.stringify({
          action: "submitAnswer",
          gameId: gameId,
          clientId: clientId,
          answerIndex: answerIndex,
          questionIndex: currentQuestionIndex
        }));
        setHasAnswered(true);
        setSelectedAnswer(answerIndex);
      } else if (!currentSocket) {
        console.error("Cannot submit answer: WebSocket not ready.");
      } else if (role !== 'player') {
        console.warn("submitAnswer called by non-player role");
      } else if (hasAnswered) {
        console.warn("submitAnswer called but player has already answered.");
      }
    }, [ensureConnected, role, hasAnswered, gameId, clientId, currentQuestionIndex]);
  
  // Handle timer completion (host only)
  const handleTimerComplete = useCallback(() => {
    const currentSocket = ensureConnected();
    if (role !== 'host' || !currentSocket) { 
      return { shouldRepeat: false };
    }
    
          const questionScores = calculateScores(
        currentQuestionIndex, 
        currentQuestionAnswers
      );
      setScores(questionScores);
    
    // Send question result
    const resultPayload = { 
      action: "questionResult", 
      gameId, 
      clientId, 
              questionIndex: currentQuestionIndex,
      scores: questionScores,
      players: players
    };
    currentSocket.send(JSON.stringify(resultPayload));
    
          const isLastQuestion = currentQuestionIndex >= questions.length - 1;
    if (isLastQuestion) {
      const finishPayload = { 
        action: "gameFinished", 
        gameId, 
        clientId, 
        finalScores: questionScores,
        players: players
      };
      currentSocket.send(JSON.stringify(finishPayload));
              setGameStatus('finished');
      } else {
        const nextIndex = currentQuestionIndex + 1;
      const nextQPayload = { 
        action: "nextQuestion", 
        gameId, 
        clientId, 
        questionIndex: nextIndex 
      };
      currentSocket.send(JSON.stringify(nextQPayload));
              advanceToNextQuestion();
    }
    
    // Reset tie-breaker state
    setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null }); 
    return { shouldRepeat: false };
      }, [
      ensureConnected, role, calculateScores, currentQuestionIndex, currentQuestionAnswers, 
      setScores, gameId, clientId, players, setTieBreakerState, questions, setGameStatus, advanceToNextQuestion
    ]);
  


  // Show FrontPage when no active game or join flow is happening
  if (!gameId && playerInfoStage === 'none') {
    return (
      <div className="trivia-game-container">
        <FrontPage 
          onHostLogin={handleHostLogin}
          onHostGame={hostGame}
          onPlayerJoin={handlePlayerJoin}
                      inputGameId={inputGameId}
            setInputGameId={setInputGameId}
          isAuthenticated={isAuthenticated}
          userType={userType}
        />
      </div>
    );
  }

  // Render the appropriate view based on current game state
  let content;
  
  if (gameStatus === 'loading') {
    content = <LoadingSpinner message='Loading game...' />;
  } else if (playerInfoStage === 'joining') {
    content = <LoadingSpinner message='Joining game...' />;
  } else if (gameStatus === 'waiting' || playerInfoStage === 'enterInfo' || playerInfoStage === 'joined') {
    content = (
      <GameLobby 
        gameId={gameId}
        role={role}
        players={players}
        qrCodeData={qrCodeData}
        inputGameId={inputGameId}
        setInputGameId={setInputGameId}
        playerInfoStage={playerInfoStage}
        hostGame={hostGame}
        initiateJoinGame={initiateJoinGame}
        completePlayerJoin={completePlayerJoin}
        startGame={startGame}
        setPlayerNameInput={setPlayerNameInput}
        playerPhoneInput={playerPhoneInput}
        setPlayerPhoneInput={setPlayerPhoneInput}
        joinTargetGameId={joinTargetGameId}
        localPlayerName={localPlayerName}
        clientId={clientId}
        setPlayerInfoStage={setPlayerInfoStage}
        setJoinTargetGameId={setJoinTargetGameId}
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
        <TriviaHostView 
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          timerKey={timerKey}
          timePerQuestion={timePerQuestion}
          handleTimerComplete={handleTimerComplete}
          scores={scores}
          players={players}
        />
      ) 
      : (
        <TriviaPlayerView 
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          timerKey={timerKey}
          timePerQuestion={timePerQuestion}
          submitAnswer={submitAnswer}
          hasAnswered={hasAnswered}
          selectedAnswer={selectedAnswer}
          localPlayerName={localPlayerName}
          clientId={clientId}
        />
      );
  } else if (gameStatus === 'finished') {
    content = (
      <GameResults 
        scores={scores}
        players={players}
        tieBreakerState={tieBreakerState}
        isAnimatingTie={tieBreakerAnimation.isAnimating}
        highlightedPlayerIndex={tieBreakerAnimation.highlightedIndex}
        role={role}
        clientId={clientId}
        localPlayerName={localPlayerName}
        resetGame={resetGame}
        hostGame={hostGame}
        gameName="Trivia"
      />
    );
  }
  
  // Main component render
  return (
    <div className="trivia-game-container">
      {content}
    </div>
  );
};

export default TriviaGame;
