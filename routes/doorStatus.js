const express = require('express');
const { DoorStatus } = require('../database/doorStatus');
const { 
  validateDoorStatus, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get door status data (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, locked, doorId } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      locked: locked !== undefined ? locked === 'true' : undefined,
      doorId
    };
    
    const [records, totalCount] = await Promise.all([
      DoorStatus.findAll(options),
      DoorStatus.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      records: records.map(record => record.toJSON()),
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
    console.error('Get door status error:', error);
    res.status(500).json({
      error: 'Failed to fetch door status data',
      details: error.message
    });
  }
});

// Get door status by door ID
router.get('/door/:doorId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const status = await DoorStatus.findByDoorId(req.params.doorId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Door status not found'
      });
    }
    
    res.json(status.toJSON());
  } catch (error) {
    console.error('Get door status by door ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch door status',
      details: error.message
    });
  }
});

// Get door status summary
router.get('/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const summary = await DoorStatus.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Get door status summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch door status summary',
      details: error.message
    });
  }
});

// Create door status
router.post('/', authenticate, requireAdmin, validateDoorStatus, async (req, res) => {
  try {
    const statusData = req.body;
    const status = await DoorStatus.create(statusData);
    
    res.status(201).json(status.toJSON());
  } catch (error) {
    console.error('Create door status error:', error);
    res.status(500).json({
      error: 'Failed to create door status',
      details: error.message
    });
  }
});

// Update door status
router.put('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const status = await DoorStatus.findById(req.params.id);
    
    if (!status) {
      return res.status(404).json({
        error: 'Door status not found'
      });
    }
    
    const updatedStatus = await status.update(req.body);
    res.json(updatedStatus.toJSON());
  } catch (error) {
    console.error('Update door status error:', error);
    res.status(500).json({
      error: 'Failed to update door status',
      details: error.message
    });
  }
});

// Update or create door status by door ID
router.put('/door/:doorId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const { status, locked } = req.body;
    
    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }
    
    const validStatuses = ['open', 'closed', 'locked', 'unlocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    const statusRecord = await DoorStatus.updateOrCreate(req.params.doorId, {
      status,
      locked: locked || false
    });
    
    res.json(statusRecord.toJSON());
  } catch (error) {
    console.error('Update door status by door ID error:', error);
    res.status(500).json({
      error: 'Failed to update door status',
      details: error.message
    });
  }
});

// Delete door status
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const status = await DoorStatus.findById(req.params.id);
    
    if (!status) {
      return res.status(404).json({
        error: 'Door status not found'
      });
    }
    
    await status.delete();
    res.json({ message: 'Door status deleted successfully' });
  } catch (error) {
    console.error('Delete door status error:', error);
    res.status(500).json({
      error: 'Failed to delete door status',
      details: error.message
    });
  }
});

// ESP32 endpoint for door status updates
router.post('/esp32/:doorId', async (req, res) => {
  try {
    const { doorId } = req.params;
    const { status, locked } = req.body;
    
    // Validate required fields
    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }
    
    const validStatuses = ['open', 'closed', 'locked', 'unlocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    const statusRecord = await DoorStatus.updateOrCreate(doorId, {
      status,
      locked: locked || false
    });
    
    res.status(200).json({
      success: true,
      message: 'Door status updated',
      status: statusRecord.toJSON()
    });
  } catch (error) {
    console.error('ESP32 door status error:', error);
    res.status(500).json({
      error: 'Failed to update door status',
      details: error.message
    });
  }
});

// Lock door
router.post('/door/:doorId/lock', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const statusRecord = await DoorStatus.updateOrCreate(req.params.doorId, {
      status: 'locked',
      locked: true
    });
    
    res.json({
      success: true,
      message: 'Door locked',
      status: statusRecord.toJSON()
    });
  } catch (error) {
    console.error('Lock door error:', error);
    res.status(500).json({
      error: 'Failed to lock door',
      details: error.message
    });
  }
});

// Unlock door
router.post('/door/:doorId/unlock', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const statusRecord = await DoorStatus.updateOrCreate(req.params.doorId, {
      status: 'unlocked',
      locked: false
    });
    
    res.json({
      success: true,
      message: 'Door unlocked',
      status: statusRecord.toJSON()
    });
  } catch (error) {
    console.error('Unlock door error:', error);
    res.status(500).json({
      error: 'Failed to unlock door',
      details: error.message
    });
  }
});

module.exports = router;