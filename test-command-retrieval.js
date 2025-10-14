#!/usr/bin/env node

// Quick test to check if door commands are being retrieved
const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'https://your-railway-app.railway.app';
const DOOR_ID = process.argv[2] || 1;

async function testCommandRetrieval() {
  console.log(`🧪 Testing command retrieval for door ${DOOR_ID}`);
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  
  try {
    // Test ESP32 polling endpoint
    console.log('\n📡 Testing ESP32 polling endpoint...');
    const response = await axios.get(`${SERVER_URL}/api/doors/commands/${DOOR_ID}`);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.commands && response.data.commands.length > 0) {
      console.log('\n🎉 Commands found! ESP32 should receive these commands.');
      console.log('📋 Commands:', response.data.commands);
    } else {
      console.log('\n❌ No commands found. Either:');
      console.log('   1. No commands have been created yet');
      console.log('   2. Commands were already retrieved by ESP32');
      console.log('   3. Wrong door ID');
    }
    
    // Check debug endpoint
    console.log('\n🔍 Checking debug endpoint...');
    const debugResponse = await axios.get(`${SERVER_URL}/api/doors/debug/commands/${DOOR_ID}`);
    console.log('✅ Door Info:', debugResponse.data.door);
    console.log('📊 Command Summary:', debugResponse.data.summary);
    
    if (debugResponse.data.summary.pending > 0) {
      console.log('\n🚨 There are pending commands that ESP32 should retrieve!');
      console.log('📋 Pending Commands:', debugResponse.data.commands.filter(cmd => cmd.status === 'pending'));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Tip: Make sure to replace "your-railway-app" with your actual Railway URL');
    }
  }
}

testCommandRetrieval();