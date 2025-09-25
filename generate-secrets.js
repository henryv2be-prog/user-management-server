#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 SimplifiAccess v3.0.0 - Secret Generator\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);
console.log(`(Length: ${jwtSecret.length} characters)\n`);

// Generate Session Secret
const sessionSecret = crypto.randomBytes(64).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);
console.log(`(Length: ${sessionSecret.length} characters)\n`);

// Generate Admin Password
const adminPassword = crypto.randomBytes(16).toString('hex');
console.log('ADMIN_PASSWORD=' + adminPassword);
console.log('(Change this after first login!)\n');

console.log('📋 Copy these values to your Railway environment variables.');
console.log('⚠️  Keep these secrets safe and never commit them to git!\n');

// Additional helpful output
console.log('Other required variables:');
console.log('NODE_ENV=production');
console.log('DB_PATH=/app/database/users.db');
console.log('ADMIN_EMAIL=admin@yourdomain.com');
console.log('FRONTEND_URL=https://app.yourdomain.com');
console.log('RENDER_EXTERNAL_URL=https://your-app.up.railway.app');