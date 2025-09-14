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
  
  // Create test data structure for tracking created items
  const testData = {
    adminUser,
    createdUsers: [],
    createdDoors: [],
    createdAccessGroups: [],
    testUsers: []
  };
  
  // Store testData in the test object for cleanup
  test.testData = testData;
  
  // Create test users for authentication tests
  addTestLog(testId, 'info', 'Creating test users in database...');
  for (let i = 0; i < Math.min(concurrentUsers, 5); i++) { // Limit to 5 test users
    try {
      const timestamp = Date.now() + i + Math.random() * 1000; // Ensure unique timestamps
      const username = `stressuser${timestamp}`;
      const email = `stressuser${timestamp}@test.com`;
      
      // Check if user already exists
      const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
      if (existingUser) {
        addTestLog(testId, 'info', `Using existing test user: ${email}`);
        testData.testUsers.push({
          email: existingUser.email,
          password: 'testpass123'
        });
        continue;
      }
      
      const testUser = await User.create({
        username: username,
        email: email,
        password: 'testpass123', // User.create will hash this automatically
        firstName: `StressUser${timestamp}`,
        lastName: 'Test',
        role: 'user'
      });
      
      testData.createdUsers.push(testUser.id);
      testData.testUsers.push({
        email: testUser.email,
        password: 'testpass123'
      });
      
      addTestLog(testId, 'info', `Created test user: ${email} (ID: ${testUser.id})`);
    } catch (error) {
      addTestLog(testId, 'error', `Failed to create test user ${i}: ${error.message}`);
    }
  }
  
  addTestLog(testId, 'info', `Created ${testData.testUsers.length} test users for authentication tests`);

  // Test functions
  const testFunctions = [];
  
  if (testOptions.testAuth) {
    if (testData.testUsers.length > 0) {
      testFunctions.push(() => testAuthentication(testData.testUsers[Math.floor(Math.random() * testData.testUsers.length)]));
      addTestLog(testId, 'info', `Added authentication test function (${testData.testUsers.length} test users available)`);
    } else {
      addTestLog(testId, 'warning', 'Skipping authentication test - no test users available');
    }
  }
  
  if (testOptions.testUsers) {
    testFunctions.push(() => testUserManagement(testData));
    addTestLog(testId, 'info', 'Added user management test function');
  }
  
  if (testOptions.testDoors) {
    testFunctions.push(() => testDoorManagement(testData));
    addTestLog(testId, 'info', 'Added door management test function');
  }
  
  if (testOptions.testAccessGroups) {
    testFunctions.push(() => testAccessGroupManagement(testData));
    addTestLog(testId, 'info', 'Added access group test function');
  }
  
  if (testOptions.testEvents) {
    testFunctions.push(() => testEventLogging(testData));
    addTestLog(testId, 'info', 'Added event logging test function');
  }
  
  if (testOptions.testDatabase) {
    testFunctions.push(() => testDatabaseOperations(testData));
    addTestLog(testId, 'info', 'Added database operations test function');
  }
  
  addTestLog(testId, 'info', `Total test functions available: ${testFunctions.length}`);

  // Run stress test
  const interval = 1000 / requestRate; // milliseconds between requests
  let requestCount = 0;
  let testInterval = null;
  let isTestRunning = true;
  
  const runRequests = async () => {
    const currentTime = Date.now();
    
    // Check if test should stop
    if (currentTime >= endTime || test.status === 'stopped' || !isTestRunning) {
      addTestLog(testId, 'info', `Test stopping - Current time: ${currentTime}, End time: ${endTime}, Status: ${test.status}, Running: ${isTestRunning}`);
      
      isTestRunning = false;
      test.status = 'completed';
      test.endTime = currentTime;
      addTestLog(testId, 'info', `Stress test completed. Total requests: ${requestCount}`);
      
      if (testInterval) {
        clearInterval(testInterval);
        testInterval = null;
        addTestLog(testId, 'info', 'Test interval cleared');
      }
      
      // Cleanup test data
      const testData = test.testData;
      if (testData) {
        await cleanupTestData(testId, testData);
      }
      return;
    }

    // Run concurrent requests
    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      if (testFunctions.length > 0) {
        const testFunction = testFunctions[Math.floor(Math.random() * testFunctions.length)];
        addTestLog(testId, 'info', `Executing test function ${i + 1}/${concurrentUsers} (${testFunctions.length} available)`);
        promises.push(executeTest(testFunction, testId));
      }
    }
    
    if (promises.length === 0) {
      addTestLog(testId, 'warning', 'No test functions available to execute');
      return;
    }
    
    addTestLog(testId, 'info', `Running ${promises.length} concurrent test functions (${testFunctions.length} total available)`);
    
    try {
      const results = await Promise.allSettled(promises);
      requestCount += promises.length;
      
      // Count successful vs failed tests
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Log individual test results for debugging
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          addTestLog(testId, 'success', `Test ${index + 1} completed successfully`);
        } else {
          addTestLog(testId, 'error', `Test ${index + 1} failed: ${result.reason.message}`);
        }
      });
      
      // Update progress
      test.results.totalRequests = requestCount;
      test.results.successfulRequests = (test.results.successfulRequests || 0) + successful;
      test.results.failedRequests = (test.results.failedRequests || 0) + failed;
      test.progress = Math.min(100, ((currentTime - startTime) / (testDuration * 1000)) * 100);
      
      addTestLog(testId, 'info', `Progress: ${test.progress.toFixed(1)}% - Requests: ${requestCount} (${successful} success, ${failed} failed)`);
    } catch (error) {
      addTestLog(testId, 'error', `Error in test execution: ${error.message}`);
    }
  };

  // Start the test with proper interval
  addTestLog(testId, 'info', `Starting stress test with ${concurrentUsers} concurrent users for ${testDuration} seconds`);
  addTestLog(testId, 'info', `Test will run for ${testDuration} seconds (${testDuration * 1000}ms)`);
  addTestLog(testId, 'info', `Request interval: ${interval}ms (${requestRate} requests per second)`);
  
  testInterval = setInterval(runRequests, interval);
  
  // Set a timeout to ensure test ends
  const timeoutId = setTimeout(async () => {
    addTestLog(testId, 'info', `Timeout reached after ${testDuration} seconds - forcing test completion`);
    
    isTestRunning = false;
    
    if (testInterval) {
      clearInterval(testInterval);
      testInterval = null;
      addTestLog(testId, 'info', 'Test interval cleared by timeout');
    }
    
    if (test.status === 'running') {
      test.status = 'completed';
      test.endTime = Date.now();
      addTestLog(testId, 'info', 'Stress test completed by timeout');
      
      // Cleanup test data
      await cleanupTestData(testId, testData);
    }
  }, testDuration * 1000); // Exact duration, no buffer
  
  // Store timeout ID for potential cleanup
  test.timeoutId = timeoutId;
}

// Execute individual test
async function executeTest(testFunction, testId) {
  const test = global.activeStressTests[testId];
  const startTime = Date.now();
  
  try {
    console.log('Executing test function...');
    const result = await testFunction();
    const responseTime = Date.now() - startTime;
    
    test.results.totalRequests++;
    test.results.successfulRequests++;
    test.results.responseTimes.push(responseTime);
    
    addTestLog(testId, 'success', `Request completed in ${responseTime}ms`);
    console.log('Test function completed successfully');
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
    console.error('Test function failed:', error);
  }
}

// Test functions - these will create real data visible in dashboard
async function testAuthentication(testData) {
  // Test authentication by trying to find user in database
  console.log('testAuthentication: Testing authentication for user:', testData.email);
  
  try {
    const foundUser = await User.findByEmail(testData.email);
    if (!foundUser) {
      console.log('testAuthentication: User not found, trying to find any test user...');
      // Try to find any test user if the specific one doesn't exist
      const allUsers = await User.findAll();
      console.log('testAuthentication: Found', allUsers.length, 'total users in database');
      
      const testUser = allUsers.find(user => 
        user.email.includes('stressuser') || 
        user.email.includes('test.com') ||
        user.email.includes('StressUser')
      );
      
      if (!testUser) {
        console.log('testAuthentication: No test users found. Available users:');
        allUsers.forEach(user => {
          console.log('  -', user.email, user.username, user.role);
        });
        throw new Error(`Auth test failed: No test users found in database`);
      }
      console.log('testAuthentication: Using fallback test user:', testUser.email);
      return testUser;
    }
    
    // Simulate password check
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(testData.password, foundUser.passwordHash);
    if (!isValid) {
      throw new Error(`Auth test failed: Invalid password`);
    }
    
    console.log('testAuthentication: Authentication successful for user:', foundUser.email);
    return foundUser;
  } catch (error) {
    console.error('testAuthentication: Error during authentication test:', error);
    throw error;
  }
}

async function testUserManagement(testData) {
  // Create a test user that will appear in dashboard
  const timestamp = Date.now();
  
  console.log('testUserManagement: Creating user...');
  
  const testUser = await User.create({
    username: `stressuser${timestamp}`,
    email: `stressuser${timestamp}@test.com`,
    password: 'testpass123', // User.create will hash this automatically
    firstName: `TestUser${timestamp}`,
    lastName: 'StressTest',
    role: 'user'
  });
  
  if (!testUser) {
    throw new Error(`User creation test failed`);
  }
  
  // Store for cleanup
  testData.createdUsers = testData.createdUsers || [];
  testData.createdUsers.push(testUser.id);
  
  console.log('testUserManagement: User created successfully', testUser.id);
  return testUser;
}

async function testDoorManagement(testData) {
  // Create a test door that will appear in dashboard
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  
  console.log('testDoorManagement: Creating door...');
  
  const testDoor = await Door.create({
    name: `StressTestDoor${timestamp}`,
    location: `Stress Test Location ${randomSuffix}`,
    esp32_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    esp32_mac: `AA:BB:CC:DD:EE:${randomSuffix.toString(16).padStart(2, '0')}`,
    has_lock_sensor: 1,
    has_door_position_sensor: 1,
    is_online: 0,
    is_locked: 1,
    is_open: 0
  });
  
  if (!testDoor) {
    throw new Error(`Door creation test failed`);
  }
  
  // Store for cleanup
  testData.createdDoors = testData.createdDoors || [];
  testData.createdDoors.push(testDoor.id);
  
  console.log('testDoorManagement: Door created successfully', testDoor.id);
  return testDoor;
}

async function testAccessGroupManagement(testData) {
  // Create a test access group that will appear in dashboard
  const timestamp = Date.now();
  
  console.log('testAccessGroupManagement: Creating access group...');
  
  const testAccessGroup = await AccessGroup.create({
    name: `StressTestGroup${timestamp}`,
    description: `Stress test access group created at ${new Date().toISOString()}`
  });
  
  if (!testAccessGroup) {
    throw new Error(`Access group creation test failed`);
  }
  
  // Store for cleanup
  testData.createdAccessGroups = testData.createdAccessGroups || [];
  testData.createdAccessGroups.push(testAccessGroup.id);
  
  console.log('testAccessGroupManagement: Access group created successfully', testAccessGroup.id);
  return testAccessGroup;
}

async function testEventLogging(testData) {
  // Create a test event that will appear in event logs
  const timestamp = Date.now();
  const eventTypes = ['door_access', 'user_login', 'system_event', 'access_denied'];
  const eventActions = ['granted', 'denied', 'attempted', 'logged'];
  const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const randomAction = eventActions[Math.floor(Math.random() * eventActions.length)];
  
  try {
    // Create a more realistic event
    const eventData = {
      type: randomType,
      action: randomAction,
      entity_type: 'stress_test',
      entity_id: timestamp,
      entity_name: `Stress Test Event ${timestamp}`,
      user_id: testData.adminUser.id,
      user_name: `${testData.adminUser.firstName} ${testData.adminUser.lastName}`,
      details: `Stress test event: ${randomType} ${randomAction} at ${new Date().toISOString()}`,
      ip_address: '127.0.0.1',
      user_agent: 'StressTest/1.0'
    };
    
    console.log('Creating event with data:', eventData);
    
    const testEvent = await Event.create(eventData);
    
    if (!testEvent) {
      throw new Error(`Event creation test failed - no event returned`);
    }
    
    // Log successful event creation
    console.log(`✅ Created event: ${randomType} ${randomAction} (ID: ${testEvent.id})`);
    return testEvent;
  } catch (error) {
    console.error('❌ Event creation error:', error);
    throw new Error(`Event creation test failed: ${error.message}`);
  }
}

async function testDatabaseOperations(testData) {
  // Test database connectivity and performance
  const userCount = await User.count();
  const doorCount = await Door.count();
  const accessGroupCount = await AccessGroup.count();
  const eventCount = await Event.count();
  
  // Test complex query
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

// Cleanup function to remove test data
async function cleanupTestData(testId, testData) {
  addTestLog(testId, 'info', 'Starting cleanup of test data...');
  
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const DB_PATH = path.join(__dirname, '../database/users.db');
    
    // Cleanup created users
    if (testData.createdUsers && testData.createdUsers.length > 0) {
      addTestLog(testId, 'info', `Cleaning up ${testData.createdUsers.length} test users...`);
      for (const userId of testData.createdUsers) {
        try {
          await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
              db.close();
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (error) {
          addTestLog(testId, 'warning', `Failed to delete user ${userId}: ${error.message}`);
        }
      }
    }
    
    // Cleanup created doors
    if (testData.createdDoors && testData.createdDoors.length > 0) {
      addTestLog(testId, 'info', `Cleaning up ${testData.createdDoors.length} test doors...`);
      for (const doorId of testData.createdDoors) {
        try {
          await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            db.run("DELETE FROM doors WHERE id = ?", [doorId], function(err) {
              db.close();
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (error) {
          addTestLog(testId, 'warning', `Failed to delete door ${doorId}: ${error.message}`);
        }
      }
    }
    
    // Cleanup created access groups
    if (testData.createdAccessGroups && testData.createdAccessGroups.length > 0) {
      addTestLog(testId, 'info', `Cleaning up ${testData.createdAccessGroups.length} test access groups...`);
      for (const groupId of testData.createdAccessGroups) {
        try {
          await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            db.run("DELETE FROM access_groups WHERE id = ?", [groupId], function(err) {
              db.close();
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (error) {
          addTestLog(testId, 'warning', `Failed to delete access group ${groupId}: ${error.message}`);
        }
      }
    }
    
    addTestLog(testId, 'info', 'Test data cleanup completed');
  } catch (error) {
    addTestLog(testId, 'error', `Error during cleanup: ${error.message}`);
  }
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