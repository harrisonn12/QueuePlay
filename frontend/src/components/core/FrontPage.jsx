import React, { useState } from 'react';
import LoginScreen from '../LoginScreen';
import './FrontPage.css';

const FrontPage = ({ onHostLogin, onHostGame, onPlayerJoin, inputGameId, setInputGameId, isAuthenticated, userType }) => {
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [error, setError] = useState('');

  // Temporary logout function for testing
  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    window.location.reload();
  };

  const handleLoginClick = () => {
    setShowLoginScreen(true);
  };

  const handleLogin = async (email, password) => {
    const result = await onHostLogin(email, password);
    if (result && result.success) {
      setShowLoginScreen(false);
      // Parent component will handle navigation to lobby
    }
    return result;
  };

  const handleJoinGame = () => {
    if (!inputGameId.trim()) {
      setError('Please enter a Game ID');
      return;
    }
    setError('');
    onPlayerJoin(inputGameId.trim());
  };



  if (showLoginScreen) {
    return (
      <div className="front-page">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="front-page">
      <div className="front-page-header">
        <h1 className="front-page-title">🎮 QueuePlay Game</h1>
        <p className="front-page-subtitle">
          Multiplayer games with real-time interaction
        </p>
        {/* Temporary logout button for testing */}
        {isAuthenticated && (
          <button 
            onClick={handleLogout}
            className="logout-test-button"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 16px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Logout (Test)
          </button>
        )}
      </div>

      <div className="front-page-content">
        {/* Host Section */}
        <div className="front-page-section host-section">
          <h2 className="section-title">🎯 Host a Game</h2>
          {isAuthenticated && userType === 'host' ? (
            <>
              <p className="section-description">
                Welcome back! You're logged in and ready to create games.
              </p>
              <button 
                onClick={onHostGame}
                className="front-page-button host-button"
              >
                Create New Game
              </button>
            </>
          ) : (
            <>
              <p className="section-description">
                Login to create and manage games
              </p>
              <button 
                onClick={handleLoginClick}
                className="front-page-button host-button"
              >
                Login as Host
              </button>
            </>
          )}
        </div>

        {/* Join Section */}
        <div className="front-page-section join-section">
          <h2 className="section-title">🚀 Join a Game</h2>
          <p className="section-description">
            Enter a game ID to join as a player (no login required)
          </p>
          
          <div className="join-game-form">
            <input 
              type="text" 
              placeholder="Enter Game ID" 
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
              className="game-id-input"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            />
            <button 
              onClick={handleJoinGame}
              className="front-page-button join-button"
            >
              Join Game
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrontPage; 