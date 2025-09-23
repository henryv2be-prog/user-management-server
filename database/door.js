const crypto = require('crypto');
const { runQuery, getQuery, allQuery } = require('./connection');

class Door {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.location = data.location;
    this.esp32Ip = data.esp32_ip;
    this.esp32Mac = data.esp32_mac;
    // Add new field names for frontend compatibility
    this.controllerIp = data.esp32_ip;
    this.controllerMac = data.esp32_mac;
    this.secretKey = data.secret_key;

    this.lastSeen = data.last_seen;
    this.isOnline = data.is_online === 1;
    this.isLocked = data.is_locked === 1;
    this.isOpen = data.is_open === 1;
    this.hasLockSensor = data.has_lock_sensor === 1;
    this.hasDoorPositionSensor = data.has_door_position_sensor === 1;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    
    // Access group information (from JOIN)
    this.accessGroupId = data.access_group_id;
    if (data.access_group_id && data.access_group_name) {
      this.accessGroup = {
        id: data.access_group_id,
        name: data.access_group_name
      };
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      location: this.location,
      esp32Ip: this.esp32Ip,
      esp32Mac: this.esp32Mac,
      controllerIp: this.controllerIp,
      controllerMac: this.controllerMac,
      secretKey: this.secretKey,
      lastSeen: this.lastSeen,
      isOnline: this.isOnline,
      isLocked: this.isLocked,
      isOpen: this.isOpen,
      hasLockSensor: this.hasLockSensor,
      hasDoorPositionSensor: this.hasDoorPositionSensor,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accessGroupId: this.accessGroupId,
      accessGroup: this.accessGroup
    };
  }

  // Static methods for database operations
  static async create(doorData) {
    const { name, location, esp32Ip, esp32Mac, controllerIp, controllerMac, hasLockSensor = false, hasDoorPositionSensor = false } = doorData;
    
    // Use new field names if provided, otherwise fall back to old field names for backward compatibility
    const ip = controllerIp || esp32Ip;
    const mac = controllerMac || esp32Mac;
    
    try {
      const result = await runQuery(
        'INSERT INTO doors (name, location, esp32_ip, esp32_mac, has_lock_sensor, has_door_position_sensor) VALUES (?, ?, ?, ?, ?, ?)',
        [name, location, ip, mac, hasLockSensor ? 1 : 0, hasDoorPositionSensor ? 1 : 0]
      );
      
      // Fetch the created door
      const door = await Door.findById(result.lastID);
      return door;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const row = await getQuery(
        `SELECT d.*, ag.id as access_group_id, ag.name as access_group_name 
         FROM doors d 
         LEFT JOIN door_access_groups dag ON d.id = dag.door_id 
         LEFT JOIN access_groups ag ON dag.access_group_id = ag.id 
         WHERE d.id = ?`,
        [id]
      );
      
      if (!row) {
        return null;
      }
      
      return new Door(row);
    } catch (error) {
      throw error;
    }
  }

  static async findByIp(ip) {
    try {
      const row = await getQuery('SELECT * FROM doors WHERE esp32_ip = ?', [ip]);
      
      if (!row) {
        return null;
      }
      
      return new Door(row);
    } catch (error) {
      throw error;
    }
  }

  static async findByMac(mac) {
    try {
      const row = await getQuery('SELECT * FROM doors WHERE esp32_mac = ?', [mac]);
      
      if (!row) {
        return null;
      }
      
      return new Door(row);
    } catch (error) {
      throw error;
    }
  }

  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search
    } = options;
    
    let query = `SELECT d.*, 
                        (SELECT ag.id FROM door_access_groups dag 
                         JOIN access_groups ag ON dag.access_group_id = ag.id 
                         WHERE dag.door_id = d.id LIMIT 1) as access_group_id,
                        (SELECT ag.name FROM door_access_groups dag 
                         JOIN access_groups ag ON dag.access_group_id = ag.id 
                         WHERE dag.door_id = d.id LIMIT 1) as access_group_name
                 FROM doors d 
                 WHERE 1=1`;
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR location LIKE ? OR esp32_ip LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY d.created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    try {
      const rows = await allQuery(query, params);
      const doors = rows.map(row => new Door(row));
      return doors;
    } catch (error) {
      throw error;
    }
  }

  static async count(options = {}) {
    const { search } = options;
    
    let query = 'SELECT COUNT(*) as count FROM doors WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR location LIKE ? OR esp32_ip LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    try {
      const row = await getQuery(query, params);
      return row.count;
    } catch (error) {
      throw error;
    }
  }

  async update(updateData) {
    const allowedFields = ['name', 'location', 'esp32_ip', 'esp32_mac', 'has_lock_sensor', 'has_door_position_sensor'];
    const updates = [];
    const params = [];
    
    // Map camelCase to snake_case
    const fieldMapping = {
      'esp32Ip': 'esp32_ip',
      'esp32Mac': 'esp32_mac',
      'controllerIp': 'esp32_ip',
      'controllerMac': 'esp32_mac',
      'hasLockSensor': 'has_lock_sensor',
      'hasDoorPositionSensor': 'has_door_position_sensor'
    };
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(value);
      }
    }
    
    if (updates.length === 0) {
      return this;
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(this.id);
    
    const query = `UPDATE doors SET ${updates.join(', ')} WHERE id = ?`;
    
    try {
      await runQuery(query, params);
      
      // Fetch updated door
      const updatedDoor = await Door.findById(this.id);
      return updatedDoor;
    } catch (error) {
      throw error;
    }
  }

  async save() {
    return this.update({
      name: this.name,
      location: this.location,
      esp32Ip: this.esp32Ip,
      esp32Mac: this.esp32Mac,
      controllerIp: this.controllerIp,
      controllerMac: this.controllerMac
    });
  }

  async updateLastSeen() {
    try {
      await runQuery(
        'UPDATE doors SET last_seen = CURRENT_TIMESTAMP, is_online = 1 WHERE id = ?',
        [this.id]
      );
      
      this.lastSeen = new Date().toISOString();
      this.isOnline = true;
      return true;
    } catch (error) {
      throw error;
    }
  }

  async setOffline() {
    try {
      await runQuery('UPDATE doors SET is_online = 0 WHERE id = ?', [this.id]);
      
      this.isOnline = false;
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Static method to check and update offline doors
  static async checkOfflineDoors(timeoutMinutes = 2) {
    try {
      // Find doors that are marked as online but haven't sent a heartbeat recently
      const rows = await allQuery(
        `SELECT * FROM doors 
         WHERE is_online = 1 
         AND last_seen < datetime('now', '-${timeoutMinutes} minutes')`
      );
      
      if (rows.length === 0) {
        return [];
      }
      
      // Set these doors to offline
      const doorIds = rows.map(row => row.id);
      const placeholders = doorIds.map(() => '?').join(',');
      
      await runQuery(
        `UPDATE doors SET is_online = 0 WHERE id IN (${placeholders})`,
        doorIds
      );
      
      console.log(`Marked ${rows.length} doors as offline due to timeout`);
      return rows.map(row => new Door(row));
    } catch (error) {
      throw error;
    }
  }

  async delete() {
    try {
      // First, remove the door from all access groups
      await runQuery('DELETE FROM door_access_groups WHERE door_id = ?', [this.id]);
      
      // Then delete the door itself
      await runQuery('DELETE FROM doors WHERE id = ?', [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verify access for a user
  async verifyAccess(userId) {
    try {
      const row = await getQuery(
        `SELECT COUNT(*) as count
         FROM user_access_groups uag
         JOIN door_access_groups dag ON uag.access_group_id = dag.access_group_id
         WHERE uag.user_id = ? 
         AND dag.door_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [userId, this.id]
      );
      
      return row.count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Log access attempt
  static async logAccess(doorId, userId, granted, reason = null) {
    try {
      const result = await runQuery(
        'INSERT INTO access_log (door_id, user_id, access_granted, access_reason) VALUES (?, ?, ?, ?)',
        [doorId, userId, granted ? 1 : 0, reason]
      );
      
      return result.lastID;
    } catch (error) {
      throw error;
    }
  }

  // Get access logs for this door
  async getAccessLogs(options = {}) {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate
    } = options;
    
    let query = `SELECT al.*, u.username, u.first_name, u.last_name
                 FROM access_log al
                 LEFT JOIN users u ON al.user_id = u.id
                 WHERE al.door_id = ?`;
    const params = [this.id];
    
    if (startDate) {
      query += ' AND al.timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND al.timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY al.timestamp DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    try {
      const rows = await allQuery(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get doors accessible by a user
  static async getAccessibleByUser(userId) {
    try {
      const rows = await allQuery(
        `SELECT DISTINCT d.*
         FROM doors d
         JOIN door_access_groups dag ON d.id = dag.door_id
         JOIN user_access_groups uag ON dag.access_group_id = uag.access_group_id
         WHERE uag.user_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [userId]
      );
      
      const doors = rows.map(row => new Door(row));
      return doors;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = { Door };