# Authentication Integration Guide
## For Frontend Developer: Integrating OAuth with QueuePlay JWT System

## 🎯 **MAIN INTEGRATION POINT: `useAuth.js` Hook**

**THE KEY FILE TO MODIFY**: `frontend/src/hooks/useAuth.js`

This hook is **already built and ready** - it just needs OAuth provider integration! It handles:
- ✅ JWT token management (15-minute expiry + auto-refresh)
- ✅ Session cookie handling  
- ✅ Authenticated API requests
- ✅ WebSocket authentication
- ✅ Automatic retry on token expiry

**You only need to replace the `login()` function with real OAuth!**

---

## 🔄 **Complete Authentication Flow**

### **Step 1: User Clicks Login (Frontend)**
```javascript
// User clicks "Login with Google" button
// → Triggers useAuth.login() function
```

### **Step 2: OAuth Provider Authentication**
```javascript
// In useAuth.js login() function:
// → Google/Auth0/Firebase handles user authentication
// → Returns user info: { id, email, name }
```

### **Step 3: Create JWT Session (Your Backend)**  
```javascript
// useAuth.js automatically calls YOUR JWT backend:
fetch('/auth/login', {
  body: JSON.stringify({
    user_id: oauthUser.id,      // From OAuth
    username: oauthUser.name,   // From OAuth  
    email: oauthUser.email      // From OAuth
  })
});

// → YOUR backend validates & creates session cookie
// → YOUR backend generates JWT token (15-minute expiry)
// → Returns JWT to useAuth.js
```

### **Step 4: Token Management (Automatic)**
```javascript
// useAuth.js automatically:
// → Stores JWT token
// → Sets up auto-refresh every 10 minutes  
// → Handles all authenticated API calls
// → Manages WebSocket authentication
```

**Result**: Host is fully authenticated with your JWT system!

## 🎯 **OAUTH INTEGRATION CHECKLIST**

### **Files You Need to Edit for OAuth Integration**

#### **Frontend Files to Modify:**
```
frontend/src/hooks/useAuth.js          ← MAIN INTEGRATION POINT
frontend/src/components/LoginPage.jsx  ← Replace placeholder login
frontend/src/components/GameHost.jsx   ← Update token usage
frontend/src/App.jsx                   ← Add route protection
frontend/src/utils/api.js              ← Update API calls (if exists)
```

#### **Backend Files (Minimal Changes):**
```
backend/main.py                        ← Update login endpoint validation
backend/models/requests.py             ← Add email field to LoginRequest
```

#### **Environment Files:**
```
frontend/.env                          ← Add OAuth provider config
backend/.env                           ← Add JWT_SECRET for production
```

### **Key Integration Points to Look For:**

#### **🔍 In `frontend/src/hooks/useAuth.js`:**
Look for these placeholder functions to replace:
```javascript
// FIND THIS PLACEHOLDER LOGIN FUNCTION:
async function login(email, password) {
  // Replace the fetch call inside this function
}

// FIND THIS PLACEHOLDER AUTH CHECK:
async function checkAuthStatus() {
  // Update this to work with your OAuth provider
}
```

#### **🔍 In `frontend/src/components/LoginPage.jsx`:**
Look for:
```javascript
// FIND PLACEHOLDER LOGIN FORM:
<form onSubmit={handleLogin}>
  // Replace this entire form with OAuth login buttons
</form>
```

#### **🔍 In `backend/main.py`:**
Look for this endpoint (around line 200-250):
```python
@app.post("/auth/login", tags=["Authentication"])
async def login(request: Request, login_data: LoginRequest, response: Response):
    # ADD EMAIL VALIDATION HERE
```

---

## 🎯 **Current State vs Target State**

### **What's Already Built (Your JWT Infrastructure)**
✅ Complete JWT token system (15-minute expiry)  
✅ Session management with httpOnly cookies  
✅ Rate limiting and security middleware  
✅ Protected API endpoints  
✅ Automatic token refresh  

### **What Needs Integration (Frontend Auth Flow)**
🔧 Real login/signup pages  
🔧 Authentication provider integration  
🔧 Proper user session handling  
🔧 Frontend route protection  

---

## 🏗️ **Integration Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Real Auth     │    │   Your JWT       │    │   Protected     │
│   Provider      │───►│   Infrastructure │───►│   Game APIs     │
│ (Auth0/Firebase)│    │   (Already Built)│    │ (Already Built) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Key Point**: You don't need to change the JWT system - just replace the placeholder login endpoint calls!

---

## 🔄 **Current Authentication Flow (Placeholder)**

```javascript
// CURRENT (Testing Only) - Replace This
// FILE: frontend/src/hooks/useAuth.js
fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'any_string',     // ← No validation!
    username: 'any_name'       // ← No password required!
  })
})
```

---

## 🎯 **Target Authentication Flow (Production)**

### **Step 1: Update Backend Login Validation**

#### **File: `backend/models/requests.py`**
Add email field to LoginRequest:
```python
# FIND THIS CLASS (around line 30-40):
class LoginRequest(BaseModel):
    user_id: str
    username: str
    # ADD THIS LINE:
    email: str = None  # Make optional for backward compatibility
```

#### **File: `backend/main.py`**
Update login endpoint validation:
```python
# FIND THIS FUNCTION (around line 200-250):
@app.post("/auth/login", tags=["Authentication"])
async def login(request: Request, login_data: LoginRequest, response: Response):
    """
    Create a new user session after external authentication.
    Called AFTER user authenticates with Auth0/Firebase/etc.
    """
    # ADD THESE VALIDATION LINES:
    if not login_data.user_id or not login_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id and email are required for production"
        )
    
    # REST OF EXISTING CODE STAYS THE SAME...
    client_ip = auth_deps["middleware"].get_client_ip(request)
    # ... existing rate limiting and session creation logic
```

### **Step 2: Replace Frontend Placeholder Authentication**

#### **File: `frontend/src/hooks/useAuth.js`**
Replace the entire login function:

```javascript
// FIND AND REPLACE THIS ENTIRE FUNCTION:
async function login(email, password) {
  try {
    // STEP 1: Authenticate with your chosen OAuth provider
    // OPTION A: Auth0
    const authResult = await auth0Client.loginWithEmailAndPassword(email, password);
    
    // OPTION B: Firebase
    // const authResult = await signInWithEmailAndPassword(auth, email, password);
    
    // OPTION C: Supabase
    // const { data: authResult, error } = await supabase.auth.signInWithPassword({
    //   email, password
    // });
    
    // STEP 2: Create session with YOUR existing JWT system
    const sessionResponse = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({
        user_id: authResult.user.id,      // ← Real OAuth user ID
        username: authResult.user.name,   // ← Real OAuth username
        email: authResult.user.email      // ← Real OAuth email
      })
    });

    if (sessionResponse.ok) {
      setUser(authResult.user);
      setIsAuthenticated(true);
      await refreshGameToken();
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

#### **File: `frontend/src/hooks/useAuth.js`**
Update the logout function:
```javascript
// FIND AND UPDATE THIS FUNCTION:
async function logout() {
  // STEP 1: Logout from your OAuth provider
  await yourOAuthProvider.signOut();  // ← Add your provider's logout
  
  // STEP 2: Clear your existing JWT session (KEEP THIS)
  await fetch('http://localhost:8000/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });

  setUser(null);
  setIsAuthenticated(false);
  setGameToken(null);
}
```

### **Step 3: Update Login Page Component**

#### **File: `frontend/src/components/LoginPage.jsx`**
Replace placeholder form with OAuth buttons:

```javascript
// FIND AND REPLACE THE ENTIRE COMPONENT:
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  // Replace placeholder form with OAuth login
  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    try {
      // Your OAuth provider login logic here
      const result = await login(provider);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <h1>Welcome to QueuePlay</h1>
      
      {/* REPLACE PLACEHOLDER LOGIN FORM WITH OAUTH BUTTONS */}
      <div className="oauth-buttons">
        <button 
          onClick={() => handleOAuthLogin('google')}
          disabled={loading}
        >
          Sign in with Google
        </button>
        
        <button 
          onClick={() => handleOAuthLogin('auth0')}
          disabled={loading}
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}
```

### **Step 4: Update Game Components**

#### **File: `frontend/src/components/GameHost.jsx`**
Ensure it uses the token correctly:
```javascript
// FIND THIS IMPORT:
import { useAuth } from '../hooks/useAuth';

// FIND THE createLobby FUNCTION AND UPDATE:
async function createLobby() {
  const { gameToken, refreshGameToken, user } = useAuth();
  
  let token = gameToken;
  
  // Auto-refresh token if needed (KEEP THIS LOGIC)
  if (!token) {
    token = await refreshGameToken();
  }
  
  // Use existing createLobby logic with real user data
  const response = await fetch('http://localhost:8000/createLobby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      hostId: user.id,        // ← Now uses real OAuth user ID
      gameType: 'trivia'
    })
  });
  
  // Rest of existing logic stays the same...
}
```

---

## 🔧 **Environment Configuration**

### **File: `frontend/.env`**
Add OAuth provider configuration:
```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **File: `backend/.env`**
Add production JWT secret:
```bash
# PRODUCTION SECURITY (CRITICAL)
JWT_SECRET=your-super-secure-secret-here

# EXISTING VARS (KEEP THESE)
OPENAI_API_KEY=your-openai-key
REDIS_URL=your-redis-url
```

---

## 🚀 **OAuth Provider Setup Examples**

### **Option A: Auth0 Integration**

#### **Install Auth0 React SDK:**
```bash
cd frontend
npm install @auth0/auth0-react
```

#### **File: `frontend/src/main.jsx`**
Wrap your app with Auth0Provider:
```javascript
import { Auth0Provider } from '@auth0/auth0-react';

// WRAP YOUR EXISTING APP:
<Auth0Provider
  domain={import.meta.env.VITE_AUTH0_DOMAIN}
  clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
  authorizationParams={{
    redirect_uri: window.location.origin
  }}
>
  <App />
</Auth0Provider>
```

#### **File: `frontend/src/hooks/useAuth.js`**
Use Auth0 in your login function:
```javascript
import { useAuth0 } from '@auth0/auth0-react';

// INSIDE YOUR useAuth HOOK:
const { loginWithRedirect, user: auth0User, isAuthenticated: auth0IsAuthenticated, logout: auth0Logout } = useAuth0();

async function login() {
  try {
    // Auth0 handles the redirect
    await loginWithRedirect();
    
    // After redirect, create session with your JWT system
    if (auth0User) {
      const sessionResponse = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          user_id: auth0User.sub,
          username: auth0User.name,
          email: auth0User.email
        })
      });
      // ... rest of logic
    }
  } catch (error) {
    console.error('Auth0 login failed:', error);
  }
}
```

### **Option B: Firebase Integration**

#### **Install Firebase SDK:**
```bash
cd frontend
npm install firebase
```

#### **File: `frontend/src/firebase.js`**
Configure Firebase:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### **File: `frontend/src/hooks/useAuth.js`**
Use Firebase in your login function:
```javascript
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Create session with your JWT system
    const sessionResponse = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({
        user_id: userCredential.user.uid,
        username: userCredential.user.displayName,
        email: userCredential.user.email
      })
    });
    // ... rest of logic
  } catch (error) {
    console.error('Firebase login failed:', error);
  }
}
```

---

## 🧪 **Testing Your Integration**

### **Step 1: Test OAuth Login**
1. Start your OAuth provider (Auth0/Firebase dashboard)
2. Try logging in with test credentials
3. Check browser console for OAuth success

### **Step 2: Test JWT Session Creation**
1. After OAuth success, check Network tab for `/auth/login` call
2. Verify session cookie is set
3. Test `/auth/token` endpoint returns JWT

### **Step 3: Test Protected APIs**
1. Use returned JWT token in Authorization header
2. Test `/createLobby` endpoint
3. Verify rate limiting and security work

### **Step 4: Test Full Game Flow**
1. Login → Create Lobby → Join Game → Play
2. All existing game functionality should work unchanged

---

## 🔒 **Security Checklist After Integration**

✅ **OAuth provider properly configured with correct redirect URLs**  
✅ **JWT_SECRET environment variable set in production**  
✅ **Email field required in backend login validation**  
✅ **Rate limiting still active (test with rapid requests)**  
✅ **CORS configured for your domain**  
✅ **Session cookies secure (httpOnly, sameSite)**  
✅ **Token expiration working (15-minute auto-refresh)**  

---

## 📱 **Recommended Frontend Flow**

### **Page Structure**
```
/                  → Home page (public)
/login             → Login/signup page  
/dashboard         → User dashboard (protected)
/host-game         → Host game page (protected)
/join/{gameId}     → Player join page (public)
```

### **Route Protection Example**
```javascript
// ProtectedRoute.jsx
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// App.jsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/join/:gameId" element={<PlayerJoin />} />
  
  {/* Protected routes */}
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  <Route path="/host-game" element={
    <ProtectedRoute>
      <GameHost />
    </ProtectedRoute>
  } />
</Routes>
```

### **Updated useAuth Hook**
```javascript
// frontend/src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameToken, setGameToken] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      // Check if user has valid session with your JWT system
      const response = await fetch('/auth/token', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameToken(data.access_token);
        setIsAuthenticated(true);
        // Get user info from your auth provider here
      }
    } catch (error) {
      console.log('No valid session');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      // 1. Authenticate with your chosen provider (Auth0/Firebase/etc)
      const authResult = await yourAuthProvider.signIn(email, password);
      
      // 2. Create session with your JWT system
      const sessionResponse = await fetch('/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          user_id: authResult.user.id,
          username: authResult.user.name,
          email: authResult.user.email
        })
      });

      if (sessionResponse.ok) {
        setUser(authResult.user);
        setIsAuthenticated(true);
        await refreshGameToken();
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function refreshGameToken() {
    try {
      const response = await fetch('/auth/token', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameToken(data.access_token);
        return data.access_token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }

  async function logout() {
    // 1. Logout from your auth provider
    await yourAuthProvider.signOut();
    
    // 2. Clear your JWT session
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    setUser(null);
    setIsAuthenticated(false);
    setGameToken(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      gameToken,
      login,
      logout,
      refreshGameToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 🔗 **Integration with Existing Game Components**

### **Update GameHost Component**
```javascript
// frontend/src/components/GameHost.jsx
import { useAuth } from '../hooks/useAuth';

function GameHost() {
  const { gameToken, refreshGameToken } = useAuth();
  
  async function createLobby() {
    let token = gameToken;
    
    // Auto-refresh token if needed
    if (!token) {
      token = await refreshGameToken();
    }
    
    // Use existing createLobby logic with real token
    const response = await fetch('/createLobby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        hostId: user.id,
        gameType: 'trivia'
      })
    });
    
    // Rest of existing logic stays the same...
  }
  
  return (
    <div>
      <button onClick={createLobby}>Create Lobby</button>
      {/* Rest of existing UI */}
    </div>
  );
}
```

---

## 🛡️ **Backend Changes Needed (Minimal)**

### **Update Login Endpoint (Only Change)**
```python
# backend/main.py - Update this one endpoint
@app.post("/auth/login", tags=["Authentication"])
async def login(request: Request, login_data: LoginRequest, response: Response):
    """
    Create a new user session after external authentication.
    Called AFTER user authenticates with Auth0/Firebase/etc.
    """
    # Add validation here if needed
    if not login_data.user_id or not login_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id and email are required"
        )
    
    # Rest of existing code stays exactly the same...
    client_ip = auth_deps["middleware"].get_client_ip(request)
    # ... existing rate limiting and session creation logic
```

### **Add User Info Endpoint (Optional)**
```python
# backend/main.py - Add this new endpoint
@app.get("/auth/user", tags=["Authentication"])
async def get_user_info(current_user: dict = Depends(auth_deps["get_current_user"])) -> dict:
    """Get current user information."""
    return {
        "user_id": current_user["user_id"],
        "username": current_user.get("username"),
        "email": current_user.get("email")
    }
```

---

## 🚀 **Deployment Strategy**

### **Phase 1: Deploy Current System (NOW)**
```bash
# You can deploy immediately with placeholder auth
git push heroku main
```

### **Phase 2: Add Real Auth (Later)**
```bash
# After frontend developer integrates real auth
git push heroku main  # Zero downtime update
```

### **Environment Variables for Auth Provider**
```bash
# Add these to Heroku when ready:
heroku config:set AUTH0_DOMAIN=your-domain.auth0.com
heroku config:set AUTH0_CLIENT_ID=your-client-id
heroku config:set AUTH0_CLIENT_SECRET=your-client-secret

# OR for Firebase:
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=your-service-account-email
```

---

## 📋 **Integration Checklist**

### **For Frontend Developer:**
- [ ] Choose auth provider (Auth0, Firebase, Supabase)
- [ ] Create login/signup pages
- [ ] Update useAuth hook to integrate with provider
- [ ] Add route protection
- [ ] Update GameHost component to use real tokens
- [ ] Test complete flow: login → create lobby → play game

### **For Backend (You):**
- [ ] Deploy current system to Heroku ✅ (Ready now!)
- [ ] Update login endpoint validation (minor)
- [ ] Add user info endpoint (optional)
- [ ] Configure auth provider environment variables

### **Integration Test Sequence:**
1. User signs up/logs in with real credentials
2. Frontend calls your `/auth/login` with real user data
3. User clicks "Host Game" → creates lobby with JWT
4. Players join game (no auth required)
5. Game proceeds normally

---

## 💡 **Key Points for Other Developer**

1. **Don't reinvent JWT system** - Use the existing infrastructure
2. **Only replace the login call** - Everything else stays the same
3. **Session cookies are automatic** - Backend handles this
4. **Token refresh is built-in** - 15-minute expiry with auto-refresh
5. **Rate limiting works immediately** - No additional setup needed

**Bottom Line**: Your JWT security system is **production-ready**. The other developer just needs to plug in real authentication and call your existing endpoints! 🚀 