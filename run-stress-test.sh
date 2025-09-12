#!/bin/bash

# SimplifiAccess Stress Test Runner
# Usage: ./run-stress-test.sh [URL]

# Default URL (update this with your actual Render app URL)
DEFAULT_URL="https://your-app-name.onrender.com"

# Get URL from parameter or use default
URL=${1:-$DEFAULT_URL}

echo "🚀 Starting SimplifiAccess Stress Test"
echo "Target URL: $URL"
echo "────────────────────────────────────────"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if package.json exists
if [ -f "stress-test-package.json" ]; then
    echo "📦 Installing dependencies..."
    cp stress-test-package.json package.json
    npm install --silent
fi

# Run the stress test
echo "🏃 Running stress test..."
TEST_URL="$URL" node stress-test.js

# Cleanup
if [ -f "package.json" ]; then
    rm package.json
    rm -rf node_modules
fi

echo "✅ Stress test completed!"