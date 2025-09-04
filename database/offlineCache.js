const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class OfflineCache {
  constructor(data) {
    this.id = data.id;
    this.cacheKey = data.cache_key;
    this.cacheData = data.cache_data ? JSON.parse(data.cache_data) : null;
    this.expiresAt = data.expires_at;
    this.createdAt = data.created_at;
  }

  toJSON() {
    return {
      id: this.id,
      cacheKey: this.cacheKey,
      cacheData: this.cacheData,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt
    };
  }

  // Static methods for database operations
  static async create(cacheData) {
    return new Promise((resolve, reject) => {
      const { cacheKey, cacheData, expiresAt } = cacheData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO offline_cache (cache_key, cache_data, expires_at) VALUES (?, ?, ?)',
        [cacheKey, JSON.stringify(cacheData), expiresAt],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created cache record
          OfflineCache.findById(this.lastID)
            .then(record => resolve(record))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM offline_cache WHERE id = ?',
        [id],
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new OfflineCache(row));
        }
      );
    });
  }

  static async findByKey(cacheKey) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM offline_cache WHERE cache_key = ?',
        [cacheKey],
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new OfflineCache(row));
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 50,
        expired = false
      } = options;
      
      let query = 'SELECT * FROM offline_cache WHERE 1=1';
      const params = [];
      
      if (expired) {
        query += ' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP';
      } else {
        query += ' AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)';
      }
      
      query += ' ORDER BY created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const records = rows.map(row => new OfflineCache(row));
        resolve(records);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { expired = false } = options;
      
      let query = 'SELECT COUNT(*) as count FROM offline_cache WHERE 1=1';
      
      if (expired) {
        query += ' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP';
      } else {
        query += ' AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)';
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.get(query, (err, row) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        resolve(row.count);
      });
    });
  }

  async update(updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['cache_data', 'expires_at'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key === 'cacheData' ? 'cache_data' :
                       key === 'expiresAt' ? 'expires_at' : key;
        
        if (allowedFields.includes(dbField) && value !== undefined) {
          if (dbField === 'cache_data') {
            updates.push(`${dbField} = ?`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${dbField} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        resolve(this);
        return;
      }
      
      params.push(this.id);
      
      const query = `UPDATE offline_cache SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated cache record
        OfflineCache.findById(this.id)
          .then(updatedRecord => resolve(updatedRecord))
          .catch(reject);
      });
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM offline_cache WHERE id = ?',
        [this.id],
        (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(true);
        }
      );
    });
  }

  // Set cache data
  static async set(cacheKey, cacheData, ttlSeconds = null) {
    return new Promise((resolve, reject) => {
      const expiresAt = ttlSeconds ? 
        new Date(Date.now() + ttlSeconds * 1000).toISOString() : 
        null;
      
      // First, try to update existing record
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'UPDATE offline_cache SET cache_data = ?, expires_at = ? WHERE cache_key = ?',
        [JSON.stringify(cacheData), expiresAt, cacheKey],
        function(err) {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // If no rows were updated, create a new record
          if (this.changes === 0) {
            db.run(
              'INSERT INTO offline_cache (cache_key, cache_data, expires_at) VALUES (?, ?, ?)',
              [cacheKey, JSON.stringify(cacheData), expiresAt],
              function(err) {
                db.close();
                if (err) {
                  reject(err);
                  return;
                }
                
                resolve(this.lastID);
              }
            );
          } else {
            db.close();
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Get cache data
  static async get(cacheKey) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM offline_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)',
        [cacheKey],
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new OfflineCache(row));
        }
      );
    });
  }

  // Delete cache by key
  static async deleteByKey(cacheKey) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM offline_cache WHERE cache_key = ?',
        [cacheKey],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes);
        }
      );
    });
  }

  // Clear expired cache
  static async clearExpired() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM offline_cache WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP',
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes);
        }
      );
    });
  }

  // Clear all cache
  static async clearAll() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM offline_cache',
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes);
        }
      );
    });
  }

  // Check if cache is valid (not expired)
  isValid() {
    if (!this.expiresAt) {
      return true; // Never expires
    }
    
    return new Date(this.expiresAt) > new Date();
  }

  // Get cache statistics
  static async getStats() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const queries = [
        'SELECT COUNT(*) as total FROM offline_cache',
        'SELECT COUNT(*) as expired FROM offline_cache WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP',
        'SELECT COUNT(*) as valid FROM offline_cache WHERE expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP'
      ];
      
      const results = {};
      let completed = 0;
      
      queries.forEach((query, index) => {
        db.get(query, (err, row) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          const key = index === 0 ? 'total' : index === 1 ? 'expired' : 'valid';
          results[key] = row[key];
          completed++;
          
          if (completed === queries.length) {
            db.close();
            resolve(results);
          }
        });
      });
    });
  }
}

module.exports = { OfflineCache };