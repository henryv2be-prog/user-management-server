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

    // Hash password
    static async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }

    // Create new user
    static async create(userData) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            const { username, email, password, firstName, lastName, role = 'user' } = userData;
            
            // Hash password
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    db.close();
                    return reject(err);
                }

                const sql = `INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`;
                
                db.run(sql, [username, email, hashedPassword, firstName, lastName, role, 0], function(err) {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(this.lastID);
                });
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

    // Get all users
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
            
            if (options.limit) {
                sql += " LIMIT ?";
                params.push(options.limit);
            }
            
            db.all(sql, params, (err, rows) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => new User(row)));
            });
        });
    }

    // Update user
    async update(updateData) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // Map camelCase to snake_case for database fields
            const fieldMapping = {
                firstName: 'first_name',
                lastName: 'last_name',

                emailVerified: 'email_verified'
            };
            
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (key === 'password') {
                    // Hash password if provided
                    bcrypt.hash(value, 10, (err, hashedPassword) => {
                        if (err) {
                            db.close();
                            return reject(err);
                        }
                        fields.push('password_hash = ?');
                        values.push(hashedPassword);
                        this._performUpdate(db, fields, values, resolve, reject);
                    });
                    return;
                } else if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
                    const dbField = fieldMapping[key] || key;
                    fields.push(`${dbField} = ?`);
                    values.push(value);
                }
            }
            
            if (fields.length === 0) {
                db.close();
                return resolve();
            }
            
            this._performUpdate(db, fields, values, resolve, reject);
        });
    }

    _performUpdate(db, fields, values, resolve, reject) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(this.id);
        
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        
        db.run(sql, values, function(err) {
            db.close();
            if (err) {
                return reject(err);
            }
            
            // Update local object
            Object.assign(this, updateData);
            resolve(this.changes > 0);
        }.bind(this));
    }

    // Delete user
    async delete() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("DELETE FROM users WHERE id = ?", [this.id], function(err) {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(this.changes > 0);
            });
        });
    }

    // Get user statistics
    static async getStats() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            const queries = [
                "SELECT COUNT(*) as total FROM users",
                "SELECT COUNT(*) as active FROM users",
                "SELECT COUNT(*) as admins FROM users WHERE role = 'admin'",
                "SELECT COUNT(*) as verified FROM users WHERE email_verified = 1"
            ];
            
            Promise.all(queries.map(query => 
                new Promise((resolveQuery, rejectQuery) => {
                    db.get(query, (err, row) => {
                        if (err) rejectQuery(err);
                        else resolveQuery(row);
                    });
                })
            )).then(results => {
                db.close();
                resolve({
                    total: results[0].total,
                    active: results[1].active,
                    admins: results[2].admins,
                    verified: results[3].verified
                });
            }).catch(err => {
                db.close();
                reject(err);
            });
        });
    }
}

module.exports = { User };