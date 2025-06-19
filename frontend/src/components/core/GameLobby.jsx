import React from 'react';
import QRCodeDisplay from './QRCodeDisplay.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import {useUsernameGenerator} from '../../hooks/core/useUsernameGenerator.js';

/**
 * Generic Game Lobby View - Displays host/player lobby UI before game start
 * Made generic to work with any game type while preserving existing trivia functionality
 */
const GameLobby = ({
  gameId,
  role,
  players,
  qrCodeData,
  inputGameId,
  setInputGameId,
  playerInfoStage,
  hostGame,
  initiateJoinGame,
  completePlayerJoin,
  startGame,
  isStartingGame = false,
  setPlayerNameInput,
  playerPhoneInput,
  setPlayerPhoneInput,
  joinTargetGameId,
  localPlayerName,
  clientId,
  setPlayerInfoStage,
  setJoinTargetGameId,
  setStatus,
  setGameId,
  setRole,
  setLocalPlayerName,
  children
}) => {
  const { generateUsername, isGenerating, error } = useUsernameGenerator();

  // Modified submit handler to auto-generate username
  const handleAutoGenerateSubmit = async (event) => {
    event.preventDefault();
    
    if (!playerPhoneInput.trim()) {
      setStatus("Error: Please enter a phone number.");
      return;
    }
    
    if (!/^\+?[0-9\s\-()]{7,}$/.test(playerPhoneInput.trim())) {
      setStatus("Error: Please enter a valid phone number.");
      return;
    }

    // Auto-generate username
    setStatus("Generating your username...");
    const generatedUsername = await generateUsername();
    
    if (!generatedUsername) {
      setStatus("Error: Failed to generate username. Please try again.");
      return;
    }

    // Set the generated username
    setPlayerNameInput(generatedUsername);

    // Store info locally (directly use the generated username)
    localStorage.setItem(`phoneNumber_${joinTargetGameId}`, playerPhoneInput);
    localStorage.setItem(`playerName_${joinTargetGameId}`, generatedUsername);
    
    // Call the actual join function
    await completePlayerJoin(joinTargetGameId, generatedUsername, playerPhoneInput);
  };
  
  // If player is entering info, show that form first
  if (playerInfoStage === 'enterInfo' || playerInfoStage === 'joining') {
    return (
      <div className="game-card fade-in" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Join Game: {joinTargetGameId}
        </h2>
        <form onSubmit={handleAutoGenerateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="playerPhone" style={{ 
              display: 'block', 
              color: 'var(--text-secondary)', 
              fontWeight: '600', 
              marginBottom: '0.5rem' 
            }}>
              Phone Number:
            </label>
            <input 
              type="tel"
              id="playerPhone"
              value={playerPhoneInput}
              onChange={(e) => setPlayerPhoneInput(e.target.value)}
              required 
              placeholder="+1 (555) 123-4567"
              disabled={playerInfoStage === 'joining' || isGenerating}
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid var(--border-color)',
                borderRadius: '12px',
                background: 'var(--card-bg-light)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-electric)' }}>
              <LoadingSpinner size="small" />
              <span style={{ fontSize: '0.9rem' }}>Generating your username...</span>
            </div>
          )}
          
          {error && (
            <div style={{ 
              color: 'var(--error)', 
              fontSize: '0.9rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid var(--error)' 
            }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="submit" 
              disabled={playerInfoStage === 'joining' || isGenerating}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              {playerInfoStage === 'joining' ? 'Joining...' : isGenerating ? 'Generating...' : 'Join Game'}
            </button>
            <button 
              type="button" 
              onClick={() => { 
                setPlayerInfoStage('none'); 
                setJoinTargetGameId(''); 
                setStatus(''); 
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Main lobby view
  return (
    <div className={`game-lobby fade-in ${role === 'host' ? 'host-lobby-container' : ''}`}>
      <h1>🎮 QueuePlay Game 🎮</h1>

      {!gameId && playerInfoStage === 'none' ? (
        <>
          <div>
            <h2>🎯 Host a Game</h2>
            <button onClick={hostGame}>Create New Game</button>
          </div>
          <div>
            <h2>🚀 Join a Game</h2>
            <input 
              type="text" 
              placeholder="Enter Game ID" 
              value={inputGameId} 
              onChange={(e) => setInputGameId(e.target.value)}
            />
            <button onClick={initiateJoinGame}>Join Game</button> 
          </div>
        </>
      ) : role === 'host' ? (
        <div className="host-lobby">
          <h2 className="neon-text">Game ID: {gameId}</h2>
          <p>Share this Game ID or QR code with players to join</p>
          
          <div className="host-lobby-content">
            <div className="qr-code-section">
              {qrCodeData && (
                <div className="qr-code-wrapper">
                  <QRCodeDisplay qrCodeData={qrCodeData} size={250} />
                </div>
              )}
            </div>
            
            <div className="players-section">
              <h3>🎮 Players ({players.length})</h3>
              <ul>
                {players.map((player, index) => (
                  <li key={player.clientId} style={{ animationDelay: `${index * 0.1}s` }} className="fade-in">
                    {player.name || `Player ${player.clientId.substring(0,4)}`}
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={startGame}
                disabled={players.length === 0 || isStartingGame}
                className="btn-primary"
              >
                {isStartingGame ? '⏳ Starting Game...' : '🚀 Start Game'}
              </button>
              
              {players.length === 0 && (
                <p>Waiting for players to join...</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="player-lobby">
          <h2>🎮 Joined Game!</h2>
          <p className="game-id">Game ID: <strong>{gameId}</strong></p>
          
          {localPlayerName && (
            <div className="player-info">
              <h3>🎮 Playing as: <span className="neon-text">{localPlayerName}</span></h3>
            </div>
          )}
          
          {players.length > 0 && (
            <div className="waiting-players">
              <h3>🎮 Players ({players.length})</h3>
              <ul>
                {players.map((player, index) => (
                  <li key={player.clientId} style={{ animationDelay: `${index * 0.1}s` }} className="fade-in">
                    {player.name || `Player ${player.clientId.substring(0,4)}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="waiting-area">
            <LoadingSpinner message="Waiting for host to start the game..." size="medium" />
          </div>
        </div>
      )}

      {/* Custom children content for game-specific additions */}
      {children}
    </div>
  );
};

export default GameLobby; 