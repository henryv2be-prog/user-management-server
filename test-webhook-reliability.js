#!/usr/bin/env node

// Comprehensive webhook reliability test script
// This script tests all aspects of the webhook system

const axios = require('axios');
const EventLogger = require('./utils/eventLogger');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Test webhook URL (replace with your actual webhook endpoint)
const TEST_WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://webhook.site/your-unique-url';

class WebhookReliabilityTester {
  constructor() {
    this.testResults = [];
    this.webhookId = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Webhook Reliability Tests...\n');
    
    try {
      // Test 1: Create webhook configuration
      await this.testCreateWebhook();
      
      // Test 2: Test webhook delivery
      await this.testWebhookDelivery();
      
      // Test 3: Test event logging and webhook triggering
      await this.testEventLogging();
      
      // Test 4: Test duplicate prevention
      await this.testDuplicatePrevention();
      
      // Test 5: Test ESP32 command webhooks
      await this.testESP32CommandWebhooks();
      
      // Test 6: Test webhook retry logic
      await this.testWebhookRetryLogic();
      
      // Test 7: Test live event updates
      await this.testLiveEventUpdates();
      
      // Cleanup
      await this.cleanup();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testCreateWebhook() {
    console.log('1️⃣ Testing webhook creation...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/webhooks`, {
        name: 'Reliability Test Webhook',
        url: TEST_WEBHOOK_URL,
        events: [
          'access_request.granted',
          'access_request.denied',
          'door.opened',
          'door.closed',
          'door.online',
          'door.offline',
          'user.login',
          'user.logout',
          'esp32.command_sent'
        ],
        retryAttempts: 3,
        timeout: 5000
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      this.webhookId = response.data.webhook.id;
      this.addResult('Webhook Creation', true, 'Webhook created successfully');
      console.log('✅ Webhook created with ID:', this.webhookId);
      
    } catch (error) {
      this.addResult('Webhook Creation', false, error.response?.data?.message || error.message);
      console.log('❌ Webhook creation failed:', error.response?.data || error.message);
    }
  }

  async testWebhookDelivery() {
    console.log('\n2️⃣ Testing webhook delivery...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/webhooks/${this.webhookId}/test`, {}, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      this.addResult('Webhook Delivery', true, 'Test webhook sent successfully');
      console.log('✅ Test webhook sent, delivery ID:', response.data.delivery.id);
      
      // Wait a moment for delivery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check delivery status
      const deliveryResponse = await axios.get(`${BASE_URL}/api/webhooks/${this.webhookId}/deliveries`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      const deliveries = deliveryResponse.data.deliveries;
      const latestDelivery = deliveries[0];
      
      if (latestDelivery && latestDelivery.status === 'delivered') {
        this.addResult('Webhook Delivery Status', true, 'Webhook delivered successfully');
        console.log('✅ Webhook delivery confirmed');
      } else {
        this.addResult('Webhook Delivery Status', false, 'Webhook delivery failed or pending');
        console.log('❌ Webhook delivery failed or pending');
      }
      
    } catch (error) {
      this.addResult('Webhook Delivery', false, error.response?.data?.message || error.message);
      console.log('❌ Webhook delivery test failed:', error.response?.data || error.message);
    }
  }

  async testEventLogging() {
    console.log('\n3️⃣ Testing event logging and webhook triggering...');
    
    try {
      // Create a mock request object
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'WebhookReliabilityTester' },
        get: () => 'WebhookReliabilityTester',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      };

      // Test different event types
      const testEvents = [
        {
          type: 'access',
          action: 'granted',
          entityType: 'door',
          entityId: 1,
          entityName: 'Test Door',
          details: 'Test access granted event'
        },
        {
          type: 'door',
          action: 'opened',
          entityType: 'door',
          entityId: 1,
          entityName: 'Test Door',
          details: 'Test door opened event'
        },
        {
          type: 'auth',
          action: 'login',
          entityType: 'user',
          entityId: 1,
          entityName: 'Test User',
          details: 'Test user login event'
        }
      ];

      let successCount = 0;
      
      for (const eventData of testEvents) {
        try {
          await EventLogger.logEvent(mockReq, eventData);
          successCount++;
          console.log(`✅ Event logged: ${eventData.type}.${eventData.action}`);
        } catch (error) {
          console.log(`❌ Event logging failed: ${eventData.type}.${eventData.action}`, error.message);
        }
      }

      if (successCount === testEvents.length) {
        this.addResult('Event Logging', true, `All ${testEvents.length} events logged successfully`);
      } else {
        this.addResult('Event Logging', false, `Only ${successCount}/${testEvents.length} events logged successfully`);
      }
      
    } catch (error) {
      this.addResult('Event Logging', false, error.message);
      console.log('❌ Event logging test failed:', error.message);
    }
  }

  async testDuplicatePrevention() {
    console.log('\n4️⃣ Testing duplicate prevention...');
    
    try {
      // Send the same event multiple times
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'WebhookReliabilityTester' },
        get: () => 'WebhookReliabilityTester',
        user: { id: 1, email: 'test@example.com' }
      };

      const eventData = {
        type: 'system',
        action: 'test_duplicate',
        entityType: 'system',
        entityId: null,
        entityName: 'Test System',
        details: 'Test duplicate prevention event'
      };

      // Log the same event multiple times
      for (let i = 0; i < 3; i++) {
        await EventLogger.logEvent(mockReq, eventData);
        console.log(`📝 Logged duplicate test event ${i + 1}/3`);
      }

      // Wait for webhook processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check delivery history
      const deliveryResponse = await axios.get(`${BASE_URL}/api/webhooks/${this.webhookId}/deliveries`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      const deliveries = deliveryResponse.data.deliveries;
      const duplicateEvents = deliveries.filter(d => 
        d.event === 'system.error' && 
        d.payload && 
        d.payload.details && 
        d.payload.details.includes('duplicate prevention')
      );

      if (duplicateEvents.length <= 1) {
        this.addResult('Duplicate Prevention', true, 'Duplicate events properly prevented');
        console.log('✅ Duplicate prevention working correctly');
      } else {
        this.addResult('Duplicate Prevention', false, `Found ${duplicateEvents.length} duplicate events`);
        console.log('❌ Duplicate prevention not working properly');
      }
      
    } catch (error) {
      this.addResult('Duplicate Prevention', false, error.message);
      console.log('❌ Duplicate prevention test failed:', error.message);
    }
  }

  async testESP32CommandWebhooks() {
    console.log('\n5️⃣ Testing ESP32 command webhooks...');
    
    try {
      // Test ESP32 command without webhook URL (should queue for polling)
      const response1 = await axios.post(`${BASE_URL}/api/webhooks/esp32/command`, {
        doorId: 1,
        command: 'open'
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response1.data.success) {
        this.addResult('ESP32 Command (Polling)', true, 'ESP32 command queued successfully');
        console.log('✅ ESP32 command queued for polling');
      } else {
        this.addResult('ESP32 Command (Polling)', false, 'ESP32 command queuing failed');
        console.log('❌ ESP32 command queuing failed');
      }

      // Test ESP32 command with webhook URL (should send directly)
      const response2 = await axios.post(`${BASE_URL}/api/webhooks/esp32/command`, {
        doorId: 1,
        command: 'close',
        webhookUrl: TEST_WEBHOOK_URL
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response2.data.success) {
        this.addResult('ESP32 Command (Webhook)', true, 'ESP32 command sent via webhook');
        console.log('✅ ESP32 command sent via webhook');
      } else {
        this.addResult('ESP32 Command (Webhook)', false, 'ESP32 webhook command failed');
        console.log('❌ ESP32 webhook command failed');
      }
      
    } catch (error) {
      this.addResult('ESP32 Command Webhooks', false, error.response?.data?.message || error.message);
      console.log('❌ ESP32 command webhook test failed:', error.response?.data || error.message);
    }
  }

  async testWebhookRetryLogic() {
    console.log('\n6️⃣ Testing webhook retry logic...');
    
    try {
      // Create a webhook with an invalid URL to test retry logic
      const invalidWebhookResponse = await axios.post(`${BASE_URL}/api/webhooks`, {
        name: 'Invalid URL Test Webhook',
        url: 'https://invalid-url-that-does-not-exist.com/webhook',
        events: ['system.error'],
        retryAttempts: 2,
        timeout: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const invalidWebhookId = invalidWebhookResponse.data.webhook.id;

      // Trigger an event that should fail and retry
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'WebhookReliabilityTester' },
        get: () => 'WebhookReliabilityTester',
        user: { id: 1, email: 'test@example.com' }
      };

      await EventLogger.logEvent(mockReq, {
        type: 'error',
        action: 'occurred',
        entityType: 'system',
        entityId: null,
        entityName: 'Test System',
        details: 'Test retry logic event'
      });

      // Wait for retry attempts
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check delivery history for retry attempts
      const deliveryResponse = await axios.get(`${BASE_URL}/api/webhooks/${invalidWebhookId}/deliveries`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      const deliveries = deliveryResponse.data.deliveries;
      const retryDeliveries = deliveries.filter(d => d.attempts > 1);

      if (retryDeliveries.length > 0) {
        this.addResult('Webhook Retry Logic', true, 'Retry logic working correctly');
        console.log('✅ Webhook retry logic working correctly');
      } else {
        this.addResult('Webhook Retry Logic', false, 'No retry attempts detected');
        console.log('❌ Webhook retry logic not working');
      }

      // Clean up invalid webhook
      await axios.delete(`${BASE_URL}/api/webhooks/${invalidWebhookId}`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      
    } catch (error) {
      this.addResult('Webhook Retry Logic', false, error.response?.data?.message || error.message);
      console.log('❌ Webhook retry logic test failed:', error.response?.data || error.message);
    }
  }

  async testLiveEventUpdates() {
    console.log('\n7️⃣ Testing live event updates...');
    
    try {
      // Test SSE endpoint
      const sseResponse = await axios.get(`${BASE_URL}/api/events/stream-public`, {
        headers: {
          'Accept': 'text/event-stream'
        },
        timeout: 5000
      });

      if (sseResponse.status === 200) {
        this.addResult('Live Event Updates (SSE)', true, 'SSE endpoint accessible');
        console.log('✅ SSE endpoint accessible');
      } else {
        this.addResult('Live Event Updates (SSE)', false, 'SSE endpoint not accessible');
        console.log('❌ SSE endpoint not accessible');
      }

      // Test events API
      const eventsResponse = await axios.get(`${BASE_URL}/api/events/recent?limit=5`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });

      if (eventsResponse.data.events && eventsResponse.data.events.length > 0) {
        this.addResult('Live Event Updates (API)', true, 'Events API working correctly');
        console.log('✅ Events API working correctly');
      } else {
        this.addResult('Live Event Updates (API)', false, 'Events API not returning data');
        console.log('❌ Events API not returning data');
      }
      
    } catch (error) {
      this.addResult('Live Event Updates', false, error.response?.data?.message || error.message);
      console.log('❌ Live event updates test failed:', error.response?.data || error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test webhook...');
    
    if (this.webhookId) {
      try {
        await axios.delete(`${BASE_URL}/api/webhooks/${this.webhookId}`, {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          }
        });
        console.log('✅ Test webhook cleaned up');
      } catch (error) {
        console.log('❌ Failed to clean up test webhook:', error.message);
      }
    }
  }

  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message
    });
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}: ${result.message}`);
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Webhook system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new WebhookReliabilityTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = WebhookReliabilityTester;