import { useState, useCallback } from 'react';

/**
 * Custom hook to manage game state
 * 
 * @returns {Object} Game state and methods to update it
 */
export const useGameState = () => {
  // Game status and core game state
  const [gameStatus, setGameStatus] = useState('waiting'); // 'waiting', 'playing', 'finished'
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [scores, setScores] = useState({});
  
  // Player and role state
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState('');
  const [clientId, setClientId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState({});
  
  // UI state
  const [inputGameId, setInputGameId] = useState("");
  const [status, setStatus] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  
  // Player info state
  const [playerInfoStage, setPlayerInfoStage] = useState('none'); // 'none', 'enterInfo', 'joining', 'joined'
  const [joinTargetGameId, setJoinTargetGameId] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerPhoneInput, setPlayerPhoneInput] = useState('');
  const [localPlayerName, setLocalPlayerName] = useState('');
  
  // Tie-breaker state
  const [tieBreakerState, setTieBreakerState] = useState({
    stage: 'none', // 'none', 'breaking', 'resolved'
    tiedPlayerIds: [],
    ultimateWinnerId: null
  });
  
  // Reset the game state
  const resetGame = useCallback(() => {
    setGameStatus('waiting');
    setGameId('');
    setRole('');
    setPlayers([]);
    setScores({});
    setCurrentQuestionIndex(0);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setQrCodeData(null);
    setInputGameId('');
    setCurrentQuestionAnswers({}); // Ensure answers are cleared
    
    // Reset player info state
    setPlayerInfoStage('none');
    setJoinTargetGameId('');
    setPlayerNameInput('');
    setPlayerPhoneInput('');
    setLocalPlayerName('');
    
    // Reset tie-breaker state
    setTieBreakerState({
      stage: 'none',
      tiedPlayerIds: [],
      ultimateWinnerId: null
    });
    
    // Clear status and reset timer
    setStatus('');
    setTimerKey(prev => prev + 1);
    
    console.log("Game state fully reset");
  }, []);
  
  // Calculate scores based on answers
  const calculateScores = useCallback((questionIndex, receivedAnswers) => {
    if (questionIndex < 0 || questionIndex >= questions.length) {
      console.error(`Invalid questionIndex ${questionIndex} for score calculation.`);
      return {}; // Return empty scores if index is invalid
    }
    
    const currentQuestion = questions[questionIndex];
    const correctAnswerIndex = currentQuestion.answerIndex;
    
    // Calculate new points for this round
    const roundScores = {};
    for (const [playerId, submittedAnswerIndex] of Object.entries(receivedAnswers)) {
      if (submittedAnswerIndex === correctAnswerIndex) {
        roundScores[playerId] = (roundScores[playerId] || 0) + 1; // Simple: 1 point for correct answer
      } else {
        roundScores[playerId] = (roundScores[playerId] || 0); // Ensure player has an entry even if wrong
      }
    }
    
    // Merge with existing scores
    const updatedScores = { ...scores };
    
    // Add all players to scores EXCEPT the host
    players.forEach(player => {
      // Skip the host (the player with role 'host' or the one who created the game lobby)
      if (player.clientId === clientId && role === 'host') {
        return; // Skip host
      }
      
      if (updatedScores[player.clientId] === undefined) {
        updatedScores[player.clientId] = 0;
      }
    });
    
    // Then add points for correct answers
    for (const [playerId, points] of Object.entries(roundScores)) {
      // Skip points for host
      if (playerId === clientId && role === 'host') {
        continue;
      }
      updatedScores[playerId] = (updatedScores[playerId] || 0) + points;
    }
    
    console.log(`Scores calculated for Q${questionIndex}:`, updatedScores);
    return updatedScores;
  }, [questions, scores, players, clientId, role]);
  
  // Check if there's a tie among top scorers
  const checkForTie = useCallback((finalScores) => {
    if (!finalScores || Object.keys(finalScores).length <= 1) {
      return false;
    }
    
    const sortedScores = Object.entries(finalScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
    
    const topScore = sortedScores[0][1];
    const tiedIds = sortedScores
      .filter(([, score]) => score === topScore)
      .map(([id]) => id);
    
    if (tiedIds.length > 1) {
      console.log("Tie detected! Tied IDs:", tiedIds);
      setTieBreakerState({
        stage: 'breaking',
        tiedPlayerIds: tiedIds,
        ultimateWinnerId: null
      });
      return true;
    } 
    
    return false;
  }, []);
  
  // Add a player to the players list
  const addPlayer = useCallback((playerId, playerName) => {
    setPlayers(prevPlayers => {
      // Avoid duplicates
      if (prevPlayers.some(p => p.clientId === playerId)) {
        return prevPlayers;
      }
      
      return [...prevPlayers, {
        clientId: playerId,
        name: playerName || `Player ${playerId.substring(0, 4)}`
      }];
    });
  }, []);
  
  // Remove a player from the players list
  const removePlayer = useCallback((playerId) => {
    setPlayers(prevPlayers => 
      prevPlayers.filter(p => p.clientId !== playerId)
    );
  }, []);
  
  // Advance to the next question
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => prev + 1);
    setCurrentQuestionAnswers({});
    setHasAnswered(false);
    setSelectedAnswer(null);
    setTimerKey(prev => prev + 1);
  }, []);
  
  return {
    // Game state
    gameStatus, setGameStatus,
    questions, setQuestions,
    currentQuestionIndex, setCurrentQuestionIndex,
    timerKey, setTimerKey,
    scores, setScores,
    
    // Player state
    gameId, setGameId,
    role, setRole,
    clientId, setClientId,
    players, setPlayers,
    hasAnswered, setHasAnswered,
    selectedAnswer, setSelectedAnswer,
    currentQuestionAnswers, setCurrentQuestionAnswers,
    
    // UI state
    inputGameId, setInputGameId,
    status, setStatus,
    qrCodeData, setQrCodeData,
    
    // Player info state
    playerInfoStage, setPlayerInfoStage,
    joinTargetGameId, setJoinTargetGameId,
    playerNameInput, setPlayerNameInput,
    playerPhoneInput, setPlayerPhoneInput,
    localPlayerName, setLocalPlayerName,
    
    // Tie-breaker state
    tieBreakerState, setTieBreakerState,
    
    // Methods
    resetGame,
    calculateScores,
    checkForTie,
    addPlayer,
    removePlayer,
    advanceToNextQuestion
  };
}; 