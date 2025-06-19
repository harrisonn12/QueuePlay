# AI Game Implementation Context for QueuePlay
**Complete Context for AI Models to Successfully Implement New Games**

This document provides all necessary context for an AI model to implement a new multiplayer game within the QueuePlay framework without requiring additional clarification or exploration.

---

## 🎯 **Project Overview**

**QueuePlay** is a real-time multiplayer party game platform where:
- **Host** manages the game on a large screen (TV/computer)
- **Players** use their phones to participate
- Games are **host-centric** (host controls game state and flow)
- **WebSocket-based** real-time communication
- **Modular architecture** allows adding new games without backend changes

### **Current Games Implemented:**
1. **Trivia Game** - Multiple choice questions with scoring
2. **Category Game** - Players submit words for categories, validation via AI
3. **Math Game** - Quick math problems with speed-based scoring

---

## 🏗️ **Architecture Overview**

### **Host-Centric Design:**
- Host screen displays game content (questions, results, timer)
- Host manages all game state and logic
- Players see simplified interface on phones
- All game logic runs on host client, not server

### **Technology Stack:**
- **Frontend**: React.js with hooks and functional components
- **Backend**: FastAPI (Python) + WebSocket server
- **Real-time**: WebSocket connections with Redis pub/sub
- **Authentication**: JWT tokens for host/guest access
- **Database**: Redis for lobby/session management

### **Key Infrastructure Components:**
- `BaseGame.jsx` - Handles authentication, lobby, WebSocket connection
- `GameFactory.jsx` - Routes to specific game components based on selection
- `useGameCore.js` - Core game state (players, lobby, connection)
- `useGameWebSocket.js` - WebSocket connection management
- Game-specific components handle only game logic

---

## ⚡ **CRITICAL SUCCESS PATTERNS** 
*Based on actual implementation experience - follow these exactly:*

### **🔥 Game Phase Management (MOST IMPORTANT)**
```javascript
// ✅ CORRECT: Use BaseGame's setGamePhase for 'finished' state
if (gameState.setGamePhase) {
  gameState.setGamePhase('finished'); // This triggers GameResults
}

// ✅ CORRECT: Store final scores in gameData for BaseGame
if (gameState.setGameData) {
  gameState.setGameData(prev => ({
    ...prev,
    finalScores: finalScores // BaseGame expects this exact key
  }));
}

// ❌ WRONG: Don't use local game phase for 'finished'
setLocalGamePhase('finished'); // This won't work
```

### **🔥 Message Handler Registration (CRITICAL)**
```javascript
// ✅ CORRECT: Use useRef to prevent re-registration loops
const messageHandlerRef = useRef(handleYourGameMessage);
messageHandlerRef.current = handleYourGameMessage;

const stableMessageHandler = useCallback((data) => {
  return messageHandlerRef.current(data);
}, []);

useEffect(() => {
  if (registerMessageHandler) {
    registerMessageHandler(stableMessageHandler);
  }
}, [registerMessageHandler, stableMessageHandler]);
```

### **🔥 Game End Flow (ESSENTIAL PATTERN)**
```javascript
// ✅ CORRECT: Complete game end sequence
const endGame = () => {
  // 1. Send message to all players
  sendGameMessage('gameFinished', {
    finalScores: scores,
    players: players
  });
  
  // 2. Message handler will receive this and call:
  // - gameState.setGamePhase('finished') 
  // - gameState.setGameData({ finalScores: ... })
  
  // 3. BaseGame automatically renders GameResults
};
```

### **🔥 State Management (AVOID CONFLICTS)**
```javascript
// ✅ CORRECT: Combine states properly
const combinedState = { 
  ...gameSpecificState, 
  ...gameCore // gameCore comes LAST to override conflicts
};

// ⚠️ IMPORTANT: Use gameCore's setGamePhase, not your own
// BaseGame provides setGamePhase through gameCore
```

---

## 📁 **File Structure**

```
QueuePlay/
├── frontend/src/
│   ├── components/
│   │   ├── games/
│   │   │   ├── trivia/           # Existing trivia game
│   │   │   ├── category/         # Existing category game
│   │   │   ├── math/             # Existing math game
│   │   │   └── [NEW_GAME]/       # Your new game goes here
│   │   └── core/                 # Shared UI components
│   ├── hooks/
│   │   ├── games/
│   │   │   ├── trivia/           # Trivia-specific hooks
│   │   │   ├── category/         # Category-specific hooks
│   │   │   ├── math/             # Math-specific hooks
│   │   │   └── [NEW_GAME]/       # Your game hooks go here
│   │   └── core/                 # Core infrastructure hooks
│   └── utils/
│       └── gameRegistry.js       # Game registration system
└── backend/
    ├── main.py                   # API endpoints (if needed)
    └── [Services]/               # Various backend services
```

---

## 🎮 **Game Integration Process**

### **Step 1: Create Game Structure**
Create these files for your new game:
```
frontend/src/components/games/[game_name]/
├── [GameName].jsx              # Main game component
├── views/
│   ├── [GameName]HostView.jsx  # Host screen view
│   └── [GameName]PlayerView.jsx # Player phone view
└── components/                 # Game-specific components (optional)

frontend/src/hooks/games/[game_name]/
├── use[GameName]State.js       # Game state management
└── use[GameName]MessageHandler.js # WebSocket message handling
```

### **Step 2: Self-Registration**
Games automatically register themselves using the `registerGame` decorator:

```javascript
import { registerGame } from '../../../utils/gameRegistry';

const YourGameWithRegistration = registerGame('yourgame', {
  activePhases: ['playing', 'scoring'], // Define your game phases
  metadata: {
    name: 'Your Game Name',
    description: 'Description of your game!',
    minPlayers: 2,
    maxPlayers: 8,
    defaultSettings: { roundTime: 60, rounds: 5 }
  }
})(YourGame);

export default YourGameWithRegistration;
```

### **Step 3: Add Import to GameFactory**
Add one line to `src/components/games/GameFactory.jsx`:
```javascript
import './yourgame/YourGame.jsx'; // This triggers auto-registration
```

**That's it!** No other manual configuration needed.

---

## 🔌 **WebSocket Message Flow**

### **Infrastructure Messages (Handled Automatically):**
```javascript
// ✅ You DON'T handle these - BaseGame handles them
'authenticate' / 'authenticated'
'identify' / 'identified'  
'playerJoined' / 'playerLeft'
'connectionError' / 'reconnecting'
```

### **Game Messages (You Handle These):**
```javascript
// ❌ Your responsibility in useYourGameMessageHandler
'startGame'      → Initialize game (from BaseGame)
'playerAction'   → Process player moves/answers  
'gameFinished'   → End game and show results
'nextRound'      → Progress to next round
'timerUpdate'    → Sync timers across devices
```

### **Sending Messages:**
```javascript
// Available in your game component
sendGameMessage('playerAction', { 
  playerId: 'player123',
  action: 'submitAnswer',
  data: { answer: 'Paris' }
});
```

---

## 🎨 **Available UI Components**

### **Shared Components (Import These):**
```javascript
import Timer from '../../core/Timer';              // Countdown timer
import LoadingSpinner from '../../core/LoadingSpinner'; // Loading states  
import QRCodeDisplay from '../../core/QRCodeDisplay';   // QR code generation
import PlayerList from '../../core/PlayerList';        // Player display
import GameLobby from '../../core/GameLobby';          // Pre-game lobby
import GameResults from '../../core/GameResults';      // Post-game results
```

### **Available CSS Classes:**
```css
/* Buttons */
.btn-primary, .btn-secondary, .btn-danger

/* Cards and layouts */
.game-card, .game-wrapper, .host-game-view, .player-game-view

/* Text styling */
.text-gradient, .neon-text

/* Animations */
.fade-in, .pulse-glow

/* Game-specific containers */
.timer-container, .scores-section, .game-content
```

---

## 🚀 **Game Component Template**

### **Main Game Component Structure:**
```javascript
import { useCallback, useEffect, useRef } from 'react';
import { registerGame } from '../../../utils/gameRegistry';
import { useYourGameState } from '../../../hooks/games/yourgame/useYourGameState';
import { useYourGameMessageHandler } from '../../../hooks/games/yourgame/useYourGameMessageHandler';
import YourHostView from './views/YourHostView';
import YourPlayerView from './views/YourPlayerView';

const YourGame = ({ 
  gameCore, 
  gameData,
  sendGameMessage, 
  ensureConnected,
  registerMessageHandler,
  skipAuth = false 
}) => {
  // Your game-specific state
  const gameState = useYourGameState();
  
  // ⚠️ CRITICAL: gameCore comes LAST to override conflicts
  const combinedState = { ...gameState, ...gameCore };
  
  // Message handling with useRef pattern (ESSENTIAL)
  const handleYourGameMessage = useYourGameMessageHandler(combinedState);
  const messageHandlerRef = useRef(handleYourGameMessage);
  messageHandlerRef.current = handleYourGameMessage;
  
  const stableMessageHandler = useCallback((data) => {
    return messageHandlerRef.current(data);
  }, []);
  
  // Register message handler (CRITICAL - no dependencies on handler)
  useEffect(() => {
    if (registerMessageHandler) {
      registerMessageHandler(stableMessageHandler);
    }
  }, [registerMessageHandler, stableMessageHandler]);
  
  // Render based on role
  if (gameCore.role === 'host') {
    return (
      <YourHostView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
        gameState={gameState} // Pass game state for actions
      />
    );
  } else {
    return (
      <YourPlayerView 
        {...combinedState}
        sendGameMessage={sendGameMessage}
        ensureConnected={ensureConnected}
      />
    );
  }
};

// Self-register the game
const YourGameWithRegistration = registerGame('yourgame', {
  activePhases: ['playing', 'scoring'], // Your game phases
  metadata: {
    name: 'Your Game Name',
    description: 'Description of your game!',
    minPlayers: 2,
    maxPlayers: 8,
    defaultSettings: { roundTime: 60, rounds: 5 }
  }
})(YourGame);

export default YourGameWithRegistration;
```

---

## 🎯 **Game State Hook Template**

### **useYourGameState.js:**
```javascript
import { useState, useCallback } from 'react';

export const useYourGameState = () => {
  // Game-specific state
  const [gamePhase, setGamePhase] = useState('playing'); // Local phases only
  const [scores, setScores] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [gameSettings, setGameSettings] = useState({
    roundTime: 30,
    totalRounds: 5
  });
  
  // Game logic functions
  const startGame = useCallback(() => {
    setGamePhase('playing');
    setCurrentRound(1);
    // Initialize your game
  }, []);
  
  const endGame = useCallback(() => {
    // Don't set gamePhase to 'finished' here
    // The message handler will handle BaseGame state
  }, []);
  
  return {
    // State
    gamePhase,
    scores,
    currentRound,
    gameSettings,
    
    // Actions
    startGame,
    endGame,
    
    // Setters
    setGamePhase,
    setScores,
    setCurrentRound,
    setGameSettings
  };
};
```

---

## 📨 **Message Handler Template**

### **useYourGameMessageHandler.js:**
```javascript
import { useCallback } from 'react';

export const useYourGameMessageHandler = (gameState) => {
  const {
    // Core state from useGameCore
    gameId, role, clientId, players,
    // Your game state
    startGame, endGame, setScores,
  } = gameState;
  
  const handleMessage = useCallback((data) => {
    console.log(`[YourGame] Processing ${data.action} for role: ${role}`);
    
    switch (data.action) {
      case 'startGame':
        // BaseGame sends this when game starts
        if (role === 'player') {
          startGame();
        }
        break;
        
      case 'playerAction':
        // Process player moves (host only)
        if (role === 'host') {
          // Handle player action
          console.log('[YourGame] Player action:', data);
        }
        break;
        
      case 'gameFinished':
        console.log('[YourGame] Game finished:', data);
        
        // ⚠️ CRITICAL: Update BaseGame state for results screen
        if (gameState.setGamePhase) {
          gameState.setGamePhase('finished');
        }
        
        if (gameState.setGameData) {
          gameState.setGameData(prev => ({
            ...prev,
            finalScores: data.finalScores || {}
          }));
        }
        
        // Update local scores
        if (data.finalScores) {
          setScores(data.finalScores);
        }
        
        // Clean up local state
        endGame();
        break;
        
      default:
        console.log(`[YourGame] Unhandled message: ${data.action}`);
        return false; // Let core handler try
    }
    
    return true; // Message handled
  }, [role, startGame, endGame, setScores, gameState]);
  
  return handleMessage;
};
```

---

## 🖥️ **View Templates**

### **Host View Template:**
```javascript
import React from 'react';
import Timer from '../../../core/Timer';

const YourHostView = ({ 
  gamePhase, 
  scores, 
  players, 
  currentRound,
  gameSettings,
  sendGameMessage,
  gameState // Access to game actions
}) => {
  
  // Timer completion handler
  const handleTimerComplete = () => {
    // End current round/game logic
    const isLastRound = currentRound >= gameSettings.totalRounds;
    
    if (isLastRound) {
      // End game - send to all players
      sendGameMessage('gameFinished', {
        finalScores: scores,
        players: players
      });
      // Message handler will handle BaseGame state
    } else {
      // Next round
      sendGameMessage('nextRound', {
        nextRound: currentRound + 1
      });
      gameState.setCurrentRound(currentRound + 1);
    }
  };
  
  if (gamePhase === 'playing') {
    return (
      <div className="host-game-view">
        <div className="game-header">
          <h2>Round {currentRound} of {gameSettings.totalRounds}</h2>
          <div className="timer-container">
            <Timer 
              seconds={gameSettings.roundTime} 
              onTimerEnd={handleTimerComplete}
            />
          </div>
        </div>
        
        <div className="game-content">
          {/* Your game-specific host UI */}
        </div>
        
        <div className="scores-section">
          <h3>Current Scores</h3>
          {Object.entries(scores).map(([playerId, score]) => {
            const player = players.find(p => p.clientId === playerId);
            return (
              <div key={playerId} className="score-item">
                {player?.name}: {score}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Let BaseGame handle 'finished' state with GameResults
  return <div>Loading...</div>;
};

export default YourHostView;
```

### **Player View Template:**
```javascript
import React, { useState } from 'react';
import Timer from '../../../core/Timer';

const YourPlayerView = ({ 
  gamePhase, 
  localPlayerName,
  sendGameMessage,
  clientId,
  gameSettings
}) => {
  const [playerInput, setPlayerInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const handleSubmit = () => {
    if (!playerInput.trim() || hasSubmitted) return;
    
    sendGameMessage('playerAction', {
      playerId: clientId,
      action: 'submit',
      data: playerInput.trim()
    });
    
    setHasSubmitted(true);
  };
  
  if (gamePhase === 'playing') {
    return (
      <div className="player-game-view">
        <p className="player-name-display">
          Playing as: {localPlayerName}
        </p>
        
        <div className="timer-container">
          <Timer seconds={gameSettings.roundTime} size={80} />
        </div>
        
        {!hasSubmitted ? (
          <div className="game-interface">
            <input
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder="Enter your answer..."
              className="player-input"
            />
            <button 
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!playerInput.trim()}
            >
              Submit
            </button>
          </div>
        ) : (
          <div className="submitted-state">
            <h3>Answer Submitted!</h3>
            <p>Waiting for other players...</p>
          </div>
        )}
      </div>
    );
  }
  
  // Let BaseGame handle 'finished' state with GameResults
  return <div>Loading...</div>;
};

export default YourPlayerView;
```

---

## 🔧 **Backend Integration (If Needed)**

### **When You Need Backend Endpoints:**
- External API calls (like trivia questions)
- Complex validation logic
- Persistent data storage

### **Adding New Endpoints:**
Add to `backend/main.py`:
```python
@app.get("/getYourGameData", tags=["Game API"])
async def get_your_game_data(
    request: Request,
    current_user: dict = Depends(auth_deps["get_current_user"])
) -> dict:
    """Get data for your game. Requires JWT authentication."""
    try:
        # Your logic here
        return {"success": True, "data": "your_data"}
    except Exception as e:
        logging.error(f"Error getting game data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get game data"
        )
```

---

## 📋 **Game Examples for Reference**

### **Simple Game Ideas:**
1. **Word Association** - Players submit related words
2. **Drawing Guessing** - One draws, others guess
3. **Voting Game** - Vote on preferences/choices
4. **Story Building** - Collaborative storytelling
5. **Speed Typing** - Type words/phrases quickly

### **Existing Game Patterns:**

**Math Game Flow:**
1. Host generates math problem
2. Players solve on phones with number pad
3. Speed + accuracy scoring
4. Multiple rounds with leaderboard

**Category Game Flow:**
1. Host reveals category
2. Players submit words for that category
3. AI validates if words fit the category
4. Scoring based on uniqueness and validity

**Trivia Game Flow:**
1. Host displays question with multiple choice
2. Players select answers on phones
3. Show correct answer and update scores
4. Progress through questions

---

## ⚠️ **Common Pitfalls to Avoid**

### **❌ DON'T:**
- Create your own 'finished' gamePhase - use BaseGame's
- Register message handlers in useEffect with dependencies
- Modify core infrastructure files
- Handle authentication (it's automatic)
- Put gameCore first in combinedState

### **✅ DO:**
- Use the exact patterns shown in templates
- Follow the message handler useRef pattern
- Store finalScores in gameData for BaseGame
- Test with multiple players (host + 2-3 phones)
- Use console.log for debugging message flow

### **🔍 Debugging Tips:**
```javascript
// Add these logs to debug message flow
console.log('[YourGame] Message received:', data.action);
console.log('[YourGame] Role:', role);
console.log('[YourGame] Game state:', gameState);
```

---

## 🚀 **Success Checklist**

Before considering your game complete:

- [ ] Game self-registers with metadata
- [ ] Import added to GameFactory.jsx
- [ ] Message handler uses useRef pattern
- [ ] Game ends with proper BaseGame state updates
- [ ] Host view shows game content and scores
- [ ] Player view provides clear interaction
- [ ] Timer integration works correctly
- [ ] Multiple players can join and play
- [ ] GameResults screen appears after game ends
- [ ] All console.log debugging messages work

---

## 📞 **Final Notes**

This framework is designed for **rapid game development**. Following these exact patterns, you should implement a complete multiplayer game in **1-2 hours**.

The **CRITICAL SUCCESS PATTERNS** section contains the exact code patterns that work. Copy them exactly - they've been tested and debugged.

**Key insight:** You're building game logic on top of a complete multiplayer platform. Focus on the game mechanics - everything else is handled for you. 
**The key insight:** You're building game logic on top of a complete multiplayer platform, not building a multiplayer platform from scratch. 