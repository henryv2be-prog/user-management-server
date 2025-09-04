const express = require('express');
const { PowerMonitoring } = require('../database/powerMonitoring');
const { 
  validatePowerMonitoring, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get power monitoring data (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, doorId } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      doorId
    };
    
    const [records, totalCount] = await Promise.all([
      PowerMonitoring.findAll(options),
      PowerMonitoring.count(options)
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
    console.error('Get power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to fetch power monitoring data',
      details: error.message
    });
  }
});

// Get power monitoring data for specific door
router.get('/door/:doorId', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate
    };
    
    const [records, totalCount] = await Promise.all([
      PowerMonitoring.findByDoorId(req.params.doorId, options),
      PowerMonitoring.count({ ...options, doorId: req.params.doorId })
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
    console.error('Get door power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to fetch door power monitoring data',
      details: error.message
    });
  }
});

// Get latest power monitoring data for door
router.get('/door/:doorId/latest', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const record = await PowerMonitoring.getLatestByDoorId(req.params.doorId);
    
    if (!record) {
      return res.status(404).json({
        error: 'No power monitoring data found for this door'
      });
    }
    
    res.json(record.toJSON());
  } catch (error) {
    console.error('Get latest power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to fetch latest power monitoring data',
      details: error.message
    });
  }
});

// Create power monitoring record
router.post('/', authenticate, requireAdmin, validatePowerMonitoring, async (req, res) => {
  try {
    const powerData = req.body;
    const record = await PowerMonitoring.create(powerData);
    
    res.status(201).json(record.toJSON());
  } catch (error) {
    console.error('Create power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to create power monitoring record',
      details: error.message
    });
  }
});

// Get power statistics for door
router.get('/door/:doorId/statistics', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const options = { startDate, endDate };
    const statistics = await PowerMonitoring.getStatistics(req.params.doorId, options);
    
    res.json(statistics);
  } catch (error) {
    console.error('Get power statistics error:', error);
    res.status(500).json({
      error: 'Failed to fetch power statistics',
      details: error.message
    });
  }
});

// Clean up old power monitoring records
router.delete('/cleanup', authenticate, requireAdmin, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const deletedCount = await PowerMonitoring.cleanup(daysToKeep);
    
    res.json({
      message: `Cleaned up ${deletedCount} old power monitoring records`,
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to cleanup power monitoring records',
      details: error.message
    });
  }
});

// ESP32 endpoint for power data submission
router.post('/esp32/:doorId', async (req, res) => {
  try {
    const { doorId } = req.params;
    const { voltage, current, power, battery_level, temperature } = req.body;
    
    // Validate required fields
    if (voltage === undefined || current === undefined) {
      return res.status(400).json({
        error: 'Voltage and current are required'
      });
    }
    
    const powerData = {
      doorId: parseInt(doorId),
      voltage: parseFloat(voltage),
      current: parseFloat(current),
      power: power ? parseFloat(power) : null,
      batteryLevel: battery_level ? parseInt(battery_level) : null,
      temperature: temperature ? parseFloat(temperature) : null
    };
    
    const record = await PowerMonitoring.create(powerData);
    
    res.status(201).json({
      success: true,
      message: 'Power monitoring data recorded',
      recordId: record.id
    });
  } catch (error) {
    console.error('ESP32 power monitoring error:', error);
    res.status(500).json({
      error: 'Failed to record power monitoring data',
      details: error.message
    });
  }
});

module.exports = router;