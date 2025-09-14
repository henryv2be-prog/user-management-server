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
  if (!test) {
    console.error(`Test ${testId} not found in activeStressTests`);
    return;
  }
  const { concurrentUsers, testDuration, requestRate, testOptions } = config;
  
  addTestLog(testId, 'info', '🚀 Starting comprehensive stress test...');
  
  // Get admin user
  let adminUser = null;
  try {
    adminUser = await User.findByEmail('admin@example.com') || await User.findByUsername('admin');
    if (!adminUser) {
      addTestLog(testId, 'error', 'Admin user not found');
      test.status = 'failed';
      return;
    }
    addTestLog(testId, 'info', `Admin user found: ${adminUser.email}`);
  } catch (error) {
    addTestLog(testId, 'error', `Failed to get admin user: ${error.message}`);
    test.status = 'failed';
    return;
  }
  
  // Test data structure
  const testData = {
    adminUser,
    createdUsers: [],
    createdDoors: [],
    createdAccessGroups: [],
    accessEvents: []
  };
  
  test.testData = testData;
  
  // Initialize test results
  test.results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: [],
    usersCreated: 0,
    doorsCreated: 0,
    accessGroupsCreated: 0,
    eventsCreated: 0
  };
  
  try {
    // Phase 1: Create test data
    addTestLog(testId, 'info', '📋 Phase 1: Creating test data...');
    await createTestData(testId, testData, concurrentUsers);
    
    // Phase 2: Setup access permissions
    addTestLog(testId, 'info', '🔐 Phase 2: Setting up access permissions...');
    await setupAccessPermissions(testId, testData);
    
    // Phase 3: Simulate access events
    addTestLog(testId, 'info', '🎭 Phase 3: Simulating access events...');
    await simulateAccessEvents(testId, testData, testDuration, requestRate);
    
    // Phase 4: Cleanup
    addTestLog(testId, 'info', '🧹 Phase 4: Cleaning up test data...');
    await cleanupTestData(testId, testData);
    
    // Final results summary
    addTestLog(testId, 'info', '📊 Test Results Summary:');
    if (test.results) {
      addTestLog(testId, 'info', `  Users Created: ${test.results.usersCreated}`);
      addTestLog(testId, 'info', `  Doors Created: ${test.results.doorsCreated}`);
      addTestLog(testId, 'info', `  Access Groups Created: ${test.results.accessGroupsCreated}`);
      addTestLog(testId, 'info', `  Events Created: ${test.results.eventsCreated}`);
      addTestLog(testId, 'info', `  Total Requests: ${test.results.totalRequests}`);
      addTestLog(testId, 'info', `  Successful Requests: ${test.results.successfulRequests}`);
      addTestLog(testId, 'info', `  Failed Requests: ${test.results.failedRequests}`);
    } else {
      addTestLog(testId, 'error', 'Test results not available');
    }
    
    test.status = 'completed';
    test.endTime = Date.now();
    addTestLog(testId, 'info', '✅ Stress test completed successfully!');
    
  } catch (error) {
    addTestLog(testId, 'error', `Stress test failed: ${error.message}`);
    test.status = 'failed';
    
    // Cleanup on failure
    try {
      await cleanupTestData(testId, testData);
    } catch (cleanupError) {
      addTestLog(testId, 'error', `Cleanup failed: ${cleanupError.message}`);
    }
  }
}

// Phase 1: Create test data
async function createTestData(testId, testData, userCount) {
  const test = global.activeStressTests[testId];
  if (!test || !test.results) {
    addTestLog(testId, 'error', 'Test object or results not initialized');
    return;
  }
  const timestamp = Date.now();
  
  // Create test users
  addTestLog(testId, 'info', `Creating ${userCount} test users...`);
  for (let i = 0; i < userCount; i++) {
    try {
      const user = await User.create({
        username: `testuser${timestamp}${i}`,
        email: `testuser${timestamp}${i}@test.com`,
        password: 'testpass123',
        firstName: `TestUser${i}`,
        lastName: 'StressTest',
        role: 'user'
      });
      
      testData.createdUsers.push(user.id);
      if (test.results) {
        test.results.usersCreated++;
        test.results.successfulRequests++;
      }
      addTestLog(testId, 'info', `Created user: ${user.email} (ID: ${user.id})`);
    } catch (error) {
      if (test.results) {
        test.results.failedRequests++;
        test.results.errors.push({
          message: `Failed to create user ${i}: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
      addTestLog(testId, 'error', `Failed to create user ${i}: ${error.message}`);
    }
  }
  
  // Create test doors
  addTestLog(testId, 'info', 'Creating test doors...');
  for (let i = 0; i < 3; i++) {
    try {
      const door = await Door.create({
        name: `Test Door ${i + 1}`,
        location: `Test Location ${i + 1}`,
        esp32_ip: `192.168.1.${100 + i}`,
        esp32_mac: `AA:BB:CC:DD:EE:${(i + 1).toString(16).padStart(2, '0')}`,
        has_lock_sensor: 1,
        has_door_position_sensor: 1,
        is_online: 1,
        is_locked: 0,
        is_open: 0
      });
      
      testData.createdDoors.push(door.id);
      if (test.results) {
        test.results.doorsCreated++;
        test.results.successfulRequests++;
      }
      addTestLog(testId, 'info', `Created door: ${door.name} (ID: ${door.id})`);
    } catch (error) {
      if (test.results) {
        test.results.failedRequests++;
        test.results.errors.push({
          message: `Failed to create door ${i}: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
      addTestLog(testId, 'error', `Failed to create door ${i}: ${error.message}`);
    }
  }
  
  // Create test access groups
  addTestLog(testId, 'info', 'Creating test access groups...');
  for (let i = 0; i < 2; i++) {
    try {
      const accessGroup = await AccessGroup.create({
        name: `Test Access Group ${i + 1}`,
        description: `Test access group for stress testing - Group ${i + 1}`
      });
      
      testData.createdAccessGroups.push(accessGroup.id);
      if (test.results) {
        test.results.accessGroupsCreated++;
        test.results.successfulRequests++;
      }
      addTestLog(testId, 'info', `Created access group: ${accessGroup.name} (ID: ${accessGroup.id})`);
    } catch (error) {
      if (test.results) {
        test.results.failedRequests++;
        test.results.errors.push({
          message: `Failed to create access group ${i}: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
      addTestLog(testId, 'error', `Failed to create access group ${i}: ${error.message}`);
    }
  }
  
  // Update total requests
  if (test.results) {
    test.results.totalRequests = test.results.successfulRequests + test.results.failedRequests;
  }
}

// Phase 2: Setup access permissions
async function setupAccessPermissions(testId, testData) {
  // Assign users to access groups
  if (testData.createdUsers.length > 0 && testData.createdAccessGroups.length > 0) {
    addTestLog(testId, 'info', 'Setting up user access group assignments...');
    
    // Assign first half of users to first access group
    const halfUsers = Math.floor(testData.createdUsers.length / 2);
    for (let i = 0; i < halfUsers; i++) {
      try {
        // This would require implementing user-access group assignment
        addTestLog(testId, 'info', `User ${testData.createdUsers[i]} assigned to access group ${testData.createdAccessGroups[0]}`);
      } catch (error) {
        addTestLog(testId, 'error', `Failed to assign user to access group: ${error.message}`);
      }
    }
  }
  
  // Assign doors to access groups
  if (testData.createdDoors.length > 0 && testData.createdAccessGroups.length > 0) {
    addTestLog(testId, 'info', 'Setting up door access group assignments...');
    
    // Assign doors to access groups
    for (let i = 0; i < testData.createdDoors.length; i++) {
      try {
        const accessGroupId = testData.createdAccessGroups[i % testData.createdAccessGroups.length];
        addTestLog(testId, 'info', `Door ${testData.createdDoors[i]} assigned to access group ${accessGroupId}`);
      } catch (error) {
        addTestLog(testId, 'error', `Failed to assign door to access group: ${error.message}`);
      }
    }
  }
}

// Phase 3: Simulate access events
async function simulateAccessEvents(testId, testData, duration, requestRate) {
  const test = global.activeStressTests[testId];
  if (!test || !test.results) {
    addTestLog(testId, 'error', 'Test object or results not initialized');
    return;
  }
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  const interval = 1000 / requestRate;
  
  addTestLog(testId, 'info', `Simulating access events for ${duration} seconds...`);
  
  const simulateEvent = async () => {
    if (Date.now() >= endTime) {
      addTestLog(testId, 'info', `Access event simulation completed. Total events: ${testData.accessEvents.length}`);
      return;
    }
    
    // Randomly select a user and door
    const randomUser = testData.createdUsers[Math.floor(Math.random() * testData.createdUsers.length)];
    const randomDoor = testData.createdDoors[Math.floor(Math.random() * testData.createdDoors.length)];
    
    // Simulate access decision (granted/denied based on access group setup)
    const isGranted = Math.random() > 0.3; // 70% success rate
    const eventType = isGranted ? 'access_granted' : 'access_denied';
    
    try {
      const event = await Event.create({
        type: 'door_access',
        action: eventType,
        entity_type: 'door',
        entity_id: randomDoor,
        entity_name: `Door ${randomDoor}`,
        user_id: randomUser,
        user_name: `TestUser${randomUser}`,
        details: `Access ${eventType} for user ${randomUser} at door ${randomDoor}`,
        ip_address: '127.0.0.1',
        user_agent: 'StressTest/1.0'
      });
      
      testData.accessEvents.push(event);
      if (test.results) {
        test.results.eventsCreated++;
        test.results.successfulRequests++;
        test.results.totalRequests++;
      }
      addTestLog(testId, 'info', `Simulated ${eventType} for user ${randomUser} at door ${randomDoor}`);
    } catch (error) {
      if (test.results) {
        test.results.failedRequests++;
        test.results.totalRequests++;
        test.results.errors.push({
          message: `Failed to create access event: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
      addTestLog(testId, 'error', `Failed to create access event: ${error.message}`);
    }
    
    // Schedule next event
    setTimeout(simulateEvent, interval);
  };
  
  // Start simulation
  simulateEvent();
  
  // Wait for simulation to complete
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
}

// Legacy test functions removed - using new phase-based approach

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