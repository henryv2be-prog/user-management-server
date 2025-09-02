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
    const { page = 1, limit = 10, isActive, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
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
    
    // Get access groups for this door
    const accessGroups = await door.getAccessGroups();
    
    res.json({
      door: door.toJSON(),
      accessGroups
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
    const { name, location, esp32Ip, esp32Mac } = req.body;
    
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
    
    const updatedDoor = await door.update(req.body);
    
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

// Add access group to door (admin only)
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

// Remove access group from door (admin only)
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
    
    // Check if door is active
    if (!door.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Door is not active'
      });
    }
    
    // Verify user access
    const hasAccess = await door.verifyUserAccess(userId);
    
    // Log access attempt
    await door.logAccess(
      userId, 
      hasAccess, 
      accessMethod, 
      req.ip, 
      req.get('User-Agent')
    );
    
    // Update door last seen
    await door.updateLastSeen();
    
    res.json({
      accessGranted: hasAccess,
      message: hasAccess ? 'Access granted' : 'Access denied'
    });
  } catch (error) {
    console.error('Verify access error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify access'
    });
  }
});

module.exports = router;

