import { useCallback } from 'react';

export const useMathMessageHandler = (gameState) => {
  const {
    // Core state from useGameCore
    gameId, role, clientId, players,
    // Math game state
    startGame, submitAnswer, endCurrentProblem, nextRound, endGame,
    mathGamePhase, currentProblem, playerAnswers, scores,
  } = gameState;
  
  const handleMessage = useCallback((data) => {
    console.log(`[MathGame] Processing ${data.action} for role: ${role}`);
    
    switch (data.action) {
      case 'startGame':
        console.log(`[MathGame] ${role} received startGame message`);
        startGame();
        // First problem will be started by MathHostView useEffect
        break;
        
      case 'newProblem':
        // Host broadcasts new problem to all players
        if (role === 'player' && data.problem) {
          console.log('[MathGame] Player received new problem:', data.problem);
          gameState.setCurrentProblem(data.problem);
          gameState.setCurrentRound(data.round);
          gameState.setTimeRemaining(data.timeLimit);
          gameState.setMathGamePhase('playing');
        }
        break;
        
      case 'playerAnswer':
        if (role === 'host' && data.playerId && data.answer !== undefined) {
          const player = players.find(p => p.clientId === data.playerId);
          const playerName = player ? player.name : 'Unknown Player';
          const result = submitAnswer(data.playerId, playerName, data.answer);
          
          // Broadcast score update to all players if answer was correct
          if (result && result.scoreGained > 0) {
            // Send immediate score update (optional - for real-time feedback)
            // We could add this if we want immediate score updates during the round
          }
        }
        break;
        
      case 'timerUpdate':
        // Host sends timer updates to players
        if (role === 'player' && data.timeRemaining !== undefined) {
          console.log('[MathGame] Player received timer update:', data.timeRemaining);
          gameState.setTimeRemaining(data.timeRemaining);
        }
        break;
        
      case 'problemResults':
        // Host sends problem results to players
        if (role === 'player') {
          console.log('[MathGame] Player received problem results:', data);
          gameState.setMathGamePhase('scoring');
          if (data.scores) {
            gameState.setScores(data.scores);
          }
        }
        break;
        
      case 'scoreUpdate':
        // Real-time score updates during gameplay (optional)
        if (role === 'player' && data.scores) {
          console.log('[MathGame] Player received score update:', data.scores);
          gameState.setScores(data.scores);
        }
        break;
        
      case 'nextRound':
        if (role === 'player') {
          console.log('[MathGame] Player received nextRound');
          gameState.setMathGamePhase('playing');
          gameState.setCurrentRound(data.nextRound);
        }
        break;
        
      case 'gameFinished':
        console.log('[MathGame] Game finished:', data);
        console.log('[MathGame] Final scores from message:', data.finalScores);
        // Update local scores
        if (data.finalScores) {
          gameState.setScores(data.finalScores);
        }
        
        // Store final scores in gameData for BaseGame's GameResults component
        if (gameState.setGameData) {
          console.log('[MathGame] Storing final scores in gameData:', data.finalScores);
          gameState.setGameData(prev => {
            const newData = {
              ...prev,
              finalScores: data.finalScores || {}
            };
            console.log('[MathGame] Updated gameData:', newData);
            return newData;
          });
        }
        
        // Update BaseGame's gamePhase to trigger results screen (same as trivia/category)
        if (gameState.setGamePhase) {
          console.log('[MathGame] Setting BaseGame gamePhase to finished');
          gameState.setGamePhase('finished');
        }
        
        // Clean up local game state
        endGame();
        break;
        
      case 'forceEndProblem':
        // Allow host to manually end current problem
        if (role === 'host') {
          endCurrentProblem();
        }
        break;
        
      case 'skipToNextRound':
        // Allow host to skip to next round
        if (role === 'host') {
          nextRound();
        }
        break;
        
      case 'updateSettings':
        // Allow host to update game settings
        if (role === 'host' && data.settings) {
          gameState.setGameSettings(prev => ({ ...prev, ...data.settings }));
        }
        break;
        
      default:
        console.log(`[MathGame] Unhandled message: ${data.action}`);
        return false; // Let core handler try
    }
    
    return true; // Message handled
  }, [
    role, 
    players,
    startGame, 
    submitAnswer, 
    endCurrentProblem, 
    nextRound, 
    endGame,
    mathGamePhase,
    currentProblem,
    playerAnswers,
    scores,
    gameState
  ]);
  
  return handleMessage;
}; 