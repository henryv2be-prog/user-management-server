const express = require('express');
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
    testFunctions.push(() => testUserManagement());
  }
  
  if (testOptions.testDoors) {
    testFunctions.push(() => testDoorManagement());
  }
  
  if (testOptions.testAccessGroups) {
    testFunctions.push(() => testAccessGroupManagement());
  }
  
  if (testOptions.testEvents) {
    testFunctions.push(() => testEventLogging());
  }
  
  if (testOptions.testDatabase) {
    testFunctions.push(() => testDatabaseOperations());
  }

  // Run stress test
  const interval = 1000 / requestRate; // milliseconds between requests
  let requestCount = 0;
  
  const runRequests = async () => {
    if (Date.now() >= endTime || test.status === 'stopped') {
      test.status = 'completed';
      test.endTime = Date.now();
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
    
    // Schedule next batch
    setTimeout(runRequests, interval);
  };

  // Start the test
  runRequests();
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
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  
  if (!response.ok) {
    throw new Error(`Auth test failed: ${response.status}`);
  }
}

async function testUserManagement() {
  const response = await fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${getTestToken()}` }
  });
  
  if (!response.ok) {
    throw new Error(`User management test failed: ${response.status}`);
  }
}

async function testDoorManagement() {
  const response = await fetch('/api/doors', {
    headers: { 'Authorization': `Bearer ${getTestToken()}` }
  });
  
  if (!response.ok) {
    throw new Error(`Door management test failed: ${response.status}`);
  }
}

async function testAccessGroupManagement() {
  const response = await fetch('/api/access-groups', {
    headers: { 'Authorization': `Bearer ${getTestToken()}` }
  });
  
  if (!response.ok) {
    throw new Error(`Access group test failed: ${response.status}`);
  }
}

async function testEventLogging() {
  const response = await fetch('/api/events', {
    headers: { 'Authorization': `Bearer ${getTestToken()}` }
  });
  
  if (!response.ok) {
    throw new Error(`Event logging test failed: ${response.status}`);
  }
}

async function testDatabaseOperations() {
  const response = await fetch('/api/health');
  
  if (!response.ok) {
    throw new Error(`Database test failed: ${response.status}`);
  }
}

// Helper functions
function getTestToken() {
  // In a real implementation, you'd get a valid test token
  return 'test-token';
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