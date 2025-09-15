#!/bin/bash

echo "🔐 Getting authentication token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"

echo "🔄 Starting SSE connection in background..."
curl -s http://localhost:3000/api/events/stream \
  -H "Authorization: Bearer $TOKEN" > /tmp/sse_output.log &
SSE_PID=$!

# Wait for connection to establish
sleep 2

echo "📝 Creating new user to test event broadcasting..."
curl -s -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"SSE","lastName":"Test","email":"sse-test2@example.com","password":"Test123456","role":"user"}' > /dev/null

echo "✅ User created"

# Wait for event to be broadcasted
sleep 2

# Kill SSE connection
kill $SSE_PID 2>/dev/null

echo "📋 SSE output:"
cat /tmp/sse_output.log

echo "🧹 Cleaning up..."
rm -f /tmp/sse_output.log

echo "✅ Test completed"