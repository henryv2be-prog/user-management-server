const express = require('express');
const { body, validationResult } = require('express-validator');
const AccessRequest = require('../database/accessRequest');
const { Door } = require('../database/door');
const { User } = require('../database/models');
const AccessGroup = require('../database/accessGroup');
const { DoorTag } = require('../database/doorTag');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

// Validation middleware
const validateAccessRequest = [
  body('doorId').optional().isInt({ min: 1 }).withMessage('Door ID must be a positive integer'),
  body('tagId').optional().isString().withMessage('Tag ID must be a string'),
  body('requestType').optional().isIn(['qr_scan', 'nfc_scan', 'manual', 'emergency']).withMessage('Invalid request type'),
  body('qrCodeData').optional().isString().withMessage('QR code data must be a string')
];

// Process access request (requires user or visitor authentication from mobile app)
router.post('/request', authenticate, validateAccessRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please fix the validation errors below',
        errors: errors.array()
      });
    }

    const { doorId, tagId, requestType = 'nfc_scan', qrCodeData } = req.body;
    
    // Check if this is a visitor or regular user
    const isVisitor = req.user.accountType === 'visitor';
    const userId = isVisitor ? req.user.userId : req.user.id; // Host user ID for visitors
    const visitorId = isVisitor ? req.user.visitorId : null;
    
    let door;
    let resolvedDoorId = doorId;
    
    // If tagId is provided, resolve doorId from tag association
    if (tagId && !doorId) {
      const doorTag = await DoorTag.findByTagId(tagId);
      if (!doorTag) {
        return res.status(404).json({
          error: 'Tag Not Associated',
          message: 'This NFC tag is not associated with any door'
        });
      }
      resolvedDoorId = doorTag.doorId;
    }
    
    // Validate that we have a door ID
    if (!resolvedDoorId) {
      return res.status(400).json({
        error: 'Missing Door Information',
        message: 'Either doorId or tagId must be provided'
      });
    }
    
    // Find the door
    door = await Door.findById(resolvedDoorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door Not Found',
        message: 'The requested door does not exist'
      });
    }

    // Check if door is online
    if (!door.isOnline) {
      return res.status(503).json({
        error: 'Door Offline',
        message: 'The door is currently offline and cannot process access requests'
      });
    }

    // Check if user has access to this door
    // All users (including admins) must have proper access groups to access doors
    let hasAccess = await checkUserDoorAccess(userId, resolvedDoorId);
    
    // Debug logging for visitors
    if (isVisitor) {
      console.log(`Visitor ${req.user.email} (visitorId: ${req.user.visitorId}) checking access via host user ${userId} for door ${resolvedDoorId}`);
    }
    
    if (hasAccess) {
      console.log(`User ${req.user.email} (${req.user.role || req.user.accountType}) granted access to door ${resolvedDoorId} via access groups`);
    } else {
      console.log(`User ${req.user.email} (${req.user.role || req.user.accountType}) denied access to door ${resolvedDoorId} - no access groups`);
    }
    
    if (!hasAccess) {
      // Create denied request
      const requestData = {
        userId: userId,
        doorId: resolvedDoorId,
        requestType: requestType,
        status: 'denied',
        reason: 'User does not have access to this door',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        qrCodeData: qrCodeData,
        processedAt: new Date().toISOString()
      };

      const accessRequest = await AccessRequest.create(requestData);

      // Log denied access
      const userName = req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : req.user.email || `User ${req.user.id}`;
      await EventLogger.log(req, 'access', 'denied', 'AccessRequest', accessRequest.id, `Access denied to ${userName} for ${door.name}`, `User: ${req.user.email}`);

      return res.json({
        success: true,
        message: 'Access denied',
        access: false,
        reason: 'You do not have access to this door',
        requestId: accessRequest.id,
        door: {
          id: door.id,
          name: door.name,
          location: door.location
        }
      });
    }

    // User has access - check if this is a visitor and handle access events
    let remainingEvents = null;
    if (req.user.accountType === 'visitor') {
      try {
        const { Visitor } = require('../database/visitor');
        const visitor = await Visitor.findById(req.user.visitorId);
        
        console.log(`Visitor access check: visitorId=${req.user.visitorId}, found visitor=${!!visitor}`);
        if (visitor) {
          console.log(`Visitor details: ${visitor.firstName} ${visitor.lastName}, remainingEvents=${visitor.remainingAccessEvents}, isValid=${visitor.isValid()}`);
        }
        
        if (visitor && visitor.isValid()) {
          // Use one access event
          await visitor.useAccessEvent();
          remainingEvents = visitor.remainingAccessEvents;
          console.log(`Visitor ${visitor.firstName} ${visitor.lastName} used access event. Remaining: ${remainingEvents}`);
        } else if (visitor) {
          // Visitor exists but is not valid (no events or expired)
          console.log(`Visitor ${visitor.firstName} ${visitor.lastName} access denied: remainingEvents=${visitor.remainingAccessEvents}, isValid=${visitor.isValid()}`);
          return res.status(403).json({
            access: false,
            message: visitor.remainingAccessEvents <= 0 ? 
              'No remaining access events. Please contact your host to add more events.' :
              'Visitor access has expired or is inactive',
            remainingInstances: visitor.remainingAccessEvents || 0
          });
        }
      } catch (error) {
        console.error('Error handling visitor access events:', error);
        // Continue with normal access if visitor handling fails
      }
    }

    // Create granted request
    const requestData = {
      userId: userId,
      doorId: resolvedDoorId,
      requestType: requestType,
      status: 'granted',
      reason: 'Access granted',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      qrCodeData: qrCodeData,
      processedAt: new Date().toISOString()
    };

    const accessRequest = await AccessRequest.create(requestData);

    // Log granted access
    const userName = req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : req.user.email || `User ${req.user.id}`;
    await EventLogger.log(req, 'access', 'granted', 'AccessRequest', accessRequest.id, `Access granted to ${userName} for ${door.name}`, `User: ${req.user.email}`);

    // Queue door open command for ESP32 to pick up (ESP32 polls server for commands)
    let doorControlSuccess = true; // Assume success since we're queuing the command
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

    res.json({
      success: true,
      message: doorControlSuccess ? 'Access granted - door opening' : 'Access granted but door control failed',
      accessGranted: true, // Changed from 'access: true' to match mobile app expectations
      doorControlSuccess: doorControlSuccess,
      doorControlMessage: doorControlMessage,
      requestId: accessRequest.id,
      remainingInstances: remainingEvents, // Include remaining events for visitors
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email
      },
      door: {
        id: door.id,
        name: door.name,
        location: door.location,
        esp32Ip: door.esp32Ip
      }
    });

  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process access request'
    });
  }
});

// ESP32 door control endpoint (no auth required - uses secret key)
router.post('/door-control', async (req, res) => {
  try {
    const { doorId, secretKey, action = 'open' } = req.body;

    if (!doorId || !secretKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'doorId and secretKey are required'
      });
    }

    // Find the door and validate secret key
    const door = await Door.findById(doorId);
    if (!door || door.secretKey !== secretKey) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Invalid door or secret key'
      });
    }

    // Check if door is online
    if (!door.isOnline) {
      return res.status(503).json({
        error: 'Door Offline',
        message: 'The door is currently offline'
      });
    }

    // Send command to ESP32
    console.log(`Attempting to send ${action} command to ESP32 at ${door.esp32Ip}`);
    
    try {
      const response = await fetch(`http://${door.esp32Ip}/door`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action }),
        timeout: 5000 // 5 second timeout
      });
      
      if (response.ok) {
        console.log(`Successfully sent ${action} command to ESP32`);
        
        // Log door control action
        await EventLogger.log(req, 'door', 'controlled', 'Door', door.id, `Door ${action} command sent to ${door.name}`, `Action: ${action}`);
        
        res.json({
          success: true,
          message: `Door ${action} command sent successfully`,
          door: {
            id: door.id,
            name: door.name,
            location: door.location,
            esp32Ip: door.esp32Ip
          },
          action: action,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`ESP32 responded with status ${response.status}`);
        res.status(500).json({
          error: 'Door Control Failed',
          message: 'ESP32 device responded with an error'
        });
      }
    } catch (fetchError) {
      console.error(`Failed to connect to ESP32 at ${door.esp32Ip}:`, fetchError.message);
      
      // Check if it's a timeout or connection error
      if (fetchError.cause && fetchError.cause.code === 'ECONNREFUSED') {
        res.status(400).json({
          error: 'ESP32 Not Reachable',
          message: 'Cannot connect to door controller - device may be offline or IP address incorrect'
        });
      } else if (fetchError.cause && fetchError.cause.code === 'ETIMEDOUT') {
        res.status(400).json({
          error: 'ESP32 Timeout',
          message: 'Door controller did not respond - device may be offline or slow to respond'
        });
      } else {
        res.status(500).json({
          error: 'Network Error',
          message: `Failed to communicate with door controller: ${fetchError.message}`
        });
      }
    }

  } catch (error) {
    console.error('Door control error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to control door'
    });
  }
});

// Helper function to check if user has access to a door
async function checkUserDoorAccess(userId, doorId) {
  try {
    // Get all access groups for the user
    const userAccessGroups = await AccessGroup.getUserAccessGroups(userId);
    
    if (userAccessGroups.length === 0) {
      return false; // User has no access groups
    }

    // Check if any of the user's access groups include this door
    for (const accessGroup of userAccessGroups) {
      const doors = await accessGroup.getDoors();
      if (doors.some(door => door.id === doorId)) {
        return true; // User has access through this access group
      }
    }

    return false; // User has no access to this door
  } catch (error) {
    console.error('Error checking user door access:', error);
    return false;
  }
}

// Get access requests (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, doorId, requestType } = req.query;

    const options = { page: parseInt(page), limit: parseInt(limit) };
    if (status) options.status = status;
    if (userId) options.userId = parseInt(userId);
    if (doorId) options.doorId = parseInt(doorId);
    if (requestType) options.requestType = requestType;

    const requests = await AccessRequest.findAll(options);
    const totalCount = await AccessRequest.count(options);

    res.json({
      requests: requests.map(request => request.toJSON()),
      pagination: {
        totalCount,
        currentPage: options.page,
        perPage: options.limit,
        totalPages: Math.ceil(totalCount / options.limit)
      }
    });
  } catch (error) {
    console.error('Get access requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve access requests'
    });
  }
});

// Get access request by ID (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request ID'
      });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Access request not found'
      });
    }

    res.json({
      request: request.toJSON()
    });
  } catch (error) {
    console.error('Get access request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve access request'
    });
  }
});

// Update access request status (admin only)
router.patch('/:id/status', authenticate, requireAdmin, [
  body('status').isIn(['pending', 'granted', 'denied', 'expired']).withMessage('Invalid status'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please fix the validation errors below',
        errors: errors.array()
      });
    }

    const requestId = parseInt(req.params.id);
    const { status, reason } = req.body;

    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request ID'
      });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Access request not found'
      });
    }

    const updateData = { status };
    if (reason) updateData.reason = reason;
    if (status !== 'pending') updateData.processedAt = new Date().toISOString();

    await request.update(updateData);

    // Log status change
    await EventLogger.log(req, 'access', 'status_changed', 'AccessRequest', request.id, `Status changed to ${status}`, `Reason: ${reason || 'No reason provided'}`);

    res.json({
      success: true,
      message: 'Access request status updated',
      request: request.toJSON()
    });
  } catch (error) {
    console.error('Update access request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update access request'
    });
  }
});

// Delete access request (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    if (isNaN(requestId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request ID'
      });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Access request not found'
      });
    }

    // Log deletion
    await EventLogger.log(req, 'access', 'deleted', 'AccessRequest', request.id, `Access request deleted`, `Request ID: ${request.id}`);

    await request.delete();

    res.json({
      success: true,
      message: 'Access request deleted successfully'
    });
  } catch (error) {
    console.error('Delete access request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete access request'
    });
  }
});

module.exports = router;
