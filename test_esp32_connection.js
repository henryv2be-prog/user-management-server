#!/usr/bin/env node

/**
 * ESP32 Connection Test Script
 * Tests communication with ESP32 door controllers
 */

const http = require('http');
const https = require('https');

// Configuration
const ESP32_IP = process.argv[2] || '192.168.1.100';
const ESP32_PORT = process.argv[3] || '80';
const SERVER_URL = process.argv[4] || 'http://localhost:3000';

console.log('🔐 ESP32 Connection Test');
console.log('======================');
console.log(`ESP32 IP: ${ESP32_IP}:${ESP32_PORT}`);
console.log(`Server URL: ${SERVER_URL}`);
console.log('');

// Test functions
async function testESP32Discovery() {
  console.log('1. Testing ESP32 Discovery...');
  
  try {
    const response = await makeRequest(`http://${ESP32_IP}:${ESP32_PORT}/discover`);
    const data = JSON.parse(response);
    
    console.log('   ✅ ESP32 Discovery Response:');
    console.log(`   MAC: ${data.mac}`);
    console.log(`   IP: ${data.ip}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Signal: ${data.signal} dBm`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('   ❌ ESP32 Discovery Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    return false;
  }
}

async function testESP32Status() {
  console.log('2. Testing ESP32 Status...');
  
  try {
    const response = await makeRequest(`http://${ESP32_IP}:${ESP32_PORT}/status`);
    const data = JSON.parse(response);
    
    console.log('   ✅ ESP32 Status Response:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Door Open: ${data.doorOpen}`);
    console.log(`   Uptime: ${Math.round(data.uptime / 1000)} seconds`);
    console.log(`   Free Heap: ${data.freeHeap} bytes`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('   ❌ ESP32 Status Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    return false;
  }
}

async function testDoorControl() {
  console.log('3. Testing Door Control...');
  
  try {
    // Test door open
    console.log('   Testing door open...');
    const openResponse = await makeRequest(`http://${ESP32_IP}:${ESP32_PORT}/door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open' })
    });
    
    const openData = JSON.parse(openResponse);
    console.log(`   Open Response: ${openData.message}`);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test door close
    console.log('   Testing door close...');
    const closeResponse = await makeRequest(`http://${ESP32_IP}:${ESP32_PORT}/door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' })
    });
    
    const closeData = JSON.parse(closeResponse);
    console.log(`   Close Response: ${closeData.message}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('   ❌ Door Control Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    return false;
  }
}

async function testServerHeartbeat() {
  console.log('4. Testing Server Heartbeat...');
  
  try {
    const heartbeatData = {
      deviceID: 'TEST-ESP32-001',
      deviceName: 'Test Door',
      ip: ESP32_IP,
      mac: 'AA:BB:CC:DD:EE:FF',
      status: 'online',
      doorOpen: false,
      signal: -45,
      freeHeap: 200000,
      uptime: Date.now()
    };
    
    const response = await makeRequest(`${SERVER_URL}/api/doors/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(heartbeatData)
    });
    
    console.log('   ✅ Server Heartbeat Response:');
    console.log(`   Response: ${response}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('   ❌ Server Heartbeat Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    return false;
  }
}

async function testServerAccessRequest() {
  console.log('5. Testing Server Access Request...');
  
  try {
    const accessData = {
      doorId: '1', // Assuming door ID 1 exists
      accessType: 'request',
      timestamp: Date.now(),
      expiry: Date.now() + 3600000, // 1 hour
      customMessage: 'Test access request'
    };
    
    const response = await makeRequest(`${SERVER_URL}/api/doors/access/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accessData)
    });
    
    const data = JSON.parse(response);
    console.log('   ✅ Server Access Request Response:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Granted: ${data.granted}`);
    console.log(`   Message: ${data.message}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log('   ❌ Server Access Request Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('');
    return false;
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('Starting ESP32 connection tests...\n');
  
  const results = {
    discovery: await testESP32Discovery(),
    status: await testESP32Status(),
    doorControl: await testDoorControl(),
    serverHeartbeat: await testServerHeartbeat(),
    serverAccess: await testServerAccessRequest()
  };
  
  console.log('Test Results Summary:');
  console.log('====================');
  console.log(`ESP32 Discovery: ${results.discovery ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`ESP32 Status: ${results.status ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Door Control: ${results.doorControl ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Server Heartbeat: ${results.serverHeartbeat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Server Access: ${results.serverAccess ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('');
  console.log(`Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your ESP32 is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
  
  console.log('');
  console.log('Usage: node test_esp32_connection.js [ESP32_IP] [ESP32_PORT] [SERVER_URL]');
  console.log('Example: node test_esp32_connection.js 192.168.1.100 80 http://localhost:3000');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testESP32Discovery,
  testESP32Status,
  testDoorControl,
  testServerHeartbeat,
  testServerAccessRequest,
  runTests
};
