#!/usr/bin/env node
/**
 * Debug script to help identify why Webhook2 is failing with 400 errors
 * 
 * Usage:
 *   node debug-webhook-failure.js
 */

const axios = require('axios');

async function debugWebhook() {
  console.log('🔍 Webhook Debug Tool\n');
  console.log('This will help you understand why your webhook is returning 400 errors\n');

  // Step 1: Get webhook configuration
  console.log('📋 Step 1: Checking configured webhooks...\n');
  
  try {
    const token = process.env.ADMIN_TOKEN;
    if (!token) {
      console.error('❌ Please set ADMIN_TOKEN environment variable');
      console.log('   Example: export ADMIN_TOKEN="your-token-here"\n');
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Get all webhooks
    const webhooksResponse = await axios.get(`${baseUrl}/api/webhooks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const webhooks = webhooksResponse.data.webhooks;
    console.log(`✅ Found ${webhooks.length} webhook(s):\n`);
    
    webhooks.forEach((webhook, index) => {
      console.log(`   ${index + 1}. ${webhook.name}`);
      console.log(`      URL: ${webhook.url}`);
      console.log(`      Active: ${webhook.active}`);
      console.log(`      Events: ${webhook.events.join(', ')}`);
      console.log(`      Retry Attempts: ${webhook.retryAttempts}`);
      console.log('');
    });

    // Find Webhook2 or the problematic webhook
    const webhook2 = webhooks.find(w => w.name.includes('Webhook2') || w.name.includes('webhook2'));
    
    if (!webhook2) {
      console.log('⚠️  Could not find "Webhook2" - please check the webhook name\n');
      console.log('Available webhooks:');
      webhooks.forEach(w => console.log(`   - ${w.name}`));
      return;
    }

    console.log(`\n🎯 Testing webhook: ${webhook2.name}\n`);
    console.log(`Target URL: ${webhook2.url}\n`);

    // Step 2: Check recent deliveries
    console.log('📊 Step 2: Checking recent delivery attempts...\n');
    
    const deliveriesResponse = await axios.get(`${baseUrl}/api/webhooks/${webhook2.id}/deliveries`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const deliveries = deliveriesResponse.data.deliveries;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed');
    
    console.log(`   Total deliveries: ${deliveries.length}`);
    console.log(`   Failed deliveries: ${failedDeliveries.length}\n`);

    if (failedDeliveries.length > 0) {
      console.log('❌ Recent failures:\n');
      failedDeliveries.slice(0, 3).forEach((delivery, index) => {
        console.log(`   ${index + 1}. Event: ${delivery.event}`);
        console.log(`      Attempts: ${delivery.attempts}/${delivery.maxAttempts}`);
        console.log(`      Error: ${delivery.error?.message}`);
        console.log(`      Status Code: ${delivery.error?.status || 'N/A'}`);
        console.log(`      Response Data: ${JSON.stringify(delivery.error?.responseData, null, 2)}`);
        console.log('');
      });
    }

    // Step 3: Analyze the error
    console.log('\n🔬 Step 3: Error Analysis\n');
    
    if (failedDeliveries.length > 0) {
      const lastFailure = failedDeliveries[0];
      const statusCode = lastFailure.error?.status;
      
      if (statusCode === 400) {
        console.log('📌 Status 400 (Bad Request) typically means:\n');
        console.log('   1. The endpoint expects a different payload format');
        console.log('   2. Missing required fields in the request');
        console.log('   3. Invalid data types or validation errors');
        console.log('   4. Incorrect Content-Type header\n');
        
        console.log('💡 Recommended fixes:\n');
        console.log('   • Check the webhook endpoint documentation');
        console.log('   • Verify the endpoint accepts JSON with Content-Type: application/json');
        console.log('   • Check if the endpoint requires specific field names');
        console.log('   • Look at the response data above for specific error messages');
        console.log('   • Test the endpoint manually with curl or Postman\n');
        
        console.log('🧪 Example test with curl:\n');
        console.log('   curl -X POST \\');
        console.log(`     "${webhook2.url}" \\`);
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -H "X-Webhook-Event: user.login" \\');
        console.log('     -d \'{"event":"user.login","timestamp":"2025-10-13T21:45:00Z","data":{"userId":"123","userName":"Test User"}}\'\n');
      } else if (statusCode === 401 || statusCode === 403) {
        console.log('📌 Authentication/Authorization issue\n');
        console.log('   The endpoint might require authentication');
      } else if (statusCode >= 500) {
        console.log('📌 Server error on the receiving end\n');
        console.log('   The webhook endpoint is experiencing server issues');
      } else if (!statusCode) {
        console.log('📌 Connection/Network issue\n');
        console.log('   • Check if the URL is reachable');
        console.log('   • Verify network connectivity');
        console.log('   • Check for firewall/security rules');
      }
    } else {
      console.log('✅ No failed deliveries found - webhook seems to be working!\n');
    }

    // Step 4: Offer to send a test
    console.log('\n🧪 Step 4: Send a test webhook?\n');
    console.log('   To send a test, run:');
    console.log(`   curl -X POST "${baseUrl}/api/webhooks/${webhook2.id}/test" -H "Authorization: Bearer ${token}"\n`);

  } catch (error) {
    console.error('\n❌ Error running debug script:\n');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.error('\n💡 Make sure:');
    console.error('   1. The server is running');
    console.error('   2. ADMIN_TOKEN is set correctly');
    console.error('   3. You have admin permissions\n');
  }
}

// Run the debug tool
debugWebhook();
