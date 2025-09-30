const { body, validationResult } = require('express-validator');

const validateHeartbeat = [
  body('deviceID').optional().isString().trim().isLength({ min: 1, max: 100 }).escape(),
  body('deviceName').optional().isString().trim().isLength({ max: 100 }).escape(),
  body('ip').isIP().withMessage('IP address is required and must be valid'),
  body('mac').optional().matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('MAC address must be in format AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF'),
  body('status').optional().isIn(['online', 'offline']),
  body('doorOpen').optional().isBoolean(),
  body('signal').optional().isInt({ min: -100, max: 0 }),
  body('freeHeap').optional().isInt({ min: 0 }),
  body('uptime').optional().isInt({ min: 0 }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid heartbeat data',
        details: errors.array() 
      });
    }
    next();
  }
];

const validateDoorCommand = [
  body('command').isIn(['unlock', 'lock', 'status']),
  body('duration').optional().isInt({ min: 1, max: 30 }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid door command',
        details: errors.array() 
      });
    }
    next();
  }
];

module.exports = { 
  validateHeartbeat,
  validateDoorCommand
};