#!/usr/bin/env node

// Simple startup script for Railway deployment
console.log('🚀 Starting SimplifiAccess Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3000);
console.log('Node Version:', process.version);

// Check if we're on Railway
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('✅ Running on Railway');
  console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  // Start the server
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}