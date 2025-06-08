# QueuePlay Codebase Architecture
## Complete System Overview & File Documentation

## 🏗️ High-Level Architecture

QueuePlay is a multiplayer trivia game with JWT-secured APIs and real-time WebSocket communication. The system is designed for **independent scaling** on platforms like Heroku.


## 📁 Directory Structure & Component Breakdown

### `/backend/` - Main API Server (FastAPI)

#### Core Application
- **`main.py`** - Main FastAPI application entry point
  - Initializes all services and dependencies
  - Defines API endpoints (auth, game, public)
  - Configures CORS and security middleware
  - Handles JWT authentication workflow

#### Security Services
- **`AuthService/AuthService.py`** - JWT Authentication Management
  - Session-based token generation (httpOnly cookies)
  - 15-minute JWT token expiry with rotation
  - Anti-abuse session validation
  - Integration with Redis for session storage

- **`RateLimitService/RateLimitService.py`** - Anti-Abuse Protection
  - Implements tiered rate limiting (API, questions, WebSocket)
  - Prevents cost explosion on expensive OpenAI calls
  - Per-user and per-IP limits with sliding windows
  - Redis-backed counters with automatic expiry

- **`middleware/auth_middleware.py`** - Request Security Pipeline
  - JWT token validation middleware
  - CORS and referer validation
  - IP extraction and rate limit integration
  - Dependency injection for protected endpoints

#### Game Services
- **`LobbyService/LobbyService.py`** - Game Session Management
  - Lobby creation and player management
  - Redis-based state persistence with TTL
  - Player join/leave operations
  - Game lifecycle management

- **`QuestionService/QuestionService.py`** - AI Question Generation
  - OpenAI ChatGPT integration for trivia questions
  - Question caching and validation
  - Content moderation pipeline
  - Cost-optimized API usage

- **`UsernameService/UsernameService.py`** - Player Name Management
  - AI-powered username generation
  - Content moderation for usernames
  - Duplicate prevention and validation

#### Infrastructure & Configuration
- **`configuration/AppConfig.py`** - Environment Configuration
  - Stage management (DEV/PROD)
  - Service URL configuration
  - Environment-specific settings

- **`configuration/RedisConfig.py`** - Redis Connection Management
  - Multi-environment Redis configuration
  - Heroku Redis URL parsing
  - SSL/TLS configuration for production

- **`commons/adapters/RedisAdapter.py`** - Redis Operations Wrapper
  - Async Redis client management
  - JSON serialization/deserialization
  - Connection pooling and error handling
  - Pub/Sub operations for real-time messaging

- **`commons/adapters/ChatGptAdapter.py`** - OpenAI API Integration
  - Authenticated ChatGPT API calls
  - Response parsing and validation
  - Error handling and retry logic

#### Real-Time Communication
- **`MultiplayerServer.py`** - WebSocket Server (Port 6789)
  - Independent WebSocket server for real-time gaming
  - Player connection management
  - Message routing and broadcasting
  - Optional JWT authentication for hosts

- **`ConnectionService.py`** - WebSocket Connection Management
  - Client connection lifecycle
  - Authentication state tracking
  - Message delivery coordination

- **`MessageService/MessageService.py`** - Pub/Sub Message Routing
  - Redis-based message broadcasting
  - Channel subscription management
  - Server-to-server communication
  - WebSocket message distribution

### `/frontend/` - React Application (Vite)

#### Main Application Structure
- **`src/main.jsx`** - Application entry point
- **`src/App.jsx`** - Root component with routing
- **`index.html`** - HTML template

#### Game Components
- **`src/components/GameHost.jsx`** - Host game interface
  - Lobby creation and management
  - Player list display
  - Game state controls

- **`src/components/PlayerJoin.jsx`** - Player join interface
  - QR code scanning/manual entry
  - Username input and validation
  - Game connection establishment

#### Authentication & Security
- **`src/hooks/useAuth.js`** - Authentication Hook
  - JWT token management and automatic refresh
  - Session state handling with httpOnly cookies
  - **Integrates with backend AuthService + RateLimitService**
  - Calls `/auth/login`, `/auth/token`, `/auth/logout` endpoints
  - Handles OAuth integration (ready for Auth0/Google/etc.)
  - WebSocket authentication for host connections

#### Game Logic Hooks
- **`src/hooks/useGameState.js`** - Game State Management
  - API calls to backend services
  - Lobby creation and management
  - Question fetching with authentication

- **`src/hooks/useGameWebSocket.js`** - WebSocket Communication
  - Real-time connection to WebSocket server
  - Message sending and receiving
  - Connection state management

- **`src/hooks/useWebSocketMessageHandler.js`** - Message Processing
  - WebSocket message parsing
  - Game event handling
  - State synchronization

- **`src/hooks/useUsernameGenerator.js`** - Username Services
  - AI username generation
  - Username validation
  - API integration for username services

#### Styling & Configuration
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS processing
- **`vite.config.js`** - Vite build configuration
- **`package.json`** - Dependencies and scripts

### `/docs/` - Documentation

- **`SECURITY_STRATEGY_OVERVIEW.md`** - Complete security architecture
- **`host_centric_architecture_v2.md`** - Game flow documentation
- **`CODEBASE_ARCHITECTURE.md`** - This file

## 🔐 Security Implementation

### Authentication Flow
```
1. User → Frontend: Click "Host Game" (useAuth.js hook)
2. Frontend → Backend: POST /auth/login {user_id, username}
3. Backend → RateLimitService: Check login attempt rate limit
4. Backend → AuthService: create_session(user_id, metadata)
5. AuthService → Redis: Store session with TTL (24 hours)
6. Backend → Frontend: httpOnly session cookie
7. Frontend → Backend: POST /auth/token (with cookie)
8. Backend → RateLimitService: Check token generation rate limit  
9. Backend → AuthService: generate_jwt_token(session_id)
10. AuthService → Redis: Validate session exists and active
11. AuthService → Backend: JWT token (15min expiry)
12. Backend → Frontend: JWT token
13. Frontend → Backend: API calls with Authorization header
14. Backend → AuthService: validate_jwt_token(token) on each request
```

**Key Integration Points:**
- **useAuth.js** → Calls main.py endpoints → Uses AuthService + RateLimitService
- **AuthService** → Manages sessions and JWT tokens in Redis
- **RateLimitService** → Prevents abuse during login/token generation
- **All authentication flows** → Go through these security services

### Protection Layers
1. **JWT Authentication** - Validates user identity
2. **Rate Limiting** - Prevents API abuse (5 req/min, 50 questions/day)
3. **CORS Validation** - Blocks cross-site attacks
4. **Referer Checks** - Prevents command-line abuse
5. **Token Expiration** - 15-minute attack window maximum

### Cost Protection
- **Question Generation**: 50 per day per user
- **API Requests**: 5 per minute per user  
- **Token Generation**: 10 per 5 minutes per IP
- **WebSocket Actions**: 10 per minute per user

## 🎮 Game Flow Architecture

### Host Flow (Authenticated)
```
Host → Create Lobby (JWT) → Generate QR Code → Get Questions (OpenAI) → Manage Game
```

### Player Flow (Unauthenticated)
```
Player → Scan QR Code → Enter Username → Join WebSocket → Play Game
```

### Real-Time Communication
```
Redis Pub/Sub ← Backend API ← WebSocket Server ← Players
     ↓              ↓              ↓
State Sync     Game Logic    Real-time Updates
```

## 🚀 Deployment Architecture

### Independent Services (Heroku)
- **Frontend Dyno**: Static React app serving
- **Backend Dyno**: FastAPI with auto-scaling
- **WebSocket Dyno**: Independent real-time server
- **Redis Add-on**: Shared state and messaging

### Scaling Strategy
```
Light Load:    Frontend=1, Backend=1, WebSocket=1
Heavy Gaming:  Frontend=2, Backend=2, WebSocket=5  
AI Spike:      Frontend=2, Backend=6, WebSocket=3
```

## 🛠️ Development Setup

### Required Services
1. **Redis** (localhost:6379) - State management
2. **Backend** (localhost:8000) - API server
3. **WebSocket** (localhost:6789) - Real-time server  
4. **Frontend** (localhost:5173) - React development server

### Environment Variables
```bash
# API Keys
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret

# Redis Configuration  
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Stage Configuration
STAGE=DEVO  # or PROD
```

### Start Sequence
```bash
# 1. Start Redis
redis-server

# 2. Start Backend API
cd backend && python3 main.py

# 3. Start WebSocket Server  
cd backend && python3 MultiplayerServer.py

# 4. Start Frontend
cd frontend && npm run dev
```

## 🧪 Testing Authentication

### JWT Test Sequence
```javascript
// 1. Create session
fetch('/auth/login', {method: 'POST', credentials: 'include', 
  body: JSON.stringify({user_id: 'test', username: 'Test'})})

// 2. Get JWT token
fetch('/auth/token', {method: 'POST', credentials: 'include'})

// 3. Use protected endpoints
fetch('/createLobby', {headers: {'Authorization': 'Bearer ' + token}})
```

## 📈 Performance & Monitoring

### Key Metrics
- **JWT Token Generation**: Rate limited per IP
- **Question API Calls**: Rate limited per user
- **WebSocket Connections**: Tracked per game
- **Redis Operations**: Monitored for performance

### Cost Controls
- **Daily Question Limits**: Prevent budget overrun
- **Rate Limiting**: Block abuse patterns
- **Token Expiration**: Minimize attack windows
- **Session Management**: Automatic cleanup

## 🔧 Future Enhancements

### Authentication Improvements
- [ ] Real password-based authentication
- [ ] OAuth integration (Google, GitHub)
- [ ] Email verification
- [ ] Password reset flow

### Security Enhancements  
- [ ] IP-based geolocation blocking
- [ ] Advanced bot detection
- [ ] Rate limit escalation
- [ ] Audit logging

### Game Features
- [ ] Question categories
- [ ] Custom game modes
- [ ] Player statistics
- [ ] Leaderboards

---

**Status**: ✅ **Complete JWT Security Implementation**  
**Next Step**: Integrate real authentication provider for production 