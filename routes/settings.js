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
    
    addTestLog(testId, 'info', 'Stress test stopped by user');

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
  
  // Get admin user directly from database for testing
  let adminUser = null;
  try {
    // Try multiple ways to find admin user using the correct methods
    adminUser = await User.findByEmail('admin@example.com') ||
                await User.findByUsername('admin');
    
    if (!adminUser) {
      addTestLog(testId, 'error', 'Admin user not found in database. Available users:');
      const allUsers = await User.findAll();
      allUsers.forEach(user => {
        addTestLog(testId, 'error', `- ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Role: ${user.role}`);
      });
      
      // Try to create a default admin user
      addTestLog(testId, 'info', 'Attempting to create default admin user...');
      try {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        adminUser = await User.create({
          username: 'admin',
          email: 'admin@example.com',
          password_hash: hashedPassword,
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          email_verified: 1
        });
        
        addTestLog(testId, 'info', 'Default admin user created successfully');
      } catch (createError) {
        addTestLog(testId, 'error', `Failed to create admin user: ${createError.message}`);
        test.status = 'failed';
        return;
      }
    }
    addTestLog(testId, 'info', `Admin user found: ${adminUser.email || adminUser.username} (ID: ${adminUser.id})`);
  } catch (error) {
    addTestLog(testId, 'error', `Failed to get admin user: ${error.message}`);
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
    testFunctions.push(() => testUserManagement(adminUser));
  }
  
  if (testOptions.testDoors) {
    testFunctions.push(() => testDoorManagement(adminUser));
  }
  
  if (testOptions.testAccessGroups) {
    testFunctions.push(() => testAccessGroupManagement(adminUser));
  }
  
  if (testOptions.testEvents) {
    testFunctions.push(() => testEventLogging(adminUser));
  }
  
  if (testOptions.testDatabase) {
    testFunctions.push(() => testDatabaseOperations(adminUser));
  }

  // Run stress test
  const interval = 1000 / requestRate; // milliseconds between requests
  let requestCount = 0;
  let testInterval = null;
  
  const runRequests = async () => {
    const currentTime = Date.now();
    
    if (currentTime >= endTime || test.status === 'stopped') {
      test.status = 'completed';
      test.endTime = currentTime;
      addTestLog(testId, 'info', `Stress test completed. Total requests: ${requestCount}`);
      if (testInterval) {
        clearInterval(testInterval);
        testInterval = null;
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
    
    try {
      await Promise.allSettled(promises);
      requestCount += concurrentUsers;
      
      // Update progress
      test.results.totalRequests = requestCount;
      test.progress = Math.min(100, ((currentTime - startTime) / (testDuration * 1000)) * 100);
      
      addTestLog(testId, 'info', `Progress: ${test.progress.toFixed(1)}% - Requests: ${requestCount}`);
    } catch (error) {
      addTestLog(testId, 'error', `Error in test execution: ${error.message}`);
    }
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
  // Test authentication by trying to find user in database
  const foundUser = await User.findByEmail(user.email);
  if (!foundUser) {
    throw new Error(`Auth test failed: User not found`);
  }
  
  // Simulate password check (in real scenario, you'd use bcrypt)
  if (foundUser.passwordHash !== user.password) {
    throw new Error(`Auth test failed: Invalid password`);
  }
  
  return foundUser;
}

async function testUserManagement(adminUser) {
  // Test 1: Count existing users
  const userCount = await User.count();
  
  // Test 2: Create a test user
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('testpass123', 10);
  
  const testUser = await User.create({
    username: `stressuser${Date.now()}`,
    email: `stressuser${Date.now()}@test.com`,
    password_hash: hashedPassword,
    first_name: `TestUser${Date.now()}`,
    last_name: 'StressTest',
    role: 'user',
    email_verified: 1
  });
  
  if (!testUser) {
    throw new Error(`User creation test failed`);
  }
  
  return testUser;
}

async function testDoorManagement(adminUser) {
  // Test 1: Count existing doors
  const doorCount = await Door.count();
  
  // Test 2: Create a test door
  const testDoor = await Door.create({
    name: `StressTestDoor${Date.now()}`,
    location: 'Stress Test Location',
    esp32_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    esp32_mac: `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}`,
    has_lock_sensor: 1,
    has_door_position_sensor: 1,
    is_online: 0,
    is_locked: 1,
    is_open: 0
  });
  
  if (!testDoor) {
    throw new Error(`Door creation test failed`);
  }
  
  return testDoor;
}

async function testAccessGroupManagement(adminUser) {
  // Test 1: Count existing access groups
  const accessGroupCount = await AccessGroup.count();
  
  // Test 2: Create a test access group
  const testAccessGroup = await AccessGroup.create({
    name: `StressTestGroup${Date.now()}`,
    description: 'Stress test access group'
  });
  
  if (!testAccessGroup) {
    throw new Error(`Access group creation test failed`);
  }
  
  return testAccessGroup;
}

async function testEventLogging(adminUser) {
  // Test 1: Count existing events
  const eventCount = await Event.count();
  
  // Test 2: Create a test event
  const testEvent = await Event.create({
    type: 'stress_test',
    action: 'test_event',
    entity_type: 'system',
    entity_id: null,
    entity_name: 'Stress Test',
    user_id: adminUser.id,
    user_name: `${adminUser.firstName} ${adminUser.lastName}`,
    details: 'Stress test event created',
    ip_address: '127.0.0.1',
    user_agent: 'StressTest/1.0'
  });
  
  if (!testEvent) {
    throw new Error(`Event creation test failed`);
  }
  
  return testEvent;
}

async function testDatabaseOperations(adminUser) {
  // Test 1: Test database connectivity
  const userCount = await User.count();
  const doorCount = await Door.count();
  const accessGroupCount = await AccessGroup.count();
  const eventCount = await Event.count();
  
  // Test 2: Test complex query
  const recentEvents = await Event.findAll({ limit: 10 });
  
  if (userCount < 0 || doorCount < 0 || accessGroupCount < 0 || eventCount < 0) {
    throw new Error(`Database operation test failed`);
  }
  
  return {
    userCount,
    doorCount,
    accessGroupCount,
    eventCount,
    recentEventsCount: recentEvents.length
  };
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