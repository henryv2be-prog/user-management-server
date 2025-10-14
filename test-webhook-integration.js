// Test script to verify webhook integration
// Run this after deploying the webhook branch

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

async function testWebhookIntegration() {
  console.log('🧪 Testing Webhook Integration...\n');

  try {
    // 1. Create a test webhook
    console.log('1️⃣ Creating test webhook...');
    const webhookResponse = await axios.post(`${BASE_URL}/api/webhooks`, {
      name: 'Test Webhook',
      url: 'https://webhook.site/your-unique-url', // Replace with your webhook.site URL
      events: ['access_request.granted', 'access_request.denied'],
      retryAttempts: 3,
      timeout: 5000
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Webhook created:', webhookResponse.data.webhook.id);
    const webhookId = webhookResponse.data.webhook.id;

    // 2. Test the webhook
    console.log('\n2️⃣ Testing webhook...');
    const testResponse = await axios.post(`${BASE_URL}/api/webhooks/${webhookId}/test`, {}, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Test webhook sent:', testResponse.data.delivery.id);

    // 3. Check delivery history
    console.log('\n3️⃣ Checking delivery history...');
    const deliveryResponse = await axios.get(`${BASE_URL}/api/webhooks/${webhookId}/deliveries`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Delivery history:', deliveryResponse.data.deliveries.length, 'deliveries found');

    // 4. List all webhooks
    console.log('\n4️⃣ Listing all webhooks...');
    const listResponse = await axios.get(`${BASE_URL}/api/webhooks`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Found', listResponse.data.webhooks.length, 'webhooks');

    // 5. Get available events
    console.log('\n5️⃣ Getting available events...');
    const eventsResponse = await axios.get(`${BASE_URL}/api/webhooks/events/available`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ Available events:', eventsResponse.data.events.length, 'events');

    console.log('\n🎉 Webhook integration test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Replace the webhook URL with your actual endpoint');
    console.log('2. Test with real access requests');
    console.log('3. Monitor webhook deliveries');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure to set ADMIN_TOKEN environment variable with a valid admin token');
    }
  }
}

// Run the test
testWebhookIntegration();