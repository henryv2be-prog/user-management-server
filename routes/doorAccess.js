const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Door } = require('../database/door');
const EventLogger = require('../utils/eventLogger');

// Door access request endpoint
router.post('/:doorId', authenticate, async (req, res) => {
  try {
    const doorId = parseInt(req.params.doorId);
    const userId = req.user.id;
    const userName = req.user.username;
    
    console.log(`🚪 Door access request - User: ${userName} (${userId}), Door: ${doorId}`);
    
    // Get door details
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        success: false,
        message: 'Door not found'
      });
    }
    
    // Check if door is online
    if (!door.isOnline) {
      return res.status(400).json({
        success: false,
        message: 'Door is offline and cannot be accessed'
      });
    }
    
    // Check if user has access to this door
    const hasAccess = await checkDoorAccess(userId, doorId);
    
    if (!hasAccess) {
      // Log access denied event
      await EventLogger.log(req, 'access', 'denied', 'door', doorId, door.name, 
        `Access denied for user ${userName} - insufficient permissions`);
      
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions for this door'
      });
    }
    
    // User has access - grant access
    console.log(`✅ Access granted for user ${userName} to door ${door.name}`);
    
    // Log access granted event
    await EventLogger.log(req, 'access', 'granted', 'door', doorId, door.name, 
      `Access granted for user ${userName} via NFC`);
    
    // Queue door open command for ESP32
    let doorControlSuccess = true;
    let doorControlMessage = 'Door opening command queued for ESP32';
    
    try {
      console.log(`Queuing door open command for door ${door.id}`);
      
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'users.db');
      
      const db = new sqlite3.Database(DB_PATH);
      
      // Ensure door_commands table exists
      await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS door_commands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          door_id INTEGER NOT NULL,
          command TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          executed_at DATETIME,
          FOREIGN KEY (door_id) REFERENCES doors (id)
        )`, (err) => {
          if (err) {
            console.error('Error creating door_commands table:', err.message);
            reject(err);
          } else {
            console.log('✅ Door commands table verified/created');
            resolve();
          }
        });
      });
      
      // Insert door open command
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO door_commands (door_id, command, status) VALUES (?, ?, ?)', 
               [door.id, 'open', 'pending'], (err) => {
          db.close();
          if (err) {
            console.error('Error queuing door command:', err);
            reject(err);
          } else {
            console.log('Door command queued successfully');
            resolve();
          }
        });
      });
      
    } catch (doorError) {
      console.error('Door command queuing error:', doorError);
      doorControlSuccess = false;
      doorControlMessage = 'Access granted but failed to queue door command';
    }
    
    // Trigger immediate site map update if webhook system is available
    if (global.triggerWebhook) {
      try {
        const doorEvent = {
          type: 'door',
          action: 'access_granted',
          entityId: doorId,
          id: doorId,
          doorId: doorId,
          timestamp: new Date().toISOString()
        };
        global.triggerWebhook('door.access_granted', doorEvent);
        console.log(`🚪 Immediate site map update triggered for door ${doorId}`);
      } catch (webhookError) {
        console.error('Failed to trigger immediate site map update:', webhookError);
      }
    }
    
    res.json({
      success: true,
      message: 'Access granted - door is opening',
      door: {
        id: door.id,
        name: door.name,
        location: door.location
      },
      doorControlSuccess: doorControlSuccess,
      doorControlMessage: doorControlMessage
    });
    
  } catch (error) {
    console.error('Door access request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process door access request'
    });
  }
});

// Check if user has access to a specific door
async function checkDoorAccess(userId, doorId) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'users.db');
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Check if user has access through access groups
      db.get(`
        SELECT COUNT(*) as count
        FROM user_access_groups uag
        JOIN door_access_groups dag ON uag.access_group_id = dag.access_group_id
        WHERE uag.user_id = ? AND dag.door_id = ?
      `, [userId, doorId], (err, row) => {
        db.close();
        if (err) {
          console.error('Error checking door access:', err);
          reject(err);
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

// Get door access information (for debugging)
router.get('/:doorId/info', authenticate, async (req, res) => {
  try {
    const doorId = parseInt(req.params.doorId);
    const userId = req.user.id;
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        success: false,
        message: 'Door not found'
      });
    }
    
    const hasAccess = await checkDoorAccess(userId, doorId);
    
    res.json({
      success: true,
      door: {
        id: door.id,
        name: door.name,
        location: door.location,
        isOnline: door.isOnline,
        isOpen: door.isOpen,
        isLocked: door.isLocked
      },
      userHasAccess: hasAccess
    });
    
  } catch (error) {
    console.error('Door access info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get door access information'
    });
  }
});

module.exports = router;