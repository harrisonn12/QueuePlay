import React, { useState } from 'react';
import './LoginScreen.css';

/**
 * Login screen component for host authentication
 * 
 * Currently uses test authentication, but designed for OAuth integration.
 * When OAuth is implemented, replace the testLogin with OAuth provider calls.
 */
const LoginScreen = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Temporary test login function
   * TODO: Replace with OAuth provider integration
   */
  const handleTestLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('LoginScreen: Starting test login...');
      const result = await onLogin(); // Call the login function from useAuth
      console.log('LoginScreen: Login result:', result);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        console.error('LoginScreen: Login failed:', result.error);
      } else {
        console.log('LoginScreen: Login successful!');
      }
    } catch (err) {
      console.error('LoginScreen: Login error:', err);
      setError('Login failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * OAuth login handlers (for future implementation)
   * TODO: Implement these when OAuth provider is ready
   */
  const handleGoogleLogin = async () => {
    setError('Google OAuth not yet implemented');
    // TODO: await oauthProvider.loginWithGoogle();
  };

  const handleGitHubLogin = async () => {
    setError('GitHub OAuth not yet implemented');
    // TODO: await oauthProvider.loginWithGitHub();
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>QueuePlay</h1>
          <p>Create and host trivia games</p>
        </div>

        <div className="login-content">
          <h2>Host Login Required</h2>
          <p>Sign in to create and manage game lobbies</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Temporary test login - remove when OAuth is ready */}
          <div className="test-login-section">
            <h3>Development Login</h3>
            <button 
              onClick={handleTestLogin}
              disabled={isLoading}
              className="test-login-btn"
            >
              {isLoading ? 'Signing in...' : 'Login as Test Host'}
            </button>
          </div>

          {/* OAuth buttons - ready for implementation */}
          <div className="oauth-section" style={{ opacity: 0.5 }}>
            <h3>OAuth Login (Coming Soon)</h3>
            <button 
              onClick={handleGoogleLogin}
              disabled={true}
              className="oauth-btn google-btn"
            >
              <span className="oauth-icon">🔍</span>
              Continue with Google
            </button>
            
            <button 
              onClick={handleGitHubLogin}
              disabled={true}
              className="oauth-btn github-btn"
            >
              <span className="oauth-icon">🐙</span>
              Continue with GitHub
            </button>
          </div>

          <div className="player-info">
            <hr />
            <p><strong>Players:</strong> No login required - just enter the game code!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen; 