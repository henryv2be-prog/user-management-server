const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class DoorStatus {
  constructor(data) {
    this.id = data.id;
    this.doorId = data.door_id;
    this.status = data.status; // 'open', 'closed', 'locked', 'unlocked'
    this.locked = data.locked === 1;
    this.lastUpdated = data.last_updated;
  }

  toJSON() {
    return {
      id: this.id,
      doorId: this.doorId,
      status: this.status,
      locked: this.locked,
      lastUpdated: this.lastUpdated
    };
  }

  // Static methods for database operations
  static async create(statusData) {
    return new Promise((resolve, reject) => {
      const { doorId, status, locked } = statusData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO door_status (door_id, status, locked) VALUES (?, ?, ?)',
        [doorId, status, locked ? 1 : 0],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created door status
          DoorStatus.findById(this.lastID)
            .then(status => resolve(status))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT ds.*, d.name as door_name 
         FROM door_status ds 
         LEFT JOIN doors d ON ds.door_id = d.id 
         WHERE ds.id = ?`,
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
          
          const status = new DoorStatus(row);
          if (row.door_name) {
            status.doorName = row.door_name;
          }
          resolve(status);
        }
      );
    });
  }

  static async findByDoorId(doorId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT ds.*, d.name as door_name 
         FROM door_status ds 
         LEFT JOIN doors d ON ds.door_id = d.id 
         WHERE ds.door_id = ? 
         ORDER BY ds.last_updated DESC 
         LIMIT 1`,
        [doorId],
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
          
          const status = new DoorStatus(row);
          if (row.door_name) {
            status.doorName = row.door_name;
          }
          resolve(status);
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 50,
        status,
        locked,
        doorId
      } = options;
      
      let query = `SELECT ds.*, d.name as door_name 
                   FROM door_status ds 
                   LEFT JOIN doors d ON ds.door_id = d.id 
                   WHERE 1=1`;
      const params = [];
      
      if (status) {
        query += ' AND ds.status = ?';
        params.push(status);
      }
      
      if (locked !== undefined) {
        query += ' AND ds.locked = ?';
        params.push(locked ? 1 : 0);
      }
      
      if (doorId) {
        query += ' AND ds.door_id = ?';
        params.push(doorId);
      }
      
      query += ' ORDER BY ds.last_updated DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const statuses = rows.map(row => {
          const status = new DoorStatus(row);
          if (row.door_name) {
            status.doorName = row.door_name;
          }
          return status;
        });
        resolve(statuses);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { status, locked, doorId } = options;
      
      let query = 'SELECT COUNT(*) as count FROM door_status WHERE 1=1';
      const params = [];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      if (locked !== undefined) {
        query += ' AND locked = ?';
        params.push(locked ? 1 : 0);
      }
      
      if (doorId) {
        query += ' AND door_id = ?';
        params.push(doorId);
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
      const allowedFields = ['status', 'locked'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'locked') {
            updates.push('locked = ?');
            params.push(value ? 1 : 0);
          } else {
            updates.push(`${key} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        resolve(this);
        return;
      }
      
      updates.push('last_updated = CURRENT_TIMESTAMP');
      params.push(this.id);
      
      const query = `UPDATE door_status SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated door status
        DoorStatus.findById(this.id)
          .then(updatedStatus => resolve(updatedStatus))
          .catch(reject);
      });
    });
  }

  // Update or create door status
  static async updateOrCreate(doorId, statusData) {
    return new Promise((resolve, reject) => {
      const { status, locked } = statusData;
      
      const db = new sqlite3.Database(DB_PATH);
      
      // First, try to update existing record
      db.run(
        'UPDATE door_status SET status = ?, locked = ?, last_updated = CURRENT_TIMESTAMP WHERE door_id = ?',
        [status, locked ? 1 : 0, doorId],
        function(err) {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // If no rows were updated, create a new record
          if (this.changes === 0) {
            db.run(
              'INSERT INTO door_status (door_id, status, locked) VALUES (?, ?, ?)',
              [doorId, status, locked ? 1 : 0],
              function(err) {
                db.close();
                if (err) {
                  reject(err);
                  return;
                }
                
                // Fetch the created door status
                DoorStatus.findById(this.lastID)
                  .then(status => resolve(status))
                  .catch(reject);
              }
            );
          } else {
            // Fetch the updated door status
            DoorStatus.findByDoorId(doorId)
              .then(status => {
                db.close();
                resolve(status);
              })
              .catch(err => {
                db.close();
                reject(err);
              });
          }
        }
      );
    });
  }

  // Get door status summary
  static async getSummary() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT 
           COUNT(*) as total_doors,
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_doors,
           SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_doors,
           SUM(CASE WHEN locked = 1 THEN 1 ELSE 0 END) as locked_doors,
           SUM(CASE WHEN locked = 0 THEN 1 ELSE 0 END) as unlocked_doors
         FROM door_status`,
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row);
        }
      );
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM door_status WHERE id = ?',
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
}

module.exports = { DoorStatus };