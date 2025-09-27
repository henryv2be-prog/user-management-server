const { runQuery, getQuery, allQuery } = require('./connection');

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

    try {
      const sql = `
        INSERT INTO events (
          type, action, entity_type, entity_id, entity_name,
          user_id, user_name, details, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const result = await runQuery(sql, [
        type, action, entityType, entityId, entityName,
        userId, userName, details, ipAddress, userAgent
      ]);
      
      return new Event({
        id: result.lastID,
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
      });
    } catch (error) {
      throw error;
    }
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 50, type, action, entityType, userId } = options;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    
    // Exclude heartbeat events from the events list
    sql += ' AND NOT (type = ? AND action = ?)';
    params.push('system', 'esp32_heartbeat');
    
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
    
    try {
      const rows = await allQuery(sql, params);
      return rows.map(row => new Event(row));
    } catch (error) {
      throw error;
    }
  }

  static async count(options = {}) {
    const { type, action, entityType, userId } = options;
    
    let sql = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
    const params = [];
    
    // Exclude heartbeat events from the count
    sql += ' AND NOT (type = ? AND action = ?)';
    params.push('system', 'esp32_heartbeat');
    
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
    
    try {
      const row = await getQuery(sql, params);
      return row.count;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const row = await getQuery('SELECT * FROM events WHERE id = ?', [id]);
      
      if (row) {
        return new Event(row);
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  static async getRecentEvents(limit = 10) {
    try {
      const rows = await allQuery(
        'SELECT * FROM events ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      
      return rows.map(row => new Event(row));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Event;
