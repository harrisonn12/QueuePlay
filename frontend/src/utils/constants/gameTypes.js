// Available game types configuration
export const GAME_TYPES = {
  TRIVIA: 'trivia',
  // Future games can be added here:
  // WORD_GAME: 'wordgame',
  // MATH_QUIZ: 'mathquiz',
};

// Game metadata for each game type
export const GAME_METADATA = {
  [GAME_TYPES.TRIVIA]: {
    name: 'Trivia Game',
    description: 'Answer questions to test your knowledge!',
    maxPlayers: 20,
    minPlayers: 1,
    defaultSettings: {
      timePerQuestion: 10,
      questionsPerGame: 10,
    },
  },
  // Future games metadata:
  // [GAME_TYPES.WORD_GAME]: {
  //   name: 'Word Game',
  //   description: 'Find words and beat your friends!',
  //   maxPlayers: 8,
  //   minPlayers: 2,
  //   defaultSettings: {
  //     timePerRound: 60,
  //     rounds: 5,
  //   },
  // },
};

// Helper function to get game metadata
export const getGameMetadata = (gameType) => {
  return GAME_METADATA[gameType] || null;
};

// Helper function to get all available games
export const getAvailableGames = () => {
  return Object.values(GAME_TYPES);
}; 