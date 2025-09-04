const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
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
    .isIn(['user', 'moderator', 'admin'])
    .withMessage('Role must be user, moderator, or admin'),
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
    .isIn(['user', 'moderator', 'admin'])
    .withMessage('Role must be user, moderator, or admin'),
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
    .isIn(['user', 'moderator', 'admin'])
    .withMessage('Role must be user, moderator, or admin'),
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
  body('esp32Ip')
    .isIP()
    .withMessage('ESP32 IP must be a valid IP address'),
  body('esp32Mac')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('ESP32 MAC must be a valid MAC address'),
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
  body('esp32Ip')
    .optional()
    .isIP()
    .withMessage('ESP32 IP must be a valid IP address'),
  body('esp32Mac')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('ESP32 MAC must be a valid MAC address'),
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

// Site validation rules
const validateSite = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Site name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must be less than 255 characters'),
  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Timezone must be between 3 and 50 characters'),
  handleValidationErrors
];

const validateSiteUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Site name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must be less than 255 characters'),
  body('timezone')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Timezone must be between 3 and 50 characters'),
  handleValidationErrors
];

// Area validation rules
const validateArea = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('siteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Site ID must be a positive integer'),
  body('parentAreaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent area ID must be a positive integer'),
  handleValidationErrors
];

const validateAreaUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('siteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Site ID must be a positive integer'),
  body('parentAreaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent area ID must be a positive integer'),
  handleValidationErrors
];

// Power monitoring validation rules
const validatePowerMonitoring = [
  body('doorId')
    .isInt({ min: 1 })
    .withMessage('Door ID must be a positive integer'),
  body('voltage')
    .isFloat({ min: 0, max: 50 })
    .withMessage('Voltage must be between 0 and 50 volts'),
  body('current')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Current must be between 0 and 10 amps'),
  body('power')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Power must be between 0 and 500 watts'),
  body('batteryLevel')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100 percent'),
  body('temperature')
    .optional()
    .isFloat({ min: -40, max: 85 })
    .withMessage('Temperature must be between -40 and 85 degrees Celsius'),
  handleValidationErrors
];

// Door status validation rules
const validateDoorStatus = [
  body('doorId')
    .isInt({ min: 1 })
    .withMessage('Door ID must be a positive integer'),
  body('status')
    .isIn(['open', 'closed', 'locked', 'unlocked'])
    .withMessage('Status must be one of: open, closed, locked, unlocked'),
  body('locked')
    .optional()
    .isBoolean()
    .withMessage('Locked must be a boolean value'),
  handleValidationErrors
];

// Camera validation rules
const validateCamera = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Camera name must be between 2 and 100 characters'),
  body('doorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Door ID must be a positive integer'),
  body('areaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Area ID must be a positive integer'),
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('IP address must be a valid IP address'),
  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be between 1 and 65535'),
  body('username')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Username must be less than 50 characters'),
  body('password')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Password must be less than 100 characters'),
  body('streamUrl')
    .optional()
    .isURL()
    .withMessage('Stream URL must be a valid URL'),
  body('recordingEnabled')
    .optional()
    .isBoolean()
    .withMessage('Recording enabled must be a boolean value'),
  body('motionDetection')
    .optional()
    .isBoolean()
    .withMessage('Motion detection must be a boolean value'),
  handleValidationErrors
];

const validateCameraUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Camera name must be between 2 and 100 characters'),
  body('doorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Door ID must be a positive integer'),
  body('areaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Area ID must be a positive integer'),
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('IP address must be a valid IP address'),
  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be between 1 and 65535'),
  body('username')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Username must be less than 50 characters'),
  body('password')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Password must be less than 100 characters'),
  body('streamUrl')
    .optional()
    .isURL()
    .withMessage('Stream URL must be a valid URL'),
  body('recordingEnabled')
    .optional()
    .isBoolean()
    .withMessage('Recording enabled must be a boolean value'),
  body('motionDetection')
    .optional()
    .isBoolean()
    .withMessage('Motion detection must be a boolean value'),
  handleValidationErrors
];

// License validation rules
const validateLicense = [
  body('licenseType')
    .isIn(['trial', 'basic', 'professional', 'enterprise'])
    .withMessage('License type must be one of: trial, basic, professional, enterprise'),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  body('maxUsers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max users must be a positive integer'),
  body('maxDoors')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max doors must be a positive integer'),
  body('maxSites')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max sites must be a positive integer'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid ISO 8601 date'),
  handleValidationErrors
];

const validateLicenseUpdate = [
  body('licenseType')
    .optional()
    .isIn(['trial', 'basic', 'professional', 'enterprise'])
    .withMessage('License type must be one of: trial, basic, professional, enterprise'),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  body('maxUsers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max users must be a positive integer'),
  body('maxDoors')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max doors must be a positive integer'),
  body('maxSites')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max sites must be a positive integer'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid ISO 8601 date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean value'),
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
  validateSite,
  validateSiteUpdate,
  validateArea,
  validateAreaUpdate,
  validatePowerMonitoring,
  validateDoorStatus,
  validateCamera,
  validateCameraUpdate,
  validateLicense,
  validateLicenseUpdate
};

