const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Door } = require('../database/door');
// Check if user has access to a specific door
async function checkDoorAccess(userId, doorId) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, '../database/users.db');
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      // Check if user has access to this door through access groups
      const query = `
        SELECT COUNT(*) as count
        FROM user_access_groups uag
        JOIN access_group_doors agd ON uag.access_group_id = agd.access_group_id
        WHERE uag.user_id = ? AND agd.door_id = ?
      `;
      
      db.get(query, [userId, doorId], (err, row) => {
        db.close();
        if (err) {
          console.error('Database error in checkDoorAccess:', err);
          resolve(false);
        } else {
          resolve(row.count > 0);
        }
      });
    });
  } catch (error) {
    console.error('Error in checkDoorAccess:', error);
    return false;
  }
}
const EventLogger = require('../utils/eventLogger');

// Silent door access endpoint (no browser required)
router.post('/:doorId', authenticate, async (req, res) => {
  try {
    const doorId = parseInt(req.params.doorId);
    const userId = req.user.id;
    const userName = req.user.username || req.user.firstName + ' ' + req.user.lastName;
    const accountType = req.accountType || 'user';
    
    console.log(`🚪 Silent Access - ${accountType}: ${userName} (${userId}), Door: ${doorId}`);
    
    // Find the door
    const door = await Door.findById(doorId);
    if (!door) {
      console.log('🚪 Silent Access - Door not found');
      return res.status(404).json({
        success: false,
        message: 'Door not found'
      });
    }
    
    // Check if door is online
    if (!door.isOnline) {
      console.log('🚪 Silent Access - Door offline');
      return res.status(400).json({
        success: false,
        message: 'Door is offline'
      });
    }
    
    // For visitors, use the host user ID; for regular users, use their own ID
    const accessUserId = req.accountType === 'visitor' ? req.user.userId : userId;
    const hasAccess = await checkDoorAccess(accessUserId, doorId);
    
    if (!hasAccess) {
      console.log('🚪 Silent Access - Access denied');
      
      // Log access denied event
      await EventLogger.log(req, 'access', 'denied', 'door', doorId, door.name, 
        `Silent access denied for ${accountType} ${userName} - insufficient permissions`);
      
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }
    
    // Grant access - queue the door open command
    console.log('🚪 Silent Access - Access granted, opening door');
    
    // Queue the door open command (same as regular door access)
    const command = {
      action: 'open',
      doorId: doorId,
      timestamp: new Date().toISOString(),
      userId: userId,
      userName: userName,
      accountType: accountType,
      source: 'silent_access'
    };
    
    // Add to command queue (you'll need to implement this based on your existing system)
    if (global.commandQueue) {
      global.commandQueue.push(command);
    }
    
    // Log successful access
    await EventLogger.log(req, 'access', 'granted', 'door', doorId, door.name, 
      `Silent access granted for ${accountType} ${userName}`);
    
    // Trigger webhook for immediate UI updates
    if (global.triggerWebhook) {
      global.triggerWebhook('door.access_granted', {
        doorId: doorId,
        doorName: door.name,
        userId: userId,
        userName: userName,
        accountType: accountType,
        source: 'silent_access'
      });
    }
    
    // Send push notification if mobile app is registered
    if (global.sendPushNotification) {
      global.sendPushNotification(userId, {
        title: 'Door Access Granted',
        body: `Access granted for ${door.name}`,
        data: {
          doorId: doorId,
          doorName: door.name,
          action: 'access_granted'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Access granted',
      doorId: doorId,
      doorName: door.name,
      doorLocation: door.location
    });
    
  } catch (error) {
    console.error('Silent access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get silent access status (for mobile app to check if user is logged in)
router.get('/status', authenticate, (req, res) => {
  const user = req.user;
  const accountType = req.accountType || 'user';
  
  res.json({
    success: true,
    loggedIn: true,
    user: {
      id: user.id,
      name: user.firstName + ' ' + user.lastName,
      email: user.email,
      accountType: accountType
    }
  });
});

module.exports = router;