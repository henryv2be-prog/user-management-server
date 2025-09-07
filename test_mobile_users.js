#!/usr/bin/env node

/**
 * Mobile User Testing Script
 * Test different mobile users and their access permissions
 */

const http = require('http');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const DOOR_ID = 14; // Door 11 (online)

// Test users - MODIFY THESE TO TEST DIFFERENT USERS
const testUsers = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    expectedAccess: true // Admin should have access
  },
  {
    email: 'henryv2be@gmail.com', 
    password: 'your_password_here', // CHANGE THIS
    name: 'Henry User',
    expectedAccess: true // Change based on your setup
  },
  {
    email: 'testuser@example.com',
    password: 'testpass123',
    name: 'Test User',
    expectedAccess: false // Regular user shouldn't have access
  }
];

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    };
    
    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ 
            statusCode: res.statusCode, 
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({ 
            statusCode: res.statusCode, 
            data: data,
            rawData: data,
            headers: res.headers
          });
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

async function testUserAccess(user) {
  console.log(`\n📱 Testing User: ${user.name}`);
  console.log(`📧 Email: ${user.email}`);
  console.log('='.repeat(50));

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Mobile Login...');
    const loginResponse = await makeRequest(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });

    if (loginResponse.statusCode !== 200) {
      console.log(`❌ Login FAILED: ${loginResponse.data.message || 'Unknown error'}`);
      return {
        user: user.name,
        loginSuccess: false,
        accessTested: false,
        error: loginResponse.data.message || 'Login failed'
      };
    }

    const authToken = loginResponse.data.token;
    const userData = loginResponse.data.user;
    console.log(`✅ Login SUCCESS!`);
    console.log(`   User: ${userData.firstName} ${userData.lastName} (${userData.role})`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);

    // Step 2: Get Door Info
    console.log('\n🚪 Step 2: Get Door Information...');
    const doorResponse = await makeRequest(`${SERVER_URL}/api/doors/${DOOR_ID}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (doorResponse.statusCode !== 200) {
      console.log(`❌ Door info FAILED: ${doorResponse.data.message}`);
      return {
        user: user.name,
        loginSuccess: true,
        accessTested: false,
        error: 'Failed to get door info'
      };
    }

    const door = doorResponse.data.door;
    console.log(`✅ Door Info: ${door.name} (${door.location})`);
    console.log(`   ESP32 IP: ${door.esp32Ip}`);
    console.log(`   Status: ${door.isOnline ? 'Online' : 'Offline'}`);

    // Step 3: Request Access
    console.log('\n🔑 Step 3: Request Door Access...');
    const accessRequest = {
      doorId: parseInt(DOOR_ID),
      requestType: 'qr_scan',
      qrCodeData: JSON.stringify({
        doorId: DOOR_ID,
        doorName: door.name,
        location: door.location,
        esp32Ip: door.esp32Ip,
        serverUrl: SERVER_URL,
        type: 'door_access'
      })
    };

    const accessResponse = await makeRequest(`${SERVER_URL}/api/access-requests/request`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accessRequest)
    });

    console.log(`   Response Status: ${accessResponse.statusCode}`);

    if (accessResponse.statusCode === 200) {
      const result = accessResponse.data;
      const accessGranted = result.access;
      
      console.log(`✅ Access Request Processed!`);
      console.log(`   Result: ${accessGranted ? '🎉 GRANTED' : '❌ DENIED'}`);
      console.log(`   Message: ${result.message}`);
      
      if (accessGranted) {
        console.log(`   User: ${result.user.firstName} ${result.user.lastName}`);
        console.log(`   Door: ${result.door.name} (${result.door.location})`);
        console.log(`   Request ID: ${result.requestId}`);
        
        // Step 4: Test Door Control
        console.log('\n🎛️  Step 4: Test Door Control...');
        const controlResponse = await makeRequest(`${SERVER_URL}/api/doors/${DOOR_ID}/control`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'open' })
        });

        if (controlResponse.statusCode === 200) {
          console.log(`✅ Door Control: ${controlResponse.data.message}`);
        } else {
          console.log(`❌ Door Control Failed: ${controlResponse.data.message}`);
        }
      } else {
        console.log(`   Reason: ${result.reason || 'No reason provided'}`);
      }

      return {
        user: user.name,
        loginSuccess: true,
        accessTested: true,
        accessGranted: accessGranted,
        expectedAccess: user.expectedAccess,
        correctResult: accessGranted === user.expectedAccess,
        message: result.message,
        reason: result.reason
      };

    } else {
      console.log(`❌ Access Request FAILED: ${accessResponse.data.message || 'Unknown error'}`);
      return {
        user: user.name,
        loginSuccess: true,
        accessTested: false,
        error: accessResponse.data.message || 'Access request failed'
      };
    }

  } catch (error) {
    console.log(`❌ Test FAILED: ${error.message}`);
    return {
      user: user.name,
      loginSuccess: false,
      accessTested: false,
      error: error.message
    };
  }
}

async function runMobileUserTests() {
  console.log('📱 Mobile User Access Testing');
  console.log('=============================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Door ID: ${DOOR_ID}`);
  console.log(`Testing ${testUsers.length} users...`);
  console.log('\n📝 Instructions:');
  console.log('1. Update the testUsers array above with real credentials');
  console.log('2. Set expectedAccess to true/false based on your setup');
  console.log('3. Run: node test_mobile_users.js');
  console.log('');

  const results = [];

  for (const user of testUsers) {
    const result = await testUserAccess(user);
    results.push(result);
    
    // Wait between users
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    let status = '❌ FAIL';
    if (result.loginSuccess && result.accessTested) {
      if (result.correctResult) {
        status = '✅ PASS';
      } else {
        status = '⚠️  UNEXPECTED';
      }
    } else if (!result.loginSuccess) {
      status = '❌ LOGIN FAIL';
    } else if (!result.accessTested) {
      status = '❌ ACCESS TEST FAIL';
    }
    
    console.log(`${status} ${result.user}`);
    if (result.loginSuccess && result.accessTested) {
      console.log(`   Expected: ${result.expectedAccess ? 'Access' : 'No Access'}`);
      console.log(`   Got: ${result.accessGranted ? 'Access' : 'No Access'}`);
      console.log(`   Message: ${result.message || 'N/A'}`);
      if (result.reason) {
        console.log(`   Reason: ${result.reason}`);
      }
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  const passedTests = results.filter(r => r.loginSuccess && r.accessTested && r.correctResult).length;
  const totalTests = results.filter(r => r.loginSuccess && r.accessTested).length;
  
  console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests && totalTests > 0) {
    console.log('🎉 All mobile user tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the results above.');
  }
}

// Run the tests
runMobileUserTests().catch(console.error);

