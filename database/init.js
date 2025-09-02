const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/users.db';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log('Connected to SQLite database');
    });
  }
  return db;
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // Enable foreign keys
    database.run('PRAGMA foreign_keys = ON');
    
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user', 'moderator')),
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create user_sessions table for token management
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;
    
    // Create audit_log table for tracking changes
    const createAuditLogTable = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `;
    
    // Create indexes for better performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)'
    ];
    
    // Create trigger to update updated_at timestamp
    const createUpdateTrigger = `
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;
    
    database.serialize(() => {
      // Create tables
      database.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Users table created/verified');
      });
      
      database.run(createSessionsTable, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Sessions table created/verified');
      });
      
      database.run(createAuditLogTable, (err) => {
        if (err) {
          console.error('Error creating audit_log table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Audit log table created/verified');
      });
      
      // Create indexes
      createIndexes.forEach((indexSQL, i) => {
        database.run(indexSQL, (err) => {
          if (err) {
            console.error(`Error creating index ${i + 1}:`, err.message);
          }
        });
      });
      
      // Create trigger
      database.run(createUpdateTrigger, (err) => {
        if (err) {
          console.error('Error creating update trigger:', err.message);
        }
      });
      
      // Create default admin user if no users exist
      database.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          console.error('Error checking user count:', err.message);
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          createDefaultAdmin()
            .then(() => {
              console.log('✅ Default admin user created');
              resolve();
            })
            .catch(reject);
        } else {
          console.log('✅ Database initialization complete');
          resolve();
        }
      });
    });
  });
}

function createDefaultAdmin() {
  return new Promise((resolve, reject) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';
    
    bcrypt.hash(adminPassword, BCRYPT_ROUNDS, (err, hash) => {
      if (err) {
        reject(err);
        return;
      }
      
      const database = getDatabase();
      database.run(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminEmail, hash, adminFirstName, adminLastName, 'admin', 1, 1],
        function(err) {
          if (err) {
            console.error('Error creating default admin:', err.message);
            reject(err);
            return;
          }
          
          console.log(`✅ Default admin user created with ID: ${this.lastID}`);
          console.log(`📧 Email: ${adminEmail}`);
          console.log(`🔑 Password: ${adminPassword}`);
          console.log('⚠️  Please change the default password after first login!');
          resolve();
        }
      );
    });
  });
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};

