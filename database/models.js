const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.passwordHash = data.password_hash;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.role = data.role || 'user';

        this.emailVerified = data.email_verified !== undefined ? Boolean(data.email_verified) : false;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        const { passwordHash, ...safeData } = this;
        return safeData;
    }

    // Check if user has a specific role
    hasRole(role) {
        return this.role === role;
    }

    // Verify password
    async verifyPassword(password) {
        return bcrypt.compare(password, this.passwordHash);
    }

    // Update password
    async updatePassword(newPassword) {
        const saltRounds = 10;
        this.passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                [this.passwordHash, this.id], (err) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    // Static methods for database operations
    
    // Create new user
    static async create(userData) {
        const { username, email, password, firstName, lastName, role = 'user' } = userData;
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)", 
                [username, email, passwordHash, firstName, lastName, role], function(err) {
                db.close();
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        return reject(new Error('Email already exists'));
                    }
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    // Find user by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new User(row) : null);
            });
        });
    }

    // Find user by username
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new User(row) : null);
            });
        });
    }

    // Find user by email
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new User(row) : null);
            });
        });
    }

    // Find all users with optional filters
    static async findAll(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT * FROM users";
            const params = [];
            
            if (options.activeOnly) {

            }
            
            if (options.role) {
                sql += options.activeOnly ? " AND role = ?" : " WHERE role = ?";
                params.push(options.role);
            }

            sql += " ORDER BY created_at DESC";
            
            db.all(sql, params, (err, rows) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => new User(row)));
            });
        });
    }

    // Count users with optional filters
    static async count(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT COUNT(*) as count FROM users";
            const params = [];
            
            if (options.activeOnly) {
                sql += " WHERE is_active = 1";
            }
            
            if (options.role) {
                sql += options.activeOnly ? " AND role = ?" : " WHERE role = ?";
                params.push(options.role);
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

    // Update user
    async update(updateData) {
        return new Promise((resolve, reject) => {
            const allowedFields = ['username', 'email', 'first_name', 'last_name', 'role'];
            const updates = [];
            const params = [];
            
            // Map camelCase to snake_case for database fields
            const fieldMapping = {
                'firstName': 'first_name',
                'lastName': 'last_name'
            };
            
            for (const [key, value] of Object.entries(updateData)) {
                const dbField = fieldMapping[key] || key;
                if (allowedFields.includes(dbField) && value !== undefined) {
                    updates.push(`${dbField} = ?`);
                    params.push(value);
                }
            }
            
            if (updates.length === 0) {
                return resolve(this);
            }
            
            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(this.id);
            
            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            
            const db = new sqlite3.Database(DB_PATH);
            
            db.run(sql, params, (err) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                // Fetch updated user
                db.get("SELECT * FROM users WHERE id = ?", [this.id], (err, row) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(new User(row));
                });
            });
        });
    }

    // Delete user
    async delete() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // First delete related records
            db.serialize(() => {
                db.run("DELETE FROM user_access_groups WHERE user_id = ?", [this.id]);
                db.run("DELETE FROM access_log WHERE user_id = ?", [this.id]);
                db.run("DELETE FROM users WHERE id = ?", [this.id], (err) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(true);
                });
            });
        });
    }

    // Get user's access groups
    async getAccessGroups() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            db.all(
                `SELECT ag.id, ag.name, ag.description
                 FROM access_groups ag
                 JOIN user_access_groups uag ON ag.id = uag.access_group_id
                 WHERE uag.user_id = ?`,
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

    // Update user's access groups
    async updateAccessGroups(accessGroupIds) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.serialize(() => {
                // Remove all existing access groups for this user
                db.run('DELETE FROM user_access_groups WHERE user_id = ?', [this.id], (err) => {
                    if (err) {
                        db.close();
                        reject(err);
                        return;
                    }
                });
                
                // Add new access groups
                if (accessGroupIds && accessGroupIds.length > 0) {
                    const stmt = db.prepare('INSERT INTO user_access_groups (user_id, access_group_id) VALUES (?, ?)');
                    
                    accessGroupIds.forEach(accessGroupId => {
                        stmt.run([this.id, accessGroupId]);
                    });
                    
                    stmt.finalize((err) => {
                        db.close();
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    db.close();
                    resolve();
                }
            });
        });
    }
}

module.exports = { User };