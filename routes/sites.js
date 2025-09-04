const express = require('express');
const { Site } = require('../database/site');
const { 
  validateSite, 
  validateSiteUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get all sites (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    };
    
    const [sites, totalCount] = await Promise.all([
      Site.findAll(options),
      Site.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      sites: sites.map(site => site.toJSON()),
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
    console.error('Get sites error:', error);
    res.status(500).json({
      error: 'Failed to fetch sites',
      details: error.message
    });
  }
});

// Get site by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }
    
    res.json(site.toJSON());
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      error: 'Failed to fetch site',
      details: error.message
    });
  }
});

// Create new site
router.post('/', authenticate, requireAdmin, validateSite, async (req, res) => {
  try {
    const siteData = req.body;
    const site = await Site.create(siteData);
    
    res.status(201).json(site.toJSON());
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({
      error: 'Failed to create site',
      details: error.message
    });
  }
});

// Update site
router.put('/:id', authenticate, requireAdmin, validateId, validateSiteUpdate, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }
    
    const updatedSite = await site.update(req.body);
    res.json(updatedSite.toJSON());
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({
      error: 'Failed to update site',
      details: error.message
    });
  }
});

// Delete site
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }
    
    await site.delete();
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      error: 'Failed to delete site',
      details: error.message
    });
  }
});

// Get areas for a site
router.get('/:id/areas', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }
    
    const areas = await site.getAreas();
    res.json(areas.map(area => area.toJSON()));
  } catch (error) {
    console.error('Get site areas error:', error);
    res.status(500).json({
      error: 'Failed to fetch site areas',
      details: error.message
    });
  }
});

// Get doors for a site
router.get('/:id/doors', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    
    if (!site) {
      return res.status(404).json({
        error: 'Site not found'
      });
    }
    
    const doors = await site.getDoors();
    res.json(doors.map(door => door.toJSON()));
  } catch (error) {
    console.error('Get site doors error:', error);
    res.status(500).json({
      error: 'Failed to fetch site doors',
      details: error.message
    });
  }
});

module.exports = router;