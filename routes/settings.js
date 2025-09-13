const express = require('express');
const axios = require('axios');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { User } = require('../database/models');
const { Door } = require('../database/door');
const AccessGroup = require('../database/accessGroup');
const Event = require('../database/event');

const router = express.Router();

// Get system information
router.get('/system-info', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalDoors, totalAccessGroups, totalEvents] = await Promise.all([
      User.count({}),
      Door.count({}),
      AccessGroup.count({}),
      Event.count({})
    ]);

    const systemInfo = {
      serverStatus: 'online',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      databaseStatus: 'connected',
      totalUsers,
      totalDoors,
      totalAccessGroups,
      totalEvents,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve system information'
    });
  }
});

// Start stress test
router.post('/stress-test/start', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      testType = 'quick',
      concurrentUsers = 10,
      testDuration = 30,
      requestRate = 5,
      testOptions = {}
    } = req.body;

    // Validate test parameters
    if (concurrentUsers < 1 || concurrentUsers > 100) {
      return res.status(400).json({
        error: 'Invalid concurrent users',
        message: 'Concurrent users must be between 1 and 100'
      });
    }

    if (testDuration < 10 || testDuration > 600) {
      return res.status(400).json({
        error: 'Invalid test duration',
        message: 'Test duration must be between 10 and 600 seconds'
      });
    }

    if (requestRate < 1 || requestRate > 50) {
      return res.status(400).json({
        error: 'Invalid request rate',
        message: 'Request rate must be between 1 and 50 requests per second'
      });
    }

    // Set predefined test configurations
    let config = {};
    switch (testType) {
      case 'quick':
        config = {
          concurrentUsers: 5,
          testDuration: 30,
          requestRate: 3,
          testOptions: {
            testAuth: true,
            testUsers: false,
            testDoors: false,
            testAccessGroups: false,
            testEvents: false,
            testDatabase: false
          }
        };
        break;
      case 'standard':
        config = {
          concurrentUsers: 10,
          testDuration: 120,
          requestRate: 5,
          testOptions: {
            testAuth: true,
            testUsers: true,
            testDoors: true,
            testAccessGroups: false,
            testEvents: false,
            testDatabase: false
          }
        };
        break;
      case 'extended':
        config = {
          concurrentUsers: 20,
          testDuration: 300,
          requestRate: 8,
          testOptions: {
            testAuth: true,
            testUsers: true,
            testDoors: true,
            testAccessGroups: true,
            testEvents: true,
            testDatabase: true
          }
        };
        break;
      case 'custom':
        config = {
          concurrentUsers,
          testDuration,
          requestRate,
          testOptions
        };
        break;
    }

    // Start the stress test
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store test configuration in memory (in production, use Redis or database)
    global.activeStressTests = global.activeStressTests || {};
    global.activeStressTests[testId] = {
      id: testId,
      config,
      startTime: Date.now(),
      status: 'running',
      results: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: []
      },
      logs: []
    };

    // Start the actual stress test in the background
    runStressTest(testId, config);

    res.json({
      message: 'Stress test started successfully',
      testId,
      config
    });
  } catch (error) {
    console.error('Start stress test error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to start stress test'
    });
  }
});

// Get stress test status
router.get('/stress-test/:testId/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { testId } = req.params;
    
    if (!global.activeStressTests || !global.activeStressTests[testId]) {
      return res.status(404).json({
        error: 'Test not found',
        message: 'Stress test not found or has completed'
      });
    }

    const test = global.activeStressTests[testId];
    const currentTime = Date.now();
    const elapsedTime = currentTime - test.startTime;
    const progress = Math.min((elapsedTime / (test.config.testDuration * 1000)) * 100, 100);

    res.json({
      testId,
      status: test.status,
      progress: Math.round(progress),
      elapsedTime: Math.round(elapsedTime / 1000),
      totalDuration: test.config.testDuration,
      results: test.results,
      logs: test.logs.slice(-50) // Return last 50 logs
    });
  } catch (error) {
    console.error('Get stress test status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get stress test status'
    });
  }
});

// Stop stress test
router.post('/stress-test/:testId/stop', authenticate, requireAdmin, async (req, res) => {
  try {
    const { testId } = req.params;
    
    if (!global.activeStressTests || !global.activeStressTests[testId]) {
      return res.status(404).json({
        error: 'Test not found',
        message: 'Stress test not found'
      });
    }

    const test = global.activeStressTests[testId];
    test.status = 'stopped';
    test.endTime = Date.now();

    res.json({
      message: 'Stress test stopped successfully',
      testId,
      results: test.results
    });
  } catch (error) {
    console.error('Stop stress test error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to stop stress test'
    });
  }
});

// Get stress test report
router.get('/stress-test/:testId/report', authenticate, requireAdmin, async (req, res) => {
  try {
    const { testId } = req.params;
    
    if (!global.activeStressTests || !global.activeStressTests[testId]) {
      return res.status(404).json({
        error: 'Test not found',
        message: 'Stress test not found'
      });
    }

    const test = global.activeStressTests[testId];
    const { results, config, startTime, endTime } = test;
    
    const totalTime = (endTime || Date.now()) - startTime;
    const avgResponseTime = results.responseTimes.length > 0 
      ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length 
      : 0;
    
    const successRate = results.totalRequests > 0 
      ? (results.successfulRequests / results.totalRequests) * 100 
      : 0;
    
    const throughput = results.totalRequests / (totalTime / 1000);

    const report = {
      testId,
      config,
      summary: {
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime),
        throughput: Math.round(throughput * 100) / 100,
        totalTime: Math.round(totalTime / 1000),
        errors: results.errors
      },
      detailedResults: results,
      logs: test.logs,
      timestamp: new Date().toISOString()
    };

    res.json(report);
  } catch (error) {
    console.error('Get stress test report error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get stress test report'
    });
  }
});

// Helper function to run stress test
async function runStressTest(testId, config) {
  const test = global.activeStressTests[testId];
  const { concurrentUsers, testDuration, requestRate, testOptions } = config;
  
  const startTime = Date.now();
  const endTime = startTime + (testDuration * 1000);
  
  // Get admin token for authenticated requests
  let adminToken = null;
  try {
    const adminResponse = await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    adminToken = adminResponse.data.token;
    addTestLog(testId, 'info', 'Admin token obtained for stress testing');
  } catch (error) {
    addTestLog(testId, 'error', `Failed to get admin token: ${error.message}`);
    test.status = 'failed';
    return;
  }
  
  // Create test users for authentication tests
  const testUsers = [];
  for (let i = 0; i < concurrentUsers; i++) {
    testUsers.push({
      email: `testuser${i}@stress.test`,
      password: 'testpass123'
    });
  }

  // Test functions
  const testFunctions = [];
  
  if (testOptions.testAuth) {
    testFunctions.push(() => testAuthentication(testUsers[Math.floor(Math.random() * testUsers.length)]));
  }
  
  if (testOptions.testUsers) {
    testFunctions.push(() => testUserManagement(adminToken));
  }
  
  if (testOptions.testDoors) {
    testFunctions.push(() => testDoorManagement(adminToken));
  }
  
  if (testOptions.testAccessGroups) {
    testFunctions.push(() => testAccessGroupManagement(adminToken));
  }
  
  if (testOptions.testEvents) {
    testFunctions.push(() => testEventLogging(adminToken));
  }
  
  if (testOptions.testDatabase) {
    testFunctions.push(() => testDatabaseOperations(adminToken));
  }

  // Run stress test
  const interval = 1000 / requestRate; // milliseconds between requests
  let requestCount = 0;
  let testInterval = null;
  
  const runRequests = async () => {
    if (Date.now() >= endTime || test.status === 'stopped') {
      test.status = 'completed';
      test.endTime = Date.now();
      addTestLog(testId, 'info', `Stress test completed. Total requests: ${requestCount}`);
      if (testInterval) {
        clearInterval(testInterval);
      }
      return;
    }

    // Run concurrent requests
    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      if (testFunctions.length > 0) {
        const testFunction = testFunctions[Math.floor(Math.random() * testFunctions.length)];
        promises.push(executeTest(testFunction, testId));
      }
    }
    
    await Promise.allSettled(promises);
    requestCount += concurrentUsers;
    
    // Update progress
    test.results.totalRequests = requestCount;
    test.progress = Math.min(100, ((Date.now() - startTime) / (testDuration * 1000)) * 100);
  };

  // Start the test with proper interval
  addTestLog(testId, 'info', `Starting stress test with ${concurrentUsers} concurrent users for ${testDuration} seconds`);
  testInterval = setInterval(runRequests, interval);
  
  // Set a timeout to ensure test ends
  setTimeout(() => {
    if (test.status === 'running') {
      test.status = 'completed';
      test.endTime = Date.now();
      addTestLog(testId, 'info', 'Stress test completed by timeout');
      if (testInterval) {
        clearInterval(testInterval);
      }
    }
  }, testDuration * 1000 + 5000); // Add 5 second buffer
}

// Execute individual test
async function executeTest(testFunction, testId) {
  const test = global.activeStressTests[testId];
  const startTime = Date.now();
  
  try {
    await testFunction();
    const responseTime = Date.now() - startTime;
    
    test.results.totalRequests++;
    test.results.successfulRequests++;
    test.results.responseTimes.push(responseTime);
    
    addTestLog(testId, 'success', `Request completed in ${responseTime}ms`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    test.results.totalRequests++;
    test.results.failedRequests++;
    test.results.responseTimes.push(responseTime);
    test.results.errors.push({
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    addTestLog(testId, 'error', `Request failed: ${error.message}`);
  }
}

// Test functions
async function testAuthentication(user) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const response = await axios.post(`${baseUrl}/api/auth/login`, user);
  
  if (response.status !== 200) {
    throw new Error(`Auth test failed: ${response.status}`);
  }
  
  return response.data.token;
}

async function testUserManagement(adminToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Test 1: Get users list
  const listResponse = await axios.get(`${baseUrl}/api/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`User list test failed: ${listResponse.status}`);
  }
  
  // Test 2: Create a test user
  const testUser = {
    firstName: `TestUser${Date.now()}`,
    lastName: 'StressTest',
    email: `stressuser${Date.now()}@test.com`,
    password: 'testpass123',
    role: 'user'
  };
  
  const createResponse = await axios.post(`${baseUrl}/api/users`, testUser, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (createResponse.status !== 200 && createResponse.status !== 201) {
    throw new Error(`User creation test failed: ${createResponse.status}`);
  }
  
  return createResponse.data;
}

async function testDoorManagement(adminToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Test 1: Get doors list
  const listResponse = await axios.get(`${baseUrl}/api/doors`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`Door list test failed: ${listResponse.status}`);
  }
  
  // Test 2: Create a test door
  const testDoor = {
    name: `StressTestDoor${Date.now()}`,
    location: 'Stress Test Location',
    esp32Ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    esp32Mac: `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}`,
    hasLockSensor: true,
    hasDoorPositionSensor: true
  };
  
  const createResponse = await axios.post(`${baseUrl}/api/doors`, testDoor, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (createResponse.status !== 200 && createResponse.status !== 201) {
    throw new Error(`Door creation test failed: ${createResponse.status}`);
  }
  
  return createResponse.data;
}

async function testAccessGroupManagement(adminToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Test 1: Get access groups list
  const listResponse = await axios.get(`${baseUrl}/api/access-groups`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`Access group list test failed: ${listResponse.status}`);
  }
  
  // Test 2: Create a test access group
  const testAccessGroup = {
    name: `StressTestGroup${Date.now()}`,
    description: 'Stress test access group'
  };
  
  const createResponse = await axios.post(`${baseUrl}/api/access-groups`, testAccessGroup, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (createResponse.status !== 200 && createResponse.status !== 201) {
    throw new Error(`Access group creation test failed: ${createResponse.status}`);
  }
  
  return createResponse.data;
}

async function testEventLogging(adminToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Test 1: Get events list
  const listResponse = await axios.get(`${baseUrl}/api/events`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`Event list test failed: ${listResponse.status}`);
  }
  
  // Test 2: Simulate an access request event
  const accessRequest = {
    doorId: 1, // Assuming door with ID 1 exists
    requestType: 'stress_test',
    userAgent: 'StressTest/1.0',
    ipAddress: '127.0.0.1'
  };
  
  const accessResponse = await axios.post(`${baseUrl}/api/access-requests/request`, accessRequest, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (accessResponse.status !== 200 && accessResponse.status !== 201) {
    throw new Error(`Access request test failed: ${accessResponse.status}`);
  }
  
  return accessResponse.data;
}

async function testDatabaseOperations(adminToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  // Test health endpoint
  const healthResponse = await axios.get(`${baseUrl}/api/health`);
  
  if (healthResponse.status !== 200) {
    throw new Error(`Health check test failed: ${healthResponse.status}`);
  }
  
  // Test system info endpoint
  const systemInfoResponse = await axios.get(`${baseUrl}/api/settings/system-info`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  if (systemInfoResponse.status !== 200) {
    throw new Error(`System info test failed: ${systemInfoResponse.status}`);
  }
  
  return systemInfoResponse.data;
}

function addTestLog(testId, level, message) {
  const test = global.activeStressTests[testId];
  if (test) {
    test.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
  }
}

module.exports = router;