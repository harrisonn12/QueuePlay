#!/bin/bash

# Digital Ocean Droplet Deployment Script for QueuePlay

set -e

echo "=== QueuePlay Digital Ocean Deployment Script ==="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Update system
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Step 2: Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release
    
    # Create keyrings directory if it doesn't exist
    mkdir -p /etc/apt/keyrings
    
    # Download and save Docker's GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository with signed-by keyring
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
else
    print_status "Docker is already installed"
fi

# Step 3: Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose is already installed"
fi

# Step 4: Install Nginx
print_status "Installing Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Step 5: Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
apt-get install -y certbot python3-certbot-nginx

# Step 6: Setup firewall
print_status "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8000/tcp
ufw allow 5173/tcp
ufw --force enable

# Step 7: Create application directory
APP_DIR="/opt/queueplay"
print_status "Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR

# Step 8: Clone or pull repository
if [ -d "$APP_DIR/.git" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    print_warning "Repository not found. Please clone your repository manually:"
    echo "cd $APP_DIR"
    echo "git clone <your-repository-url> ."
fi

# Step 9: Setup environment variables
if [ ! -f "$APP_DIR/.env" ]; then
    print_warning ".env file not found!"
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        print_status "Created .env from .env.example"
        print_warning "Please edit $APP_DIR/.env with your actual credentials"
    else
        print_error "No .env.example found. Please create .env file manually"
    fi
else
    print_status ".env file exists"
fi

# Step 10: Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/queueplay.service << EOF
[Unit]
Description=QueuePlay Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable queueplay

# Step 11: Setup Nginx configuration
print_status "Setting up Nginx configuration..."
cat > /etc/nginx/sites-available/queueplay << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/queueplay /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

print_status "Deployment setup complete!"
echo ""
print_warning "Next steps:"
echo "1. Clone your repository to $APP_DIR"
echo "2. Edit $APP_DIR/.env with your credentials"
echo "3. Update domain in /etc/nginx/sites-available/queueplay"
echo "4. Run: cd $APP_DIR && docker-compose build"
echo "5. Start the application: systemctl start queueplay"
echo "6. Setup SSL: certbot --nginx -d your-domain.com"
echo ""
print_status "To check application status: systemctl status queueplay"
print_status "To view logs: journalctl -u queueplay -f"