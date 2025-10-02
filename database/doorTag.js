const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.db');

class DoorTag {
  constructor(data = {}) {
    this.id = data.id;
    this.doorId = data.door_id;
    this.tagId = data.tag_id;
    this.tagType = data.tag_type; // 'nfc', 'qr'
    this.tagData = data.tag_data;
    this.createdAt = data.created_at;
    
    // Related data (from JOINs)
    this.door = data.door;
  }

  toJSON() {
    return {
      id: this.id,
      doorId: this.doorId,
      tagId: this.tagId,
      tagType: this.tagType,
      tagData: this.tagData,
      createdAt: this.createdAt,
      door: this.door
    };
  }

  // Static methods for database operations
  static async create(tagData) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const { doorId, tagId, tagType = 'nfc', tagData } = tagData;
      
      const sql = `
        INSERT INTO door_tags (door_id, tag_id, tag_type, tag_data)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [doorId, tagId, tagType, tagData], function(err) {
        if (err) {
          console.error('Error creating door tag:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
        db.close();
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const sql = `
        SELECT dt.*, d.name as door_name, d.location as door_location
        FROM door_tags dt
        LEFT JOIN doors d ON dt.door_id = d.id
        WHERE dt.id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Error finding door tag by ID:', err);
          reject(err);
        } else if (row) {
          const doorTag = new DoorTag(row);
          if (row.door_name) {
            doorTag.door = {
              id: row.door_id,
              name: row.door_name,
              location: row.door_location
            };
          }
          resolve(doorTag);
        } else {
          resolve(null);
        }
        db.close();
      });
    });
  }

  static async findByTagId(tagId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const sql = `
        SELECT dt.*, d.name as door_name, d.location as door_location
        FROM door_tags dt
        LEFT JOIN doors d ON dt.door_id = d.id
        WHERE dt.tag_id = ?
      `;
      
      db.get(sql, [tagId], (err, row) => {
        if (err) {
          console.error('Error finding door tag by tag ID:', err);
          reject(err);
        } else if (row) {
          const doorTag = new DoorTag(row);
          if (row.door_name) {
            doorTag.door = {
              id: row.door_id,
              name: row.door_name,
              location: row.door_location
            };
          }
          resolve(doorTag);
        } else {
          resolve(null);
        }
        db.close();
      });
    });
  }

  static async findByDoorId(doorId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const sql = `
        SELECT dt.*, d.name as door_name, d.location as door_location
        FROM door_tags dt
        LEFT JOIN doors d ON dt.door_id = d.id
        WHERE dt.door_id = ?
        ORDER BY dt.created_at DESC
      `;
      
      db.all(sql, [doorId], (err, rows) => {
        if (err) {
          console.error('Error finding door tags by door ID:', err);
          reject(err);
        } else {
          const doorTags = rows.map(row => {
            const doorTag = new DoorTag(row);
            if (row.door_name) {
              doorTag.door = {
                id: row.door_id,
                name: row.door_name,
                location: row.door_location
              };
            }
            return doorTag;
          });
          resolve(doorTags);
        }
        db.close();
      });
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      let sql = `
        SELECT dt.*, d.name as door_name, d.location as door_location
        FROM door_tags dt
        LEFT JOIN doors d ON dt.door_id = d.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (options.doorId) {
        conditions.push('dt.door_id = ?');
        params.push(options.doorId);
      }
      
      if (options.tagType) {
        conditions.push('dt.tag_type = ?');
        params.push(options.tagType);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY dt.created_at DESC';
      
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error finding all door tags:', err);
          reject(err);
        } else {
          const doorTags = rows.map(row => {
            const doorTag = new DoorTag(row);
            if (row.door_name) {
              doorTag.door = {
                id: row.door_id,
                name: row.door_name,
                location: row.door_location
              };
            }
            return doorTag;
          });
          resolve(doorTags);
        }
        db.close();
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const sql = 'DELETE FROM door_tags WHERE id = ?';
      
      db.run(sql, [id], function(err) {
        if (err) {
          console.error('Error deleting door tag:', err);
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
        db.close();
      });
    });
  }

  static async deleteByTagId(tagId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const sql = 'DELETE FROM door_tags WHERE tag_id = ?';
      
      db.run(sql, [tagId], function(err) {
        if (err) {
          console.error('Error deleting door tag by tag ID:', err);
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
        db.close();
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      let sql = 'SELECT COUNT(*) as count FROM door_tags dt';
      
      const conditions = [];
      const params = [];
      
      if (options.doorId) {
        conditions.push('dt.door_id = ?');
        params.push(options.doorId);
      }
      
      if (options.tagType) {
        conditions.push('dt.tag_type = ?');
        params.push(options.tagType);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error counting door tags:', err);
          reject(err);
        } else {
          resolve(row.count);
        }
        db.close();
      });
    });
  }
}

module.exports = { DoorTag };
