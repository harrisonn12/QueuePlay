# QueuePlay OAuth Integration Roadmap

**Status:** 🚧 **PREPARATION PHASE** - Refactoring for OAuth Integration  
**Assignee:** Coworker implementing OAuth  
**Last Updated:** June 9, 2025

## 🎯 **Goal: Remove Hidden Auto-Login, Prepare for OAuth**

Currently, QueuePlay has **hidden automatic authentication** that conflicts with real OAuth. This document outlines the refactoring needed to make OAuth integration smooth.

---

## 🚨 **Current Problem: Hidden Authentication**

### **What Happens When User Clicks "Create Lobby":**
```javascript
1. 👤 User clicks "Create Lobby" button
2. 🤖 Frontend secretly calls: POST /auth/login 
3. 🤖 Backend creates fake session: "test@example.com"
4. 🤖 Frontend secretly calls: POST /auth/token
5. 🤖 Backend returns JWT for fake user
6. ✅ Frontend finally calls: POST /createLobby
```

### **Why This Breaks OAuth:**
- **No login UI** - Users never see authentication
- **Fake credentials** - Always logs in as "test@example.com"  
- **Automatic flow** - OAuth needs user interaction
- **Competing systems** - OAuth + auto-login will conflict

---

## 🏗️ **Refactoring Steps (Priority Order)**

### **Step 1: Add Authentication State Management** ⚡ URGENT

**Current Issue:** No way to know if user is authenticated  
**Solution:** Create proper auth state with login/logout UI

**Files to Modify:**
- `frontend/src/hooks/useAuth.js` - Remove auto-login  
- `frontend/src/components/AuthWrapper.jsx` - NEW: Auth state wrapper
- `frontend/src/components/LoginScreen.jsx` - NEW: OAuth login UI

**Changes:**
```javascript
// REMOVE: Automatic login in useAuth.js
// ADD: Proper authentication state management
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // REMOVE: checkSession auto-login
  // ADD: Real login/logout methods for OAuth
}
```

### **Step 2: Separate Host/Player Authentication Flows** 🔄

**Current Issue:** Both hosts and players use same auto-login  
**Solution:** Different auth flows for different user types

**Host Flow (Needs OAuth):**
```
1. User visits app
2. Sees login screen  
3. Clicks "Login with [OAuth Provider]"
4. OAuth flow completes
5. Now can create lobbies
```

**Player Flow (Keep Guest Tokens):**
```
1. Player enters game code
2. Gets guest token (no OAuth needed)
3. Joins game
```

### **Step 3: Update UI Components** 🎨

**Files to Modify:**
- `TriviaGame.jsx` - Add auth checks
- `GameLobby.jsx` - Show different UI for auth state  
- Add new components for login screen

**Changes:**
```javascript
// BEFORE: "Create Lobby" always visible
// AFTER: Show login screen if not authenticated
{isAuthenticated ? (
  <button onClick={hostGame}>Create Lobby</button>
) : (
  <LoginScreen onLogin={handleOAuthLogin} />
)}
```

### **Step 4: Clean Up Backend Test Endpoints** 🧹 AFTER OAUTH

**Remove These Test Endpoints:**
- `GET /auth/test-host-login` 
- `POST /auth/login` (temporary test endpoint)
- Any hardcoded "test@example.com" logic

**Keep These (OAuth Compatible):**
- `POST /auth/token` (for OAuth tokens)
- `POST /auth/guest-token` (for players)
- All game APIs with JWT protection

---

## 🔌 **OAuth Integration Points**

### **Where OAuth Provider Fits:**
```javascript
// In the new LoginScreen component:
const handleOAuthLogin = async () => {
  // Your coworker's OAuth code goes here
  const oauthResult = await oauthProvider.login();
  
  // Exchange OAuth token for QueuePlay JWT
  const queuePlayToken = await api.exchangeOAuthToken(oauthResult.token);
  
  // Set authentication state
  setAuth({ token: queuePlayToken, user: oauthResult.user });
};
```

### **Backend OAuth Token Exchange:**
```python
@app.post("/auth/oauth-exchange")  # NEW ENDPOINT
async def exchange_oauth_token(oauth_token: str):
    # Verify OAuth token with provider
    user_info = await oauth_provider.verify_token(oauth_token)
    
    # Create QueuePlay JWT for authenticated user
    jwt_token = create_jwt_token(user_info.email, user_info.id)
    
    return {"access_token": jwt_token, "user": user_info}
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Remove Auto-Login (Do First)**
- [ ] Remove automatic `/auth/login` calls from frontend
- [ ] Add authentication state management  
- [ ] Create login screen component
- [ ] Update "Create Lobby" to require authentication
- [ ] Test that everything still works with manual login

### **Phase 2: OAuth Integration (Your Coworker)**  
- [ ] Choose OAuth provider (Google, GitHub, etc.)
- [ ] Implement OAuth login flow
- [ ] Create OAuth token exchange endpoint
- [ ] Replace login screen with OAuth buttons
- [ ] Test end-to-end OAuth flow

### **Phase 3: Cleanup (After OAuth Works)**
- [ ] Remove test authentication endpoints
- [ ] Remove hardcoded test credentials
- [ ] Update rate limiting for real users
- [ ] Add proper user management
- [ ] Production deployment preparation

---

## ⚠️ **Critical Dependencies**

1. **Must complete Phase 1 BEFORE starting OAuth** - Otherwise OAuth will conflict with auto-login
2. **Keep guest token flow** - Players don't need OAuth, just game-specific tokens
3. **Preserve JWT security** - All existing API protection stays the same
4. **Don't break WebSocket auth** - Existing WebSocket JWT validation works with OAuth tokens

---

## 🧪 **Testing Strategy**

### **After Phase 1 (Manual Login):**
```bash
# Test that auto-login is removed
1. Load app - should see login screen
2. Manual login - should work  
3. Create lobby - should work after login
4. Player join - should still work (guest tokens)
```

### **After Phase 2 (OAuth):**
```bash
# Test OAuth integration
1. OAuth login - should get real user token
2. Create lobby as real user - should work
3. Multiple users - should create separate lobbies
4. Player join - should still work for guests
```

---

## 📞 **Coordination with OAuth Developer**

**What OAuth developer needs to know:**
1. QueuePlay expects JWT tokens in specific format
2. User info should include: `email`, `user_id`, `name`
3. OAuth tokens get exchanged for QueuePlay JWTs
4. All existing API endpoints will work with OAuth JWTs
5. Guest players don't need OAuth (keep current flow)

**What they DON'T need to change:**
- Any game logic or APIs
- WebSocket authentication 
- Player/guest token system
- Rate limiting or security systems

---

**🎯 Ready for OAuth integration once Phase 1 refactoring is complete!** 