#!/usr/bin/env node

/**
 * Test Script for Complete ESP32 Door Access Flow
 * This script simulates the complete flow from ESP32 setup to door access
 */

const fetch = require('node-fetch');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const ESP32_IP = process.env.ESP32_IP || '192.168.1.100';
const ESP32_MAC = 'AA:BB:CC:DD:EE:FF';

// Test data
const testDevice = {
  deviceID: `ESP32-${ESP32_MAC.replace(/:/g, '')}`,
  deviceName: 'Test Door Controller',
  ip: ESP32_IP,
  mac: ESP32_MAC,
  status: 'online',
  doorOpen: false,
  signal: -45,
  freeHeap: 150000,
  uptime: 60000,
  firmware: '1.0.0',
  deviceType: 'ESP32'
};

const testUser = {
  id: 1,
  userName: 'Test User'
};

// Helper function to make requests
async function makeRequest(url, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 ESP32 Door Access System - Complete Flow Test');
  console.log('================================================\n');
  
  // Step 1: Simulate ESP32 sending heartbeats
  console.log('📡 Step 1: Simulating ESP32 Heartbeat...');
  const heartbeatResult = await makeRequest(
    `${SERVER_URL}/api/doors/heartbeat`,
    'POST',
    testDevice
  );
  
  if (heartbeatResult.ok) {
    console.log('✅ Heartbeat sent successfully');
    console.log(`   Response: ${JSON.stringify(heartbeatResult.data)}\n`);
  } else {
    console.log('❌ Heartbeat failed:', heartbeatResult.data);
  }
  
  // Step 2: Admin discovers the ESP32
  console.log('🔍 Step 2: Admin discovers ESP32 devices...');
  console.log('   Note: This requires admin authentication\n');
  
  // Step 3: Simulate door registration (manual process)
  console.log('🚪 Step 3: Door Registration');
  console.log('   In the real flow, admin would:');
  console.log('   1. Use /api/doors/discover to find ESP32s');
  console.log('   2. Use /api/doors/auto-register/:deviceID to register\n');
  
  // Step 4: Simulate access request
  console.log('🔓 Step 4: Simulating Access Request...');
  console.log('   (Assuming door ID 1 exists and user has access)\n');
  
  const accessRequest = {
    doorId: 1,
    userId: testUser.id,
    userName: testUser.userName,
    reason: 'QR code scan'
  };
  
  const accessResult = await makeRequest(
    `${SERVER_URL}/api/doors/access/request`,
    'POST',
    accessRequest
  );
  
  if (accessResult.ok) {
    console.log('✅ Access request processed');
    console.log(`   Response: ${JSON.stringify(accessResult.data)}`);
    
    if (accessResult.data.accessGranted) {
      console.log('   🎉 Access GRANTED - Door should open!');
    } else {
      console.log('   🚫 Access DENIED');
    }
  } else {
    console.log('❌ Access request failed:', accessResult.data);
  }
  
  console.log('\n================================================');
  console.log('📋 Summary of the Complete Flow:\n');
  console.log('1. ESP32 Configuration:');
  console.log('   - User holds boot button on ESP32 to enter AP mode');
  console.log('   - Connects to ESP32 WiFi and configures server URL');
  console.log('   - ESP32 connects to WiFi and starts sending heartbeats\n');
  
  console.log('2. Server Discovery:');
  console.log('   - Server receives heartbeats and caches device info');
  console.log('   - Admin uses discovery endpoint to find new ESP32s');
  console.log('   - Admin registers ESP32 as a door in the system\n');
  
  console.log('3. Access Control:');
  console.log('   - User scans QR code/NFC tag at door');
  console.log('   - Mobile app sends access request to server');
  console.log('   - Server verifies permissions via access groups');
  console.log('   - If authorized, server sends open command to ESP32');
  console.log('   - ESP32 triggers GPIO5 to open door\n');
  
  console.log('🔧 ESP32 Endpoints:');
  console.log(`   - /discover - Returns device info`);
  console.log(`   - /door - Receives open/close commands`);
  console.log(`   - /status - Returns current status\n`);
  
  console.log('🌐 Server Endpoints:');
  console.log(`   - POST /api/doors/heartbeat - Receives ESP32 heartbeats`);
  console.log(`   - POST /api/doors/discover - Finds unregistered ESP32s`);
  console.log(`   - POST /api/doors/auto-register/:deviceID - Registers ESP32`);
  console.log(`   - POST /api/doors/access/request - Processes access requests`);
}

// Run the tests
runTests().catch(console.error);