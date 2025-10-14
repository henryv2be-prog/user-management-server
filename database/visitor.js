const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path - use environment variable for Render compatibility
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

class Visitor {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.passwordHash = data.password_hash;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.hostUserId = data.host_user_id;
        this.accessInstances = data.access_instances || 2;
        this.remainingInstances = data.remaining_instances || 2;
        this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        const { passwordHash, ...safeData } = this;
        return safeData;
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
            
            db.run("UPDATE visitors SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                [this.passwordHash, this.id], (err) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    // Update remaining instances
    async updateRemainingInstances(newCount) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("UPDATE visitors SET remaining_instances = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                [newCount, this.id], (err) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                this.remainingInstances = newCount;
                resolve(true);
            });
        });
    }

    // Add more access instances
    async addAccessInstances(additionalInstances) {
        const newTotal = this.accessInstances + additionalInstances;
        const newRemaining = this.remainingInstances + additionalInstances;
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("UPDATE visitors SET access_instances = ?, remaining_instances = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                [newTotal, newRemaining, this.id], (err) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                this.accessInstances = newTotal;
                this.remainingInstances = newRemaining;
                resolve(true);
            });
        });
    }

    // Log access attempt
    async logAccess(doorId, accessGranted, reason = null) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("INSERT INTO visitor_access_log (visitor_id, door_id, access_granted, access_reason) VALUES (?, ?, ?, ?)", 
                [this.id, doorId, accessGranted ? 1 : 0, reason], function(err) {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    // Get access history
    async getAccessHistory(limit = 50) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.all(`
                SELECT val.*, d.name as door_name, d.location as door_location
                FROM visitor_access_log val
                JOIN doors d ON val.door_id = d.id
                WHERE val.visitor_id = ?
                ORDER BY val.timestamp DESC
                LIMIT ?
            `, [this.id, limit], (err, rows) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    // Static methods for database operations
    
    // Create new visitor
    static async create(visitorData) {
        const { username, email, password, firstName, lastName, hostUserId, accessInstances = 2 } = visitorData;
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run("INSERT INTO visitors (username, email, password_hash, first_name, last_name, host_user_id, access_instances, remaining_instances) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                [username, email, passwordHash, firstName, lastName, hostUserId, accessInstances, accessInstances], function(err) {
                db.close();
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: visitors.email')) {
                        return reject(new Error('Email already exists'));
                    }
                    if (err.message.includes('UNIQUE constraint failed: visitors.username')) {
                        return reject(new Error('Username already exists'));
                    }
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    // Find visitor by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM visitors WHERE id = ?", [id], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new Visitor(row) : null);
            });
        });
    }

    // Find visitor by username
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM visitors WHERE username = ?", [username], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new Visitor(row) : null);
            });
        });
    }

    // Find visitor by email
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get("SELECT * FROM visitors WHERE email = ?", [email], (err, row) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(row ? new Visitor(row) : null);
            });
        });
    }

    // Find visitors by host user ID
    static async findByHostUserId(hostUserId) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.all("SELECT * FROM visitors WHERE host_user_id = ? ORDER BY created_at DESC", [hostUserId], (err, rows) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => new Visitor(row)));
            });
        });
    }

    // Find all visitors with optional filters
    static async findAll(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT * FROM visitors";
            const params = [];
            const conditions = [];
            
            if (options.activeOnly) {
                conditions.push("is_active = 1");
            }
            
            if (options.hostUserId) {
                conditions.push("host_user_id = ?");
                params.push(options.hostUserId);
            }
            
            if (options.search) {
                conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)");
                const searchTerm = `%${options.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
            }

            sql += " ORDER BY created_at DESC";
            
            // Add pagination if specified
            if (options.limit) {
                sql += " LIMIT ?";
                params.push(options.limit);
                
                if (options.page && options.page > 1) {
                    sql += " OFFSET ?";
                    params.push((options.page - 1) * options.limit);
                }
            }
            
            db.all(sql, params, (err, rows) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => new Visitor(row)));
            });
        });
    }

    // Count visitors with optional filters
    static async count(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT COUNT(*) as count FROM visitors";
            const params = [];
            const conditions = [];
            
            if (options.activeOnly) {
                conditions.push("is_active = 1");
            }
            
            if (options.hostUserId) {
                conditions.push("host_user_id = ?");
                params.push(options.hostUserId);
            }
            
            if (options.search) {
                conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)");
                const searchTerm = `%${options.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
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

    // Update visitor
    async update(updateData) {
        return new Promise((resolve, reject) => {
            const allowedFields = ['username', 'email', 'first_name', 'last_name', 'is_active'];
            const updates = [];
            const params = [];
            
            // Map camelCase to snake_case for database fields
            const fieldMapping = {
                'firstName': 'first_name',
                'lastName': 'last_name',
                'isActive': 'is_active'
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
            
            const sql = `UPDATE visitors SET ${updates.join(', ')} WHERE id = ?`;
            
            const db = new sqlite3.Database(DB_PATH);
            
            db.run(sql, params, (err) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                // Fetch updated visitor
                db.get("SELECT * FROM visitors WHERE id = ?", [this.id], (err, row) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(new Visitor(row));
                });
            });
        });
    }

    // Delete visitor
    async delete() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // First delete related records
            db.serialize(() => {
                db.run("DELETE FROM visitor_access_log WHERE visitor_id = ?", [this.id]);
                db.run("DELETE FROM visitors WHERE id = ?", [this.id], (err) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(true);
                });
            });
        });
    }

    // Check if visitor has access to a door
    static async checkDoorAccess(visitorId, doorId) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // First check if visitor has remaining instances
            db.get("SELECT remaining_instances FROM visitors WHERE id = ? AND is_active = 1", [visitorId], (err, visitor) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                if (!visitor) {
                    db.close();
                    return resolve({ hasAccess: false, reason: 'Visitor not found or inactive' });
                }
                
                if (visitor.remaining_instances <= 0) {
                    db.close();
                    return resolve({ hasAccess: false, reason: 'No remaining access instances' });
                }
                
                // Check if visitor's host has access to this door
                db.get(`
                    SELECT d.id 
                    FROM doors d
                    JOIN door_access_groups dag ON d.id = dag.door_id
                    JOIN user_access_groups uag ON dag.access_group_id = uag.access_group_id
                    JOIN visitors v ON uag.user_id = v.host_user_id
                    WHERE v.id = ? AND d.id = ?
                `, [visitorId, doorId], (err, door) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    
                    if (!door) {
                        return resolve({ hasAccess: false, reason: 'Host user does not have access to this door' });
                    }
                    
                    return resolve({ hasAccess: true, reason: 'Access granted' });
                });
            });
        });
    }

    // Process door access attempt
    static async processAccessAttempt(visitorId, doorId) {
        return new Promise(async (resolve, reject) => {
            try {
                const accessCheck = await Visitor.checkDoorAccess(visitorId, doorId);
                
                if (!accessCheck.hasAccess) {
                    // Log denied access
                    const visitor = await Visitor.findById(visitorId);
                    if (visitor) {
                        await visitor.logAccess(doorId, false, accessCheck.reason);
                    }
                    return resolve({ accessGranted: false, reason: accessCheck.reason });
                }
                
                // Grant access and decrement remaining instances
                const visitor = await Visitor.findById(visitorId);
                if (visitor) {
                    await visitor.updateRemainingInstances(visitor.remainingInstances - 1);
                    await visitor.logAccess(doorId, true, 'Access granted');
                }
                
                return resolve({ accessGranted: true, reason: 'Access granted' });
            } catch (error) {
                return reject(error);
            }
        });
    }
}

module.exports = { Visitor };
