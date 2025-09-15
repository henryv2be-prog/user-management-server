const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path - use environment variable for Render compatibility
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create a singleton database connection
let dbInstance = null;

const getDatabase = () => {
    if (!dbInstance) {
        dbInstance = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                throw err;
            }
            console.log('Connected to SQLite database at:', DB_PATH);
        });
    }
    return dbInstance;
};

const closeDatabase = () => {
    if (dbInstance) {
        dbInstance.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
        dbInstance = null;
    }
};

// Helper function to run queries with automatic connection management
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const getQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
};

const allQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
};

module.exports = {
    getDatabase,
    closeDatabase,
    runQuery,
    getQuery,
    allQuery,
    DB_PATH
};