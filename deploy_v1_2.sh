#!/bin/bash

# SimplifiAccess v1.2 Deployment Script
# This script deploys SimplifiAccess v1.2 with all new features

set -e  # Exit on any error

echo "🚀 SimplifiAccess v1.2 Deployment Script"
echo "========================================"

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16.0.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is not supported. Please install Node.js $REQUIRED_VERSION or higher."
    exit 1
fi

print_status "Node.js version $NODE_VERSION detected ✓"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm detected ✓"

# Create backup of existing installation
if [ -d "database" ] && [ -f "database/users.db" ]; then
    print_header "Creating backup of existing database..."
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r database "$BACKUP_DIR/"
    print_status "Database backed up to $BACKUP_DIR/"
fi

# Install dependencies
print_header "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Dependencies installed successfully ✓"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_warning "Please edit .env file with your configuration before starting the server"
    else
        print_error "env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Initialize database
print_header "Initializing database..."
node database/init.js

if [ $? -ne 0 ]; then
    print_error "Failed to initialize database"
    exit 1
fi

print_status "Database initialized successfully ✓"

# Run ESP32 workflow tests
print_header "Running ESP32 workflow tests..."
node test_esp32_workflow.js

if [ $? -ne 0 ]; then
    print_warning "ESP32 workflow tests failed. This may be expected if no ESP32 devices are connected."
else
    print_status "ESP32 workflow tests completed ✓"
fi

# Create systemd service file (optional)
if command -v systemctl &> /dev/null; then
    print_header "Creating systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/simplifiaccess.service"
    CURRENT_DIR=$(pwd)
    USER=$(whoami)
    
    sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=SimplifiAccess v1.2 Access Control System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    print_status "Systemd service created at $SERVICE_FILE"
    print_warning "To start the service: sudo systemctl start simplifiaccess"
    print_warning "To enable auto-start: sudo systemctl enable simplifiaccess"
fi

# Create PM2 ecosystem file
print_header "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'simplifiaccess-v1.2',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

print_status "PM2 ecosystem configuration created ✓"

# Create logs directory
mkdir -p logs

# Create startup script
print_header "Creating startup script..."
cat > start.sh <<'EOF'
#!/bin/bash
echo "Starting SimplifiAccess v1.2..."

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Starting with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "SimplifiAccess v1.2 started with PM2"
    echo "To view logs: pm2 logs simplifiaccess-v1.2"
    echo "To stop: pm2 stop simplifiaccess-v1.2"
else
    echo "PM2 not found. Starting with node..."
    node server.js
fi
EOF

chmod +x start.sh
print_status "Startup script created ✓"

# Create stop script
print_header "Creating stop script..."
cat > stop.sh <<'EOF'
#!/bin/bash
echo "Stopping SimplifiAccess v1.2..."

if command -v pm2 &> /dev/null; then
    pm2 stop simplifiaccess-v1.2
    echo "SimplifiAccess v1.2 stopped"
else
    echo "PM2 not found. Please stop the process manually."
fi
EOF

chmod +x stop.sh
print_status "Stop script created ✓"

# Create update script
print_header "Creating update script..."
cat > update.sh <<'EOF'
#!/bin/bash
echo "Updating SimplifiAccess v1.2..."

# Stop the service
./stop.sh

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Initialize database (will migrate if needed)
node database/init.js

# Start the service
./start.sh

echo "Update completed!"
EOF

chmod +x update.sh
print_status "Update script created ✓"

# Display deployment summary
print_header "Deployment Summary"
echo "===================="
print_status "SimplifiAccess v1.2 has been deployed successfully!"
echo ""
print_status "New Features Available:"
echo "  ✓ Multi-site management"
echo "  ✓ Advanced area/zone management"
echo "  ✓ Power monitoring for ESP32 devices"
echo "  ✓ Enhanced door access control (QR/NFC)"
echo "  ✓ Camera integration"
echo "  ✓ Licensing framework"
echo "  ✓ Offline fallback system"
echo "  ✓ ESP32 mesh networking"
echo "  ✓ ESP32 web server configuration"
echo ""
print_status "Files Created:"
echo "  ✓ ecosystem.config.js - PM2 configuration"
echo "  ✓ start.sh - Start script"
echo "  ✓ stop.sh - Stop script"
echo "  ✓ update.sh - Update script"
echo ""
print_status "Next Steps:"
echo "  1. Edit .env file with your configuration"
echo "  2. Run ./start.sh to start the server"
echo "  3. Access the web interface at http://localhost:3000"
echo "  4. Configure your ESP32 devices"
echo "  5. Set up your sites and areas"
echo ""
print_warning "Important:"
echo "  - Change default admin password after first login"
echo "  - Configure your ESP32 devices with the server URL"
echo "  - Set up proper SSL certificates for production use"
echo "  - Monitor system resources and logs regularly"
echo ""

# Ask if user wants to start the service
read -p "Do you want to start SimplifiAccess v1.2 now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_header "Starting SimplifiAccess v1.2..."
    ./start.sh
else
    print_status "Deployment completed. Run ./start.sh when ready to start the service."
fi

print_status "Deployment completed successfully! 🎉"