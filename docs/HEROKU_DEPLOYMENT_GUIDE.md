# QueuePlay Heroku Deployment Guide

**Deploy QueuePlay to Production**  
*Complete guide for deploying frontend, backend, and WebSocket services to Heroku*

## 🎯 Overview

This guide walks you through deploying QueuePlay to Heroku using the existing Docker configuration. QueuePlay requires:

- **Frontend**: React app (Vite)
- **Backend**: FastAPI application 
- **WebSocket Server**: Multiplayer game server
- **Redis**: Database for game state and authentication

---

## 🏗️ Current Architecture

Your QueuePlay is configured with:
- ✅ `heroku.yml` - Multi-container Docker deployment
- ✅ `frontend/Dockerfile` - React/Vite application
- ✅ `backend/Dockerfile` - FastAPI application
- ✅ `Dockerfile.multiplayer` - WebSocket server
- ✅ JWT authentication with Redis sessions

---

## 🚀 Step 1: Heroku Setup

### Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Verify installation
heroku --version
```

### Login and Create App
```bash
# Login to Heroku
heroku login

# Create your app (replace 'your-app-name' with your desired name)
heroku apps:create queueplay-prod

# Enable container registry
heroku container:login
```

---

## 🔧 Step 2: Configure Environment Variables

### Set Production Environment Variables
```bash
# Set stage to production
heroku config:set STAGE=PROD -a queueplay-prod

# JWT Secret (generate a secure secret)
heroku config:set JWT_SECRET=$(openssl rand -base64 32) -a queueplay-prod

# Redis Configuration (we'll add Redis addon next)
heroku config:set REDIS_URL=redis://localhost:6379 -a queueplay-prod

# Frontend URL for QR codes
heroku config:set FRONTEND_URL=https://queueplay-prod.herokuapp.com -a queueplay-prod

# WebSocket configuration
heroku config:set WS_HOST=0.0.0.0 -a queueplay-prod
heroku config:set WS_PORT=6789 -a queueplay-prod

# API Configuration
heroku config:set API_BASE_URL=https://queueplay-prod.herokuapp.com -a queueplay-prod

# OpenAI API Key (for username generation and questions)
heroku config:set OPENAI_API_KEY=your_openai_api_key -a queueplay-prod
```

### Add Redis Addon
```bash
# Add Redis addon (free tier available)
heroku addons:create heroku-redis:mini -a queueplay-prod

# This automatically sets REDIS_URL, no manual configuration needed
```

---

## 📦 Step 3: Prepare for Deployment

### Update heroku.yml Configuration
Your current `heroku.yml` needs some adjustments for production:

```yaml
# heroku.yml (updated)
build:
  docker:
    web: frontend/Dockerfile
    api: backend/Dockerfile
    worker: ./Dockerfile.multiplayer

run:
  web:
    command:
      - npm start
    image: web
  api:
    command:
      - python main.py --env prod
    image: api
  worker:
    command:
      - python backend/MultiplayerServer.py
    image: worker

```

### Update Frontend for Production

#### Update `frontend/package.json` scripts:
```json
{
  "scripts": {
    "start": "vite preview --host 0.0.0.0 --port $PORT",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

#### Create `frontend/.env.production`:
```bash
# frontend/.env.production
VITE_API_BASE_URL=https://queueplay-prod.herokuapp.com
VITE_WS_URL=wss://queueplay-prod.herokuapp.com:6789
```

### Update Backend for Production

#### Update `backend/main.py` CORS origins:
```python
# backend/main.py
if appConfig.stage == Stage.PROD:
    origins = [
        "https://queueplay-prod.herokuapp.com",  # Your Heroku app URL
        "https://your-custom-domain.com",        # If you have a custom domain
    ]
```

---

## 🔍 Step 4: Pre-Deployment Checklist

### Verify Required Files
- ✅ `heroku.yml` in root directory
- ✅ `frontend/Dockerfile` with correct Node.js setup
- ✅ `backend/Dockerfile` with Python setup
- ✅ `Dockerfile.multiplayer` for WebSocket server
- ✅ `backend/requirements.txt` with all dependencies

### Test Local Build (Optional)
```bash
# Test frontend build
cd frontend
npm run build
cd ..

# Test backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

---

## 🚀 Step 5: Deploy to Heroku

### Enable Container Stack
```bash
heroku stack:set container -a queueplay-prod
```

### Deploy the Application
```bash
# Make sure you're in the root directory of your project
cd /Users/kyoimura/Repo/QueuePlay

# Add all changes to git
git add .
git commit -m "Production deployment configuration"

# Set up Heroku remote
heroku git:remote -a queueplay-prod

# Deploy to Heroku
git push heroku main
```

### Monitor Deployment
```bash
# Watch deployment logs
heroku logs --tail -a queueplay-prod

# Check app status
heroku ps -a queueplay-prod
```

---

## 🔧 Step 6: Post-Deployment Configuration

### Scale Your Dynos
```bash
# Scale web dyno (frontend)
heroku ps:scale web=1 -a queueplay-prod

# Scale API dyno (backend)
heroku ps:scale api=1 -a queueplay-prod

# Scale worker dyno (WebSocket server)
heroku ps:scale worker=1 -a queueplay-prod
```

### Verify Services
```bash
# Check all services are running
heroku ps -a queueplay-prod

# Test the application
heroku open -a queueplay-prod
```

---

## 🧪 Step 7: Test Production Deployment

### Manual Testing Checklist
1. **Frontend Access**: Visit `https://queueplay-prod.herokuapp.com`
2. **Host Login**: Test authentication flow
3. **Game Creation**: Create a new game
4. **QR Code Generation**: Verify QR codes work
5. **Player Join**: Test player joining via QR code
6. **WebSocket Connection**: Start a game and test real-time functionality

### Debug Common Issues
```bash
# View application logs
heroku logs --tail -a queueplay-prod

# Check specific service logs
heroku logs --dyno=web -a queueplay-prod
heroku logs --dyno=api -a queueplay-prod  
heroku logs --dyno=worker -a queueplay-prod

# Check Redis connection
heroku redis:info -a queueplay-prod
```

---

## 🔒 Step 8: Security & Performance

### SSL Configuration
Heroku automatically provides SSL certificates for `*.herokuapp.com` domains.

### Custom Domain (Optional)
```bash
# Add custom domain
heroku domains:add yourdomain.com -a queueplay-prod

# Configure SSL for custom domain
heroku certs:auto:enable -a queueplay-prod
```

### Performance Monitoring
```bash
# Add performance monitoring
heroku addons:create newrelic:wayne -a queueplay-prod
```

---

## 🔄 Step 9: Ongoing Deployment

### Deploy Updates
```bash
# After making changes
git add .
git commit -m "Your commit message"
git push heroku main

# Force rebuild if needed
heroku builds:create -a queueplay-prod
```

### Environment Variable Updates
```bash
# Update environment variables as needed
heroku config:set NEW_VARIABLE=value -a queueplay-prod

# View all environment variables
heroku config -a queueplay-prod
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Application Error (H10)**
```bash
# Check logs for errors
heroku logs --tail -a queueplay-prod

# Common causes:
# - Port binding issues (use $PORT in frontend)
# - Missing environment variables
# - Database connection issues
```

**2. WebSocket Connection Fails**
```bash
# Check worker dyno is running
heroku ps -a queueplay-prod

# WebSocket URL should be:
# wss://queueplay-prod.herokuapp.com:6789
```

**3. Redis Connection Issues**
```bash
# Check Redis addon status
heroku redis:info -a queueplay-prod

# Verify REDIS_URL is set
heroku config:get REDIS_URL -a queueplay-prod
```

**4. CORS Errors**
- Update `backend/main.py` origins list with your Heroku URL
- Redeploy after CORS changes

**5. Build Failures**
```bash
# Check build logs
heroku logs --dyno=web -a queueplay-prod

# Common issues:
# - Missing dependencies in package.json/requirements.txt
# - Dockerfile syntax errors
# - Environment variable issues
```

---

## 📋 Quick Deployment Checklist

### Pre-Deployment
- [ ] Heroku CLI installed and logged in
- [ ] App created on Heroku
- [ ] Environment variables configured
- [ ] Redis addon added
- [ ] CORS origins updated for production

### Deployment
- [ ] Container stack enabled
- [ ] Code committed to git
- [ ] Heroku remote configured
- [ ] Deployed with `git push heroku main`
- [ ] Dynos scaled appropriately

### Post-Deployment
- [ ] All services running (`heroku ps`)
- [ ] Application accessible via web
- [ ] Authentication working
- [ ] Game creation/joining tested
- [ ] WebSocket connections working
- [ ] Logs monitored for errors

---

## 🎯 Next Steps After Deployment

1. **Custom Domain**: Configure your own domain name
2. **SSL Certificate**: Set up SSL for custom domain
3. **Monitoring**: Add application monitoring and alerts
4. **Backup Strategy**: Set up Redis backup strategy
5. **CI/CD**: Set up automated deployments
6. **Performance**: Monitor and optimize application performance

Your QueuePlay application should now be live and accessible at `https://queueplay-prod.herokuapp.com`! 🚀

---

## 📞 Support

If you encounter issues during deployment:

1. **Check Heroku Status**: https://status.heroku.com/
2. **Review Logs**: `heroku logs --tail -a queueplay-prod`
3. **Heroku Documentation**: https://devcenter.heroku.com/
4. **QueuePlay Documentation**: Refer to other docs in this repository

Happy deploying! 🎮 