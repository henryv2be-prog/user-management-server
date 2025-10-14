const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - use environment variable for Render compatibility
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

class Visitor {
    constructor(data = {}) {
        this.id = data.id;
        this.userId = data.user_id;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.email = data.email;
        this.phone = data.phone;
        this.validFrom = data.valid_from;
        this.validUntil = data.valid_until;
        this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
        this.accessEventLimit = data.access_event_limit || 0;
        this.remainingAccessEvents = data.remaining_access_events || 0;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.createdBy = data.created_by;
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            phone: this.phone,
            validFrom: this.validFrom,
            validUntil: this.validUntil,
            isActive: this.isActive,
            accessEventLimit: this.accessEventLimit,
            remainingAccessEvents: this.remainingAccessEvents,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy
        };
    }

    // Check if visitor is currently valid
    isValid() {
        if (!this.isActive) return false;
        
        const now = new Date();
        const validFrom = new Date(this.validFrom);
        const validUntil = new Date(this.validUntil);
        
        // Check date validity
        if (now < validFrom || now > validUntil) return false;
        
        // Check if visitor has remaining access events
        if (this.remainingAccessEvents <= 0) return false;
        
        return true;
    }

    // Static methods for database operations
    
    // Create new visitor
    static async create(visitorData) {
        const { 
            userId, 
            firstName, 
            lastName, 
            email, 
            phone, 
            validFrom, 
            validUntil, 
            createdBy 
        } = visitorData;
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.run(`INSERT INTO visitors (
                user_id, first_name, last_name, email, phone, 
                valid_from, valid_until, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [userId, firstName, lastName, email, phone, validFrom, validUntil, createdBy], 
                function(err) {
                db.close();
                if (err) {
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

    // Find visitors by user ID
    static async findByUserId(userId, options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT * FROM visitors WHERE user_id = ?";
            const params = [userId];
            const conditions = [];
            
            if (options.activeOnly) {
                conditions.push("is_active = 1");
            }
            
            if (options.validOnly) {
                conditions.push("is_active = 1 AND valid_from <= CURRENT_TIMESTAMP AND valid_until >= CURRENT_TIMESTAMP");
            }
            
            if (options.search) {
                conditions.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
                const searchTerm = `%${options.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            if (conditions.length > 0) {
                sql += " AND " + conditions.join(" AND ");
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

    // Find all visitors with optional filters (admin only)
    static async findAll(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = `SELECT v.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
                      FROM visitors v
                      LEFT JOIN users u ON v.user_id = u.id`;
            const params = [];
            const conditions = [];
            
            if (options.activeOnly) {
                conditions.push("v.is_active = 1");
            }
            
            if (options.validOnly) {
                conditions.push("v.is_active = 1 AND v.valid_from <= CURRENT_TIMESTAMP AND v.valid_until >= CURRENT_TIMESTAMP");
            }
            
            if (options.userId) {
                conditions.push("v.user_id = ?");
                params.push(options.userId);
            }
            
            if (options.search) {
                conditions.push("(v.first_name LIKE ? OR v.last_name LIKE ? OR v.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)");
                const searchTerm = `%${options.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
            }

            sql += " ORDER BY v.created_at DESC";
            
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
                resolve(rows.map(row => ({
                    ...new Visitor(row).toJSON(),
                    user: {
                        id: row.user_id,
                        firstName: row.user_first_name,
                        lastName: row.user_last_name,
                        email: row.user_email
                    }
                })));
            });
        });
    }
    // Count visitors with optional filters
    static async count(options = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            let sql = "SELECT COUNT(*) as count FROM visitors v";
            const params = [];
            const conditions = [];
            
            if (options.activeOnly) {
                conditions.push("v.is_active = 1");
            }
            
            if (options.validOnly) {
                conditions.push("v.is_active = 1 AND v.valid_from <= CURRENT_TIMESTAMP AND v.valid_until >= CURRENT_TIMESTAMP");
            }
            
            if (options.userId) {
                conditions.push("v.user_id = ?");
                params.push(options.userId);
            }
            
            if (options.search) {
                conditions.push("(v.first_name LIKE ? OR v.last_name LIKE ? OR v.email LIKE ?)");
                const searchTerm = `%${options.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
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
            const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'valid_from', 'valid_until', 'is_active'];
            const updates = [];
            const params = [];
            
            // Map camelCase to snake_case for database fields
            const fieldMapping = {
                'firstName': 'first_name',
                'lastName': 'last_name',
                'validFrom': 'valid_from',
                'validUntil': 'valid_until',
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
            
            db.run("DELETE FROM visitors WHERE id = ?", [this.id], (err) => {
                db.close();
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    // Get visitor's user information
    async getUser() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            db.get(
                "SELECT id, first_name, last_name, email, role FROM users WHERE id = ?",
                [this.userId],
                (err, row) => {
                    db.close();
                    if (err) {
                        return reject(err);
                    }
                    resolve(row);
                }
            );
        });
    }

    // Use an access event (decrement remaining events)
    async useAccessEvent() {
        if (this.remainingAccessEvents <= 0) {
            throw new Error('No remaining access events');
        }

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            const sql = `
                UPDATE visitors 
                SET remaining_access_events = remaining_access_events - 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            db.run(sql, [this.id], (err) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                // Update local instance
                this.remainingAccessEvents -= 1;
                this.updatedAt = new Date().toISOString();
                
                db.close();
                resolve(this);
            });
        });
    }

    // Add more access events
    async addAccessEvents(additionalEvents) {
        if (additionalEvents <= 0) {
            throw new Error('Additional events must be positive');
        }

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            const sql = `
                UPDATE visitors 
                SET remaining_access_events = remaining_access_events + ?,
                    access_event_limit = access_event_limit + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            db.run(sql, [additionalEvents, additionalEvents, this.id], (err) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                // Update local instance
                this.remainingAccessEvents += additionalEvents;
                this.accessEventLimit += additionalEvents;
                this.updatedAt = new Date().toISOString();
                
                db.close();
                resolve(this);
            });
        });
    }

    // Reset access events to original limit
    async resetAccessEvents() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            const sql = `
                UPDATE visitors 
                SET remaining_access_events = access_event_limit,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            db.run(sql, [this.id], (err) => {
                if (err) {
                    db.close();
                    return reject(err);
                }
                
                // Update local instance
                this.remainingAccessEvents = this.accessEventLimit;
                this.updatedAt = new Date().toISOString();
                
                db.close();
                resolve(this);
            });
        });
    }
}

module.exports = { Visitor };
