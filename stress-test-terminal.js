#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'database/users.db');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(50)}`, 'cyan');
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Database helper functions
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runInsert(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.run(sql, params, function(err) {
      db.close();
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function runDelete(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.run(sql, params, function(err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Test data creation functions
async function createTestUsers(count) {
  logStep('1', `Creating ${count} test users...`);
  const userIds = [];
  const timestamp = Date.now();
  
  for (let i = 0; i < count; i++) {
    try {
      const hashedPassword = bcrypt.hashSync('testpass123', 10);
      const userId = await runInsert(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          `testuser${timestamp}${i}`,
          `testuser${timestamp}${i}@test.com`,
          hashedPassword,
          `TestUser${i}`,
          'StressTest',
          'user',
          1
        ]
      );
      userIds.push(userId);
      logSuccess(`Created user: testuser${timestamp}${i}@test.com (ID: ${userId})`);
    } catch (error) {
      logError(`Failed to create user ${i}: ${error.message}`);
    }
  }
  
  return userIds;
}

async function createTestDoors(count) {
  logStep('2', `Creating ${count} test doors...`);
  const doorIds = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const doorId = await runInsert(
        `INSERT INTO doors (name, location, esp32_ip, esp32_mac, has_lock_sensor, has_door_position_sensor, is_online, is_locked, is_open, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          `Test Door ${i + 1}`,
          `Test Location ${i + 1}`,
          `192.168.1.${100 + i}`,
          `AA:BB:CC:DD:EE:${(i + 1).toString(16).padStart(2, '0')}`,
          1, 1, 1, 0, 0
        ]
      );
      doorIds.push(doorId);
      logSuccess(`Created door: Test Door ${i + 1} (ID: ${doorId})`);
    } catch (error) {
      logError(`Failed to create door ${i}: ${error.message}`);
    }
  }
  
  return doorIds;
}

async function createTestAccessGroups(count) {
  logStep('3', `Creating ${count} test access groups...`);
  const groupIds = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const groupId = await runInsert(
        `INSERT INTO access_groups (name, description, created_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [
          `Test Access Group ${i + 1}`,
          `Test access group for stress testing - Group ${i + 1}`
        ]
      );
      groupIds.push(groupId);
      logSuccess(`Created access group: Test Access Group ${i + 1} (ID: ${groupId})`);
    } catch (error) {
      logError(`Failed to create access group ${i}: ${error.message}`);
    }
  }
  
  return groupIds;
}

async function simulateAccessEvents(userIds, doorIds, duration, requestRate) {
  logStep('4', `Simulating access events for ${duration} seconds...`);
  const events = [];
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  const interval = 1000 / requestRate;
  
  let eventCount = 0;
  
  const simulateEvent = async () => {
    if (Date.now() >= endTime) {
      logSuccess(`Access event simulation completed. Total events: ${eventCount}`);
      return;
    }
    
    // Randomly select a user and door
    const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
    const randomDoor = doorIds[Math.floor(Math.random() * doorIds.length)];
    
    // Simulate access decision (70% success rate)
    const isGranted = Math.random() > 0.3;
    const eventType = isGranted ? 'access_granted' : 'access_denied';
    
    try {
      const eventId = await runInsert(
        `INSERT INTO events (type, action, entity_type, entity_id, entity_name, user_id, user_name, details, ip_address, user_agent, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          'door_access',
          eventType,
          'door',
          randomDoor,
          `Door ${randomDoor}`,
          randomUser,
          `TestUser${randomUser}`,
          `Access ${eventType} for user ${randomUser} at door ${randomDoor}`,
          '127.0.0.1',
          'StressTest/1.0'
        ]
      );
      
      events.push(eventId);
      eventCount++;
      logInfo(`Simulated ${eventType} for user ${randomUser} at door ${randomDoor} (Event ID: ${eventId})`);
    } catch (error) {
      logError(`Failed to create access event: ${error.message}`);
    }
    
    // Schedule next event
    setTimeout(simulateEvent, interval);
  };
  
  // Start simulation
  simulateEvent();
  
  // Wait for simulation to complete
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  
  return events;
}

async function cleanupTestData(userIds, doorIds, groupIds) {
  logStep('5', 'Cleaning up test data...');
  
  // Clean up events first (foreign key constraints)
  try {
    const eventCount = await runDelete(
      `DELETE FROM events WHERE user_agent = 'StressTest/1.0'`
    );
    logSuccess(`Cleaned up ${eventCount} test events`);
  } catch (error) {
    logError(`Failed to clean up events: ${error.message}`);
  }
  
  // Clean up users
  for (const userId of userIds) {
    try {
      await runDelete(`DELETE FROM users WHERE id = ?`, [userId]);
      logSuccess(`Cleaned up user ${userId}`);
    } catch (error) {
      logError(`Failed to clean up user ${userId}: ${error.message}`);
    }
  }
  
  // Clean up doors
  for (const doorId of doorIds) {
    try {
      // First remove door from all access groups
      await runDelete(`DELETE FROM door_access_groups WHERE door_id = ?`, [doorId]);
      // Then delete the door itself
      await runDelete(`DELETE FROM doors WHERE id = ?`, [doorId]);
      logSuccess(`Cleaned up door ${doorId}`);
    } catch (error) {
      logError(`Failed to clean up door ${doorId}: ${error.message}`);
    }
  }
  
  // Clean up access groups
  for (const groupId of groupIds) {
    try {
      await runDelete(`DELETE FROM access_groups WHERE id = ?`, [groupId]);
      logSuccess(`Cleaned up access group ${groupId}`);
    } catch (error) {
      logError(`Failed to clean up access group ${groupId}: ${error.message}`);
    }
  }
}

async function showTestResults(userIds, doorIds, groupIds, eventCount) {
  logSection('TEST RESULTS');
  
  logInfo(`Users created: ${userIds.length}`);
  logInfo(`Doors created: ${doorIds.length}`);
  logInfo(`Access groups created: ${groupIds.length}`);
  logInfo(`Access events simulated: ${eventCount}`);
  
  // Show some sample data
  if (userIds.length > 0) {
    logInfo(`Sample users: ${userIds.slice(0, 3).join(', ')}${userIds.length > 3 ? '...' : ''}`);
  }
  if (doorIds.length > 0) {
    logInfo(`Sample doors: ${doorIds.slice(0, 3).join(', ')}${doorIds.length > 3 ? '...' : ''}`);
  }
  if (groupIds.length > 0) {
    logInfo(`Sample access groups: ${groupIds.slice(0, 3).join(', ')}${groupIds.length > 3 ? '...' : ''}`);
  }
}

// Main stress test function
async function runStressTest() {
  const args = process.argv.slice(2);
  const userCount = parseInt(args[0]) || 5;
  const doorCount = parseInt(args[1]) || 3;
  const groupCount = parseInt(args[2]) || 2;
  const duration = parseInt(args[3]) || 30;
  const requestRate = parseInt(args[4]) || 2;
  
  logSection('STRESS TEST STARTING');
  logInfo(`Configuration:`);
  logInfo(`  Users: ${userCount}`);
  logInfo(`  Doors: ${doorCount}`);
  logInfo(`  Access Groups: ${groupCount}`);
  logInfo(`  Duration: ${duration} seconds`);
  logInfo(`  Request Rate: ${requestRate} events/second`);
  
  const testData = {
    userIds: [],
    doorIds: [],
    groupIds: [],
    eventCount: 0
  };
  
  try {
    // Phase 1: Create test data
    logSection('PHASE 1: CREATING TEST DATA');
    testData.userIds = await createTestUsers(userCount);
    testData.doorIds = await createTestDoors(doorCount);
    testData.groupIds = await createTestAccessGroups(groupCount);
    
    // Phase 2: Simulate access events
    logSection('PHASE 2: SIMULATING ACCESS EVENTS');
    const events = await simulateAccessEvents(testData.userIds, testData.doorIds, duration, requestRate);
    testData.eventCount = events.length;
    
    // Phase 3: Show results
    await showTestResults(testData.userIds, testData.doorIds, testData.groupIds, testData.eventCount);
    
    // Phase 4: Cleanup
    logSection('PHASE 3: CLEANUP');
    await cleanupTestData(testData.userIds, testData.doorIds, testData.groupIds);
    
    logSection('STRESS TEST COMPLETED');
    logSuccess('All phases completed successfully!');
    logInfo('Check your dashboard to see the test data that was created and cleaned up.');
    
  } catch (error) {
    logError(`Stress test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the stress test
if (require.main === module) {
  runStressTest().catch(console.error);
}

module.exports = { runStressTest };