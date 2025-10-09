const express = require('express');
const Visitor = require('../database/visitor');
const { authenticate, authorizeSelfOrAdmin } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

// Cache prevention middleware
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}"`
  });
  next();
});

// Validation rules
const validateVisitorCreate = [
  param('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer'),
  body('visitorName').trim().isLength({ min: 1, max: 100 }).withMessage('visitorName required'),
  body('email').optional().isEmail().withMessage('email must be valid'),
  body('phone').optional().isString().isLength({ max: 50 }).withMessage('phone too long'),
  body('validFrom').optional().isISO8601().withMessage('validFrom must be ISO8601 date'),
  body('validTo').isISO8601().withMessage('validTo must be ISO8601 date'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('notes too long'),
  handleValidationErrors
];

const validateVisitorUpdate = [
  param('id').isInt({ min: 1 }).withMessage('id must be positive integer'),
  body('visitorName').optional().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail(),
  body('phone').optional().isString().isLength({ max: 50 }),
  body('validFrom').optional().isISO8601(),
  body('validTo').optional().isISO8601(),
  body('notes').optional().isString().isLength({ max: 500 }),
  handleValidationErrors
];

// List visitors for current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const visitors = await Visitor.findByUser(req.user.id, { includeExpired: false, page: 1, limit: 100 });
    res.json({ visitors: visitors.map(v => v.toJSON()) });
  } catch (error) {
    console.error('List my visitors error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list visitors' });
  }
});

// List visitors for a specific user (self or admin)
router.get('/user/:userId', authenticate, authorizeSelfOrAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const includeExpired = req.query.includeExpired === 'true';
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const visitors = await Visitor.findByUser(userId, { includeExpired, page, limit });
    res.json({ visitors: visitors.map(v => v.toJSON()) });
  } catch (error) {
    console.error('List visitors error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list visitors' });
  }
});

// Create visitor for a user (self or admin)
router.post('/user/:userId', authenticate, authorizeSelfOrAdmin, validateVisitorCreate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { visitorName, email, phone, validFrom, validTo, notes } = req.body;
    const visitor = await Visitor.create({ userId, visitorName, email, phone, validFrom, validTo, notes });

    await EventLogger.log(req, 'visitor', 'created', 'visitor', visitor.id, visitor.visitorName, `Visitor added for user ${userId} valid until ${visitor.validTo}`);

    res.status(201).json({ message: 'Visitor created', visitor: visitor.toJSON() });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create visitor' });
  }
});

// Update visitor (owner or admin)
router.put('/:id', authenticate, validateVisitorUpdate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ error: 'Not Found', message: 'Visitor not found' });
    }
    if (!(req.user.hasRole('admin') || req.user.id === visitor.userId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not allowed to update this visitor' });
    }
    const updated = await visitor.update(req.body);
    await EventLogger.log(req, 'visitor', 'updated', 'visitor', updated.id, updated.visitorName, 'Visitor updated');
    res.json({ message: 'Visitor updated', visitor: updated.toJSON() });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update visitor' });
  }
});

// Delete visitor (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ error: 'Not Found', message: 'Visitor not found' });
    }
    if (!(req.user.hasRole('admin') || req.user.id === visitor.userId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not allowed to delete this visitor' });
    }
    await visitor.delete();
    await EventLogger.log(req, 'visitor', 'deleted', 'visitor', id, visitor.visitorName, 'Visitor deleted');
    res.json({ message: 'Visitor deleted' });
  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete visitor' });
  }
});

module.exports = router;
