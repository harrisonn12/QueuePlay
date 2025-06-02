import React from 'react';
import QRCodeDisplay from '../components/QRCodeDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import {useUsernameGenerator} from '../../../../hooks/useUsernameGenerator';
/**
 * Game Lobby View - Displays host/player lobby UI before game start
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
  startGame,
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
  setLocalPlayerName
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
    
    setPlayerInfoStage('joining');
    setStatus(`Joining game ${joinTargetGameId} as ${generatedUsername}...`);

    // Set role and gameId directly (using the generated username)
    console.log(`Setting state for joining: gameId=${joinTargetGameId}, role=player`);
    setGameId(joinTargetGameId);
    setRole('player');
    setLocalPlayerName(generatedUsername);
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

  // Existing lobby rendering logic
  return (
    <div className={`game-lobby fade-in ${role === 'host' ? 'host-lobby-container' : ''}`}>
      <h1>🎮 QueuePlay Trivia 🎮</h1>

      {!gameId && playerInfoStage === 'none' ? ( // Only show if not joined AND not entering info
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
                disabled={players.length <= 1} // Disable if only host is present
                className={players.length > 1 ? 'pulse-glow' : ''}
              >
                🚀 Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      ) : role === 'player' && playerInfoStage === 'joined' ? ( // Player waiting screen
        <div className="game-card fade-in" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            🎮 Ready to Play!
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ 
              background: 'var(--card-bg-light)', 
              padding: '1rem', 
              borderRadius: '12px',
              border: '1px solid var(--accent-electric)'
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Game ID:</p>
              <p style={{ 
                fontFamily: 'monospace', 
                fontSize: '1.2rem', 
                fontWeight: '700', 
                color: 'var(--accent-electric)',
                margin: 0
              }}>
                {gameId}
              </p>
            </div>
            <div style={{ 
              background: 'rgba(0, 255, 136, 0.1)', 
              padding: '1rem', 
              borderRadius: '12px',
              border: '1px solid var(--accent-neon)'
            }}>
              <p style={{ color: 'var(--accent-neon)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Your Username:</p>
              <p style={{ 
                fontSize: '1.3rem', 
                fontWeight: '700', 
                color: 'var(--accent-neon)',
                margin: 0
              }}>
                {localPlayerName || `Player ${clientId?.substring(0,4)}`}
              </p>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--text-secondary)',
              justifyContent: 'center'
            }}>
              <div className="pulse-glow" style={{ 
                width: '8px', 
                height: '8px', 
                background: 'var(--accent-electric)', 
                borderRadius: '50%' 
              }}></div>
              <p style={{ fontSize: '0.95rem', margin: 0 }}>Waiting for host to start the game...</p>
            </div>
          </div>
        </div>
      ) : (
        // Fallback or initial loading state before role/gameId is set
        <LoadingSpinner message="Loading lobby..." />
      )}
    </div>
  );
};

export default GameLobby; 