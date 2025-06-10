# OAuth Integration Implementation Guide

**QueuePlay Authentication Upgrade**  
*From Placeholder Login to Production-Ready OAuth*

## 🎯 Overview

This guide explains how to replace QueuePlay's current placeholder login system with production-ready OAuth authentication while preserving the existing JWT/session architecture.

### Current System (Placeholder)
```javascript
// Current placeholder login in useAuth.js
const login = async (email = "test@example.com", password = "password") => {
  // Step 1: Fake authentication
  const response = await fetch(`/auth/login`, {
    body: JSON.stringify({
      user_id: email,  // ← Just uses email as user_id
      username: email.split('@')[0]
    })
  });
  
  // Step 2: Get JWT token (this part is solid)
  const tokenResponse = await fetch(`/auth/token`, { credentials: 'include' });
  const tokenData = await tokenResponse.json();
  setToken(tokenData.access_token);
}
```

### Target System (OAuth)
- **Real user authentication** via Google, GitHub, Auth0, etc.
- **Same JWT/session architecture** (no backend changes needed)
- **Same security model** (rate limiting, token expiry, etc.)
- **Seamless user experience** with OAuth providers

---

## 🏗️ Architecture Integration

### Existing QueuePlay Auth Flow (Preserved)
```
User Login → Session Created → Session Cookie Set → JWT Token Generated → API Access Granted → WebSocket Authentication
```

### New OAuth Flow (Enhanced)
```
OAuth Login Button → OAuth Provider → OAuth Callback → QueuePlay Session Created → Session Cookie Set → JWT Token Generated → API Access Granted → WebSocket Authentication
```

**Key Insight:** We only replace the first 3 steps. Everything from QueuePlay Session onwards stays the same!

---

## 🔌 Implementation Options

### Option 1: Google OAuth (Recommended)

#### Frontend Integration
```javascript
// Install: npm install @google-cloud/oauth2
// src/hooks/core/useAuth.js

import { GoogleAuth } from '@google-cloud/oauth2';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export const useAuth = () => {
  // ... existing code ...

  const loginWithGoogle = useCallback(async () => {
    try {
      console.log('Starting Google OAuth login...');
      
      // Step 1: Google OAuth flow
      const googleAuth = new GoogleAuth({
        scopes: ['openid', 'email', 'profile'],
        clientId: GOOGLE_CLIENT_ID
      });
      
      const authUrl = googleAuth.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        redirect_uri: `${window.location.origin}/auth/callback`
      });
      
      // Redirect to Google
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const handleOAuthCallback = useCallback(async (code) => {
    try {
      // Step 2: Exchange code for user info
      const response = await fetch('/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        // Step 3: Get JWT token (existing flow)
        const tokenResponse = await fetch('/auth/token', {
          method: 'POST',
          credentials: 'include'
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          const jwtToken = tokenData.access_token;
          
          setToken(jwtToken);
          storeToken(jwtToken, tokenData.expires_in);
          setIsAuthenticated(true);
          setUserType('host');
          
          return { success: true };
        }
      }
      
      return { success: false, error: 'OAuth authentication failed' };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    // ... existing exports ...
    loginWithGoogle,
    handleOAuthCallback
  };
};
```

#### Backend Integration
```python
# backend/main.py - Add new OAuth endpoint

from google.oauth2 import id_token
from google.auth.transport import requests
import os

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

@app.post("/auth/oauth/google", tags=["Authentication"])
async def google_oauth_callback(request: Request, oauth_data: dict):
    """
    Handle Google OAuth callback and create QueuePlay session.
    Integrates with existing JWT/session system.
    """
    try:
        code = oauth_data.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="OAuth code required")
        
        # Step 1: Verify Google OAuth token
        id_info = id_token.verify_oauth2_token(
            code, requests.Request(), GOOGLE_CLIENT_ID
        )
        
        # Step 2: Extract user info
        google_user_id = id_info['sub']
        email = id_info['email']
        name = id_info['name']
        picture = id_info.get('picture')
        
        # Step 3: Create QueuePlay session (existing system)
        client_ip = auth_deps["middleware"].get_client_ip(request)
        session_id = await auth_service.create_session(
            user_id=f"google_{google_user_id}",
            metadata={
                "email": email,
                "name": name,
                "picture": picture,
                "provider": "google",
                "ip": client_ip
            }
        )
        
        # Step 4: Set session cookie (existing system)
        response = JSONResponse({"success": True, "message": "OAuth login successful"})
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=(appConfig.stage == Stage.PROD),
            samesite="lax",
            max_age=24 * 3600
        )
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid OAuth token")
    except Exception as e:
        logging.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=500, detail="OAuth authentication failed")
```

#### Frontend UI Update
```javascript
// src/components/LoginScreen.jsx
import React, { useState } from 'react';

const LoginScreen = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h2>🎮 Host Login</h2>
        <p>Sign in to create and manage games</p>
        
        {/* Primary OAuth Login */}
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="oauth-button google-login"
        >
          <img src="/google-icon.svg" alt="Google" />
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
        
        {/* Optional: Keep placeholder for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="dev-login-section">
            <hr />
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Development Only:</p>
            <button onClick={() => onLogin('dev@test.com', 'password')}>
              🔧 Dev Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Option 2: Auth0 Integration

#### Setup
```bash
npm install @auth0/auth0-react
```

#### Implementation
```javascript
// src/index.js - Wrap app with Auth0Provider
import { Auth0Provider } from '@auth0/auth0-react';

const domain = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;

ReactDOM.render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    redirectUri={window.location.origin}
    audience={`https://${domain}/api/v2/`}
  >
    <App />
  </Auth0Provider>,
  document.getElementById('root')
);

// src/hooks/core/useAuth.js - Integration
import { useAuth0 } from '@auth0/auth0-react';

export const useAuth = () => {
  const { 
    loginWithRedirect, 
    logout: auth0Logout, 
    user: auth0User, 
    isAuthenticated: auth0Authenticated,
    getAccessTokenSilently 
  } = useAuth0();

  const loginWithAuth0 = useCallback(async () => {
    try {
      await loginWithRedirect();
    } catch (error) {
      console.error('Auth0 login error:', error);
    }
  }, [loginWithRedirect]);

  // Handle Auth0 callback and create QueuePlay session
  useEffect(() => {
    if (auth0Authenticated && auth0User) {
      createQueuePlaySession();
    }
  }, [auth0Authenticated, auth0User]);

  const createQueuePlaySession = async () => {
    try {
      // Create session with QueuePlay backend
      const response = await fetch('/auth/oauth/auth0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name,
          picture: auth0User.picture
        })
      });

      if (response.ok) {
        // Get JWT token (existing flow)
        const tokenResponse = await fetch('/auth/token', {
          method: 'POST',
          credentials: 'include'
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setToken(tokenData.access_token);
          storeToken(tokenData.access_token, tokenData.expires_in);
          setIsAuthenticated(true);
          setUserType('host');
        }
      }
    } catch (error) {
      console.error('QueuePlay session creation failed:', error);
    }
  };

  return {
    // ... existing exports ...
    loginWithAuth0,
    isAuth0Authenticated: auth0Authenticated,
    auth0User
  };
};
```

### Option 3: Multiple Providers

```javascript
// src/components/LoginScreen.jsx - Multiple OAuth options
const LoginScreen = ({ onLogin }) => {
  const { loginWithGoogle, loginWithGitHub, loginWithAuth0 } = useAuth();

  return (
    <div className="login-screen">
      <div className="oauth-providers">
        <button onClick={loginWithGoogle} className="oauth-google">
          <img src="/google.svg" alt="" />
          Continue with Google
        </button>
        
        <button onClick={loginWithGitHub} className="oauth-github">
          <img src="/github.svg" alt="" />
          Continue with GitHub
        </button>
        
        <button onClick={loginWithAuth0} className="oauth-auth0">
          <img src="/auth0.svg" alt="" />
          Continue with Auth0
        </button>
      </div>
    </div>
  );
};
```

---

## 🎨 UI/UX Enhancements

### OAuth Button Styling
```css
/* src/components/LoginScreen.css */
.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 16px 24px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg-light);
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
}

.oauth-button:hover {
  transform: translateY(-2px);
  border-color: var(--accent-electric);
  box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
}

.oauth-button img {
  width: 24px;
  height: 24px;
}

.google-login {
  border-color: #4285f4;
}

.google-login:hover {
  border-color: #4285f4;
  box-shadow: 0 8px 32px rgba(66, 133, 244, 0.3);
}
```

### Loading States
```javascript
const LoginScreen = () => {
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleProviderLogin = async (provider, loginFunction) => {
    setLoadingProvider(provider);
    try {
      await loginFunction();
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="oauth-providers">
      <button 
        onClick={() => handleProviderLogin('google', loginWithGoogle)}
        disabled={loadingProvider}
        className={`oauth-button google-login ${loadingProvider === 'google' ? 'loading' : ''}`}
      >
        {loadingProvider === 'google' ? (
          <>
            <LoadingSpinner size="small" />
            <span>Signing in with Google...</span>
          </>
        ) : (
          <>
            <img src="/google.svg" alt="" />
            <span>Continue with Google</span>
          </>
        )}
      </button>
    </div>
  );
};
```

---

## 🔒 Security Considerations

### Environment Variables
```bash
# .env.local (Frontend)
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_AUTH0_DOMAIN=your-tenant.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your_auth0_client_id

# .env (Backend)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
```

### CSRF Protection
```javascript
// Frontend - Generate and validate state parameter
const generateOAuthState = () => {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  return state;
};

const validateOAuthState = (receivedState) => {
  const storedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return storedState === receivedState;
};
```

---

## 🚀 Migration Strategy

### Phase 1: Setup OAuth (1-2 days)
1. **Choose Provider**: Start with Google OAuth (simplest)
2. **Setup Credentials**: Create OAuth app in Google Console
3. **Install Dependencies**: Add OAuth libraries
4. **Environment Setup**: Configure client IDs and secrets

### Phase 2: Backend Integration (1 day)
1. **Add OAuth Endpoint**: `/auth/oauth/google`
2. **Token Verification**: Validate OAuth tokens
3. **Session Creation**: Integrate with existing session system
4. **Testing**: Verify OAuth → JWT flow works

### Phase 3: Frontend Integration (1 day)
1. **Update useAuth Hook**: Add OAuth methods
2. **Update LoginScreen**: Add OAuth buttons
3. **Handle Callbacks**: Process OAuth redirects
4. **Error Handling**: Graceful fallbacks

### Phase 4: Testing & Polish (1 day)
1. **End-to-End Testing**: Full OAuth → Game Creation flow
2. **UI Polish**: Loading states, error messages
3. **Security Review**: Rate limiting, CSRF protection
4. **Documentation**: Update deployment guides

### Phase 5: Deployment (0.5 day)
1. **Environment Variables**: Set production OAuth credentials
2. **CORS Configuration**: Update allowed origins
3. **Monitoring**: Set up OAuth success/failure logging
4. **Rollback Plan**: Keep placeholder system as fallback

---

## 📋 Implementation Checklist

### Backend Tasks
- [ ] Install OAuth verification libraries
- [ ] Add OAuth callback endpoints
- [ ] Update CORS settings for OAuth redirects
- [ ] Add OAuth-specific rate limiting
- [ ] Configure environment variables
- [ ] Add OAuth logging and monitoring

### Frontend Tasks
- [ ] Install OAuth libraries
- [ ] Update `useAuth` hook with OAuth methods
- [ ] Create OAuth login buttons in `LoginScreen`
- [ ] Add OAuth callback handling
- [ ] Implement loading states and error handling
- [ ] Add CSRF protection with state parameters

### Security Tasks
- [ ] Setup OAuth app credentials
- [ ] Configure redirect URIs for development and production
- [ ] Implement state parameter validation
- [ ] Add OAuth attempt rate limiting
- [ ] Review and test security measures
- [ ] Document security configurations

### Testing Tasks
- [ ] Test OAuth login flow end-to-end
- [ ] Test JWT token generation after OAuth
- [ ] Test game creation after OAuth login
- [ ] Test error scenarios (invalid tokens, network failures)
- [ ] Test rate limiting on OAuth attempts
- [ ] Performance test with multiple OAuth providers

---

## 🔍 Troubleshooting

### Common Issues

**1. "OAuth token verification failed"**
```python
# Check OAuth client configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    logging.error("GOOGLE_CLIENT_ID not set in environment")
```

**2. "CORS error on OAuth callback"**
```python
# Update CORS origins to include OAuth redirect URIs
origins = [
    "http://localhost:5173",
    "https://accounts.google.com",  # Add OAuth provider origins
    "https://your-domain.auth0.com"
]
```

**3. "Session not created after OAuth"**
```javascript
// Check that OAuth callback creates QueuePlay session
const handleOAuthCallback = async (code) => {
  // Step 1: Send code to backend
  const oauthResponse = await fetch('/auth/oauth/google', { 
    body: JSON.stringify({ code })
  });
  
  // Step 2: MUST call /auth/token to get JWT
  const tokenResponse = await fetch('/auth/token', { 
    credentials: 'include'  // Important: include cookies
  });
};
```

---

## 📈 Benefits of OAuth Integration

### For Users (Hosts)
- ✅ **No password management** - Use existing Google/Auth0 accounts
- ✅ **Faster login** - One-click authentication
- ✅ **Better security** - OAuth provider handles security
- ✅ **Familiar experience** - Same login flow as other apps

### For QueuePlay
- ✅ **Production ready** - Replace placeholder system
- ✅ **Scalable** - Handle thousands of users
- ✅ **Secure by design** - Industry-standard OAuth 2.0
- ✅ **Easy maintenance** - Less custom auth code

### For Development
- ✅ **Existing architecture preserved** - JWT/session system unchanged
- ✅ **Multiple provider support** - Easy to add more OAuth providers
- ✅ **Testing friendly** - Keep dev login for testing
- ✅ **Monitoring ready** - Built-in OAuth success/failure logging

---

## 🎯 Next Steps

1. **Choose your OAuth provider** (Google recommended for simplicity)
2. **Follow the implementation steps** for your chosen provider
3. **Test thoroughly** in development environment
4. **Deploy with proper environment variables**
5. **Monitor OAuth success rates** and user feedback

This OAuth integration will transform QueuePlay from a prototype with placeholder auth into a production-ready application with professional-grade authentication! 🚀 