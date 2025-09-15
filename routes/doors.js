const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Door } = require('../database/door');
const { 
  validateDoor, 
  validateDoorUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

// Cache prevention middleware for all routes
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}"`
  });
  next();
});

// Public endpoint for QR Code Generator (no auth required)
router.get('/public', async (req, res) => {
  try {
    const doors = await Door.findAll({ limit: 100 });
    res.json(doors);
  } catch (error) {
    console.error('Error fetching doors for QR generator:', error);
    res.status(500).json({ error: 'Failed to fetch doors' });
  }
});

// ESP32 Heartbeat endpoint (no auth required)
router.post('/heartbeat', async (req, res) => {
  try {
    console.log('Heartbeat endpoint hit');
    
    // Log heartbeat event
    await EventLogger.log(req, 'system', 'esp32_heartbeat', 'system', null, 'System', `Door Controller heartbeat received from IP: ${req.ip}`);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    let { deviceID, deviceName, ip, mac, status, doorOpen, signal, freeHeap, uptime } = req.body;
    
    console.log('Heartbeat received:', { deviceID, deviceName, ip, mac, status });
    
    if (!deviceID || !ip) {
      console.log('Heartbeat rejected - missing deviceID or ip');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'deviceID and ip are required'
      });
    }
    
    // Handle empty deviceName
    if (!deviceName || deviceName.trim() === '') {
      deviceName = 'ESP32-' + mac.replace(/:/g, '');
    }
    
    // Find door by ESP32 IP first (most reliable)
    console.log('Looking for door with IP:', ip);
    let door = await Door.findByIp(ip);
    console.log('Door found by IP:', door ? 'Yes' : 'No');
    
    if (!door && mac) {
      console.log('Looking for door with MAC:', mac);
      // Try to find by MAC if IP not found, but warn about potential conflicts
      door = await Door.findByMac(mac);
      console.log('Door found by MAC:', door ? 'Yes' : 'No');
      
      if (door) {
        console.log('WARNING: Found door by MAC but IP mismatch. Door IP:', door.esp32Ip, 'Heartbeat IP:', ip);
        // Update the door's IP to match the current heartbeat
        if (door.esp32Ip !== ip) {
          console.log('Updating door IP from', door.esp32Ip, 'to', ip);
          door.esp32Ip = ip;
          await door.save();
        }
      }
    }
    
    if (door) {
      // Check if door was previously offline
      const wasOffline = !door.isOnline;
      
      // Update last seen and online status
      await door.updateLastSeen();
      
      // Log door coming back online if it was previously offline
      if (wasOffline) {
        await EventLogger.log(req, 'door', 'online', 'door', door.id, door.name, `Door came back online - heartbeat received from IP: ${ip}`);
      }
      
      res.json({
        success: true,
        message: 'Heartbeat received',
        doorId: door.id,
        doorName: door.name
      });
    } else {
      // Door not found - could be a new ESP32
      res.json({
        success: true,
        message: 'Heartbeat received but door not registered',
        registered: false
      });
    }
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process heartbeat'
    });
  }
});

// Get all doors (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    };
    
    console.log('Fetching doors with options:', options);
    
    const [doors, totalCount] = await Promise.all([
      Door.findAll(options),
      Door.count(options)
    ]);
    
    console.log(`Found ${doors.length} doors, total count: ${totalCount}`);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      doors: doors.map(door => door.toJSON()),
      pagination: {
        page: options.page,
        limit: options.limit,
        totalCount,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    console.error('Get doors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve doors'
    });
  }
});

// Get door by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const door = await Door.findById(doorId);
    
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    res.json({
      door: door.toJSON()
    });
  } catch (error) {
    console.error('Get door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve door'
    });
  }
});

// Create new door (admin only)
router.post('/', authenticate, requireAdmin, validateDoor, async (req, res) => {
  try {
    const { name, location, controllerIp, controllerMac, accessGroupId } = req.body;
    
    console.log('Creating door with data:', { name, location, controllerIp, controllerMac, accessGroupId });
    
    // Validation middleware already checks for duplicate IP/MAC addresses
    const door = await Door.create({
      name,
      location,
      controllerIp,
      controllerMac
    });
    
    console.log('Door created successfully with ID:', door.id);
    
    // Add to access group if specified
    if (accessGroupId) {
      const db = new sqlite3.Database(path.join(__dirname, '..', 'database', 'users.db'));
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO door_access_groups (door_id, access_group_id) VALUES (?, ?)', 
               [door.id, accessGroupId], (err) => {
          db.close();
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Log door creation event
    await EventLogger.logDoorCreated(req, door);
    
    res.status(201).json({
      message: 'Door created successfully',
      door: door.toJSON()
    });
  } catch (error) {
    console.error('Create door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create door'
    });
  }
});

// Update door (admin only)
router.put('/:id', authenticate, requireAdmin, validateId, validateDoorUpdate, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const door = await Door.findById(doorId);
    
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    const { accessGroupId, ...doorUpdateData } = req.body;
    const updatedDoor = await door.update(doorUpdateData);
    
    // Handle access group changes
    if (accessGroupId !== undefined) {
      const db = new sqlite3.Database(path.join(__dirname, '..', 'database', 'users.db'));
      
      // Remove existing access group associations
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM door_access_groups WHERE door_id = ?', [doorId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Add new access group association if provided
      if (accessGroupId) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO door_access_groups (door_id, access_group_id) VALUES (?, ?)', 
                 [doorId, accessGroupId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      db.close();
    }
    
    // Fetch the updated door with access group info
    const finalDoor = await Door.findById(doorId);
    
    // Log door update event
    const changes = Object.keys(doorUpdateData).filter(key => doorUpdateData[key] !== undefined);
    await EventLogger.logDoorUpdated(req, finalDoor, changes);
    
    res.json({
      message: 'Door updated successfully',
      door: finalDoor.toJSON()
    });
  } catch (error) {
    console.error('Update door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update door'
    });
  }
});

// Delete door (admin only)
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const door = await Door.findById(doorId);
    
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Log door deletion event before deleting
    await EventLogger.logDoorDeleted(req, door);
    
    await door.delete();
    
    res.json({
      message: 'Door deleted successfully'
    });
  } catch (error) {
    console.error('Delete door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete door'
    });
  }
});

// Add door to access group (admin only)
router.post('/:id/access-groups/:accessGroupId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const accessGroupId = parseInt(req.params.accessGroupId);
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Add door to access group
    const db = new sqlite3.Database(path.join(__dirname, '..', 'database', 'users.db'));
    await new Promise((resolve, reject) => {
      db.run('INSERT OR IGNORE INTO door_access_groups (door_id, access_group_id) VALUES (?, ?)', 
             [doorId, accessGroupId], (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({
      message: 'Door added to access group successfully'
    });
  } catch (error) {
    console.error('Add door to access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add door to access group'
    });
  }
});

// Remove door from access group (admin only)
router.delete('/:id/access-groups/:accessGroupId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const accessGroupId = parseInt(req.params.accessGroupId);
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Remove door from access group
    const db = new sqlite3.Database(path.join(__dirname, '..', 'database', 'users.db'));
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM door_access_groups WHERE door_id = ? AND access_group_id = ?', 
             [doorId, accessGroupId], (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({
      message: 'Door removed from access group successfully'
    });
  } catch (error) {
    console.error('Remove door from access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove access group from door'
    });
  }
});

// ESP32 heartbeat endpoint (public endpoint)
router.post('/heartbeat', async (req, res) => {
  try {
    const { esp32_ip, esp32_mac, status = 'online' } = req.body;
    
    if (!esp32_ip) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ESP32 IP address is required'
      });
    }
    
    // Find door by IP
    const door = await Door.findByIp(esp32_ip);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'No door found with this IP address'
      });
    }
    
    // Update last seen timestamp
    await door.updateLastSeen();
    
    // Log heartbeat activity
    console.log(`Heartbeat received from ${door.name} (${esp32_ip}) - Status: ${status}`);
    
    res.json({
      success: true,
      message: 'Heartbeat received',
      door_name: door.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process heartbeat'
    });
  }
});

// Generate static QR code for door (admin only)
router.get('/:id/qr-code', authenticate, requireAdmin, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    
    if (isNaN(doorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid door ID'
      });
    }

    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Door not found'
      });
    }

    // Generate static QR code data - this will be the same every time
    const qrCodeData = {
      doorId: door.id,
      doorName: door.name,
      location: door.location,
      esp32Ip: door.esp32Ip,
      serverUrl: `${req.protocol}://${req.get('host')}`,
      type: 'door_access'
    };

    // Log QR code generation
    try {
      await EventLogger.log(req, 'door', 'qr_generated', 'Door', door.id, `Static QR code generated for ${door.name}`, `Location: ${door.location}`);
    } catch (logError) {
      console.error('EventLogger error (non-fatal):', logError);
      // Continue without logging
    }

    res.json({
      success: true,
      qrCodeData: JSON.stringify(qrCodeData),
      door: {
        id: door.id,
        name: door.name,
        location: door.location,
        esp32Ip: door.esp32Ip
      },
      instructions: {
        message: 'This is a static QR code for this door. Print and display it for users to scan.',
        note: 'Users will authenticate through the mobile app when scanning this code'
      }
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code'
    });
  }
});

// ESP32 access verification endpoint (no auth required - uses secret key)
router.post('/:id/verify-access', async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const { userId, secretKey, accessMethod = 'card' } = req.body;
    
    if (!userId || !secretKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID and secret key are required'
      });
    }
    
    const door = await Door.findById(doorId);
    if (!door) {
      await Door.logAccess(doorId, userId, false, 'Door not found');
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist',
        access_granted: false
      });
    }
    
    // Verify secret key (basic security)
    if (secretKey !== door.secretKey) {
      await Door.logAccess(doorId, userId, false, 'Invalid secret key');
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid secret key',
        access_granted: false
      });
    }
    
    // Update last seen when device communicates
    await door.updateLastSeen();
    
    // Verify user access
    const hasAccess = await door.verifyAccess(userId);
    
    // Log access attempt
    await Door.logAccess(doorId, userId, hasAccess, 
      hasAccess ? `Access granted via ${accessMethod}` : 'Access denied - insufficient permissions');
    
    res.json({
      access_granted: hasAccess,
      door_name: door.name,
      message: hasAccess ? 'Access granted' : 'Access denied',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Verify access error:', error);
    
    // Log error and deny access
    try {
      await Door.logAccess(req.params.id, req.body.userId, false, 'System error during verification');
    } catch (logError) {
      console.error('Failed to log access error:', logError);
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify access',
      access_granted: false
    });
  }
});

// Get door access logs (admin only)
router.get('/:id/logs', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    const logs = await door.getAccessLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate
    });
    
    res.json({
      logs,
      door: door.toJSON()
    });
  } catch (error) {
    console.error('Get door logs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve door access logs'
    });
  }
});

// Get doors accessible by current user
router.get('/accessible/me', authenticate, async (req, res) => {
  try {
    const doors = await Door.getAccessibleByUser(req.user.id);
    
    res.json({
      doors: doors.map(door => door.toJSON())
    });
  } catch (error) {
    console.error('Get accessible doors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve accessible doors'
    });
  }
});

// ESP32 Discovery endpoint
router.post('/discover', authenticate, requireAdmin, async (req, res) => {
  try {
    // Log ESP32 discovery event
    await EventLogger.log(req, 'system', 'door_controller_discovery_started', 'system', null, 'System', 'Door Controller discovery scan initiated');
    
    // Mock ESP32 discovery - in a real implementation, this would scan the network
    const mockDevices = [
      {
        mac: 'AA:BB:CC:DD:EE:01',
        ip: '192.168.1.100',
        name: 'ESP32-Door-001',
        status: 'discovered',
        signal: -45,
        lastSeen: new Date().toISOString(),
        deviceType: 'ESP32',
        firmware: '1.0.0'
      },
      {
        mac: 'AA:BB:CC:DD:EE:02',
        ip: '192.168.1.101',
        name: 'ESP32-Door-002',
        status: 'discovered',
        signal: -52,
        lastSeen: new Date().toISOString(),
        deviceType: 'ESP32',
        firmware: '1.0.0'
      }
    ];
    
    // Log discovery completion
    await EventLogger.log(req, 'system', 'door_controller_discovery_completed', 'system', null, 'System', `Door Controller discovery completed - found ${mockDevices.length} devices`);
    
    res.json({
      message: 'Door Controller discovery completed',
      devices: mockDevices,
      count: mockDevices.length
    });
  } catch (error) {
    console.error('Door Controller discovery error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to discover door controller devices'
    });
  }
});


// ESP32 Access Request endpoint (for QR code scanning)
router.post('/access/request', async (req, res) => {
  try {
    const { doorId, userId, reason } = req.body;
    
    if (!doorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'doorId is required'
      });
    }
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door Not Found',
        message: 'The requested door does not exist'
      });
    }
    
    // Check if door is online
    if (!door.isOnline) {
      return res.json({
        success: false,
        message: 'Door is offline',
        accessGranted: false
      });
    }
    
    // If userId provided, check access permissions
    if (userId) {
      const hasAccess = await door.verifyAccess(userId);
      if (!hasAccess) {
        await Door.logAccess(doorId, userId, false, 'Access denied - no permission');
        return res.json({
          success: false,
          message: 'Access denied',
          accessGranted: false
        });
      }
    }
    
    // Grant access
    await Door.logAccess(doorId, userId, true, reason || 'QR code access');
    
    // Send door open command to ESP32
    try {
      const response = await fetch(`http://${door.esp32Ip}/door`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'open' })
      });
      
      if (response.ok) {
        res.json({
          success: true,
          message: 'Access granted - door opening',
          accessGranted: true
        });
      } else {
        res.json({
          success: false,
          message: 'Access granted but door control failed',
          accessGranted: true
        });
      }
    } catch (doorError) {
      console.error('Door control error:', doorError);
      res.json({
        success: false,
        message: 'Access granted but door control failed',
        accessGranted: true
      });
    }
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process access request'
    });
  }
});

// Direct door control endpoint
router.post('/:id/control', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const { action } = req.body;
    
    // Get door details for logging
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Log door control event
    await EventLogger.log(req, 'door', 'control', 'door', door.id, door.name, `Door control command: ${action}`);
    
    if (!door.isOnline) {
      return res.status(400).json({
        error: 'Door Offline',
        message: 'Cannot control door - device is offline'
      });
    }
    
    // Send command to ESP32
    const response = await fetch(`http://${door.esp32Ip}/door`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action })
    });
    
    if (response.ok) {
      res.json({
        success: true,
        message: `Door ${action} command sent successfully`
      });
    } else {
      res.status(500).json({
        error: 'Door Control Failed',
        message: 'Failed to send command to ESP32'
      });
    }
  } catch (error) {
    console.error('Door control error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to control door'
    });
  }
});

module.exports = router;