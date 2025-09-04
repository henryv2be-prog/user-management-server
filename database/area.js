const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class Area {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.siteId = data.site_id;
    this.parentAreaId = data.parent_area_id;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      siteId: this.siteId,
      parentAreaId: this.parentAreaId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(areaData) {
    return new Promise((resolve, reject) => {
      const { name, description, siteId, parentAreaId } = areaData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO areas (name, description, site_id, parent_area_id) VALUES (?, ?, ?, ?)',
        [name, description, siteId, parentAreaId],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created area
          Area.findById(this.lastID)
            .then(area => resolve(area))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT a.*, s.name as site_name 
         FROM areas a 
         LEFT JOIN sites s ON a.site_id = s.id 
         WHERE a.id = ?`,
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
          
          const area = new Area(row);
          if (row.site_name) {
            area.siteName = row.site_name;
          }
          resolve(area);
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 10,
        search,
        siteId
      } = options;
      
      let query = `SELECT a.*, s.name as site_name 
                   FROM areas a 
                   LEFT JOIN sites s ON a.site_id = s.id 
                   WHERE 1=1`;
      const params = [];
      
      if (search) {
        query += ' AND (a.name LIKE ? OR a.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (siteId) {
        query += ' AND a.site_id = ?';
        params.push(siteId);
      }
      
      query += ' ORDER BY a.name';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const areas = rows.map(row => {
          const area = new Area(row);
          if (row.site_name) {
            area.siteName = row.site_name;
          }
          return area;
        });
        resolve(areas);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { search, siteId } = options;
      
      let query = 'SELECT COUNT(*) as count FROM areas WHERE 1=1';
      const params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (siteId) {
        query += ' AND site_id = ?';
        params.push(siteId);
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
      const allowedFields = ['name', 'description', 'site_id', 'parent_area_id'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key === 'siteId' ? 'site_id' : 
                       key === 'parentAreaId' ? 'parent_area_id' : key;
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
      
      const query = `UPDATE areas SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated area
        Area.findById(this.id)
          .then(updatedArea => resolve(updatedArea))
          .catch(reject);
      });
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM areas WHERE id = ?',
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

  // Get child areas
  async getChildAreas() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        'SELECT * FROM areas WHERE parent_area_id = ? ORDER BY name',
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const areas = rows.map(row => new Area(row));
          resolve(areas);
        }
      );
    });
  }

  // Get doors in this area
  async getDoors() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        'SELECT * FROM doors WHERE area_id = ? ORDER BY name',
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const doors = rows.map(row => new (require('./door').Door)(row));
          resolve(doors);
        }
      );
    });
  }

  // Get cameras in this area
  async getCameras() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        'SELECT * FROM cameras WHERE area_id = ? ORDER BY name',
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const cameras = rows.map(row => new (require('./camera').Camera)(row));
          resolve(cameras);
        }
      );
    });
  }
}

module.exports = { Area };