const express = require('express');
const { Area } = require('../database/area');
const { 
  validateArea, 
  validateAreaUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get all areas (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, siteId } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      siteId
    };
    
    const [areas, totalCount] = await Promise.all([
      Area.findAll(options),
      Area.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      areas: areas.map(area => area.toJSON()),
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
    console.error('Get areas error:', error);
    res.status(500).json({
      error: 'Failed to fetch areas',
      details: error.message
    });
  }
});

// Get area by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    res.json(area.toJSON());
  } catch (error) {
    console.error('Get area error:', error);
    res.status(500).json({
      error: 'Failed to fetch area',
      details: error.message
    });
  }
});

// Create new area
router.post('/', authenticate, requireAdmin, validateArea, async (req, res) => {
  try {
    const areaData = req.body;
    const area = await Area.create(areaData);
    
    res.status(201).json(area.toJSON());
  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({
      error: 'Failed to create area',
      details: error.message
    });
  }
});

// Update area
router.put('/:id', authenticate, requireAdmin, validateId, validateAreaUpdate, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    const updatedArea = await area.update(req.body);
    res.json(updatedArea.toJSON());
  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({
      error: 'Failed to update area',
      details: error.message
    });
  }
});

// Delete area
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    await area.delete();
    res.json({ message: 'Area deleted successfully' });
  } catch (error) {
    console.error('Delete area error:', error);
    res.status(500).json({
      error: 'Failed to delete area',
      details: error.message
    });
  }
});

// Get child areas
router.get('/:id/children', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    const childAreas = await area.getChildAreas();
    res.json(childAreas.map(area => area.toJSON()));
  } catch (error) {
    console.error('Get child areas error:', error);
    res.status(500).json({
      error: 'Failed to fetch child areas',
      details: error.message
    });
  }
});

// Get doors in area
router.get('/:id/doors', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    const doors = await area.getDoors();
    res.json(doors.map(door => door.toJSON()));
  } catch (error) {
    console.error('Get area doors error:', error);
    res.status(500).json({
      error: 'Failed to fetch area doors',
      details: error.message
    });
  }
});

// Get cameras in area
router.get('/:id/cameras', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({
        error: 'Area not found'
      });
    }
    
    const cameras = await area.getCameras();
    res.json(cameras.map(camera => camera.toJSON()));
  } catch (error) {
    console.error('Get area cameras error:', error);
    res.status(500).json({
      error: 'Failed to fetch area cameras',
      details: error.message
    });
  }
});

module.exports = router;