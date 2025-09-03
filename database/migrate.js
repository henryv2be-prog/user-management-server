const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database for migration at:', DB_PATH);
});

// Run migrations
const runMigrations = () => {
    return new Promise((resolve, reject) => {
        let completedMigrations = 0;
        const totalMigrations = 3;
        
        const checkCompletion = () => {
            completedMigrations++;
            if (completedMigrations === totalMigrations) {
                resolve();
            }
        };
        
        // Migration 1: Add is_active column to access_groups table if it doesn't exist
        db.run(`ALTER TABLE access_groups ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding is_active column to access_groups:', err.message);
                reject(err);
                return;
            }
            if (err && err.message.includes('duplicate column name')) {
                console.log('is_active column already exists in access_groups table');
            } else {
                console.log('Added is_active column to access_groups table');
            }
            checkCompletion();
        });
        
        // Migration 2: Add is_active column to doors table if it doesn't exist
        db.run(`ALTER TABLE doors ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding is_active column to doors:', err.message);
                reject(err);
                return;
            }
            if (err && err.message.includes('duplicate column name')) {
                console.log('is_active column already exists in doors table');
            } else {
                console.log('Added is_active column to doors table');
            }
            checkCompletion();
        });
        
        // Migration 3: Add is_active column to users table if it doesn't exist
        db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding is_active column to users:', err.message);
                reject(err);
                return;
            }
            if (err && err.message.includes('duplicate column name')) {
                console.log('is_active column already exists in users table');
            } else {
                console.log('Added is_active column to users table');
            }
            checkCompletion();
        });
    });
};

// Run migrations
runMigrations()
    .then(() => {
        console.log('Database migration completed successfully');
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
                process.exit(1);
            }
            console.log('Database connection closed');
            process.exit(0);
        });
    })
    .catch((err) => {
        console.error('Database migration failed:', err.message);
        db.close();
        process.exit(1);
    });
