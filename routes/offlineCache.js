const express = require('express');
const { OfflineCache } = require('../database/offlineCache');
const { 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get offline cache data (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, expired = false } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      expired: expired === 'true'
    };
    
    const [records, totalCount] = await Promise.all([
      OfflineCache.findAll(options),
      OfflineCache.count(options)
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
    console.error('Get offline cache error:', error);
    res.status(500).json({
      error: 'Failed to fetch offline cache data',
      details: error.message
    });
  }
});

// Get cache by key
router.get('/key/:cacheKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const record = await OfflineCache.get(req.params.cacheKey);
    
    if (!record) {
      return res.status(404).json({
        error: 'Cache record not found'
      });
    }
    
    res.json(record.toJSON());
  } catch (error) {
    console.error('Get cache by key error:', error);
    res.status(500).json({
      error: 'Failed to fetch cache record',
      details: error.message
    });
  }
});

// Set cache data
router.post('/set', authenticate, requireAdmin, async (req, res) => {
  try {
    const { cacheKey, cacheData, ttlSeconds } = req.body;
    
    if (!cacheKey || cacheData === undefined) {
      return res.status(400).json({
        error: 'Cache key and data are required'
      });
    }
    
    const recordId = await OfflineCache.set(cacheKey, cacheData, ttlSeconds);
    
    res.status(201).json({
      success: true,
      message: 'Cache data set successfully',
      recordId
    });
  } catch (error) {
    console.error('Set cache error:', error);
    res.status(500).json({
      error: 'Failed to set cache data',
      details: error.message
    });
  }
});

// Get cache data
router.get('/get/:cacheKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const record = await OfflineCache.get(req.params.cacheKey);
    
    if (!record) {
      return res.status(404).json({
        error: 'Cache record not found'
      });
    }
    
    res.json(record.toJSON());
  } catch (error) {
    console.error('Get cache error:', error);
    res.status(500).json({
      error: 'Failed to get cache data',
      details: error.message
    });
  }
});

// Delete cache by key
router.delete('/key/:cacheKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await OfflineCache.deleteByKey(req.params.cacheKey);
    
    res.json({
      success: true,
      message: 'Cache record deleted successfully',
      deletedCount
    });
  } catch (error) {
    console.error('Delete cache by key error:', error);
    res.status(500).json({
      error: 'Failed to delete cache record',
      details: error.message
    });
  }
});

// Clear expired cache
router.delete('/cleanup/expired', authenticate, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await OfflineCache.clearExpired();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired cache records`,
      deletedCount
    });
  } catch (error) {
    console.error('Clear expired cache error:', error);
    res.status(500).json({
      error: 'Failed to clear expired cache',
      details: error.message
    });
  }
});

// Clear all cache
router.delete('/cleanup/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await OfflineCache.clearAll();
    
    res.json({
      success: true,
      message: `Cleared all ${deletedCount} cache records`,
      deletedCount
    });
  } catch (error) {
    console.error('Clear all cache error:', error);
    res.status(500).json({
      error: 'Failed to clear all cache',
      details: error.message
    });
  }
});

// Get cache statistics
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await OfflineCache.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      details: error.message
    });
  }
});

// Update cache record
router.put('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const record = await OfflineCache.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        error: 'Cache record not found'
      });
    }
    
    const updatedRecord = await record.update(req.body);
    res.json(updatedRecord.toJSON());
  } catch (error) {
    console.error('Update cache record error:', error);
    res.status(500).json({
      error: 'Failed to update cache record',
      details: error.message
    });
  }
});

// Delete cache record by ID
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const record = await OfflineCache.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        error: 'Cache record not found'
      });
    }
    
    await record.delete();
    res.json({ message: 'Cache record deleted successfully' });
  } catch (error) {
    console.error('Delete cache record error:', error);
    res.status(500).json({
      error: 'Failed to delete cache record',
      details: error.message
    });
  }
});

module.exports = router;