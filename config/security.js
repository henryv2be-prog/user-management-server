const crypto = require('crypto');

// Validate JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
  console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// Validate other critical settings
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
if (BCRYPT_ROUNDS < 10) {
  console.warn('WARNING: BCRYPT_ROUNDS should be at least 10 for security');
}

// Validate NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
if (!['development', 'production', 'test'].includes(NODE_ENV)) {
  console.error('FATAL: NODE_ENV must be one of: development, production, test');
  process.exit(1);
}

module.exports = {
  JWT_SECRET,
  BCRYPT_ROUNDS,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development'
};