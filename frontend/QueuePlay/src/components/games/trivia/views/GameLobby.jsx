import React from 'react';
import QRCodeDisplay from '../components/QRCodeDisplay';

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
  handlePlayerInfoSubmit,
  startGame,
  playerNameInput,
  setPlayerNameInput,
  playerPhoneInput,
  setPlayerPhoneInput,
  joinTargetGameId,
  localPlayerName,
  clientId,
  setPlayerInfoStage,
  setJoinTargetGameId,
  setStatus
}) => {
  
  // If player is entering info, show that form first
  if (playerInfoStage === 'enterInfo' || playerInfoStage === 'joining') {
    return (
      <div className="player-info-form">
        <h2>Join Game: {joinTargetGameId}</h2>
        <form onSubmit={handlePlayerInfoSubmit}>
          <div className="form-group">
            <label htmlFor="playerName">Username:</label>
            <input 
              type="text" 
              id="playerName"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              required 
              maxLength="20" // Add a reasonable max length
            />
          </div>
          <div className="form-group">
            <label htmlFor="playerPhone">Phone Number:</label>
            <input 
              type="tel" // Use tel type for better mobile UX
              id="playerPhone"
              value={playerPhoneInput}
              onChange={(e) => setPlayerPhoneInput(e.target.value)}
              required 
              placeholder="+1 (555) 123-4567" // Example placeholder
            />
          </div>
          <button type="submit" disabled={playerInfoStage === 'joining'}>
            {playerInfoStage === 'joining' ? 'Joining...' : 'Submit and Join'}
          </button>
          <button type="button" onClick={() => { 
            setPlayerInfoStage('none'); 
            setJoinTargetGameId(''); 
            setStatus(''); 
          }}>
            Cancel
          </button>
        </form>
      </div>
    );
  }

  // Existing lobby rendering logic
  return (
    <div className="game-lobby">
      <h1>Game</h1>

      {!gameId && playerInfoStage === 'none' ? ( // Only show if not joined AND not entering info
        <>
          <div>
            <h2>Host a Game</h2>
            <button onClick={hostGame}>Host Game</button>
          </div>
          <div>
            <h2>Join a Game</h2>
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
          <h2>Game ID: {gameId}</h2>
          <p>Share this Game ID or QR code with players to join</p>
          
          {qrCodeData && (
            <div className="qr-code-wrapper">
              <QRCodeDisplay qrCodeData={qrCodeData} size={250} />
            </div>
          )}
          
          <h3>Players ({players.length})</h3>
          <ul>
            {players.map((player) => (
              <li key={player.clientId}>
                {player.name || `Player ${player.clientId.substring(0,4)}`}
              </li>
            ))}
          </ul>
          
          <button 
            onClick={startGame}
            disabled={players.length <= 1} // Disable if only host is present
          >
            Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
          </button>
        </div>
      ) : role === 'player' && playerInfoStage === 'joined' ? ( // Player waiting screen
        <div className="player-lobby">
          <h2>Waiting for Host to Start Game</h2>
          <p>Game ID: {gameId}</p>
          <p>Your Name: {localPlayerName || `Player ${clientId?.substring(0,4)}`}</p>
          <p>Status: Waiting for host to start the game...</p>
        </div>
      ) : (
        // Fallback or initial loading state before role/gameId is set
        <p>Loading lobby...</p> 
      )}
    </div>
  );
};

export default GameLobby; 