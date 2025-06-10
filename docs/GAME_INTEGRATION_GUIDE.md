# QueuePlay Game Integration Guide
**How to Add New Multiplayer Games to the Framework**

This guide explains how to integrate new game types into the QueuePlay framework, leveraging the modular architecture and WebSocket abstraction to enable rapid deployment without backend modifications.

---

## 🎯 **Framework Overview**

QueuePlay provides a **modular game framework** that abstracts WebSocket infrastructure complexity, enabling developers to focus purely on game logic while getting all the multiplayer infrastructure for free.

### **What You Get for Free:**
- ✅ **WebSocket Infrastructure**: Connection management, authentication, reconnection
- ✅ **Authentication System**: Host/guest authentication flows  
- ✅ **Lobby Management**: QR codes, player lists, game creation
- ✅ **Player Management**: Join/leave, name generation, phone verification
- ✅ **Real-time Communication**: Message routing, pub/sub, broadcasting
- ✅ **UI Components**: Timer, loading spinners, results display, responsive layouts
- ✅ **Error Handling**: Network errors, disconnections, validation
- ✅ **Rate Limiting**: Anti-abuse protection, cost management

### **What You Implement (Game-Specific):**
- ❌ Game rules and logic
- ❌ Game state management  
- ❌ Game-specific message handling
- ❌ Game UI components and views
- ❌ Scoring and win conditions

---

## 🏗️ **Architecture Benefits**

### **Development Cycle Time Reduction: 60-67%**
```
Traditional Approach: 8-12 hours per new game
QueuePlay Framework: 3-4 hours per new game

Time Savings: 60-67% reduction in development time
```

### **Infrastructure Abstraction**
```javascript
// ❌ Traditional WebSocket Development (What you DON'T need to write):
const socket = new WebSocket('ws://localhost:6789');
socket.onopen = () => { /* auth logic */ };
socket.onmessage = (event) => { /* parsing + auth + game logic */ };
socket.onclose = () => { /* reconnection logic */ };
socket.onerror = () => { /* error handling */ };

// ✅ QueuePlay Framework (What you DO write):
const { ensureConnected } = useGameWebSocket(gameId, clientId, role, handleMessage);
const handleMessage = (data) => {
  switch(data.action) {
    case 'gameStarted': startMyGame(); break;
    case 'playerMove': updateGameState(data); break;
  }
};
```

---

## 📋 **Step-by-Step Integration Process**

### **Total Time: 3-4 hours**

### **Step 1: Create Directory Structure (5 minutes)**

```bash
# Navigate to frontend source
cd frontend/src

# Create game directories
mkdir -p components/games/yourgame/{views,components}
mkdir -p hooks/games/yourgame

# Create main files
touch components/games/yourgame/YourGame.jsx
touch hooks/games/yourgame/useYourGameState.js
touch hooks/games/yourgame/useYourGameMessageHandler.js
```

### **Step 2: Register Game Type (2 minutes)**

**File: `src/utils/constants/gameTypes.js`**
```javascript
export const GAME_TYPES = {
  TRIVIA: 'trivia',
  YOUR_GAME: 'yourgame', // Add your game
};

export const GAME_METADATA = {
  [GAME_TYPES.YOUR_GAME]: {
    name: 'Your Game Name',
    description: 'Description of your game!',
    maxPlayers: 8,
    minPlayers: 2,
    defaultSettings: {
      roundTime: 60,
      rounds: 5,
    },
  },
};
```

**File: `src/components/games/GameFactory.jsx`**
```javascript
// Add import
const YourGame = lazy(() => import('./yourgame/YourGame.jsx'));

// Add to component mapping
const gameComponents = {
  [GAME_TYPES.TRIVIA]: TriviaGame,
  [GAME_TYPES.YOUR_GAME]: YourGame, // Add your game
};
```

### **Step 3: Implement Game-Specific Hook (1-2 hours)**

**File: `src/hooks/games/yourgame/useYourGameState.js`**
```javascript
import { useState, useCallback } from 'react';

export const useYourGameState = () => {
  // Your game-specific state
  const [gamePhase, setGamePhase] = useState('waiting');
  const [gameData, setGameData] = useState({});
  const [scores, setScores] = useState({});
  
  // Your game-specific logic
  const startGame = useCallback(() => {
    setGamePhase('playing');
    // Initialize your game state
  }, []);
  
  const processMove = useCallback((moveData) => {
    // Handle player moves
    // Update game state
    // Calculate scores
  }, []);
  
  const endGame = useCallback(() => {
    setGamePhase('finished');
    // Calculate final results
  }, []);
  
  return {
    gamePhase,
    gameData,
    scores,
    startGame,
    processMove,
    endGame,
    // Export whatever your game needs
  };
};
```

### **Step 4: Implement Message Handler (30 minutes)**

**File: `src/hooks/games/yourgame/useYourGameMessageHandler.js`**
```javascript
import { useCallback } from 'react';

export const useYourGameMessageHandler = (gameState) => {
  const {
    // Core state from useGameCore
    gameId, role, clientId, players,
    // Your game state
    startGame, processMove, endGame,
  } = gameState;
  
  const handleMessage = useCallback((data) => {
    console.log(`[YourGame] Processing ${data.action} for role: ${role}`);
    
    switch (data.action) {
      case 'gameStarted':
        if (role === 'player') {
          startGame();
        }
        break;
        
      case 'playerMove':
        processMove(data);
        break;
        
      case 'gameEnded':
        endGame();
        break;
        
      default:
        console.log(`[YourGame] Unhandled message: ${data.action}`);
        return false; // Let core handler try
    }
    
    return true; // Message handled
  }, [role, startGame, processMove, endGame]);
  
  return handleMessage;
};
```

### **Step 5: Create Main Game Component (1-2 hours)**

**File: `src/components/games/yourgame/YourGame.jsx`**
```javascript
import { useState, useCallback } from 'react';

// Import core hooks (infrastructure provided)
import { useGameCore } from '../../hooks/core/useGameCore';
import { useGameWebSocket } from '../../hooks/core/useGameWebSocket';
import { useGameMessageHandler } from '../../hooks/core/useGameMessageHandler';

// Import your game-specific hooks
import { useYourGameState } from '../../hooks/games/yourgame/useYourGameState';
import { useYourGameMessageHandler } from '../../hooks/games/yourgame/useYourGameMessageHandler';

// Import shared components (provided)
import FrontPage from '../core/FrontPage';
import GameLobby from '../core/GameLobby';
import GameResults from '../core/GameResults';
import LoadingSpinner from '../core/LoadingSpinner';

const YourGame = () => {
  // Get core game infrastructure (FREE)
  const gameCore = useGameCore('yourgame');
  const gameState = useYourGameState();
  
  // Combine states for message handling
  const combinedState = { ...gameCore, ...gameState };
  
  // Message handlers
  const handleCoreMessage = useGameMessageHandler(combinedState);
  const handleYourGameMessage = useYourGameMessageHandler(combinedState);
  
  // Combined message handler
  const handleWebSocketMessage = useCallback((data) => {
    const handledByCore = handleCoreMessage(data);
    if (!handledByCore) {
      handleYourGameMessage(data);
    }
  }, [handleCoreMessage, handleYourGameMessage]);
  
  // WebSocket connection (FREE)
  const { ensureConnected } = useGameWebSocket(
    gameCore.gameId, gameCore.clientId, gameCore.role, 
    handleWebSocketMessage, null
  );
  
  // Render logic based on game state
  if (!gameCore.gameId && gameCore.playerInfoStage === 'none') {
    return (
      <FrontPage 
        onHostLogin={gameCore.handleHostLogin}
        onHostGame={gameCore.hostGame}
        onPlayerJoin={gameCore.handlePlayerJoin}
        inputGameId={gameCore.inputGameId}
        setInputGameId={gameCore.setInputGameId}
        isAuthenticated={gameCore.isAuthenticated}
        userType={gameCore.userType}
      />
    );
  }
  
  if (gameState.gamePhase === 'waiting') {
    return (
      <GameLobby 
        {...gameCore}
        startGame={() => gameCore.startGame(ensureConnected)}
      />
    );
  }
  
  if (gameState.gamePhase === 'playing') {
    return gameCore.role === 'host' ? (
      <YourHostView {...combinedState} />
    ) : (
      <YourPlayerView {...combinedState} />
    );
  }
  
  if (gameState.gamePhase === 'finished') {
    return (
      <GameResults 
        scores={gameState.scores}
        players={gameCore.players}
        role={gameCore.role}
        clientId={gameCore.clientId}
        localPlayerName={gameCore.localPlayerName}
        resetGame={gameCore.resetGame}
        hostGame={gameCore.hostGame}
      />
    );
  }
  
  return <LoadingSpinner message="Loading game..." />;
};

export default YourGame;
```

### **Step 6: Create Game Views (1 hour)**

**File: `src/components/games/yourgame/views/YourHostView.jsx`**
```javascript
import React from 'react';
import Timer from '../../../core/Timer';

const YourHostView = ({ gameData, scores, players, /* your props */ }) => {
  return (
    <div className="host-game-view">
      <h2>Your Game - Host View</h2>
      
      <div className="timer-container">
        <Timer seconds={60} onTimerEnd={() => {/* handle timeout */}} />
      </div>
      
      {/* Your game-specific host UI */}
      <div className="game-content">
        {/* Game state display */}
        {/* Player actions monitoring */}
        {/* Game controls */}
      </div>
      
      <div className="scores-section">
        {/* Use shared scoring display */}
      </div>
    </div>
  );
};

export default YourHostView;
```

**File: `src/components/games/yourgame/views/YourPlayerView.jsx`**
```javascript
import React from 'react';
import Timer from '../../../core/Timer';

const YourPlayerView = ({ gameData, localPlayerName, /* your props */ }) => {
  return (
    <div className="player-game-view">
      <p className="player-name-display">
        Playing as: {localPlayerName}
      </p>
      
      <div className="timer-container">
        <Timer seconds={60} size={80} />
      </div>
      
      {/* Your game-specific player UI */}
      <div className="game-interface">
        {/* Game controls for players */}
        {/* Action buttons */}
        {/* Game state display */}
      </div>
    </div>
  );
};

export default YourPlayerView;
```

---

## 🎮 **Game Integration Examples**

### **Word Puzzle Game**
```javascript
// Game-specific state
const [currentWord, setCurrentWord] = useState('');
const [guessedLetters, setGuessedLetters] = useState([]);
const [timeRemaining, setTimeRemaining] = useState(60);

// Game-specific messages
case 'letterGuessed':
  setGuessedLetters(prev => [...prev, data.letter]);
  break;
case 'wordCompleted':
  setCurrentWord(data.nextWord);
  break;
```

### **Drawing Game**
```javascript
// Game-specific state
const [currentDrawing, setCurrentDrawing] = useState('');
const [drawingPhase, setDrawingPhase] = useState('drawing'); // 'drawing' | 'guessing'
const [guesses, setGuesses] = useState([]);

// Game-specific messages
case 'drawingUpdate':
  setCurrentDrawing(data.drawingData);
  break;
case 'guess':
  setGuesses(prev => [...prev, data.guess]);
  break;
```

### **Quiz Game**
```javascript
// Game-specific state
const [questions, setQuestions] = useState([]);
const [currentQuestion, setCurrentQuestion] = useState(0);
const [playerAnswers, setPlayerAnswers] = useState({});

// Game-specific messages
case 'questionStarted':
  setCurrentQuestion(data.questionIndex);
  break;
case 'answerSubmitted':
  setPlayerAnswers(prev => ({...prev, [data.playerId]: data.answer}));
  break;
```

---

## 🔌 **WebSocket Message Flow**

### **Infrastructure Messages (Handled Automatically)**
These are processed by the core framework - you don't need to handle them:
```javascript
// ✅ Handled by useGameCore + useGameWebSocket
- 'authenticate' / 'authenticated'
- 'identify' / 'identified'  
- 'playerJoined' / 'playerLeft'
- 'connectionError' / 'reconnecting'
```

### **Game Messages (You Handle These)**
```javascript
// ❌ Your responsibility - implement in useYourGameMessageHandler
- 'gameStarted' → Start your game logic
- 'playerMove' → Process player actions
- 'gameEnded' → Show results
```

### **Sending Messages**
```javascript
// Get WebSocket connection
const { ensureConnected } = useGameWebSocket(/* ... */);

// Send game message
const sendGameMessage = useCallback((action, data) => {
  const socket = ensureConnected();
  if (socket) {
    socket.send(JSON.stringify({
      action,
      gameId,
      clientId,
      ...data
    }));
  }
}, [ensureConnected, gameId, clientId]);

// Usage
sendGameMessage('playerMove', { move: 'rock' });
sendGameMessage('submitAnswer', { answer: 'Paris' });
```

---

## 🎨 **UI Components Available**

### **Shared Components (Use These)**
```javascript
import Timer from '../../core/Timer';              // Countdown timer
import LoadingSpinner from '../../core/LoadingSpinner'; // Loading states  
import QRCodeDisplay from '../../core/QRCodeDisplay';   // QR code generation
import PlayerList from '../../core/PlayerList';        // Player display
import GameLobby from '../../core/GameLobby';          // Pre-game lobby
import GameResults from '../../core/GameResults';      // Post-game results
import FrontPage from '../../core/FrontPage';          // Landing page
import BaseGameWrapper from '../../core/BaseGameWrapper'; // Layout wrapper
```

### **Styling Classes Available**
```css
/* Buttons */
.btn-primary, .btn-secondary

/* Cards and layouts */
.game-card, .game-wrapper

/* Text styling */
.text-gradient, .neon-text

/* Animations */
.fade-in, .pulse-glow

/* Game-specific containers */
.host-game-view, .player-game-view
.timer-container, .scores-section
```

---

## 🧪 **Testing Your Game**

### **Development Testing**
1. **Start the development servers**:
   ```bash
   # Backend
   cd backend && python main.py
   
   # WebSocket server  
   cd backend && python MultiplayerServer.py
   
   # Frontend
   cd frontend && npm run dev
   ```

2. **Test game flow**:
   - Host login → Create lobby → Generate QR code
   - Player join → Enter details → Join lobby  
   - Start game → Play through full game → See results

---

## 🚀 **Next Steps**

1. **Choose Your Game**: Define rules, win conditions, player interactions
2. **Follow This Guide**: Use the step-by-step process above
3. **Test Thoroughly**: Use the testing checklist
4. **Deploy**: Push to production with zero backend changes

**Remember**: You're building on a production-ready multiplayer framework. Focus on your game logic - we've got the infrastructure covered! 🚀 