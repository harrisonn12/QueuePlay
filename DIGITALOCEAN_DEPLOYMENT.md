# Digital Ocean Deployment Guide for QueuePlay

## Prerequisites

- Digital Ocean account
- Domain name (optional, but recommended for production)
- Git repository for your code

## Step 1: Create a Digital Ocean Droplet

1. Log into Digital Ocean
2. Create a new Droplet with these specifications:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (Recommended: 2 GB RAM / 2 CPUs minimum)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or Password
   - **Additional Options**: Enable monitoring

## Step 2: Initial Server Setup

1. SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

2. Run the deployment script:
```bash
# Download and run the deploy script
wget https://raw.githubusercontent.com/your-repo/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

## Step 3: Clone Your Repository

```bash
cd /opt/queueplay
git clone https://github.com/your-username/queueplay.git .
```

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your actual credentials:
```bash
nano .env
```

Required environment variables:
- `CHATGPT_KEY`: Your OpenAI API key
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `VITE_AUTH0_DOMAIN`: Auth0 domain
- `VITE_AUTH0_CLIENT_ID`: Auth0 client ID
- `VITE_AUTH0_CLIENT_SECRET`: Auth0 client secret
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `REDIS_PASSWORD`: Set a strong Redis password

## Step 5: Build and Start the Application

1. Build Docker containers:
```bash
cd /opt/queueplay
docker-compose build
```

2. Start the application:
```bash
systemctl start queueplay
# Or manually:
docker-compose up -d
```

3. Check status:
```bash
systemctl status queueplay
docker-compose ps
```

## Step 6: Configure Domain and SSL (Optional but Recommended)

1. Update Nginx configuration with your domain:
```bash
nano /etc/nginx/sites-available/queueplay
```
Replace `your-domain.com` with your actual domain.

2. Reload Nginx:
```bash
nginx -t
systemctl reload nginx
```

3. Setup SSL with Let's Encrypt:
```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Step 7: Configure Firewall

The deployment script already configures basic firewall rules. To verify:
```bash
ufw status
```

## Application Structure

- **Frontend**: React app running on port 5173
- **Backend**: FastAPI server on port 8000
- **Multiplayer Server**: WebSocket server on port 6789
- **Redis**: Cache and session storage on port 6379
- **Nginx**: Reverse proxy on port 80/443

## Monitoring and Maintenance

### View logs:
```bash
# Application logs
journalctl -u queueplay -f

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f multiplayer
```

### Restart services:
```bash
# Restart entire application
systemctl restart queueplay

# Restart individual services
docker-compose restart backend
docker-compose restart frontend
```

### Update application:
```bash
cd /opt/queueplay
git pull origin main
docker-compose build
systemctl restart queueplay
```

## Database Setup

Your application uses Supabase as the database. Ensure you:

1. Have created a Supabase project
2. Run the database migrations in Supabase:
   - Go to SQL Editor in Supabase dashboard
   - Run migrations from `backend/database/migrations/` in order

## Troubleshooting

### Application won't start:
```bash
# Check logs
docker-compose logs
journalctl -u queueplay -n 50

# Check if ports are available
netstat -tulpn | grep -E '(8000|5173|6789|6379)'
```

### Database connection issues:
- Verify Supabase credentials in `.env`
- Check if Supabase project is active
- Ensure IP is whitelisted in Supabase settings

### WebSocket connection issues:
- Ensure Nginx is properly configured for WebSocket
- Check firewall allows WebSocket connections
- Verify multiplayer server is running

## Security Checklist

- [ ] Change default passwords
- [ ] Configure firewall rules
- [ ] Setup SSL certificate
- [ ] Secure environment variables
- [ ] Regular security updates: `apt update && apt upgrade`
- [ ] Enable automatic security updates
- [ ] Configure fail2ban for SSH protection
- [ ] Disable root SSH login after creating admin user

## Backup Strategy

1. Database: Supabase handles backups automatically
2. Application code: Use Git for version control
3. Environment variables: Keep secure backup of `.env`
4. Redis data: Configure Redis persistence if needed

## Performance Optimization

1. Enable Docker container resource limits
2. Configure Nginx caching for static assets
3. Use CDN for frontend assets (optional)
4. Monitor with Digital Ocean monitoring
5. Scale horizontally with load balancer if needed

## Support

- Check application logs for errors
- Review Docker container status
- Ensure all environment variables are set correctly
- Verify network connectivity between services