# Production Deployment Checklist
## QueuePlay Security & Configuration Updates

### 🌐 **1. Domain Configuration**

#### **Update CORS Origins in `backend/middleware/auth_middleware.py`**
```python
# CURRENT (Development):
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "http://localhost:80",
    "http://localhost"
]

# UPDATE FOR PRODUCTION:
allowed_origins = [
    "https://your-actual-domain.com",
    "https://www.your-actual-domain.com",
    # Remove localhost entries in production
]
```

### 🔐 **2. Environment Variables**

#### **Frontend Environment Variables:**
```bash
# Production frontend build-time variables
VITE_API_URL=https://your-backend-service.herokuapp.com
VITE_WS_URL=wss://your-websocket-service.herokuapp.com
```

#### **Backend Environment Variables:**
```bash
# PRODUCTION ONLY
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
REDIS_URL=redis://your-redis-instance:6379
DATABASE_URL=your-database-connection-string

# OAuth Configuration (when integrated)
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REDIRECT_URI=https://your-domain.com/auth/callback

# API Keys
OPENAI_API_KEY=your-openai-api-key
```

### 🚀 **3. Heroku Deployment**

#### **Required Config Vars:**
- Set all environment variables above in Heroku dashboard
- Ensure `JWT_SECRET` is at least 32 characters
- Configure Redis add-on or external Redis instance

#### **Domain Configuration:**
- Update allowed_origins with your Heroku app domain
- Configure custom domain if using one

### 🔒 **4. Security Headers**

#### **Add to Heroku/Production:**
- Enable HTTPS-only mode
- Configure security headers middleware
- Set secure cookie flags in production

### 📝 **5. Rate Limiting Adjustments**

#### **Consider Production Limits:**
```python
# Current limits may need adjustment:
"api_requests": {"count": 5, "window": 60},      # May need increase
"question_generation": {"count": 50, "window": 86400},  # Monitor costs
"token_generation": {"count": 10, "window": 300},
"login_attempts": {"count": 5, "window": 60},
```

### 🎯 **6. OAuth Integration**

#### **Replace Placeholder Auth:**
- Integrate real OAuth provider (Auth0, Google, etc.)
- Update login endpoints to use real authentication
- Remove placeholder login logic

### 📊 **7. Monitoring & Logging**

#### **Production Logging:**
- Configure structured logging
- Set up error tracking (Sentry, etc.)
- Monitor rate limit usage
- Track authentication failures

### ✅ **8. Testing Checklist**

- [ ] Test CORS with production domain
- [ ] Verify JWT token generation/validation
- [ ] Test rate limiting with production limits  
- [ ] Confirm OAuth flow works end-to-end
- [ ] Test WebSocket connections with authentication
- [ ] Verify all environment variables are set
- [ ] Test database/Redis connectivity

### 🚨 **9. Security Verification**

- [ ] JWT_SECRET is secure (32+ characters)
- [ ] No hardcoded secrets in code
- [ ] HTTPS enforced for all endpoints
- [ ] Rate limiting active and tested
- [ ] CORS configured for production domains only
- [ ] Session cookies secure in production

### 📋 **10. Post-Deployment**

- [ ] Monitor error rates and performance
- [ ] Check rate limiting effectiveness
- [ ] Verify authentication flow
- [ ] Test multiplayer game functionality
- [ ] Monitor OpenAI API usage and costs 