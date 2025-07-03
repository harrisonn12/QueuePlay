# Docker Setup Guide

This project supports both development and production Docker configurations.

## Development Setup

**Files:**
- `docker-compose.yml` - Development services
- `frontend/Dockerfile` - Development frontend
- `.env` - Development environment variables

**Features:**
- Hot reloading for frontend
- Direct container access to source code
- Development API endpoints
- Vite dev server on port 5173

**Usage:**
```bash
# Copy environment file
cp .env.example .env
# Edit .env with your development values

# Start development environment
docker-compose up --build

# Services available at:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Multiplayer: http://localhost:6789
# Redis: localhost:6379
```

## Production Setup

**Files:**
- `docker-compose.prod.yml` - Production services
- `frontend/Dockerfile.prod` - Production frontend with Nginx
- `frontend/nginx.prod.conf` - Nginx configuration
- `.env.prod` - Production environment variables

**Features:**
- Optimized React build
- Nginx reverse proxy
- API/WebSocket proxying
- Production security headers
- Gzip compression
- Asset caching
- Health checks

**Usage:**
```bash
# Copy production environment file
cp .env.prod.example .env.prod
# Edit .env.prod with your production values

# Start production environment
docker-compose -f docker-compose.prod.yml up --build

# Services available at:
# Frontend: http://localhost (port 80)
# Backend: http://localhost:8000 (internal)
# Multiplayer: http://localhost:6789 (internal)
# API via Nginx: http://localhost/api/
# WebSocket via Nginx: http://localhost/ws/
```

## Environment Configuration

### Development (.env)
```bash
# Database
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_KEY=your-dev-key
SUPABASE_USERNAME=dev@example.com
SUPABASE_PASSWORD=dev-password

# APIs
OPENAI_API_KEY=your-dev-openai-key
JWT_SECRET=dev-secret-key

# Frontend
VITE_API_URL=http://localhost:8000
STAGE=dev
```

### Production (.env.prod)
```bash
# Database
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_KEY=your-prod-key
SUPABASE_USERNAME=prod@example.com
SUPABASE_PASSWORD=secure-prod-password

# APIs
OPENAI_API_KEY=your-prod-openai-key
JWT_SECRET=super-secure-prod-jwt-secret

# Frontend
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=wss://your-ws-domain.com
STAGE=prod
```

## Architecture Differences

### Development
```
Browser → Vite Dev Server (5173) → Backend API (8000)
                                 → WebSocket (6789)
```

### Production
```
Browser → Nginx (80) → React Build (static files)
                    → /api/* → Backend API (8000)
                    → /ws/* → WebSocket (6789)
```

## Commands Reference

```bash
# Development
docker-compose up --build                    # Start dev environment
docker-compose down                          # Stop dev environment
docker-compose logs -f web                   # View frontend logs
docker-compose exec backend python main.py  # Access backend shell

# Production
docker-compose -f docker-compose.prod.yml up --build -d  # Start prod (detached)
docker-compose -f docker-compose.prod.yml down           # Stop prod
docker-compose -f docker-compose.prod.yml logs -f web    # View logs
docker-compose -f docker-compose.prod.yml ps             # View status

# Database migration (production)
docker-compose -f docker-compose.prod.yml exec backend python -c "
import sys; sys.path.append('/app'); 
from main import supabaseDatabaseAdapter;
# Run your migration commands here
"

# Health checks
curl http://localhost/health        # Production health check
curl http://localhost:5173/         # Development health check
```

## Troubleshooting

### Development Issues
- **Port conflicts**: Change ports in `docker-compose.yml`
- **Hot reload not working**: Ensure volume mounts are correct
- **API not connecting**: Check `getApiBaseUrl()` logic

### Production Issues
- **502 Bad Gateway**: Check backend container status
- **Static files not loading**: Verify Nginx configuration
- **WebSocket connection failed**: Check proxy settings

### Common Problems
- **Environment variables not loading**: Ensure `.env` files exist
- **Database connection failed**: Verify Supabase credentials
- **Build failures**: Check Node.js version compatibility