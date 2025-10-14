const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Convert errors to the format expected by frontend
    const errorObj = {};
    errors.array().forEach(err => {
      errorObj[err.path] = err.msg;
    });
    
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Please fix the validation errors below',
      errors: errorObj
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'visitor'])
    .withMessage('Role must be user, admin, or visitor'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'visitor'])
    .withMessage('Role must be user, admin, or visitor'),
  // isActive removed - entities are always active
  body('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be a boolean value'),
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

// Authentication validation rules
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Username or email is required')
    .custom((value) => {
      // Check if it's a valid email or a valid username (alphanumeric + underscore)
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isUsername = /^[a-zA-Z0-9_]+$/.test(value);
      
      if (!isEmail && !isUsername) {
        throw new Error('Must be a valid email address or username');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  handleValidationErrors
];

// Parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  query('role')
    .optional()
    .isIn(['user', 'admin', 'visitor'])
    .withMessage('Role must be user, admin, or visitor'),
  // isActive removed - accounts are always active
  handleValidationErrors
];

// Door validation rules
const validateDoor = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Door name must be between 2 and 100 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('controllerIp')
    .isIP()
    .withMessage('Controller IP must be a valid IP address')
    .custom(async (value) => {
      const { Door } = require('../database/door');
      const existingDoor = await Door.findByIp(value);
      if (existingDoor) {
        throw new Error(`IP address ${value} is already in use by door "${existingDoor.name}"`);
      }
    }),
  body('controllerMac')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Controller MAC must be a valid MAC address')
    .custom(async (value) => {
      if (value) {
        const { Door } = require('../database/door');
        const existingDoor = await Door.findByMac(value);
        if (existingDoor) {
          throw new Error(`MAC address ${value} is already in use by door "${existingDoor.name}"`);
        }
      }
    }),
  handleValidationErrors
];

const validateDoorUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Door name must be between 2 and 100 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('controllerIp')
    .optional()
    .isIP()
    .withMessage('Controller IP must be a valid IP address')
    .custom(async (value, { req }) => {
      if (value) {
        const { Door } = require('../database/door');
        const existingDoor = await Door.findByIp(value);
        if (existingDoor && existingDoor.id !== parseInt(req.params.id)) {
          throw new Error(`IP address ${value} is already in use by door "${existingDoor.name}"`);
        }
      }
    }),
  body('controllerMac')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Controller MAC must be a valid MAC address')
    .custom(async (value, { req }) => {
      if (value) {
        const { Door } = require('../database/door');
        const existingDoor = await Door.findByMac(value);
        if (existingDoor && existingDoor.id !== parseInt(req.params.id)) {
          throw new Error(`MAC address ${value} is already in use by door "${existingDoor.name}"`);
        }
      }
    }),
  // isActive removed - entities are always active
  handleValidationErrors
];

// Access group validation rules
const validateAccessGroup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Access group name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must be less than 255 characters'),
  handleValidationErrors
];

const validateAccessGroupUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Access group name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must be less than 255 characters'),
  // isActive removed - entities are always active
  handleValidationErrors
];

// Visitor validation rules
const validateVisitor = [
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('visitorName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('visitorName must be between 1 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('Valid from must be a valid date'),
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid date')
    .custom((value, { req }) => {
      if (req.body.validFrom && new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('Valid until must be after valid from date');
      }
      return true;
    }),
  handleValidationErrors
];

const validateVisitorUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('visitorName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('visitorName must be between 1 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('Valid from must be a valid date'),
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid date')
    .custom((value, { req }) => {
      if (req.body.validFrom && new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('Valid until must be after valid from date');
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateUserUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateLogin,
  validateRegister,
  validateId,
  validatePagination,
  validateDoor,
  validateDoorUpdate,
  validateAccessGroup,
  validateAccessGroupUpdate,
  validateVisitor,
  validateVisitorUpdate
};

