#!/usr/bin/env node

const { initDatabase } = require('./database/init');

console.log('🔄 Forcing database initialization...');

initDatabase()
    .then(() => {
        console.log('✅ Database initialization completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    });