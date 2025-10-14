const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'users.db');

async function runMigration() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);

        db.serialize(() => {
            console.log('Running migration: 003_add_visitor_password.js');

            // Add password column to visitors table
            db.run(`ALTER TABLE visitors ADD COLUMN password TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding password column:', err.message);
                    reject(err);
                    return;
                }
                console.log('Column password added or already exists.');
            });

            db.close((err) => {
                if (err) {
                    console.error('Error closing database after migration:', err.message);
                    reject(err);
                    return;
                }
                console.log('Migration 003_add_visitor_password.js completed.');
                resolve();
            });
        });
    });
}

module.exports = { runMigration };
