#!/usr/bin/env node

// Railway-specific startup script
console.log('🚂 Railway startup script starting...');

// Set Railway-specific environment variables
process.env.NODE_ENV = 'production';
process.env.RAILWAY_ENVIRONMENT = 'true';

// Add Railway-specific optimizations
process.env.DB_PATH = '/tmp/users.db'; // Use tmp directory for Railway
process.env.LOG_LEVEL = 'info';

console.log('🚂 Railway environment configured');
console.log('🚂 Starting server...');

// Start the main server
require('./server.js');