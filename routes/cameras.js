const express = require('express');
const { Camera } = require('../database/camera');
const { 
  validateCamera, 
  validateCameraUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get all cameras (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, doorId, areaId, recordingEnabled, motionDetection } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      doorId,
      areaId,
      recordingEnabled: recordingEnabled !== undefined ? recordingEnabled === 'true' : undefined,
      motionDetection: motionDetection !== undefined ? motionDetection === 'true' : undefined
    };
    
    const [cameras, totalCount] = await Promise.all([
      Camera.findAll(options),
      Camera.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      cameras: cameras.map(camera => camera.toJSON()),
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
    console.error('Get cameras error:', error);
    res.status(500).json({
      error: 'Failed to fetch cameras',
      details: error.message
    });
  }
});

// Get camera by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    res.json(camera.toJSON());
  } catch (error) {
    console.error('Get camera error:', error);
    res.status(500).json({
      error: 'Failed to fetch camera',
      details: error.message
    });
  }
});

// Create new camera
router.post('/', authenticate, requireAdmin, validateCamera, async (req, res) => {
  try {
    const cameraData = req.body;
    const camera = await Camera.create(cameraData);
    
    res.status(201).json(camera.toJSON());
  } catch (error) {
    console.error('Create camera error:', error);
    res.status(500).json({
      error: 'Failed to create camera',
      details: error.message
    });
  }
});

// Update camera
router.put('/:id', authenticate, requireAdmin, validateId, validateCameraUpdate, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const updatedCamera = await camera.update(req.body);
    res.json(updatedCamera.toJSON());
  } catch (error) {
    console.error('Update camera error:', error);
    res.status(500).json({
      error: 'Failed to update camera',
      details: error.message
    });
  }
});

// Delete camera
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    await camera.delete();
    res.json({ message: 'Camera deleted successfully' });
  } catch (error) {
    console.error('Delete camera error:', error);
    res.status(500).json({
      error: 'Failed to delete camera',
      details: error.message
    });
  }
});

// Test camera connection
router.post('/:id/test', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const testResult = await camera.testConnection();
    res.json(testResult);
  } catch (error) {
    console.error('Test camera connection error:', error);
    res.status(500).json({
      error: 'Failed to test camera connection',
      details: error.message
    });
  }
});

// Get camera stream URL
router.get('/:id/stream', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const streamUrl = camera.getStreamUrl();
    
    if (!streamUrl) {
      return res.status(400).json({
        error: 'Camera stream URL not configured'
      });
    }
    
    res.json({ streamUrl });
  } catch (error) {
    console.error('Get camera stream URL error:', error);
    res.status(500).json({
      error: 'Failed to get camera stream URL',
      details: error.message
    });
  }
});

// Get camera snapshot URL
router.get('/:id/snapshot', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const snapshotUrl = camera.getSnapshotUrl();
    
    if (!snapshotUrl) {
      return res.status(400).json({
        error: 'Camera snapshot URL not configured'
      });
    }
    
    res.json({ snapshotUrl });
  } catch (error) {
    console.error('Get camera snapshot URL error:', error);
    res.status(500).json({
      error: 'Failed to get camera snapshot URL',
      details: error.message
    });
  }
});

// Enable/disable recording
router.post('/:id/recording/:enabled', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const enabled = req.params.enabled === 'true';
    const updatedCamera = await camera.update({ recordingEnabled: enabled });
    
    res.json({
      success: true,
      message: `Recording ${enabled ? 'enabled' : 'disabled'}`,
      camera: updatedCamera.toJSON()
    });
  } catch (error) {
    console.error('Toggle recording error:', error);
    res.status(500).json({
      error: 'Failed to toggle recording',
      details: error.message
    });
  }
});

// Enable/disable motion detection
router.post('/:id/motion/:enabled', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found'
      });
    }
    
    const enabled = req.params.enabled === 'true';
    const updatedCamera = await camera.update({ motionDetection: enabled });
    
    res.json({
      success: true,
      message: `Motion detection ${enabled ? 'enabled' : 'disabled'}`,
      camera: updatedCamera.toJSON()
    });
  } catch (error) {
    console.error('Toggle motion detection error:', error);
    res.status(500).json({
      error: 'Failed to toggle motion detection',
      details: error.message
    });
  }
});

module.exports = router;