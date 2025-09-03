const express = require('express');
const { AccessGroup } = require('../database/accessGroup');
const { 
  validateAccessGroup, 
  validateAccessGroupUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get all access groups (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    };
    
    const [accessGroups, totalCount] = await Promise.all([
      AccessGroup.findAll(options),
      AccessGroup.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      accessGroups: accessGroups.map(group => group.toJSON()),
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
    console.error('Get access groups error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve access groups'
    });
  }
});

// Get access group by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const accessGroup = await AccessGroup.findById(accessGroupId);
    
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    // Get doors and users for this access group
    const [doors, users] = await Promise.all([
      accessGroup.getDoors(),
      accessGroup.getUsers()
    ]);
    
    res.json({
      accessGroup: accessGroup.toJSON(),
      doors,
      users
    });
  } catch (error) {
    console.error('Get access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve access group'
    });
  }
});

// Create new access group (admin only)
router.post('/', authenticate, requireAdmin, validateAccessGroup, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if access group with this name already exists
    const existingGroup = await AccessGroup.findByName(name);
    if (existingGroup) {
      return res.status(409).json({
        error: 'Access group already exists',
        message: 'An access group with this name already exists'
      });
    }
    
    const accessGroup = await AccessGroup.create({
      name,
      description
    });
    
    res.status(201).json({
      message: 'Access group created successfully',
      accessGroup: accessGroup.toJSON()
    });
  } catch (error) {
    console.error('Create access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create access group'
    });
  }
});

// Update access group (admin only)
router.put('/:id', authenticate, requireAdmin, validateId, validateAccessGroupUpdate, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const accessGroup = await AccessGroup.findById(accessGroupId);
    
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    const updatedAccessGroup = await accessGroup.update(req.body);
    
    res.json({
      message: 'Access group updated successfully',
      accessGroup: updatedAccessGroup.toJSON()
    });
  } catch (error) {
    console.error('Update access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update access group'
    });
  }
});

// Delete access group (admin only)
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const accessGroup = await AccessGroup.findById(accessGroupId);
    
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    await accessGroup.delete();
    
    res.json({
      message: 'Access group deleted successfully'
    });
  } catch (error) {
    console.error('Delete access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete access group'
    });
  }
});

// Add user to access group (admin only)
router.post('/:id/users', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }
    
    const accessGroup = await AccessGroup.findById(accessGroupId);
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    const success = await accessGroup.addUser(userId, req.user.id);
    
    if (success) {
      res.json({
        message: 'User added to access group successfully'
      });
    } else {
      res.status(409).json({
        error: 'Conflict',
        message: 'User is already in this access group'
      });
    }
  } catch (error) {
    console.error('Add user to access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add user to access group'
    });
  }
});

// Remove user from access group (admin only)
router.delete('/:id/users/:userId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    const accessGroup = await AccessGroup.findById(accessGroupId);
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    const success = await accessGroup.removeUser(userId);
    
    if (success) {
      res.json({
        message: 'User removed from access group successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'User is not in this access group'
      });
    }
  } catch (error) {
    console.error('Remove user from access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove user from access group'
    });
  }
});

// Add door to access group (admin only)
router.post('/:id/doors', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const { doorId } = req.body;
    
    if (!doorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Door ID is required'
      });
    }
    
    const accessGroup = await AccessGroup.findById(accessGroupId);
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    const success = await accessGroup.addDoor(doorId);
    
    if (success) {
      res.json({
        message: 'Door added to access group successfully'
      });
    } else {
      res.status(409).json({
        error: 'Conflict',
        message: 'Door is already in this access group'
      });
    }
  } catch (error) {
    console.error('Add door to access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add door to access group'
    });
  }
});

// Remove door from access group (admin only)
router.delete('/:id/doors/:doorId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const accessGroupId = parseInt(req.params.id);
    const doorId = parseInt(req.params.doorId);
    
    const accessGroup = await AccessGroup.findById(accessGroupId);
    if (!accessGroup) {
      return res.status(404).json({
        error: 'Access group not found',
        message: 'The requested access group does not exist'
      });
    }
    
    const success = await accessGroup.removeDoor(doorId);
    
    if (success) {
      res.json({
        message: 'Door removed from access group successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Door is not in this access group'
      });
    }
  } catch (error) {
    console.error('Remove door from access group error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove door from access group'
    });
  }
});

module.exports = router;

