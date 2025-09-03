const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class AccessGroup {
  constructor(data) {
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
  static async create(accessGroupData) {
    return new Promise((resolve, reject) => {
      const { name, description } = accessGroupData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO access_groups (name, description) VALUES (?, ?)',
        [name, description],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created access group
          AccessGroup.findById(this.lastID)
            .then(accessGroup => resolve(accessGroup))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM access_groups WHERE id = ?',
        [id],
        (err, row) => {
          db.close();
          if (err) {
            console.error('AccessGroup.findById SQLite error:', err);
            console.error('Query: SELECT * FROM access_groups WHERE id = ?');
            console.error('Params:', [id]);
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new AccessGroup(row));
        }
      );
    });
  }

  static async findByName(name) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM access_groups WHERE name = ?',
        [name],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new AccessGroup(row));
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
      
      let query = 'SELECT * FROM access_groups WHERE 1=1';
      const params = [];
      

      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      query += ' ORDER BY created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          console.error('AccessGroup.findAll SQLite error:', err);
          console.error('Query:', query);
          console.error('Params:', params);
          reject(err);
          return;
        }
        
        const accessGroups = rows.map(row => new AccessGroup(row));
        resolve(accessGroups);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { search } = options;
      
      let query = 'SELECT COUNT(*) as count FROM access_groups WHERE 1=1';
      const params = [];
      

      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.get(query, params, (err, row) => {
        db.close();
        if (err) {
          console.error('AccessGroup.count SQLite error:', err);
          console.error('Query:', query);
          console.error('Params:', params);
          reject(err);
          return;
        }
        
        resolve(row.count);
      });
    });
  }

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
        resolve(this);
        return;
      }
      
      params.push(this.id);
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `UPDATE access_groups SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch updated access group
          AccessGroup.findById(this.id)
            .then(updatedAccessGroup => resolve(updatedAccessGroup))
            .catch(reject);
        }
      );
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM access_groups WHERE id = ?',
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

  // Get doors for this access group
  async getDoors() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT d.* FROM doors d
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

  // Get users in this access group
  async getUsers() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `         SELECT u.*, uag.granted_at, uag.expires_at
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
  async addUser(userId, grantedBy) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `INSERT OR REPLACE INTO user_access_groups 
         (user_id, access_group_id, granted_by) 
         VALUES (?, ?, ?)`,
        [userId, this.id, grantedBy],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
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
        'DELETE FROM user_access_groups WHERE access_group_id = ? AND user_id = ?',
        [this.id, userId],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
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
        'INSERT OR IGNORE INTO door_access_groups (access_group_id, door_id) VALUES (?, ?)',
        [this.id, doorId],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
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
        'DELETE FROM door_access_groups WHERE access_group_id = ? AND door_id = ?',
        [this.id, doorId],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = { AccessGroup };

