const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class Door {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.location = data.location;
    this.esp32Ip = data.esp32_ip;
    this.esp32Mac = data.esp32_mac;
    this.secretKey = data.secret_key;

    this.lastSeen = data.last_seen;
    this.isOnline = data.is_online === 1;
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
      secretKey: this.secretKey,
      lastSeen: this.lastSeen,
      isOnline: this.isOnline,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accessGroupId: this.accessGroupId,
      accessGroup: this.accessGroup
    };
  }

  // Static methods for database operations
  static async create(doorData) {
    return new Promise((resolve, reject) => {
      const { name, location, esp32Ip, esp32Mac } = doorData;
      
      // Generate a secure secret key for ESP32 communication
      const secretKey = crypto.randomBytes(32).toString('hex');
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO doors (name, location, esp32_ip, esp32_mac) VALUES (?, ?, ?, ?)',
        [name, location, esp32Ip, esp32Mac],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created door
          Door.findById(this.lastID)
            .then(door => resolve(door))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT d.*, ag.id as access_group_id, ag.name as access_group_name 
         FROM doors d 
         LEFT JOIN door_access_groups dag ON d.id = dag.door_id 
         LEFT JOIN access_groups ag ON dag.access_group_id = ag.id 
         WHERE d.id = ?`,
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
          
          resolve(new Door(row));
        }
      );
    });
  }

  static async findByIp(ip) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM doors WHERE esp32_ip = ?',
        [ip],
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
          
          resolve(new Door(row));
        }
      );
    });
  }

  static async findByMac(mac) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM doors WHERE esp32_mac = ?',
        [mac],
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
          
          resolve(new Door(row));
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 10,
        search
      } = options;
      
      let query = `SELECT d.*, ag.id as access_group_id, ag.name as access_group_name 
                   FROM doors d 
                   LEFT JOIN door_access_groups dag ON d.id = dag.door_id 
                   LEFT JOIN access_groups ag ON dag.access_group_id = ag.id 
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
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const doors = rows.map(row => new Door(row));
        resolve(doors);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { search } = options;
      
      let query = 'SELECT COUNT(*) as count FROM doors WHERE 1=1';
      const params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR location LIKE ? OR esp32_ip LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.get(query, params, (err, row) => {
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
      const allowedFields = ['name', 'location', 'esp32_ip', 'esp32_mac'];
      const updates = [];
      const params = [];
      
      // Map camelCase to snake_case
      const fieldMapping = {
        'esp32Ip': 'esp32_ip',
        'esp32Mac': 'esp32_mac'
      };
      
      for (const [key, value] of Object.entries(updateData)) {
        const dbField = fieldMapping[key] || key;
        if (allowedFields.includes(dbField) && value !== undefined) {
          updates.push(`${dbField} = ?`);
          params.push(value);
        }
      }
      
      if (updates.length === 0) {
        resolve(this);
        return;
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(this.id);
      
      const query = `UPDATE doors SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated door
        Door.findById(this.id)
          .then(updatedDoor => resolve(updatedDoor))
          .catch(reject);
      });
    });
  }

  async updateLastSeen() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'UPDATE doors SET last_seen = CURRENT_TIMESTAMP, is_online = 1 WHERE id = ?',
        [this.id],
        (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          this.lastSeen = new Date().toISOString();
          this.isOnline = true;
          resolve(true);
        }
      );
    });
  }

  async setOffline() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'UPDATE doors SET is_online = 0 WHERE id = ?',
        [this.id],
        (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          this.isOnline = false;
          resolve(true);
        }
      );
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM doors WHERE id = ?',
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

  // Verify access for a user
  async verifyAccess(userId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT COUNT(*) as count
         FROM user_access_groups uag
         JOIN door_access_groups dag ON uag.access_group_id = dag.access_group_id
         WHERE uag.user_id = ? 
         AND dag.door_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [userId, this.id],
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row.count > 0);
        }
      );
    });
  }

  // Log access attempt
  static async logAccess(doorId, userId, granted, reason = null) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO access_log (door_id, user_id, access_granted, access_reason) VALUES (?, ?, ?, ?)',
        [doorId, userId, granted ? 1 : 0, reason],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.lastID);
        }
      );
    });
  }

  // Get access logs for this door
  async getAccessLogs(options = {}) {
    return new Promise((resolve, reject) => {
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
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Get doors accessible by a user
  static async getAccessibleByUser(userId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT DISTINCT d.*
         FROM doors d
         JOIN door_access_groups dag ON d.id = dag.door_id
         JOIN user_access_groups uag ON dag.access_group_id = uag.access_group_id
         WHERE uag.user_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [userId],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const doors = rows.map(row => new Door(row));
          resolve(doors);
        }
      );
    });
  }
}

module.exports = { Door };