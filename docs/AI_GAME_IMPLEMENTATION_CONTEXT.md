# AI Game Implementation Guide for QueuePlay
**Simple guide to add new multiplayer games**

---

## 🎯 **What is QueuePlay?**

QueuePlay is a party game platform where:
- **Host** controls the game on a big screen (TV/computer)  
- **Players** join with their phones
- All communication happens through **WebSockets**
- Games are **real-time multiplayer**

**Current Games:** Trivia, Category, Math

---

## 🏗️ **How It Works**

### **Simple Architecture:**
```
Host Screen (Computer) ←→ WebSocket ←→ Backend ←→ WebSocket ←→ Player Phones
```

### **Your Game Gets:**
- Authentication handled automatically
- WebSocket connection ready
- Player management done for you
- Just focus on **game logic**

---

## 📁 **Where to Put Your Game**

Create these files:
```
frontend/src/components/games/[yourGame]/
├── YourGame.jsx                    # Main game component
├── views/
│   ├── YourGameHostView.jsx       # What host sees on big screen
│   └── YourGamePlayerView.jsx     # What players see on phones
```

```
frontend/src/hooks/games/[yourGame]/
├── useYourGameState.js            # Game state (scores, questions, etc.)
└── useYourGameMessageHandler.js   # Handle WebSocket messages
```

---

## 🚀 **Quick Start - Copy This Structure**

### **1. Main Game Component (YourGame.jsx)**
```javascript
import { useCallback, useEffect, useRef } from 'react';
import { registerGame } from '../../../utils/gameRegistry';
import { useYourGameState } from '../../../hooks/games/yourgame/useYourGameState';
import { useYourGameMessageHandler } from '../../../hooks/games/yourgame/useYourGameMessageHandler';
import YourGameHostView from './views/YourGameHostView';
import YourGamePlayerView from './views/YourGamePlayerView';

const YourGame = ({ 
  gameCore, 
  gameData,
  sendGameMessage, 
  ensureConnected,
  registerMessageHandler,
  skipAuth = false 
}) => {
  // Your game state
  const gameState = useYourGameState();
  
  // Combine with core infrastructure (gameCore MUST come last)
  const combinedState = { ...gameState, ...gameCore };
  
  // Message handling (copy this pattern exactly)
  const handleMessage = useYourGameMessageHandler(combinedState);
  const messageHandlerRef = useRef(handleMessage);
  messageHandlerRef.current = handleMessage;
  
  const stableMessageHandler = useCallback((data) => {
    return messageHandlerRef.current(data);
  }, []);
  
  useEffect(() => {
    if (registerMessageHandler) {
      registerMessageHandler(stableMessageHandler);
    }
  }, [registerMessageHandler, stableMessageHandler]);
  
  // Render based on role
  if (gameCore.role === 'host') {
    return <YourGameHostView {...combinedState} sendGameMessage={sendGameMessage} />;
  } else {
    return <YourGamePlayerView {...combinedState} sendGameMessage={sendGameMessage} />;
  }
};

// Register your game (change 'yourgame' to your game name)
const YourGameWithRegistration = registerGame('yourgame', {
  metadata: {
    name: 'Your Game Name',
    description: 'What your game does',
    minPlayers: 2,
    maxPlayers: 8
  }
})(YourGame);

export default YourGameWithRegistration;
```

### **2. Game State Hook (useYourGameState.js)**
```javascript
import { useState, useCallback } from 'react';

export const useYourGameState = () => {
  // Your game's state
  const [gamePhase, setGamePhase] = useState('playing');
  const [scores, setScores] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  
  // Your game's functions
  const startGame = useCallback(() => {
    setGamePhase('playing');
    setCurrentRound(1);
  }, []);
  
  const endGame = useCallback(() => {
    // Game ending logic
  }, []);
  
  return {
    // State
    gamePhase, scores, currentRound,
    
    // Functions
    startGame, endGame,
    
    // Setters (for message handler)
    setGamePhase, setScores, setCurrentRound
  };
};
```

### **3. Message Handler (useYourGameMessageHandler.js)**
```javascript
import { useCallback } from 'react';

export const useYourGameMessageHandler = (gameState) => {
  const { role, startGame, setScores } = gameState;
  
  const handleMessage = useCallback((data) => {
    console.log(`[YourGame] Got message: ${data.action} for ${role}`);
    
    switch (data.action) {
      case 'startGame':
        // When game starts
        if (role === 'player') {
          startGame();
        }
        break;
        
      case 'playerAction':
        // When player does something (host handles this)
        if (role === 'host') {
          console.log('Player did:', data);
          // Update scores, game state, etc.
        }
        break;
        
      case 'gameFinished':
        // When game ends - IMPORTANT!
        if (gameState.setGamePhase) {
          gameState.setGamePhase('finished'); // Shows results screen
        }
        if (gameState.setGameData) {
          gameState.setGameData(prev => ({
            ...prev,
            finalScores: data.finalScores
          }));
        }
        break;
        
      default:
        return false; // Let core handle it
    }
    
    return true; // Message handled
  }, [role, startGame, setScores, gameState]);
  
  return handleMessage;
};
```

### **4. Host View (YourGameHostView.jsx)**
```javascript
import React from 'react';

const YourGameHostView = ({ 
  gamePhase, 
  scores, 
  players,
  sendGameMessage 
}) => {
  
  const endGame = () => {
    // Send game finished to all players
    sendGameMessage('gameFinished', {
      finalScores: scores,
      players: players
    });
  };
  
  return (
    <div className="host-game-view">
      <h1>Your Game - Host View</h1>
      <div>Current Scores:</div>
      {Object.entries(scores).map(([playerId, score]) => (
        <div key={playerId}>Player {playerId}: {score}</div>
      ))}
      <button onClick={endGame}>End Game</button>
    </div>
  );
};

export default YourGameHostView;
```

### **5. Player View (YourGamePlayerView.jsx)**
```javascript
import React, { useState } from 'react';

const YourGamePlayerView = ({ 
  localPlayerName,
  sendGameMessage,
  clientId 
}) => {
  const [playerAnswer, setPlayerAnswer] = useState('');
  
  const submitAnswer = () => {
    sendGameMessage('playerAction', {
      playerId: clientId,
      action: 'submit',
      data: playerAnswer
    });
  };
  
  return (
    <div className="player-game-view">
      <h2>Playing as: {localPlayerName}</h2>
      <input 
        value={playerAnswer}
        onChange={(e) => setPlayerAnswer(e.target.value)}
        placeholder="Your answer..."
      />
      <button onClick={submitAnswer}>Submit</button>
    </div>
  );
};

export default YourGamePlayerView;
```

### **6. Register Your Game**
Add one line to `frontend/src/components/games/GameFactory.jsx`:
```javascript
import './yourgame/YourGame.jsx'; // Add this line
```

**Done!** Your game will automatically appear in the game selection.

---

## 💬 **WebSocket Messages**

### **What You Send:**
```javascript
// Player submits something
sendGameMessage('playerAction', {
  playerId: clientId,
  action: 'submit',
  data: 'player input'
});

// Game ends
sendGameMessage('gameFinished', {
  finalScores: scores,
  players: players
});
```

### **What You Receive:**
```javascript
// Game starts
{ action: 'startGame', gameType: 'yourgame', players: [...] }

// Player did something  
{ action: 'playerAction', playerId: 'player123', data: 'player input' }

// Game ends
{ action: 'gameFinished', finalScores: {...}, players: [...] }
```

---

## ⚠️ **Important Rules**

### **DO:**
- Copy the message handler pattern exactly (the `useRef` part)
- Put `gameCore` last when combining state: `{ ...gameState, ...gameCore }`
- Use `gameState.setGamePhase('finished')` to show results screen
- Test with multiple phones

### **DON'T:**
- Change the message handler registration pattern
- Put `gameCore` first in combined state
- Handle authentication yourself
- Modify core files

---

## 🔧 **Available Components**

```javascript
import Timer from '../../core/Timer';           // Countdown timer
import LoadingSpinner from '../../core/LoadingSpinner'; // Loading animation
import PlayerList from '../../core/PlayerList'; // Show players
```

---

## 📱 **Testing Your Game**

1. Run the app: `npm run dev`
2. Open on computer (host)
3. Create game, select your game type
4. Join with phones using QR code
5. Test the full flow

---

## 🐛 **Debugging**

Add these logs to see what's happening:
```javascript
console.log('[YourGame] Role:', role);
console.log('[YourGame] Message:', data.action);
console.log('[YourGame] Players:', players);
```

---

## 📋 **Checklist**

- [ ] Created all 5 files
- [ ] Added import to GameFactory.jsx  
- [ ] Message handler uses exact pattern
- [ ] Game ends with `setGamePhase('finished')`
- [ ] Tested with multiple players
- [ ] Results screen appears after game

**That's it!** Follow this guide and you'll have a working multiplayer game.