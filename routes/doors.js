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

const router = express.Router();

// Get all doors (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    };
    
    const [doors, totalCount] = await Promise.all([
      Door.findAll(options),
      Door.count(options)
    ]);
    
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
    const { name, location, esp32Ip, esp32Mac, accessGroupId } = req.body;
    
    // Check if door with this IP already exists
    const existingDoor = await Door.findByIp(esp32Ip);
    if (existingDoor) {
      return res.status(409).json({
        error: 'Door already exists',
        message: 'A door with this ESP32 IP address already exists'
      });
    }
    
    const door = await Door.create({
      name,
      location,
      esp32Ip,
      esp32Mac
    });
    
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

// Verify access for ESP32 (public endpoint with IP-based auth)
router.post('/verify-access', async (req, res) => {
  try {
    const { esp32_ip, user_id, esp32_secret } = req.body;
    
    if (!esp32_ip || !user_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ESP32 IP and user ID are required'
      });
    }
    
    // Find door by IP
    const door = await Door.findByIp(esp32_ip);
    if (!door) {
      await Door.logAccess(null, user_id, false, 'Door not found');
      return res.status(404).json({
        error: 'Door not found',
        message: 'No door found with this IP address',
        access_granted: false
      });
    }
    
    // Update last seen
    await door.updateLastSeen();
    
    // Verify user access
    const hasAccess = await door.verifyAccess(user_id);
    
    // Log access attempt
    await Door.logAccess(door.id, user_id, hasAccess, hasAccess ? 'Access granted' : 'Access denied');
    
    res.json({
      access_granted: hasAccess,
      door_name: door.name,
      message: hasAccess ? 'Access granted' : 'Access denied'
    });
    
  } catch (error) {
    console.error('Verify access error:', error);
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

module.exports = router;