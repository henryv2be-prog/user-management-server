const fetch = require('node-fetch');

async function testDoorTagsAPI() {
    try {
        console.log('Testing door tags API...');
        
        // Test with a sample door ID (you can change this)
        const doorId = 1;
        const baseUrl = 'http://localhost:3000'; // Change this to your Railway URL if testing remotely
        
        console.log(`Testing GET /api/door-tags/door/${doorId}`);
        
        const response = await fetch(`${baseUrl}/api/door-tags/door/${doorId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Note: You'll need to add a valid JWT token here for testing
                // 'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('Response data:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testDoorTagsAPI();
