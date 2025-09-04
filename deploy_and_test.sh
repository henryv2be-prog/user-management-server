#!/bin/bash

# SimplifiAccess Linux Deployment and Stress Testing Script
# This script deploys the server and runs comprehensive stress tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_PORT=${SERVER_PORT:-3000}
SERVER_HOST=${SERVER_HOST:-localhost}
STRESS_TEST_SIZE=${STRESS_TEST_SIZE:-medium}

echo -e "${BLUE}🚀 SimplifiAccess Linux Deployment & Stress Test${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    print_info "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        print_info "Installing Node.js..."
        
        # Detect Linux distribution and install Node.js
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs npm
        elif command -v dnf &> /dev/null; then
            # Fedora
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo dnf install -y nodejs npm
        else
            print_error "Unsupported Linux distribution. Please install Node.js manually."
            exit 1
        fi
    fi
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_status "Node.js $NODE_VERSION and npm $NPM_VERSION are available"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Initialize database
init_database() {
    print_info "Initializing database..."
    node database/init.js
    print_status "Database initialized"
}

# Start server in background
start_server() {
    print_info "Starting SimplifiAccess server..."
    
    # Kill any existing server process
    pkill -f "node server.js" 2>/dev/null || true
    
    # Start server in background
    nohup node server.js > server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > server.pid
    
    # Wait for server to start
    print_info "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://$SERVER_HOST:$SERVER_PORT/api/health &> /dev/null; then
            print_status "Server started successfully on port $SERVER_PORT (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    print_error "Server failed to start within 30 seconds"
    cat server.log
    exit 1
}

# Stop server
stop_server() {
    if [ -f server.pid ]; then
        SERVER_PID=$(cat server.pid)
        print_info "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        rm -f server.pid
        print_status "Server stopped"
    fi
}

# Run stress tests
run_stress_tests() {
    print_info "Running stress tests (size: $STRESS_TEST_SIZE)..."
    
    case $STRESS_TEST_SIZE in
        "small")
            node stress_test.js --users 100 --doors 50 --groups 25 --url http://$SERVER_HOST:$SERVER_PORT
            ;;
        "medium")
            node stress_test.js --users 1000 --doors 100 --groups 50 --url http://$SERVER_HOST:$SERVER_PORT
            ;;
        "large")
            node stress_test.js --users 10000 --doors 1000 --groups 500 --url http://$SERVER_HOST:$SERVER_PORT
            ;;
        *)
            node stress_test.js --url http://$SERVER_HOST:$SERVER_PORT
            ;;
    esac
    
    print_status "Stress tests completed!"
}

# Generate system report
generate_system_report() {
    print_info "Generating system report..."
    
    REPORT_FILE="system_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "SimplifiAccess System Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo
        echo "System Information:"
        echo "- OS: $(uname -a)"
        echo "- CPU: $(nproc) cores"
        echo "- Memory: $(free -h | grep '^Mem:' | awk '{print $2}') total"
        echo "- Disk: $(df -h . | tail -1 | awk '{print $4}') available"
        echo "- Node.js: $(node --version)"
        echo "- npm: $(npm --version)"
        echo
        echo "Server Status:"
        echo "- Port: $SERVER_PORT"
        echo "- PID: $(cat server.pid 2>/dev/null || echo 'Not running')"
        echo "- Log size: $(wc -l < server.log 2>/dev/null || echo '0') lines"
        echo
        echo "Database:"
        echo "- SQLite file: $(ls -lh *.db 2>/dev/null || echo 'No database file found')"
        echo
        echo "Stress Test Results:"
        echo "- Latest results: $(ls -t stress_test_results/*.json 2>/dev/null | head -1 || echo 'No results found')"
        echo "- Results count: $(ls stress_test_results/*.json 2>/dev/null | wc -l || echo '0')"
    } > $REPORT_FILE
    
    print_status "System report saved to: $REPORT_FILE"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    stop_server
    print_status "Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT

# Main execution
main() {
    print_info "Starting deployment and testing process..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --size)
                STRESS_TEST_SIZE="$2"
                shift 2
                ;;
            --port)
                SERVER_PORT="$2"
                shift 2
                ;;
            --host)
                SERVER_HOST="$2"
                shift 2
                ;;
            --no-install)
                SKIP_INSTALL=true
                shift
                ;;
            --no-tests)
                SKIP_TESTS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --size <small|medium|large>  Stress test size (default: medium)"
                echo "  --port <port>                Server port (default: 3000)"
                echo "  --host <host>                Server host (default: localhost)"
                echo "  --no-install                 Skip dependency installation"
                echo "  --no-tests                   Skip stress tests"
                echo "  --help                       Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_nodejs
    
    if [ "$SKIP_INSTALL" != true ]; then
        install_dependencies
        init_database
    fi
    
    start_server
    
    if [ "$SKIP_TESTS" != true ]; then
        run_stress_tests
    fi
    
    generate_system_report
    
    print_status "Deployment and testing completed successfully!"
    print_info "Server is running at http://$SERVER_HOST:$SERVER_PORT"
    print_info "Check server.log for detailed logs"
    print_info "Stress test results are in ./stress_test_results/"
}

# Run main function
main "$@"
