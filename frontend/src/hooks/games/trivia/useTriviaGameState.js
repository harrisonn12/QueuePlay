import { useState, useCallback } from 'react';
import { getStoredToken } from '../../../utils/api/auth';
import { getQuestions } from '../../../utils/api/trivia';
import { useTieBreakerAnimation } from './useTieBreakerAnimation';

export const useTriviaGameState = () => {
  // Game configuration
  const timePerQuestion = 10; // seconds per question
  
  // Trivia-specific state
  const [gamePhase, setGamePhase] = useState("playing"); // Start as playing since TriviaGame only renders when game should start
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
    (questionIndex, receivedAnswers, players, clientId, role) => {
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
    [questions, scores],
  );

  // Advance to next question
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      console.log(`[TriviaState] advanceToNextQuestion: ${prev} -> ${prev + 1}`);
      return prev + 1;
    });
    setHasAnswered(false);
    setSelectedAnswer(null);
    setCurrentQuestionAnswers({});
    setTimerKey((prev) => {
      console.log(`[TriviaState] updating timerKey: ${prev} -> ${prev + 1}`);
      return prev + 1;
    });
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

  // Load questions for the host
  const loadQuestions = useCallback(async (gameId, role, setStatus) => {
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
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGamePhase('playing');
  }, []);

  // End game
  const endGame = useCallback(() => {
    setGamePhase('finished');
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    setGamePhase('waiting');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setTimerKey(0);
    setScores({});
    setHasAnswered(false);
    setSelectedAnswer(null);
    setCurrentQuestionAnswers({});
    setTieBreakerState({
      stage: "none",
      tiedPlayerIds: [],
      ultimateWinnerId: null,
    });
  }, []);

  // Tie breaker handler
  const handleTieResolved = useCallback((winnerId, ensureConnected, gameId, clientId) => {
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
      setTieBreakerState({ stage: 'none', tiedPlayerIds: [], ultimateWinnerId: null });
    }
  }, []);

  // Set up the tie-breaker animation handler
  const isTieBreaking = tieBreakerState.stage === 'breaking';
  const tieBreakerAnimation = useTieBreakerAnimation(
    tieBreakerState.tiedPlayerIds,
    isTieBreaking,
    () => {} // Will be set up in component
  );

  return {
    // State
    gamePhase,
    setGamePhase,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timerKey,
    setTimerKey,
    scores,
    setScores,
    hasAnswered,
    setHasAnswered,
    selectedAnswer,
    setSelectedAnswer,
    currentQuestionAnswers,
    setCurrentQuestionAnswers,
    tieBreakerState,
    setTieBreakerState,
    timePerQuestion,
    
    // Actions
    calculateScores,
    advanceToNextQuestion,
    checkForTie,
    loadQuestions,
    startGame,
    endGame,
    resetGame,
    handleTieResolved,
    
    // Tie breaker animation
    isTieBreaking,
    isAnimatingTie: tieBreakerAnimation.isAnimating,
    highlightedPlayerIndex: tieBreakerAnimation.highlightedIndex,
  };
}; 