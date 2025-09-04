const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class Site {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.address = data.address;
    this.timezone = data.timezone || 'UTC';
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      address: this.address,
      timezone: this.timezone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(siteData) {
    return new Promise((resolve, reject) => {
      const { name, description, address, timezone } = siteData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO sites (name, description, address, timezone) VALUES (?, ?, ?, ?)',
        [name, description, address, timezone || 'UTC'],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created site
          Site.findById(this.lastID)
            .then(site => resolve(site))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM sites WHERE id = ?',
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
          
          resolve(new Site(row));
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
      
      let query = 'SELECT * FROM sites WHERE 1=1';
      const params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ? OR address LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const sites = rows.map(row => new Site(row));
        resolve(sites);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { search } = options;
      
      let query = 'SELECT COUNT(*) as count FROM sites WHERE 1=1';
      const params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ? OR address LIKE ?)';
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
      const allowedFields = ['name', 'description', 'address', 'timezone'];
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
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(this.id);
      
      const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated site
        Site.findById(this.id)
          .then(updatedSite => resolve(updatedSite))
          .catch(reject);
      });
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM sites WHERE id = ?',
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

  // Get areas for this site
  async getAreas() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        'SELECT * FROM areas WHERE site_id = ? ORDER BY name',
        [this.id],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const areas = rows.map(row => new (require('./area').Area)(row));
          resolve(areas);
        }
      );
    });
  }

  // Get doors for this site
  async getDoors() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        'SELECT * FROM doors WHERE site_id = ? ORDER BY name',
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
}

module.exports = { Site };