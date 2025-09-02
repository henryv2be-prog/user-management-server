#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'database', 'users.db');

console.log('🗑️  Removing old database...');
try {
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('✅ Old database removed');
    } else {
        console.log('ℹ️  No existing database found');
    }
} catch (error) {
    console.error('❌ Error removing old database:', error.message);
    process.exit(1);
}

console.log('🔄 Recreating database with current schema...');
try {
    require('./database/init.js');
    console.log('✅ Database recreated successfully!');
    console.log('🚀 You can now start the server with: npm start');
} catch (error) {
    console.error('❌ Error recreating database:', error.message);
    process.exit(1);
}
