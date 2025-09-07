const express = require('express');
const Event = require('../database/event');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

// Get events with pagination and filtering (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, action, entityType, userId } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      action,
      entityType,
      userId: userId ? parseInt(userId) : undefined
    };

    const [events, totalCount] = await Promise.all([
      Event.findAll(options),
      Event.count(options)
    ]);

    const totalPages = Math.ceil(totalCount / options.limit);

    res.json({
      events,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalCount,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve events'
    });
  }
});

// Get recent events for dashboard (admin only)
router.get('/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await Event.getRecentEvents(limit);

    res.json({ events });
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve recent events'
    });
  }
});

// Get event by ID (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Event not found'
      });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve event'
    });
  }
});

// Get event statistics (admin only)
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalEvents, userEvents, doorEvents, accessGroupEvents, authEvents, errorEvents] = await Promise.all([
      Event.count({}),
      Event.count({ type: 'user' }),
      Event.count({ type: 'door' }),
      Event.count({ type: 'access_group' }),
      Event.count({ type: 'auth' }),
      Event.count({ type: 'error' })
    ]);

    // Get events from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentEvents = await Event.findAll({
      page: 1,
      limit: 1000 // Get all recent events for filtering
    });

    const last24Hours = recentEvents.filter(event => 
      new Date(event.createdAt) > yesterday
    ).length;

    res.json({
      stats: {
        totalEvents,
        userEvents,
        doorEvents,
        accessGroupEvents,
        authEvents,
        errorEvents,
        last24Hours
      }
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve event statistics'
    });
  }
});

module.exports = router;
