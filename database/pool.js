const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabasePool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.connections = [];
    this.waitingQueue = [];
    this.dbPath = process.env.DB_PATH || path.join(__dirname, 'users.db');
    
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  async getConnection() {
    // Try to find an available connection
    const available = this.connections.find(conn => !conn.inUse);
    
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.db;
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Enable foreign keys
          db.run('PRAGMA foreign_keys = ON');
          
          const connection = { 
            db, 
            inUse: true, 
            lastUsed: Date.now(),
            id: this.connections.length 
          };
          this.connections.push(connection);
          resolve(db);
        });
      });
    }

    // Wait for available connection
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  releaseConnection(db) {
    const connection = this.connections.find(conn => conn.db === db);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
      
      // Check waiting queue
      if (this.waitingQueue.length > 0) {
        const resolve = this.waitingQueue.shift();
        connection.inUse = true;
        connection.lastUsed = Date.now();
        resolve(connection.db);
      }
    }
  }

  async closeAll() {
    // Clear waiting queue
    this.waitingQueue = [];
    
    // Close all connections
    await Promise.all(
      this.connections.map(conn => 
        new Promise((resolve) => {
          conn.db.close((err) => {
            if (err) {
              console.error(`Error closing connection ${conn.id}:`, err);
            }
            resolve();
          });
        })
      )
    );
    this.connections = [];
  }

  // Clean up idle connections
  startCleanup(idleTimeout = 60000) {
    setInterval(() => {
      const now = Date.now();
      this.connections = this.connections.filter(conn => {
        if (!conn.inUse && (now - conn.lastUsed) > idleTimeout) {
          conn.db.close((err) => {
            if (err) {
              console.error(`Error closing idle connection ${conn.id}:`, err);
            }
          });
          return false;
        }
        return true;
      });
    }, 30000); // Check every 30 seconds
  }

  // Helper methods for queries with automatic connection management
  async run(sql, params = []) {
    const db = await this.getConnection();
    try {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    } finally {
      this.releaseConnection(db);
    }
  }

  async get(sql, params = []) {
    const db = await this.getConnection();
    try {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      });
    } finally {
      this.releaseConnection(db);
    }
  }

  async all(sql, params = []) {
    const db = await this.getConnection();
    try {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        });
      });
    } finally {
      this.releaseConnection(db);
    }
  }
}

// Create singleton instance
const pool = new DatabasePool();
pool.startCleanup();

module.exports = pool;