import { useCallback } from 'react';

export const useCategoryMessageHandler = (gameState) => {
  const {
    // Core state from useGameCore
    gameId, role, clientId, players,
    // Core state setters
    setPlayerInfoStage,
    // Category game state
    gamePhase, currentRound, currentCategory, timeRemaining,
    // Category game actions
    initializeGame, startGame, submitPlayerAnswer, forceNextRound, endGame,
    // Category game data
    playerAnswers, playerScores, roundResults, gameResults,
    // State setters (for player updates)
    setGamePhase, setCurrentRound, setCurrentCategory, setTimeRemaining, 
    setPlayerScores, setRoundResults, setGameResults,
    // Core functions
    sendGameMessage,
  } = gameState;

  const handleMessage = useCallback((data) => {
    console.log(`[CategoryGame] Processing ${data.action} for role: ${role}`);
    
    switch (data.action) {
      // Game initialization and start
      case 'startGame':
      case 'gameStarted':
        console.log(`[CategoryGame] ${role} received ${data.action} message`);
        if (data.gameSettings) {
          initializeGame(data.gameSettings);
        }
        
        // Start the category game with proper phase flow
        console.log(`[CategoryGame] Starting category game for ${role}`);
        startGame();
        
        // Also update BaseGame's game phase for players to trigger view transition
        if (role === 'player' && gameState.setGamePhase) {
          console.log(`[CategoryGame] Player updating BaseGame gamePhase to 'playing'`);
          gameState.setGamePhase('playing');
        }
        break;

      // Round management
      case 'roundStarted':
        if (role === 'player') {
          // Host sends round start with category info
          console.log(`[CategoryGame] Round ${data.roundNumber} started: ${data.category}`);
        }
        break;

      case 'categoryRevealed':
        if (role === 'player') {
          // Host reveals the category for this round
          console.log(`[CategoryGame] Category revealed: ${data.category}`);
          setCurrentCategory({ 
            name: data.category, 
            examples: Array.isArray(data.examples) ? data.examples : [] 
          });
          setCurrentRound(data.roundNumber);
          setGamePhase('category-reveal');
        }
        break;

      case 'inputPhaseStarted':
        if (role === 'player') {
          // Host signals that input phase has begun
          console.log(`[CategoryGame] Input phase started - ${data.timeLimit}s to answer`);
          setGamePhase('input');
          setTimeRemaining(data.timeLimit);
          setCurrentRound(data.roundNumber);
        }
        break;

      // Player answers
      case 'submitAnswer':
        if (role === 'host') {
          // Host receives player answer
          const { playerId, answer, timestamp } = data;
          console.log(`[CategoryGame] Host received answer from ${playerId}: "${answer}"`);
          submitPlayerAnswer(playerId, answer);
        }
        break;

      case 'answerReceived':
        if (role === 'player' && data.playerId === clientId) {
          // Confirmation that player's answer was received
          console.log(`[CategoryGame] Answer confirmed received: "${data.answer}"`);
        }
        break;

      // Round end and results
      case 'roundEnded':
        if (role === 'player') {
          // Host signals round has ended
          console.log(`[CategoryGame] Round ${data.roundNumber} ended`);
        }
        break;

      case 'roundResults':
        if (role === 'player') {
          // Host sends round results to all players
          console.log(`[CategoryGame] Round results received:`, data.results);
          setRoundResults(data.results);
          setPlayerScores(data.scores || {});
          setCurrentRound(data.roundNumber);
          setGamePhase('results');
        }
        break;

      // Game state updates
      case 'gameStateUpdate':
        if (role === 'player') {
          // Host sends game state update (phase, timer, etc.)
          console.log(`[CategoryGame] Game state update:`, data.gameState);
          // Update player's local state to match host
          if (data.gameState) {
            setGamePhase(data.gameState.gamePhase);
            setCurrentRound(data.gameState.currentRound);
            setCurrentCategory(data.gameState.currentCategory);
            setTimeRemaining(data.gameState.timeRemaining);
            setPlayerScores(data.gameState.playerScores || {});
            setRoundResults(data.gameState.roundResults);
          }
        }
        break;

      case 'gamePhaseChanged':
        if (role === 'player') {
          // Host notifies phase change
          console.log(`[CategoryGame] Game phase changed to: ${data.phase}`);
          setGamePhase(data.phase);
          if (data.timeRemaining !== undefined) {
            setTimeRemaining(data.timeRemaining);
          }
          if (data.category) {
            setCurrentCategory({ name: data.category });
          }
          if (data.roundNumber !== undefined) {
            setCurrentRound(data.roundNumber);
          }
        }
        break;

      // Timer updates
      case 'timerUpdate':
        if (role === 'player') {
          // Host sends timer updates
          console.log(`[CategoryGame] Timer update: ${data.timeRemaining}s remaining`);
          setTimeRemaining(data.timeRemaining);
        }
        break;

      // Game end
      case 'gameEnded':
      case 'gameFinished':
        console.log('[CategoryGame] Game finished:', data);
        
        // Update BaseGame's gamePhase to trigger results screen
        if (gameState.setGamePhase) {
          console.log('[CategoryGame] Setting BaseGame gamePhase to finished');
          console.log('[CategoryGame] gameState.setGamePhase type:', typeof gameState.setGamePhase);
          console.log('[CategoryGame] gameState.setGamePhase function:', gameState.setGamePhase.toString().substring(0, 100));
          gameState.setGamePhase('finished');
          console.log('[CategoryGame] Called gameState.setGamePhase(finished)');
        }
        
        // Also store final scores in gameData for results screen
        if (gameState.setGameData) {
          gameState.setGameData(prev => ({
            ...prev,
            finalScores: data.finalScores || data.finalResults || playerScores || {}
          }));
        }
        
        if (role === 'player') {
          // Host signals game has ended
          console.log(`[CategoryGame] Game ended. Final results:`, data.finalResults || data.finalScores);
          setGameResults(data.finalResults || data.finalScores || {});
          setGamePhase('finished');
        } else if (role === 'host') {
          setGamePhase('finished');
        }
        break;

      // Host-specific actions
      case 'forceNextRound':
        if (role === 'host') {
          // Manual advance to next round (admin control)
          console.log(`[CategoryGame] Forcing next round`);
          forceNextRound();
        }
        break;

      // Player management
      case 'playerJoined':
        // Handled by core, but we might want to initialize player score
        if (role === 'host' && gamePhase !== 'waiting') {
          // Initialize score for new player if game is active
          console.log(`[CategoryGame] Player ${data.playerId} joined mid-game`);
        }
        break;

      case 'playerLeft':
        // Handled by core, but we might want to clean up player data
        if (role === 'host') {
          console.log(`[CategoryGame] Player ${data.playerId} left the game`);
        }
        break;

      // Reconnection handling
      case 'requestGameState':
        if (role === 'host') {
          // A player is requesting current game state (reconnection)
          console.log(`[CategoryGame] Sending game state to reconnecting player ${data.playerId}`);
          // Send current game state to the requesting player
          return {
            action: 'gameStateUpdate',
            gameState: {
              gamePhase,
              currentRound,
              currentCategory,
              timeRemaining,
              playerAnswers,
              playerScores,
              roundResults,
              gameResults,
            },
            targetPlayerId: data.playerId,
          };
        }
        break;

      // Error handling
      case 'error':
        console.error(`[CategoryGame] Error received:`, data.error);
        break;

      // Handle Trivia game messages that might be sent to Category players
      case 'startGame':
        if (data.questions && Array.isArray(data.questions)) {
          console.warn(`[CategoryGame] Received Trivia game message: ${data.action}. This suggests a game type mismatch!`);
          console.warn(`[CategoryGame] Player might be in wrong game type. Expected Category messages.`);
          return false; // Let core handler try
        }
        break;
        
      case 'questionResult':
      case 'nextQuestion':
      case 'resolveTie':
        console.warn(`[CategoryGame] Received Trivia game message: ${data.action}. This suggests a game type mismatch!`);
        console.warn(`[CategoryGame] Player might be in wrong game type. Expected Category messages.`);
        return false; // Let core handler try
        
      default:
        console.log(`[CategoryGame] Unhandled message: ${data.action}`);
        return false; // Let core handler try
    }
    
    return true; // Message handled
  }, [
    role, clientId, gameId, players,
    gamePhase, currentRound, currentCategory, timeRemaining,
    initializeGame, startGame, submitPlayerAnswer, forceNextRound, endGame,
    playerAnswers, playerScores, roundResults, gameResults,
    setGamePhase, setCurrentRound, setCurrentCategory, setTimeRemaining, 
    setPlayerScores, setRoundResults, setGameResults,
    sendGameMessage,
  ]);

  return handleMessage;
}; 