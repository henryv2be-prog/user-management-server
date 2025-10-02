const fetch = require('node-fetch');

async function testTagCreation() {
    try {
        console.log('Testing tag creation...');
        
        // Test data
        const testData = {
            doorId: 1,
            tagId: 'TEST123',
            tagType: 'nfc',
            tagData: 'Test tag data'
        };
        
        console.log('Sending request with data:', testData);
        
        const response = await fetch('http://localhost:3000/api/door-tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: You'll need to add a valid JWT token here for testing
                // 'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('Success response:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testTagCreation();
