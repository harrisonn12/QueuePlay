import { useCallback } from 'react';

export const useTriviaMessageHandler = (gameState) => {
  const {
    // Core state
    gameId, role, clientId, players, setStatus,
    // Trivia state
    setGamePhase, setQuestions, setCurrentQuestionIndex, setTimerKey,
    setScores, setHasAnswered, setSelectedAnswer, setCurrentQuestionAnswers,
    setTieBreakerState, checkForTie, calculateScores, advanceToNextQuestion,
    currentQuestionIndex, questions, currentQuestionAnswers,
  } = gameState;
  
  const handleMessage = useCallback((data) => {
    console.log(`[Trivia] handleMessage called with data:`, data);
    
    // Enhanced null check to prevent errors during React state initialization
    if (!data || typeof data !== 'object' || !data.action) {
      // Don't log warnings for React's internal calls during state initialization
      if (data !== null && data !== false) {
        console.warn('[Trivia] Received invalid message data:', data);
      }
      return false;
    }
    
    console.log(`[Trivia] Processing ${data.action} for role: ${role}`);
    
    switch (data.action) {
      case 'startGame':
        console.log(`[Trivia] ${role} received startGame message`);
        console.log(`[Trivia] Questions in startGame message:`, data.questions);
        setQuestions(data.questions || []);
        console.log(`[Trivia] Questions set, length:`, (data.questions || []).length);
        setGamePhase('playing');
        
        // Also update BaseGame's game phase for players to trigger view transition
        if (role === 'player' && gameState.setGamePhase) {
          console.log(`[Trivia] Player updating BaseGame gamePhase to 'playing'`);
          gameState.setGamePhase('playing');
        }
        
        setCurrentQuestionIndex(0);
        setTimerKey(prev => prev + 1);
        break;
        
      case 'submitAnswer':
        if (role === 'host') {
          console.log('[Trivia] Host received submitAnswer:', data);
          setCurrentQuestionAnswers(prev => ({
            ...prev,
            [data.clientId]: data.answerIndex
          }));
        }
        break;
        
      case 'questionResult':
        if (role === 'player') {
          console.log('[Trivia] Player received questionResult:', data);
          setScores(data.scores || {});
        }
        break;
        
      case 'nextQuestion':
        console.log(`[Trivia] Processing nextQuestion for role: ${role}`, data);
        if (role === 'player') {
          console.log('[Trivia] Player received nextQuestion:', data);
          console.log(`[Trivia] Updating question index from ${currentQuestionIndex} to ${data.questionIndex}`);
          setCurrentQuestionIndex(data.questionIndex);
          setHasAnswered(false);
          setSelectedAnswer(null);
          setTimerKey(prev => {
            console.log(`[Trivia] Player updating timerKey from ${prev} to ${prev + 1}`);
            return prev + 1;
          });
        }
        break;
        
      case 'gameFinished':
        console.log('[Trivia] Game finished:', data);
        setScores(data.finalScores || {});
        
        // Update BaseGame's gamePhase to trigger results screen
        if (gameState.setGamePhase) {
          console.log('[Trivia] Setting BaseGame gamePhase to finished');
          console.log('[Trivia] gameState.setGamePhase type:', typeof gameState.setGamePhase);
          console.log('[Trivia] gameState.setGamePhase function:', gameState.setGamePhase.toString().substring(0, 100));
          gameState.setGamePhase('finished');
          console.log('[Trivia] Called gameState.setGamePhase(finished)');
        }
        
        // Also store final scores in gameData for results screen
        if (gameState.setGameData) {
          gameState.setGameData(prev => ({
            ...prev,
            finalScores: data.finalScores || {}
          }));
        }
        
        if (role === 'host') {
          // Check for tie
          const hasTie = checkForTie(data.finalScores || {});
          if (!hasTie) {
            setGamePhase('finished');
          }
        } else {
          setGamePhase('finished');
        }
        break;
        
      case 'resolveTie':
        console.log('[Trivia] Tie resolved:', data);
        setTieBreakerState({
          stage: 'resolved',
          tiedPlayerIds: [],
          ultimateWinnerId: data.ultimateWinnerId
        });
        setGamePhase('finished');
        break;
        
      // Handle Category game messages that might be sent to Trivia players
      case 'gamePhaseChanged':
      case 'categoryRevealed':
      case 'inputPhaseStarted':
      case 'roundResults':
        console.warn(`[Trivia] Received Category game message: ${data.action}. This suggests a game type mismatch!`);
        console.warn(`[Trivia] Player might be in wrong game type. Expected Trivia messages.`);
        return false; // Let core handler try
        
      default:
        console.log(`[Trivia] Unhandled message: ${data.action}`);
        return false; // Let core handler try
    }
    
    return true; // Message handled
  }, [
    role, gameId, clientId, players, setStatus,
    setGamePhase, setQuestions, setCurrentQuestionIndex, setTimerKey,
    setScores, setHasAnswered, setSelectedAnswer, setCurrentQuestionAnswers,
    setTieBreakerState, checkForTie, calculateScores, advanceToNextQuestion,
    currentQuestionIndex, questions, currentQuestionAnswers
  ]);
  
  return handleMessage;
}; 