import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { getApiBaseUrl } from "../utils/api";

/**
 * Custom hook to manage game state
 *
 * @returns {Object} Game state and methods to update it
 */
export const useGameState = () => {
  // Game status and core game state
  const [gameStatus, setGameStatus] = useState("waiting"); // 'waiting', 'playing', 'finished'
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [scores, setScores] = useState({});

  // Player and role state
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState("");
  const [clientId, setClientId] = useState(() => {
    const newClientId = uuidv4();
    console.log("Generated new clientId for this session:", newClientId);
    return newClientId;
  });
  const [players, setPlayers] = useState([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState({});

  // UI state
  const [inputGameId, setInputGameId] = useState("");
  const [status, setStatus] = useState("");
  const [qrCodeData, setQrCodeData] = useState(null);

  // Player info state
  const [playerInfoStage, setPlayerInfoStage] = useState("none"); // 'none', 'enterInfo', 'joining', 'joined'
  const [joinTargetGameId, setJoinTargetGameId] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [playerPhoneInput, setPlayerPhoneInput] = useState("");
  const [localPlayerName, setLocalPlayerName] = useState("");

  // Tie-breaker state
  const [tieBreakerState, setTieBreakerState] = useState({
    stage: "none", // 'none', 'breaking', 'resolved'
    tiedPlayerIds: [],
    ultimateWinnerId: null,
  });

  // Connection/Identification state
  const [isClientIdentified, setIsClientIdentified] = useState(false);

  // Reset the game state
  const resetGame = useCallback(() => {
    setGameStatus("waiting");
    setGameId("");
    setRole("");
    setPlayers([]);
    setScores({});
    setCurrentQuestionIndex(0);
    setHasAnswered(false);
    setSelectedAnswer(null);
    setQrCodeData(null);
    setInputGameId("");
    setCurrentQuestionAnswers({}); // Ensure answers are cleared

    // Reset player info state
    setPlayerInfoStage("none");
    setJoinTargetGameId("");
    setPlayerNameInput("");
    setPlayerPhoneInput("");
    setLocalPlayerName("");

    // Reset tie-breaker state
    setTieBreakerState({
      stage: "none",
      tiedPlayerIds: [],
      ultimateWinnerId: null,
    });

    // Clear status and reset timer
    setStatus("");
    setTimerKey((prev) => prev + 1);
    setIsClientIdentified(false); // Reset identification status

    console.log("Game state fully reset");
  }, []);

  // Calculate scores based on answers
  const calculateScores = useCallback(
    (questionIndex, receivedAnswers) => {
      if (questionIndex < 0 || questionIndex >= questions.length) {
        console.error(
          `Invalid questionIndex ${questionIndex} for score calculation.`,
        );
        return {}; // Return empty scores if index is invalid
      }

      const currentQuestion = questions[questionIndex];
      const correctAnswerIndex = currentQuestion.answerIndex;

      // Calculate new points for this round
      const roundScores = {};
      for (const [playerId, submittedAnswerIndex] of Object.entries(
        receivedAnswers,
      )) {
        if (submittedAnswerIndex === correctAnswerIndex) {
          roundScores[playerId] = (roundScores[playerId] || 0) + 1; // Simple: 1 point for correct answer
        } else {
          roundScores[playerId] = roundScores[playerId] || 0; // Ensure player has an entry even if wrong
        }
      }

      // Merge with existing scores
      const updatedScores = { ...scores };

      // Add all players to scores EXCEPT the host
      players.forEach((player) => {
        // Skip the host (the player with role 'host' or the one who created the game lobby)
        if (player.clientId === clientId && role === "host") {
          return; // Skip host
        }

        if (updatedScores[player.clientId] === undefined) {
          updatedScores[player.clientId] = 0;
        }
      });

      // Then add points for correct answers
      for (const [playerId, points] of Object.entries(roundScores)) {
        // Skip points for host
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

  // Add a player to the players list
  const addPlayer = useCallback((playerId, playerName) => {
    setPlayers((prevPlayers) => {
      // Avoid duplicates
      if (prevPlayers.some((p) => p.clientId === playerId)) {
        return prevPlayers;
      }

      return [
        ...prevPlayers,
        {
          clientId: playerId,
          name: playerName || `Player ${playerId.substring(0, 4)}`,
        },
      ];
    });
  }, []);

  // Remove a player from the players list
  const removePlayer = useCallback((playerId) => {
    setPlayers((prevPlayers) =>
      prevPlayers.filter((p) => p.clientId !== playerId),
    );
  }, []);

  // Advance to the next question
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setCurrentQuestionAnswers({});
    setHasAnswered(false);
    setSelectedAnswer(null);
    setTimerKey((prev) => prev + 1);
  }, []);

  const API_BASE_URL = getApiBaseUrl();

  const createLobbyAPI = async (clientId, gameType) => {
    console.log("Calling createLobby API...");
    if (!clientId) {
      throw new Error("Cannot create lobby: clientId is missing.");
    }
    if (!gameType) {
      throw new Error("Cannot create lobby: gameType is missing.");
    }
    const response = await fetch(`${API_BASE_URL}/createLobby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any other headers your API might require, like Authorization
      },
      body: JSON.stringify({
        hostId: clientId,
        gameType: gameType, // Use the provided gameType
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("createLobby API Error:", response.status, errorText);
      throw new Error(
        `Failed to create lobby: ${response.status} ${errorText}`,
      );
    }
    const data = await response.json();
    console.log("createLobby API Success:", data);
    if (!data.gameId) {
      throw new Error("Lobby created, but gameId missing in response.");
    }
    return data.gameId;
  };

  const getQrCodeAPI = async (gameId) => {
    console.log(`Calling getLobbyQRCode API for game ${gameId}...`);
    const response = await fetch(
      `${API_BASE_URL}/getLobbyQRCode?gameId=${gameId}`,
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("getLobbyQRCode API Error:", response.status, errorText);
      throw new Error(`Failed to get QR code: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    console.log("getLobbyQRCode API Success:", data);
    if (!data.qrCodeData) {
      // Decide if this is critical - maybe return null or a default?
      console.warn("QR code data missing in API response.");
      return null;
    }
    return data.qrCodeData; // Return the string data (e.g., URL) to be encoded
  };

  const getQuestionsAPI = async (gameId) => {
    console.log(`Calling getQuestions API for game ${gameId}...`);
    // Adjust endpoint/query params as needed by your backend
    const response = await fetch(
      `${API_BASE_URL}/getQuestions?gameId=${gameId}`,
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("getQuestions API Error:", response.status, errorText);
      throw new Error(
        `Failed to get questions: ${response.status} ${errorText}`,
      );
    }
    const data = await response.json();
    console.log("getQuestions API Success:", data);
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Invalid questions data received from API.");
    }
    return data.questions;
  };

  return {
    // Game state
    gameStatus,
    setGameStatus,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timerKey,
    setTimerKey,
    scores,
    setScores,

    // Player state
    gameId,
    setGameId,
    role,
    setRole,
    clientId,
    setClientId,
    players,
    setPlayers,
    hasAnswered,
    setHasAnswered,
    selectedAnswer,
    setSelectedAnswer,
    currentQuestionAnswers,
    setCurrentQuestionAnswers,

    // UI state
    inputGameId,
    setInputGameId,
    status,
    setStatus,
    qrCodeData,
    setQrCodeData,

    // Player info state
    playerInfoStage,
    setPlayerInfoStage,
    joinTargetGameId,
    setJoinTargetGameId,
    playerNameInput,
    setPlayerNameInput,
    playerPhoneInput,
    setPlayerPhoneInput,
    localPlayerName,
    setLocalPlayerName,

    // Tie-breaker state
    tieBreakerState,
    setTieBreakerState,

    // Identification state
    isClientIdentified,
    setIsClientIdentified,

    // Methods
    resetGame,
    calculateScores,
    checkForTie,
    addPlayer,
    removePlayer,
    advanceToNextQuestion,

    // API Call placeholders (can be moved to a separate api.js file later)
    createLobbyAPI,
    getQrCodeAPI,
    getQuestionsAPI,
  };
};
