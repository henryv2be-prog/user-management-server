const express = require('express');
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
    
    // If access group is specified, add the door to it
    if (accessGroupId) {
      try {
        await door.addAccessGroup(accessGroupId);
      } catch (accessGroupError) {
        console.error('Error adding door to access group:', accessGroupError);
        // Don't fail the door creation if access group assignment fails
      }
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
    const { name, location, esp32Ip, esp32Mac } = req.body;
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Check if another door with this IP already exists
    if (esp32Ip && esp32Ip !== door.esp32Ip) {
      const existingDoor = await Door.findByIp(esp32Ip);
      if (existingDoor) {
        return res.status(409).json({
          error: 'IP address already in use',
          message: 'Another door with this ESP32 IP address already exists'
        });
      }
    }
    
    await door.update({
      name,
      location,
      esp32Ip,
      esp32Mac
    });
    
    const updatedDoor = await Door.findById(doorId);
    
    res.json({
      message: 'Door updated successfully',
      door: updatedDoor.toJSON()
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

// Add access group to door
router.post('/:id/access-groups', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const { accessGroupId } = req.body;
    
    if (!accessGroupId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Access group ID is required'
      });
    }
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    const success = await door.addAccessGroup(accessGroupId);
    
    if (success) {
      res.json({
        message: 'Access group added to door successfully'
      });
    } else {
      res.status(409).json({
        error: 'Conflict',
        message: 'Access group is already assigned to this door'
      });
    }
  } catch (error) {
    console.error('Add access group to door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add access group to door'
    });
  }
});

// Remove access group from door
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
    
    const success = await door.removeAccessGroup(accessGroupId);
    
    if (success) {
      res.json({
        message: 'Access group removed from door successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Access group is not assigned to this door'
      });
    }
  } catch (error) {
    console.error('Remove access group from door error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove access group from door'
    });
  }
});

// ESP32 access verification endpoint (no authentication required)
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
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Verify secret key
    if (door.secretKey !== secretKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid secret key'
      });
    }
    
    // Door is always active (is_active column removed)
    
    // Verify user access
    const hasAccess = await door.verifyUserAccess(userId);
    
    if (hasAccess) {
      // Log successful access
      await door.logAccess(userId, accessMethod, true);
      
      res.json({
        access: true,
        message: 'Access granted'
      });
    } else {
      // Log failed access attempt
      await door.logAccess(userId, accessMethod, false);
      
      res.status(403).json({
        access: false,
        message: 'Access denied'
      });
    }
  } catch (error) {
    console.error('Verify access error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify access'
    });
  }
});

// Update door last seen (ESP32 heartbeat)
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const doorId = parseInt(req.params.id);
    const { secretKey } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Secret key is required'
      });
    }
    
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door not found',
        message: 'The requested door does not exist'
      });
    }
    
    // Verify secret key
    if (door.secretKey !== secretKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid secret key'
      });
    }
    
    await door.updateLastSeen();
    
    res.json({
      message: 'Heartbeat received'
    });
  } catch (error) {
    console.error('Door heartbeat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update door heartbeat'
    });
  }
});

module.exports = router;