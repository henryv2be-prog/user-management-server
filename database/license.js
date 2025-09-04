const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class License {
  constructor(data) {
    this.id = data.id;
    this.licenseKey = data.license_key;
    this.licenseType = data.license_type; // 'trial', 'basic', 'professional', 'enterprise'
    this.features = data.features ? JSON.parse(data.features) : [];
    this.maxUsers = data.max_users;
    this.maxDoors = data.max_doors;
    this.maxSites = data.max_sites;
    this.expiresAt = data.expires_at;
    this.isActive = data.is_active === 1;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      licenseKey: this.licenseKey,
      licenseType: this.licenseType,
      features: this.features,
      maxUsers: this.maxUsers,
      maxDoors: this.maxDoors,
      maxSites: this.maxSites,
      expiresAt: this.expiresAt,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(licenseData) {
    return new Promise((resolve, reject) => {
      const { 
        licenseType, 
        features = [], 
        maxUsers, 
        maxDoors, 
        maxSites, 
        expiresAt 
      } = licenseData;
      
      // Generate a unique license key
      const licenseKey = crypto.randomBytes(16).toString('hex').toUpperCase();
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `INSERT INTO licenses (license_key, license_type, features, max_users, max_doors, max_sites, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [licenseKey, licenseType, JSON.stringify(features), maxUsers, maxDoors, maxSites, expiresAt],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created license
          License.findById(this.lastID)
            .then(license => resolve(license))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM licenses WHERE id = ?',
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
          
          resolve(new License(row));
        }
      );
    });
  }

  static async findByLicenseKey(licenseKey) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM licenses WHERE license_key = ?',
        [licenseKey],
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
          
          resolve(new License(row));
        }
      );
    });
  }

  static async findActive() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        'SELECT * FROM licenses WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 1',
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
          
          resolve(new License(row));
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 10,
        licenseType,
        isActive
      } = options;
      
      let query = 'SELECT * FROM licenses WHERE 1=1';
      const params = [];
      
      if (licenseType) {
        query += ' AND license_type = ?';
        params.push(licenseType);
      }
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
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
        
        const licenses = rows.map(row => new License(row));
        resolve(licenses);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { licenseType, isActive } = options;
      
      let query = 'SELECT COUNT(*) as count FROM licenses WHERE 1=1';
      const params = [];
      
      if (licenseType) {
        query += ' AND license_type = ?';
        params.push(licenseType);
      }
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
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
      const allowedFields = ['license_type', 'features', 'max_users', 'max_doors', 'max_sites', 'expires_at', 'is_active'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key === 'licenseType' ? 'license_type' :
                       key === 'maxUsers' ? 'max_users' :
                       key === 'maxDoors' ? 'max_doors' :
                       key === 'maxSites' ? 'max_sites' :
                       key === 'expiresAt' ? 'expires_at' :
                       key === 'isActive' ? 'is_active' : key;
        
        if (allowedFields.includes(dbField) && value !== undefined) {
          if (dbField === 'features') {
            updates.push(`${dbField} = ?`);
            params.push(JSON.stringify(value));
          } else if (dbField === 'is_active') {
            updates.push(`${dbField} = ?`);
            params.push(value ? 1 : 0);
          } else {
            updates.push(`${dbField} = ?`);
            params.push(value);
          }
        }
      }
      
      if (updates.length === 0) {
        resolve(this);
        return;
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(this.id);
      
      const query = `UPDATE licenses SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated license
        License.findById(this.id)
          .then(updatedLicense => resolve(updatedLicense))
          .catch(reject);
      });
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM licenses WHERE id = ?',
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

  // Check if license is valid
  isValid() {
    if (!this.isActive) {
      return false;
    }
    
    if (this.expiresAt && new Date(this.expiresAt) < new Date()) {
      return false;
    }
    
    return true;
  }

  // Check if a feature is enabled
  hasFeature(feature) {
    return this.features.includes(feature);
  }

  // Get license status
  getStatus() {
    if (!this.isActive) {
      return 'inactive';
    }
    
    if (this.expiresAt && new Date(this.expiresAt) < new Date()) {
      return 'expired';
    }
    
    if (this.expiresAt && new Date(this.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return 'expiring_soon';
    }
    
    return 'active';
  }

  // Get days until expiration
  getDaysUntilExpiration() {
    if (!this.expiresAt) {
      return null; // Never expires
    }
    
    const now = new Date();
    const expiration = new Date(this.expiresAt);
    const diffTime = expiration - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Activate license
  async activate() {
    return this.update({ isActive: true });
  }

  // Deactivate license
  async deactivate() {
    return this.update({ isActive: false });
  }

  // Get license limits
  getLimits() {
    return {
      maxUsers: this.maxUsers,
      maxDoors: this.maxDoors,
      maxSites: this.maxSites,
      features: this.features
    };
  }

  // Check if usage is within limits
  async checkUsage() {
    const db = new sqlite3.Database(DB_PATH);
    
    return new Promise((resolve, reject) => {
      const queries = [];
      
      if (this.maxUsers) {
        queries.push('SELECT COUNT(*) as count FROM users');
      }
      
      if (this.maxDoors) {
        queries.push('SELECT COUNT(*) as count FROM doors');
      }
      
      if (this.maxSites) {
        queries.push('SELECT COUNT(*) as count FROM sites');
      }
      
      if (queries.length === 0) {
        db.close();
        resolve({ withinLimits: true, usage: {} });
        return;
      }
      
      const results = {};
      let completed = 0;
      
      queries.forEach((query, index) => {
        db.get(query, (err, row) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          const key = index === 0 ? 'users' : index === 1 ? 'doors' : 'sites';
          results[key] = row.count;
          completed++;
          
          if (completed === queries.length) {
            db.close();
            
            const withinLimits = 
              (!this.maxUsers || results.users <= this.maxUsers) &&
              (!this.maxDoors || results.doors <= this.maxDoors) &&
              (!this.maxSites || results.sites <= this.maxSites);
            
            resolve({ withinLimits, usage: results });
          }
        });
      });
    });
  }
}

module.exports = { License };