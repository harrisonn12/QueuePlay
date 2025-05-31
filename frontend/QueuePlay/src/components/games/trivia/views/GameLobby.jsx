import React from 'react';
import QRCodeDisplay from '../components/QRCodeDisplay';
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
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Join Game: {joinTargetGameId}</h2>
        <form onSubmit={handleAutoGenerateSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerPhone" className="block text-sm font-semibold text-gray-700 mb-2">
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          
          {isGenerating && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm">Generating your username...</span>
            </div>
          )}
          
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button 
              type="submit" 
              disabled={playerInfoStage === 'joining' || isGenerating}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
              className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Waiting for Host to Start Game</h2>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Game ID:</p>
              <p className="font-mono text-lg font-semibold text-gray-800">{gameId}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600">Your Username:</p>
              <p className="text-xl font-bold text-blue-800">{localPlayerName || `Player ${clientId?.substring(0,4)}`}</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
              <p className="text-sm">Waiting for host to start the game...</p>
            </div>
          </div>
        </div>
      ) : (
        // Fallback or initial loading state before role/gameId is set
        <p>Loading lobby...</p> 
      )}
    </div>
  );
};

export default GameLobby; 