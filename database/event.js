const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Event {
  constructor(data = {}) {
    this.id = data.id;
    this.type = data.type;
    this.action = data.action;
    this.entityType = data.entity_type;
    this.entityId = data.entity_id;
    this.entityName = data.entity_name;
    this.userId = data.user_id;
    this.userName = data.user_name;
    this.details = data.details;
    this.ipAddress = data.ip_address;
    this.userAgent = data.user_agent;
    this.createdAt = data.created_at;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      entityName: this.entityName,
      userId: this.userId,
      userName: this.userName,
      details: this.details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt
    };
  }

  // Static methods for database operations
  static async create(eventData) {
    const {
      type,
      action,
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      details,
      ipAddress,
      userAgent
    } = eventData;

    const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO events (
          type, action, entity_type, entity_id, entity_name,
          user_id, user_name, details, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      db.run(sql, [
        type, action, entityType, entityId, entityName,
        userId, userName, details, ipAddress, userAgent
      ], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(new Event({
            id: this.lastID,
            type,
            action,
            entityType,
            entityId,
            entityName,
            userId,
            userName,
            details,
            ipAddress,
            userAgent,
            created_at: new Date().toISOString()
          }));
        }
      });
    });
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 50, type, action, entityType, userId } = options;
    const offset = (page - 1) * limit;
    
    const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
    
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    
    if (entityType) {
      sql += ' AND entity_type = ?';
      params.push(entityType);
    }
    
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => new Event(row)));
        }
      });
    });
  }

  static async count(options = {}) {
    const { type, action, entityType, userId } = options;
    
    const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
    
    let sql = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    
    if (entityType) {
      sql += ' AND entity_type = ?';
      params.push(entityType);
    }
    
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  static async findById(id) {
    const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
    
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new Event(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  static async getRecentEvents(limit = 10) {
    const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM events ORDER BY created_at DESC LIMIT ?',
        [limit],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => new Event(row)));
          }
        }
      );
    });
  }
}

module.exports = Event;
