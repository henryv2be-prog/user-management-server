#!/usr/bin/env node

// Test script to debug ESP32 communication
const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DOOR_ID = process.argv[2];

if (!DOOR_ID) {
  console.log('Usage: node test-esp32-communication.js <door_id>');
  console.log('Example: node test-esp32-communication.js 1');
  process.exit(1);
}

async function testESP32Communication() {
  console.log(`🧪 Testing ESP32 communication for door ${DOOR_ID}`);
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  
  try {
    // 1. Check door info and commands
    console.log('\n1️⃣ Checking door info and commands...');
    const debugResponse = await axios.get(`${SERVER_URL}/api/doors/debug/commands/${DOOR_ID}`);
    console.log('✅ Door Info:', debugResponse.data.door);
    console.log('📋 Commands Summary:', debugResponse.data.summary);
    console.log('📋 All Commands:', debugResponse.data.commands);
    
    // 2. Test ESP32 polling endpoint
    console.log('\n2️⃣ Testing ESP32 polling endpoint...');
    const pollResponse = await axios.get(`${SERVER_URL}/api/doors/commands/${DOOR_ID}`);
    console.log('✅ ESP32 Poll Response:', pollResponse.data);
    
    // 3. Create a test command
    console.log('\n3️⃣ Creating test door command...');
    const testCommandResponse = await axios.post(`${SERVER_URL}/api/doors/access/request`, {
      doorId: parseInt(DOOR_ID),
      userId: 1,
      userName: 'Test User',
      reason: 'Test command creation'
    });
    console.log('✅ Test Command Response:', testCommandResponse.data);
    
    // 4. Check commands again
    console.log('\n4️⃣ Checking commands after test...');
    const debugResponse2 = await axios.get(`${SERVER_URL}/api/doors/debug/commands/${DOOR_ID}`);
    console.log('📋 Commands Summary:', debugResponse2.data.summary);
    console.log('📋 Pending Commands:', debugResponse2.data.commands.filter(cmd => cmd.status === 'pending'));
    
    // 5. Test ESP32 polling again
    console.log('\n5️⃣ Testing ESP32 polling after command creation...');
    const pollResponse2 = await axios.get(`${SERVER_URL}/api/doors/commands/${DOOR_ID}`);
    console.log('✅ ESP32 Poll Response:', pollResponse2.data);
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testESP32Communication();