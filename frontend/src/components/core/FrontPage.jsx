import React, { useState } from 'react';
import LoginScreen from '../LoginScreen';
import StoreManagement from '../store/StoreManagement';
import './FrontPage.css';

const FrontPage = ({ onHostLogin, onHostGame, onPlayerJoin, inputGameId, setInputGameId, isAuthenticated, userType }) => {
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showStoreManagement, setShowStoreManagement] = useState(false);
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

  if (showStoreManagement) {
    return (
      <div className="front-page">
        <div className="store-management-header" style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <button 
            onClick={() => setShowStoreManagement(false)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Main
          </button>
        </div>
        <StoreManagement storeId={1} />
      </div>
    );
  }

  return (
    <div className="front-page">
      <div className="front-page-header">
        <h1 className="front-page-title">QueuePlay</h1>
        
        {/* Control buttons for authenticated users */}
        {isAuthenticated && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setShowStoreManagement(true)}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Manage Offers
            </button>
            <button 
              onClick={handleLogout}
              className="logout-test-button"
              style={{
                padding: '8px 16px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="front-page-content">
        {/* Host Section */}
        <div className="front-page-section host-section">
          <h2 className="section-title">Host Games</h2>
          {isAuthenticated && userType === 'host' ? (
            <>
              <p className="section-description">
                Welcome back! Ready to create memorable experiences for your community.
              </p>
              <button 
                onClick={onHostGame}
                className="front-page-button host-button btn-primary"
              >
                Start Community Activity
              </button>
            </>
          ) : (
            <>
              <p className="section-description">
                Create engaging activities that bring your customers together
              </p>
              <button 
                onClick={handleLoginClick}
                className="front-page-button host-button btn-primary"
              >
                Get Started as Host
              </button>
            </>
          )}
        </div>

        {/* Join Section */}
        <div className="front-page-section join-section">
          <h2 className="section-title">Join the Fun</h2>
          <p className="section-description">
            Enter the activity code to connect with your local community
          </p>
          
          <div className="join-game-form">
            <input 
              type="text" 
              placeholder="Enter Activity Code" 
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
              className="game-id-input"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            />
            <button 
              onClick={handleJoinGame}
              className="front-page-button join-button btn-secondary"
            >
              Join Activity
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              Please enter a valid activity code to join
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrontPage; 