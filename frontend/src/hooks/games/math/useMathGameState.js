import { useState, useCallback } from 'react';

// Math problem generation utilities
const generateProblem = (difficulty, operations) => {
  const operation = operations[Math.floor(Math.random() * operations.length)];
  let num1, num2, answer, problem;
  
  switch (difficulty) {
    case 'easy':
      num1 = Math.floor(Math.random() * 25) + 1;
      num2 = Math.floor(Math.random() * 25) + 1;
      break;
    case 'medium':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      break;
    case 'hard':
      num1 = Math.floor(Math.random() * 100) + 1;
      num2 = Math.floor(Math.random() * 100) + 1;
      break;
    default:
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
  }
  
  switch (operation) {
    case 'addition':
      answer = num1 + num2;
      problem = `${num1} + ${num2}`;
      break;
    case 'subtraction':
      // Ensure positive result
      if (num1 < num2) [num1, num2] = [num2, num1];
      answer = num1 - num2;
      problem = `${num1} - ${num2}`;
      break;
    case 'multiplication':
      // Keep numbers smaller for multiplication
      if (difficulty === 'easy') {
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
      } else if (difficulty === 'medium') {
        num1 = Math.floor(Math.random() * 15) + 1;
        num2 = Math.floor(Math.random() * 15) + 1;
      } else {
        num1 = Math.floor(Math.random() * 25) + 1;
        num2 = Math.floor(Math.random() * 25) + 1;
      }
      answer = num1 * num2;
      problem = `${num1} × ${num2}`;
      break;
    case 'division':
      // Generate division problems that result in whole numbers
      answer = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 8) + 1;
      num1 = answer * num2;
      problem = `${num1} ÷ ${num2}`;
      break;
    default:
      answer = num1 + num2;
      problem = `${num1} + ${num2}`;
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    problem,
    answer,
    operation,
    difficulty
  };
};

export const useMathGameState = () => {
  // Game state (use mathGamePhase to avoid conflict with BaseGame's gamePhase)
  const [mathGamePhase, setMathGamePhase] = useState('waiting');
  const [currentRound, setCurrentRound] = useState(0);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [roundResults, setRoundResults] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [problemStartTime, setProblemStartTime] = useState(0);
  
  // Game settings
  const [gameSettings, setGameSettings] = useState({
    roundTime: 15,
    totalRounds: 5,
    difficulty: 'medium',
    operations: ['addition', 'subtraction', 'multiplication']
  });
  
  // Initialize game
  const startGame = useCallback(() => {
    setMathGamePhase('playing');
    setCurrentRound(1);
    setScores({});
    setRoundResults([]);
    // Don't start problem immediately - let host control this
  }, []);
  
  // Generate and start a new problem
  const startNewProblem = useCallback(() => {
    const problem = generateProblem(gameSettings.difficulty, gameSettings.operations);
    setCurrentProblem(problem);
    setPlayerAnswers({});
    setTimeRemaining(gameSettings.roundTime);
    setProblemStartTime(Date.now());
  }, [gameSettings]);
  
  // Process player answer (now returns the result for broadcasting)
  const submitAnswer = useCallback((playerId, playerName, answer) => {
    if (!currentProblem || mathGamePhase !== 'playing') return null;
    
    const responseTime = Date.now() - problemStartTime;
    const isCorrect = parseInt(answer) === currentProblem.answer;
    
    const answerResult = {
      answer: parseInt(answer),
      isCorrect,
      responseTime,
      playerName
    };
    
    setPlayerAnswers(prev => ({
      ...prev,
      [playerId]: answerResult
    }));
    
    // Calculate score (correct + speed bonus)
    let newScore = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, Math.floor((gameSettings.roundTime * 1000 - responseTime) / 100));
      newScore = 100 + speedBonus;
      
      setScores(prev => ({
        ...prev,
        [playerId]: (prev[playerId] || 0) + newScore
      }));
    }
    
    return { answerResult, scoreGained: newScore };
  }, [currentProblem, mathGamePhase, problemStartTime, gameSettings.roundTime]);
  
  // End current problem and calculate results (host only)
  const endCurrentProblem = useCallback(() => {
    if (!currentProblem) return;
    
    const result = {
      problem: currentProblem,
      answers: { ...playerAnswers },
      round: currentRound
    };
    
    setRoundResults(prev => [...prev, result]);
    setMathGamePhase('scoring');
    
    return result;
  }, [currentProblem, playerAnswers, currentRound]);
  
  // Move to next round
  const nextRound = useCallback(() => {
    if (currentRound >= gameSettings.totalRounds) {
      endGame();
      return;
    }
    
    setCurrentRound(prev => prev + 1);
    setMathGamePhase('playing');
    
    // Start new problem immediately
    setTimeout(() => {
      startNewProblem();
    }, 500);
  }, [currentRound, gameSettings.totalRounds, startNewProblem]);
  
  // End the game
  const endGame = useCallback(() => {
    setMathGamePhase('finished');
    setCurrentProblem(null);
  }, []);
  
  // Get sorted leaderboard
  const getLeaderboard = useCallback(() => {
    return Object.entries(scores)
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);
  
  // Timer is now handled by Timer component in host view
  
  return {
    // State
    mathGamePhase,
    currentRound,
    currentProblem,
    playerAnswers,
    scores,
    roundResults,
    timeRemaining,
    gameSettings,
    
    // Actions
    startGame,
    startNewProblem,
    submitAnswer,
    endCurrentProblem,
    nextRound,
    endGame,
    getLeaderboard,
    
    // Setters
    setMathGamePhase,
    setGameSettings,
    setTimeRemaining,
    setCurrentProblem,
    setCurrentRound,
    setScores,
    setPlayerAnswers
  };
}; 