const { getDatabase } = require('./init');
const crypto = require('crypto');

class Door {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.location = data.location;
    this.esp32Ip = data.esp32_ip;
    this.esp32Mac = data.esp32_mac;
    this.secretKey = data.secret_key;
    this.isActive = data.is_active;
    this.lastSeen = data.last_seen;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      location: this.location,
      esp32Ip: this.esp32Ip,
      esp32Mac: this.esp32Mac,
      isActive: this.isActive,
      lastSeen: this.lastSeen,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(doorData) {
    return new Promise((resolve, reject) => {
      const { name, location, esp32Ip, esp32Mac } = doorData;
      
      // Generate a secure secret key for ESP32 communication
      const secretKey = crypto.randomBytes(32).toString('hex');
      
      const db = getDatabase();
      db.run(
        'INSERT INTO doors (name, location, esp32_ip, esp32_mac, secret_key, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [name, location, esp32Ip, esp32Mac, secretKey, 1],
        function(err) {
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
      const db = getDatabase();
      db.get(
        'SELECT * FROM doors WHERE id = ?',
        [id],
        (err, row) => {
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
      const db = getDatabase();
      db.get(
        'SELECT * FROM doors WHERE esp32_ip = ?',
        [ip],
        (err, row) => {
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
        isActive,
        search
      } = options;
      
      let query = 'SELECT * FROM doors WHERE 1=1';
      const params = [];
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }
      
      if (search) {
        query += ' AND (name LIKE ? OR location LIKE ? OR esp32_ip LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = getDatabase();
      db.all(query, params, (err, rows) => {
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
      const { isActive, search } = options;
      
      let query = 'SELECT COUNT(*) as count FROM doors WHERE 1=1';
      const params = [];
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }
      
      if (search) {
        query += ' AND (name LIKE ? OR location LIKE ? OR esp32_ip LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      const db = getDatabase();
      db.get(query, params, (err, row) => {
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
      const allowedFields = ['name', 'location', 'esp32_ip', 'esp32_mac', 'is_active'];
      const updates = [];
      const params = [];
      
      // Map camelCase to snake_case
      const fieldMapping = {
        'esp32Ip': 'esp32_ip',
        'esp32Mac': 'esp32_mac',
        'isActive': 'is_active'
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
      
      params.push(this.id);
      
      const db = getDatabase();
      db.run(
        `UPDATE doors SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch updated door
          Door.findById(this.id)
            .then(updatedDoor => resolve(updatedDoor))
            .catch(reject);
        }
      );
    });
  }

  async updateLastSeen() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE doors SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [this.id],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(true);
        }
      );
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'DELETE FROM doors WHERE id = ?',
        [this.id],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(true);
        }
      );
    });
  }

  // Get access groups for this door
  async getAccessGroups() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.all(
        `SELECT ag.* FROM access_groups ag
         JOIN door_access_groups dag ON ag.id = dag.access_group_id
         WHERE dag.door_id = ? AND ag.is_active = 1`,
        [this.id],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(rows);
        }
      );
    });
  }

  // Add access group to door
  async addAccessGroup(accessGroupId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'INSERT OR IGNORE INTO door_access_groups (door_id, access_group_id) VALUES (?, ?)',
        [this.id, accessGroupId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes > 0);
        }
      );
    });
  }

  // Remove access group from door
  async removeAccessGroup(accessGroupId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'DELETE FROM door_access_groups WHERE door_id = ? AND access_group_id = ?',
        [this.id, accessGroupId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes > 0);
        }
      );
    });
  }

  // Verify access for a user
  async verifyUserAccess(userId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get(
        `SELECT COUNT(*) as count FROM user_access_groups uag
         JOIN door_access_groups dag ON uag.access_group_id = dag.access_group_id
         WHERE dag.door_id = ? AND uag.user_id = ? AND uag.is_active = 1
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [this.id, userId],
        (err, row) => {
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
  async logAccess(userId, accessGranted, accessMethod, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'INSERT INTO access_log (user_id, door_id, access_granted, access_method, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, this.id, accessGranted ? 1 : 0, accessMethod, ipAddress, userAgent],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.lastID);
        }
      );
    });
  }
}

module.exports = { Door };

