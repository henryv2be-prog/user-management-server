const { getDatabase } = require('./init');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.role = data.role;
    this.isActive = data.is_active;
    this.emailVerified = data.email_verified;
    this.lastLogin = data.last_login;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Remove sensitive data before sending to client
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(userData) {
    return new Promise((resolve, reject) => {
      const { email, password, firstName, lastName, role = 'user' } = userData;
      
      if (!email || !password || !firstName || !lastName) {
        reject(new Error('Missing required fields'));
        return;
      }

      bcrypt.hash(password, BCRYPT_ROUNDS, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        const db = getDatabase();
        db.run(
          'INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [email, hash, firstName, lastName, role, 1, 0],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                reject(new Error('Email already exists'));
              } else {
                reject(err);
              }
              return;
            }
            
            // Return the created user
            User.findById(this.lastID)
              .then(resolve)
              .catch(reject);
          }
        );
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get(
        'SELECT * FROM users WHERE id = ?',
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
          
          resolve(new User(row));
        }
      );
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(new User(row));
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 10, role, isActive, search } = options;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM users WHERE 1=1';
      const params = [];
      
      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }
      
      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const db = getDatabase();
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const users = rows.map(row => new User(row));
        resolve(users);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { role, isActive, search } = options;
      
      let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
      const params = [];
      
      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }
      
      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }
      
      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
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
      const allowedFields = ['first_name', 'last_name', 'role', 'is_active', 'email_verified'];
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
      
      const db = getDatabase();
      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Return updated user
          User.findById(this.id)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  }

  async updatePassword(newPassword) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(newPassword, BCRYPT_ROUNDS, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }
        
        const db = getDatabase();
        db.run(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [hash, this.id],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            resolve(true);
          }
        );
      });
    });
  }

  async verifyPassword(password) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [this.id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(false);
            return;
          }
          
          bcrypt.compare(password, row.password_hash, (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            
            resolve(result);
          });
        }
      );
    });
  }

  async updateLastLogin() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
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
        'DELETE FROM users WHERE id = ?',
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

  generateToken() {
    const payload = {
      id: this.id,
      email: this.email,
      role: this.role
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid token');
    }
  }

  hasRole(requiredRole) {
    const roleHierarchy = {
      'user': 1,
      'moderator': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[this.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
}

module.exports = { User };

