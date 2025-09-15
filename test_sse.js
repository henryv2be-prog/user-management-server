const EventSource = require('eventsource');
const fetch = require('node-fetch');

async function testSSE() {
    try {
        // Login to get token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Login successful, token obtained');
        
        // Connect to SSE stream
        const eventSource = new EventSource(`http://localhost:3000/api/events/stream`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        eventSource.onopen = function(event) {
            console.log('✅ SSE connection opened');
        };
        
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('📨 Received SSE message:', data);
        };
        
        eventSource.onerror = function(event) {
            console.error('❌ SSE error:', event);
        };
        
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create a new user to trigger an event
        console.log('🔄 Creating new user to test event broadcasting...');
        const createResponse = await fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName: 'SSE',
                lastName: 'Test',
                email: 'sse-test@example.com',
                password: 'Test123456',
                role: 'user'
            })
        });
        
        const createData = await createResponse.json();
        console.log('✅ User created:', createData.message);
        
        // Wait for event to be broadcasted
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Close connection
        eventSource.close();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSSE();