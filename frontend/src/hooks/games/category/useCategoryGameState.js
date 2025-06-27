import { useState, useCallback, useRef, useEffect } from 'react';
import { useCategoriesData } from './useCategoriesData.js';
import { useWordValidationAPI } from './useWordValidationAPI.js';

// Import hardcoded validation data for fallback
const FALLBACK_VALIDATION_DATA = {
  'fruits': [
    'apple', 'orange', 'banana', 'grape', 'strawberry', 'blueberry', 'watermelon', 'pineapple', 'mango', 'peach',
    'pear', 'cherry', 'plum', 'kiwi', 'lemon', 'lime', 'coconut', 'papaya', 'avocado', 'pomegranate'
  ],
  'animals': [
    'dog', 'cat', 'lion', 'tiger', 'elephant', 'bear', 'wolf', 'fox', 'rabbit', 'deer',
    'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'fish', 'bird', 'eagle',
    'owl', 'snake', 'lizard', 'frog', 'turtle', 'shark', 'whale', 'dolphin', 'octopus', 'crab'
  ],
  'colors': [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
    'gray', 'grey', 'violet', 'indigo', 'turquoise', 'maroon', 'navy', 'lime', 'olive', 'cyan'
  ],
  'countries': [
    'usa', 'canada', 'mexico', 'france', 'germany', 'italy', 'spain', 'japan', 'china', 'india',
    'brazil', 'argentina', 'australia', 'russia', 'egypt', 'nigeria', 'kenya', 'sweden', 'norway', 'denmark'
  ]
};

export const useCategoryGameState = () => {
  // Categories data hook
  const { 
    getRandomCategory, 
    resetUsedCategories, 
    getCategoryExamples 
  } = useCategoriesData();
  
  // Word validation API hook
  const { 
    validateWordsBatch, 
    isValidating: isValidatingWords,
    getStats: getValidationStats 
  } = useWordValidationAPI();

  // Game state
  const [gamePhase, setGamePhase] = useState('waiting'); // 'waiting', 'category-reveal', 'input', 'scoring', 'results', 'finished'
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [roundTimeLimit, setRoundTimeLimit] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Player data
  const [playerAnswers, setPlayerAnswers] = useState({}); // { playerId: { answer, timestamp } }
  const [playerScores, setPlayerScores] = useState({}); // { playerId: totalScore }
  const [roundResults, setRoundResults] = useState(null); // Latest round results
  const [gameResults, setGameResults] = useState(null); // Final game results

  // Timer reference
  const timerRef = useRef(null);
  const phaseTimerRef = useRef(null);
  const roundStartTimeRef = useRef(null); // Track when input phase started

  // Game settings
  const [gameSettings, setGameSettings] = useState({
    roundTime: 10,
    totalRounds: 5,
    categoryRevealTime: 3, // seconds to show category before input starts
    resultsDisplayTime: 5, // seconds to show results before next round
  });

  // Initialize game
  const initializeGame = useCallback((settings = {}) => {
    const newSettings = { ...gameSettings, ...settings };
    setGameSettings(newSettings);
    setTotalRounds(newSettings.totalRounds);
    setRoundTimeLimit(newSettings.roundTime);
    
    // Reset all state
    setCurrentRound(1);
    setPlayerScores({});
    setPlayerAnswers({});
    setCurrentCategory(null);
    setRoundResults(null);
    setGameResults(null);
    setGamePhase('waiting');
    resetUsedCategories();
    
    console.log('[CategoryGame] Game initialized with settings:', newSettings);
  }, [gameSettings, resetUsedCategories]);

  // Start game
  const startGame = useCallback(() => {
    console.log('[CategoryGame] Starting game...');
    startNewRound();
  }, []);

  // Start round timer 
  const startRoundTimer = useCallback(() => {
    console.log('[CategoryGame] Starting round timer...');
    
    // Clear any existing timer
    if (timerRef.current) {
      console.log('[CategoryGame] Timer already running, clearing it first');
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Set initial time to 15 seconds - Timer component will handle countdown
    const initialTime = 15;
    setTimeRemaining(initialTime);
    
    console.log('[CategoryGame] Timer initialized with 15 seconds - Timer component will handle countdown');
  }, []);

  // Handle timer end (called by Timer component)
  const handleTimerEnd = useCallback(() => {
    console.log('[CategoryGame] Timer ended via Timer component, moving to scoring phase');
    setTimeRemaining(0);
    setGamePhase('scoring');
  }, []);

  // Calculate round scores
  const calculateRoundScores = useCallback(async (answers, categoryName) => {
    const answerCounts = {};
    const validAnswers = {};
    const playerResults = {};
    const scores = {};
    
    // Prepare word-category pairs for batch validation
    const wordCategoryPairs = Object.entries(answers).map(([playerId, data]) => ({
      playerId,
      word: data.answer.trim(),
      category: categoryName,
      timestamp: data.timestamp
    }));
    
    console.log(`[CategoryGame] Validating ${wordCategoryPairs.length} answers for category "${categoryName}" using API...`);
    
    try {
      // Batch validate all answers using the API
      const validationResults = await validateWordsBatch(
        wordCategoryPairs.map(pair => ({ word: pair.word, category: pair.category }))
      );
      
      // Process validation results
      wordCategoryPairs.forEach((pair, index) => {
        const { playerId, word, timestamp } = pair;
        const validationResult = validationResults[index];
        const cleanAnswer = word.toLowerCase().trim();
        const isValid = validationResult?.isValid || false;
        
        console.log(`[CategoryGame] API Validation: "${word}" in "${categoryName}" = ${isValid} (${validationResult?.source || 'unknown'})`);
        
        playerResults[playerId] = {
          answer: word,
          cleanAnswer: cleanAnswer,
          isValid: isValid,
          timestamp: timestamp,
          score: 0,
          validationSource: validationResult?.source || 'unknown',
          validationExplanation: validationResult?.explanation || 'No explanation'
        };
        
        if (isValid) {
          answerCounts[cleanAnswer] = (answerCounts[cleanAnswer] || 0) + 1;
          validAnswers[cleanAnswer] = true;
        }
      });
      
      // Calculate scores with speed bonus
      Object.entries(playerResults).forEach(([playerId, result]) => {
        if (result.isValid) {
          let score = 0;
          
          // Base score for valid answer
          if (answerCounts[result.cleanAnswer] === 1) {
            score = 3; // 3 points for unique valid answer
          } else {
            score = 1; // 1 point for duplicate valid answer
          }
          
          // Speed bonus: extra points based on how quickly answered
          // Calculate time from when input phase started to when answer was submitted
          const roundStart = roundStartTimeRef.current || Date.now();
          const timeElapsed = (result.timestamp - roundStart) / 1000; // Convert to seconds
          const roundTimeLimit = 15; // 15 second rounds
          const timeUsed = Math.max(0, Math.min(timeElapsed, roundTimeLimit));
          const speedBonus = Math.max(0, Math.floor((roundTimeLimit - timeUsed) / 3)); // 1 bonus point per 3 seconds saved
          
          score += speedBonus;
          result.score = score;
          
          console.log(`[CategoryGame] Player ${playerId}: base=${score-speedBonus}, speed bonus=${speedBonus}, total=${score}, timeUsed=${timeUsed.toFixed(1)}s, source=${result.validationSource}`);
        }
        scores[playerId] = result.score;
      });
      
      // Log validation statistics
      const validationStats = getValidationStats();
      console.log(`[CategoryGame] Validation stats:`, validationStats);
      
      return {
        scores,
        playerResults,
        answerCounts,
        validAnswers: Object.keys(validAnswers),
        duplicates: Object.keys(answerCounts).filter(answer => answerCounts[answer] > 1),
        validationStats
      };
      
    } catch (error) {
      console.error(`[CategoryGame] Error during batch validation:`, error);
      console.log(`[CategoryGame] Falling back to hardcoded validation...`);
      
      // Fallback validation function
      const isValidForCategoryFallback = (word, category) => {
        const cleanWord = word.toLowerCase().trim();
        const cleanCategory = category.toLowerCase().trim();
        const validWords = FALLBACK_VALIDATION_DATA[cleanCategory];
        return validWords ? validWords.includes(cleanWord) : false;
      };
      
      // Fallback: use hardcoded validation
      Object.entries(answers).forEach(([playerId, data]) => {
        const cleanAnswer = data.answer.toLowerCase().trim();
        const isValid = isValidForCategoryFallback(cleanAnswer, categoryName);
        
        playerResults[playerId] = {
          answer: data.answer,
          cleanAnswer: cleanAnswer,
          isValid: isValid,
          timestamp: data.timestamp,
          score: 0,
          validationSource: 'hardcoded_fallback',
          validationExplanation: `API failed, used hardcoded validation: ${error.message}`
        };
        
        if (isValid) {
          answerCounts[cleanAnswer] = (answerCounts[cleanAnswer] || 0) + 1;
          validAnswers[cleanAnswer] = true;
        }
      });
      
      // Calculate scores with speed bonus (same logic as above)
      Object.entries(playerResults).forEach(([playerId, result]) => {
        if (result.isValid) {
          let score = 0;
          
          // Base score for valid answer
          if (answerCounts[result.cleanAnswer] === 1) {
            score = 3; // 3 points for unique valid answer
          } else {
            score = 1; // 1 point for duplicate valid answer
          }
          
          // Speed bonus: extra points based on how quickly answered
          const roundStart = roundStartTimeRef.current || Date.now();
          const timeElapsed = (result.timestamp - roundStart) / 1000;
          const roundTimeLimit = 15;
          const timeUsed = Math.max(0, Math.min(timeElapsed, roundTimeLimit));
          const speedBonus = Math.max(0, Math.floor((roundTimeLimit - timeUsed) / 3));
          
          score += speedBonus;
          result.score = score;
          
          console.log(`[CategoryGame] Player ${playerId} (fallback): base=${score-speedBonus}, speed bonus=${speedBonus}, total=${score}, timeUsed=${timeUsed.toFixed(1)}s`);
        }
        scores[playerId] = result.score;
      });
      
      return {
        scores,
        playerResults,
        answerCounts,
        validAnswers: Object.keys(validAnswers),
        duplicates: Object.keys(answerCounts).filter(answer => answerCounts[answer] > 1),
        validationError: error.message,
        usedFallback: true
      };
    }
  }, [validateWordsBatch, getValidationStats]);

  // Store sendGameMessage and setBaseGamePhase for use in useEffect calls
  const sendGameMessageRef = useRef(null);
  const setBaseGamePhaseRef = useRef(null);

  // End game
  const endGame = useCallback((sendGameMessage, setBaseGamePhase) => {
    // If parameters are provided, store them for future use
    if (sendGameMessage) {
      sendGameMessageRef.current = sendGameMessage;
    }
    if (setBaseGamePhase) {
      setBaseGamePhaseRef.current = setBaseGamePhase;
    }
    
    // Use either provided parameters or stored refs
    const messageSender = sendGameMessage || sendGameMessageRef.current;
    const phaseSetter = setBaseGamePhase || setBaseGamePhaseRef.current;
    console.log('[CategoryGame] Game ended, calculating final results...');
    
    // Calculate final results
    const sortedPlayers = Object.entries(playerScores)
      .sort(([,a], [,b]) => b - a)
      .map(([playerId, score], index) => ({
        playerId,
        score,
        rank: index + 1
      }));
    
    const finalResults = {
      rankings: sortedPlayers,
      winner: sortedPlayers[0]?.playerId,
      totalRounds: currentRound,
      gameStats: {
        totalAnswers: Object.keys(playerAnswers).length,
        // Could add more stats here
      }
    };
    
    setGameResults(finalResults);
    setGamePhase('finished');
    
    // Also set the BaseGame phase to 'finished' so it shows GameResults
    if (phaseSetter) {
      console.log('[CategoryGame] Setting BaseGame phase to finished');
      phaseSetter('finished');
    } else {
      console.error('[CategoryGame] setBaseGamePhase is not available!');
    }
    
    // Send game finished message to all players
    console.log('[CategoryGame] Checking sendGameMessage availability:', !!messageSender);
    if (messageSender) {
      console.log('[CategoryGame] Sending gameFinished message to all players');
      console.log('[CategoryGame] Final scores being sent:', playerScores);
      console.log('[CategoryGame] Final results being sent:', finalResults);
      messageSender('gameFinished', {
        finalResults: finalResults,
        finalScores: playerScores,
        winner: finalResults.winner,
        gameStats: finalResults.gameStats
      });
      console.log('[CategoryGame] gameFinished message sent successfully');
    } else {
      console.error('[CategoryGame] sendGameMessage is not available! Cannot send gameFinished message');
    }
    
    return finalResults;
  }, [playerScores, currentRound, playerAnswers]);

  // Start new round
  const startNewRound = useCallback(() => {
    console.log(`[CategoryGame] Starting new round`);
    
    // Clear previous round data
    setPlayerAnswers({});
    setRoundResults(null);
    
    // Get new category
    const category = getRandomCategory();
    setCurrentCategory(category);
    
    // Start with category reveal phase
    setGamePhase('category-reveal');
    
    // After category reveal time, move to input phase
    setTimeout(() => {
      console.log('[CategoryGame] Moving from category-reveal to input phase');
      setGamePhase('input');
      setTimeRemaining(15);
    }, gameSettings.categoryRevealTime * 1000);
    
  }, [getRandomCategory, gameSettings.categoryRevealTime]);

  // Start timer when game phase changes to 'input'
  useEffect(() => {
    if (gamePhase === 'input') {
      console.log('[CategoryGame] Input phase started, starting timer...');
      roundStartTimeRef.current = Date.now(); // Record when input phase started
      startRoundTimer();
    }
  }, [gamePhase, startRoundTimer]);

  // Handle round progression - SIMPLIFIED to avoid infinite loops
  useEffect(() => {
    if (gamePhase === 'scoring') {
      console.log('[CategoryGame] Processing scoring phase...');
      
      // Calculate round scores asynchronously
      const processScoring = async () => {
        try {
          const results = await calculateRoundScores(playerAnswers, currentCategory?.name);
          setRoundResults(results);
          
          // Update total scores
          setPlayerScores(prevScores => {
            const newScores = { ...prevScores };
            Object.entries(results.scores).forEach(([playerId, score]) => {
              newScores[playerId] = (newScores[playerId] || 0) + score;
            });
            return newScores;
          });
          
          // Move to results phase after brief delay
          setTimeout(() => {
            setGamePhase('results');
          }, 1000);
          
        } catch (error) {
          console.error('[CategoryGame] Error during scoring:', error);
          
          // Fallback: create empty results and move to results phase
          setRoundResults({
            scores: {},
            playerResults: {},
            answerCounts: {},
            validAnswers: [],
            duplicates: [],
            validationError: error.message
          });
          
          setTimeout(() => {
            setGamePhase('results');
          }, 1000);
        }
      };
      
      processScoring();
    }
  }, [gamePhase, playerAnswers, currentCategory, calculateRoundScores]);

  // Handle round advancement - SEPARATE useEffect to avoid loops
  useEffect(() => {
    if (gamePhase === 'results') {
      const advanceTimer = setTimeout(() => {
        if (currentRound < totalRounds) {
          console.log(`[CategoryGame] Advancing to round ${currentRound + 1}`);
          setCurrentRound(prev => prev + 1);
          startNewRound();
        } else {
          console.log('[CategoryGame] All rounds completed, ending game');
          endGame(); // Note: sendGameMessage and setBaseGamePhase will be passed from the component
        }
      }, gameSettings.resultsDisplayTime * 1000);
      
      return () => clearTimeout(advanceTimer);
    }
  }, [gamePhase, currentRound, totalRounds, gameSettings.resultsDisplayTime, startNewRound, endGame]);

  // End current round (simplified - just trigger scoring phase)
  const endRound = useCallback(() => {
    console.log('[CategoryGame] Manually ending round...');
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setGamePhase('scoring');
  }, []);

  // Submit player answer
  const submitPlayerAnswer = useCallback((playerId, answer) => {
    if (gamePhase !== 'input') {
      console.log('[CategoryGame] Answer submission ignored - not in input phase');
      return false;
    }
    
    const timestamp = Date.now();
    setPlayerAnswers(prev => ({
      ...prev,
      [playerId]: { answer: answer.trim(), timestamp }
    }));
    
    console.log(`[CategoryGame] Answer submitted by ${playerId}: "${answer}"`);
    return true;
  }, [gamePhase]);

  // Manual advance (for host control)
  const forceNextRound = useCallback(() => {
    if (gamePhase === 'input' || gamePhase === 'category-reveal') {
      endRound();
    } else if (gamePhase === 'results' && currentRound < totalRounds) {
      setCurrentRound(prev => prev + 1);
      startNewRound();
    } else if (gamePhase === 'results' && currentRound >= totalRounds) {
      endGame(); // Note: sendGameMessage and setBaseGamePhase will be passed from the component
    }
  }, [gamePhase, currentRound, totalRounds, endRound, startNewRound, endGame]);

  // Reset game
  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }
    
    setGamePhase('waiting');
    setCurrentRound(1);
    setPlayerScores({});
    setPlayerAnswers({});
    setCurrentCategory(null);
    setRoundResults(null);
    setGameResults(null);
    resetUsedCategories();
  }, [resetUsedCategories]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
    };
  }, []);

  // Function to set the refs from component
  const setEndGameDependencies = useCallback((sendGameMessage, setBaseGamePhase) => {
    console.log('[CategoryGame] Setting endGame dependencies:', !!sendGameMessage, !!setBaseGamePhase);
    sendGameMessageRef.current = sendGameMessage;
    setBaseGamePhaseRef.current = setBaseGamePhase;
  }, []);

  return {
    // Game state
    gamePhase,
    currentRound,
    totalRounds,
    currentCategory,
    timeRemaining,
    
    // Player data
    playerAnswers,
    playerScores,
    roundResults,
    gameResults,
    
    // Settings
    gameSettings,
    
    // Actions
    initializeGame,
    startGame,
    submitPlayerAnswer,
    forceNextRound,
    resetGame,
    handleTimerEnd,
    endGame,
    setEndGameDependencies,
    
    // State setters (for message handler)
    setGamePhase,
    setCurrentRound,
    setCurrentCategory,
    setTimeRemaining,
    setPlayerScores,
    setRoundResults,
    setGameResults,
    
    // Helper
    getCategoryExamples,
    
    // References for timer synchronization
    roundStartTimeRef,
  };
}; 