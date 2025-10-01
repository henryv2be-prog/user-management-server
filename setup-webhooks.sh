#!/bin/bash

# SimplifiAccess Webhook Setup Script
# This script helps you set up webhooks step by step

echo "🔗 SimplifiAccess Webhook Setup"
echo "================================"
echo ""

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        return 1
    else
        echo "✅ $1 is installed"
        return 0
    fi
}

echo "🔍 Checking required tools..."
check_tool "node"
check_tool "npm"
check_tool "curl"

echo ""
echo "📋 Setup Steps:"
echo "1. Deploy the webhook branch on Railway"
echo "2. Get your admin token"
echo "3. Start the webhook receiver"
echo "4. Create your first webhook"
echo "5. Test the integration"
echo ""

# Get user input
read -p "Enter your Railway app URL (e.g., https://your-app.railway.app): " RAILWAY_URL
read -p "Enter your admin token: " ADMIN_TOKEN

if [ -z "$RAILWAY_URL" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Please provide both Railway URL and admin token"
    exit 1
fi

echo ""
echo "🚀 Starting webhook receiver..."
echo "This will start a local server to receive webhooks."
echo "Press Ctrl+C to stop when you're done testing."
echo ""

# Start the webhook receiver
node simple-webhook-receiver.js &
RECEIVER_PID=$!

# Wait a moment for server to start
sleep 2

echo ""
echo "📡 Creating test webhook..."

# Create a test webhook
WEBHOOK_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/webhooks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "http://localhost:3001/webhook",
    "events": ["access_request.granted", "access_request.denied"],
    "retryAttempts": 3,
    "timeout": 5000
  }')

if echo "$WEBHOOK_RESPONSE" | grep -q "success"; then
    echo "✅ Test webhook created successfully!"
    WEBHOOK_ID=$(echo "$WEBHOOK_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Webhook ID: $WEBHOOK_ID"
else
    echo "❌ Failed to create webhook:"
    echo "$WEBHOOK_RESPONSE"
fi

echo ""
echo "🧪 Testing webhook..."

# Test the webhook
TEST_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/webhooks/$WEBHOOK_ID/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$TEST_RESPONSE" | grep -q "success"; then
    echo "✅ Test webhook sent successfully!"
else
    echo "❌ Failed to send test webhook:"
    echo "$TEST_RESPONSE"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 What to do next:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Grant/deny access using your mobile app"
echo "3. Watch webhooks appear in the browser"
echo "4. Press Ctrl+C to stop the receiver when done"
echo ""
echo "💡 For external access, use ngrok:"
echo "   ngrok http 3001"
echo ""

# Wait for user to stop
wait $RECEIVER_PID