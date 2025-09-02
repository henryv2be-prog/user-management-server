#!/bin/bash

# User Management Server Installation Script for Linux Mint
# This script automates the installation and setup process

set -e  # Exit on any error

echo "🚀 User Management Server Installation Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update package list
print_header "📦 Updating package list..."
sudo apt update

# Install Node.js and npm
print_header "🔧 Installing Node.js and npm..."
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    sudo apt install -y nodejs npm
else
    print_status "Node.js is already installed"
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_warning "Node.js version is $NODE_VERSION. Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Install PM2 globally
print_header "⚙️ Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 is already installed"
fi

# Install project dependencies
print_header "📚 Installing project dependencies..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the project directory."
    exit 1
fi

print_status "Installing dependencies..."
npm install

# Create necessary directories
print_header "📁 Creating directories..."
mkdir -p data
mkdir -p logs

# Set up environment file
print_header "⚙️ Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        
        print_warning "Environment file created. Please review and update .env file with your settings."
        print_warning "Generated JWT secret: $JWT_SECRET"
    else
        print_error "env.example file not found"
        exit 1
    fi
else
    print_status ".env file already exists"
fi

# Set proper permissions
print_header "🔐 Setting permissions..."
chmod 755 data/
chmod 644 .env

# Test the installation
print_header "🧪 Testing installation..."
print_status "Starting server in test mode..."
timeout 10s npm start || true

# Create systemd service (optional)
print_header "🔧 Creating systemd service..."
read -p "Do you want to create a systemd service for auto-start? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Creating systemd service..."
    
    SERVICE_FILE="/tmp/user-management.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=User Management Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

    sudo mv "$SERVICE_FILE" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable user-management
    print_status "Systemd service created and enabled"
fi

# Final instructions
print_header "🎉 Installation Complete!"
echo
print_status "Your User Management Server is ready to use!"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review and update the .env file with your settings"
echo "2. Start the server:"
echo "   - Development: npm run dev"
echo "   - Production: npm start"
echo "   - With PM2: pm2 start ecosystem.config.js"
echo
echo "3. Access the application:"
echo "   - Web Interface: http://localhost:3000"
echo "   - API: http://localhost:3000/api"
echo "   - Health Check: http://localhost:3000/health"
echo
echo -e "${YELLOW}Default admin credentials:${NC}"
echo "Email: admin@example.com"
echo "Password: admin123456"
echo -e "${RED}⚠️  Change these credentials immediately after first login!${NC}"
echo
echo -e "${BLUE}Useful commands:${NC}"
echo "- Start with PM2: pm2 start ecosystem.config.js"
echo "- View logs: pm2 logs user-management-server"
echo "- Stop server: pm2 stop user-management-server"
echo "- Restart server: pm2 restart user-management-server"
echo
print_status "Installation completed successfully! 🚀"

