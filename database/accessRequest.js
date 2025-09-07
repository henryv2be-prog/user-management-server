const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.db');

class AccessRequest {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.doorId = data.door_id;
    this.requestType = data.request_type; // 'qr_scan', 'manual', 'emergency'
    this.status = data.status; // 'pending', 'granted', 'denied', 'expired'
    this.reason = data.reason; // Reason for denial or additional info
    this.userAgent = data.user_agent;
    this.ipAddress = data.ip_address;
    this.qrCodeData = data.qr_code_data; // QR code data that was scanned
    this.requestedAt = data.requested_at;
    this.processedAt = data.processed_at;
    this.expiresAt = data.expires_at;
    
    // Related data (from JOINs)
    this.user = data.user;
    this.door = data.door;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      doorId: this.doorId,
      requestType: this.requestType,
      status: this.status,
      reason: this.reason,
      userAgent: this.userAgent,
      ipAddress: this.ipAddress,
      qrCodeData: this.qrCodeData,
      requestedAt: this.requestedAt,
      processedAt: this.processedAt,
      expiresAt: this.expiresAt,
      user: this.user,
      door: this.door
    };
  }

  // Static methods for database operations
  static async create(requestData) {
    return new Promise((resolve, reject) => {
      const { 
        userId, 
        doorId, 
        requestType = 'qr_scan', 
        userAgent, 
        ipAddress, 
        qrCodeData,
        expiresAt 
      } = requestData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `INSERT INTO access_requests 
         (user_id, door_id, request_type, status, user_agent, ip_address, qr_code_data, expires_at) 
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [userId, doorId, requestType, userAgent, ipAddress, qrCodeData, expiresAt],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created request
          AccessRequest.findById(this.lastID)
            .then(request => resolve(request))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT ar.*, 
                u.first_name, u.last_name, u.email, u.role,
                d.name as door_name, d.location, d.esp32_ip
         FROM access_requests ar
         LEFT JOIN users u ON ar.user_id = u.id
         LEFT JOIN doors d ON ar.door_id = d.id
         WHERE ar.id = ?`,
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
          
          const request = new AccessRequest(row);
          if (row.first_name) {
            request.user = {
              id: row.user_id,
              firstName: row.first_name,
              lastName: row.last_name,
              email: row.email,
              role: row.role
            };
          }
          if (row.door_name) {
            request.door = {
              id: row.door_id,
              name: row.door_name,
              location: row.location,
              esp32Ip: row.esp32_ip
            };
          }
          
          resolve(request);
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 10, status, userId, doorId, requestType } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (status) {
        whereClause += ' AND ar.status = ?';
        params.push(status);
      }
      if (userId) {
        whereClause += ' AND ar.user_id = ?';
        params.push(userId);
      }
      if (doorId) {
        whereClause += ' AND ar.door_id = ?';
        params.push(doorId);
      }
      if (requestType) {
        whereClause += ' AND ar.request_type = ?';
        params.push(requestType);
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(
        `SELECT ar.*, 
                u.first_name, u.last_name, u.email, u.role,
                d.name as door_name, d.location, d.esp32_ip
         FROM access_requests ar
         LEFT JOIN users u ON ar.user_id = u.id
         LEFT JOIN doors d ON ar.door_id = d.id
         ${whereClause}
         ORDER BY ar.requested_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const requests = rows.map(row => {
            const request = new AccessRequest(row);
            if (row.first_name) {
              request.user = {
                id: row.user_id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                role: row.role
              };
            }
            if (row.door_name) {
              request.door = {
                id: row.door_id,
                name: row.door_name,
                location: row.location,
                esp32Ip: row.esp32_ip
              };
            }
            return request;
          });
          
          resolve(requests);
        }
      );
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { status, userId, doorId, requestType } = options;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }
      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }
      if (doorId) {
        whereClause += ' AND door_id = ?';
        params.push(doorId);
      }
      if (requestType) {
        whereClause += ' AND request_type = ?';
        params.push(requestType);
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT COUNT(*) as count FROM access_requests ${whereClause}`,
        params,
        (err, row) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(row.count);
        }
      );
    });
  }

  async update(updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['status', 'reason', 'processed_at'];
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
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `UPDATE access_requests SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Update local properties
          Object.assign(this, updateData);
          resolve(this);
        }
      );
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM access_requests WHERE id = ?',
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
}

module.exports = AccessRequest;
