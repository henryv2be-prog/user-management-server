const pool = require('./pool');
const path = require('path');

// Re-export pool methods for backward compatibility
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

// Legacy getDatabase function - returns a connection from the pool
const getDatabase = async () => {
    return await pool.getConnection();
};

const closeDatabase = async () => {
    await pool.closeAll();
};

// Helper function to run queries with automatic connection management
const runQuery = async (sql, params = []) => {
    return await pool.run(sql, params);
};

const getQuery = async (sql, params = []) => {
    return await pool.get(sql, params);
};

const allQuery = async (sql, params = []) => {
    return await pool.all(sql, params);
};

module.exports = {
    getDatabase,
    closeDatabase,
    runQuery,
    getQuery,
    allQuery,
    DB_PATH
};