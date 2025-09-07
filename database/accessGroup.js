const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class AccessGroup {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations

  // Create new access group
  static async create(accessGroupData) {
    const { name, description } = accessGroupData;
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run("INSERT INTO access_groups (name, description) VALUES (?, ?)", 
        [name, description], function(err) {
        if (err) {
          db.close();
          if (err.message.includes('UNIQUE constraint failed: access_groups.name')) {
            return reject(new Error('Access group name already exists'));
          }
          return reject(err);
        }
        
        // Fetch the created access group
        const accessGroupId = this.lastID;
        db.get("SELECT * FROM access_groups WHERE id = ?", [accessGroupId], (fetchErr, row) => {
          db.close();
          if (fetchErr) {
            return reject(fetchErr);
          }
          resolve(new AccessGroup(row));
        });
      });
    });
  }

  // Find access group by ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.get("SELECT * FROM access_groups WHERE id = ?", [id], (err, row) => {
        db.close();
        if (err) {
          return reject(err);
        }
        resolve(row ? new AccessGroup(row) : null);
      });
    });
  }

  // Find access group by name
  static async findByName(name) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.get("SELECT * FROM access_groups WHERE name = ?", [name], (err, row) => {
        db.close();
        if (err) {
          return reject(err);
        }
        resolve(row ? new AccessGroup(row) : null);
      });
    });
  }

  // Find all access groups with optional filters
  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      let sql = "SELECT * FROM access_groups";
      const params = [];
      
      if (options.search) {
        sql += " WHERE name LIKE ? OR description LIKE ?";
        params.push(`%${options.search}%`, `%${options.search}%`);
      }
      
      sql += " ORDER BY created_at DESC";
      
      // Add pagination
      if (options.page && options.limit) {
        const offset = (options.page - 1) * options.limit;
        sql += ` LIMIT ${options.limit} OFFSET ${offset}`;
      }
      
      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) {
          return reject(err);
        }
        resolve(rows.map(row => new AccessGroup(row)));
      });
    });
  }

  // Count access groups with optional filters
  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      let sql = "SELECT COUNT(*) as count FROM access_groups";
      const params = [];
      
      if (options.search) {
        sql += " WHERE name LIKE ? OR description LIKE ?";
        params.push(`%${options.search}%`, `%${options.search}%`);
      }
      
      db.get(sql, params, (err, row) => {
        db.close();
        if (err) {
          return reject(err);
        }
        resolve(row.count);
      });
    });
  }

  // Update access group
  async update(updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['name', 'description'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
      
      if (updates.length === 0) {
        return resolve(this);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(this.id);
      
      const sql = `UPDATE access_groups SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(sql, params, (err) => {
        if (err) {
          db.close();
          return reject(err);
        }
        
        // Fetch updated access group
        db.get("SELECT * FROM access_groups WHERE id = ?", [this.id], (err, row) => {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve(new AccessGroup(row));
        });
      });
    });
  }

  // Delete access group
  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // First delete related records
      db.serialize(() => {
        db.run("DELETE FROM user_access_groups WHERE access_group_id = ?", [this.id]);
        db.run("DELETE FROM door_access_groups WHERE access_group_id = ?", [this.id]);
        db.run("DELETE FROM access_groups WHERE id = ?", [this.id], (err) => {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve(true);
        });
      });
    });
  }

  // Static method to get access groups for a user
  static async getUserAccessGroups(userId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT ag.* FROM access_groups ag
         JOIN user_access_groups uag ON ag.id = uag.access_group_id
         WHERE uag.user_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [userId],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const accessGroups = rows.map(row => new AccessGroup(row));
          resolve(accessGroups);
        }
      );
    });
  }

  // Get doors for this access group
  async getDoors() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT d.*
         FROM doors d
         JOIN door_access_groups dag ON d.id = dag.door_id
         WHERE dag.access_group_id = ?`,
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  // Get users for this access group
  async getUsers() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT u.*, uag.created_at as granted_at, uag.expires_at
         FROM users u
         JOIN user_access_groups uag ON u.id = uag.user_id
         WHERE uag.access_group_id = ?
         AND (uag.expires_at IS NULL OR uag.expires_at > CURRENT_TIMESTAMP)`,
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  // Add user to access group
  async addUser(userId, grantedBy = null) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(
        "INSERT OR IGNORE INTO user_access_groups (user_id, access_group_id, granted_by) VALUES (?, ?, ?)",
        [userId, this.id, grantedBy],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          // If no rows were affected, user is already in the group
          resolve(this.changes > 0);
        }
      );
    });
  }

  // Remove user from access group
  async removeUser(userId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(
        "DELETE FROM user_access_groups WHERE user_id = ? AND access_group_id = ?",
        [userId, this.id],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  // Add door to access group
  async addDoor(doorId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(
        "INSERT OR IGNORE INTO door_access_groups (door_id, access_group_id) VALUES (?, ?)",
        [doorId, this.id],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          // If no rows were affected, door is already in the group
          resolve(this.changes > 0);
        }
      );
    });
  }

  // Remove door from access group
  async removeDoor(doorId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(
        "DELETE FROM door_access_groups WHERE door_id = ? AND access_group_id = ?",
        [doorId, this.id],
        function(err) {
          db.close();
          if (err) {
            return reject(err);
          }
          resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = AccessGroup;
