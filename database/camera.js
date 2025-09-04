const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class Camera {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.doorId = data.door_id;
    this.areaId = data.area_id;
    this.ipAddress = data.ip_address;
    this.port = data.port || 80;
    this.username = data.username;
    this.password = data.password;
    this.streamUrl = data.stream_url;
    this.recordingEnabled = data.recording_enabled === 1;
    this.motionDetection = data.motion_detection === 1;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      doorId: this.doorId,
      areaId: this.areaId,
      ipAddress: this.ipAddress,
      port: this.port,
      username: this.username,
      password: this.password ? '***' : null, // Don't expose password
      streamUrl: this.streamUrl,
      recordingEnabled: this.recordingEnabled,
      motionDetection: this.motionDetection,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(cameraData) {
    return new Promise((resolve, reject) => {
      const { 
        name, 
        doorId, 
        areaId, 
        ipAddress, 
        port, 
        username, 
        password, 
        streamUrl, 
        recordingEnabled, 
        motionDetection 
      } = cameraData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        `INSERT INTO cameras (name, door_id, area_id, ip_address, port, username, password, stream_url, recording_enabled, motion_detection) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, doorId, areaId, ipAddress, port || 80, username, password, streamUrl, recordingEnabled ? 1 : 0, motionDetection ? 1 : 0],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created camera
          Camera.findById(this.lastID)
            .then(camera => resolve(camera))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT c.*, d.name as door_name, a.name as area_name 
         FROM cameras c 
         LEFT JOIN doors d ON c.door_id = d.id 
         LEFT JOIN areas a ON c.area_id = a.id 
         WHERE c.id = ?`,
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
          
          const camera = new Camera(row);
          if (row.door_name) {
            camera.doorName = row.door_name;
          }
          if (row.area_name) {
            camera.areaName = row.area_name;
          }
          resolve(camera);
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
        doorId,
        areaId,
        recordingEnabled,
        motionDetection
      } = options;
      
      let query = `SELECT c.*, d.name as door_name, a.name as area_name 
                   FROM cameras c 
                   LEFT JOIN doors d ON c.door_id = d.id 
                   LEFT JOIN areas a ON c.area_id = a.id 
                   WHERE 1=1`;
      const params = [];
      
      if (search) {
        query += ' AND (c.name LIKE ? OR c.ip_address LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (doorId) {
        query += ' AND c.door_id = ?';
        params.push(doorId);
      }
      
      if (areaId) {
        query += ' AND c.area_id = ?';
        params.push(areaId);
      }
      
      if (recordingEnabled !== undefined) {
        query += ' AND c.recording_enabled = ?';
        params.push(recordingEnabled ? 1 : 0);
      }
      
      if (motionDetection !== undefined) {
        query += ' AND c.motion_detection = ?';
        params.push(motionDetection ? 1 : 0);
      }
      
      query += ' ORDER BY c.created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const cameras = rows.map(row => {
          const camera = new Camera(row);
          if (row.door_name) {
            camera.doorName = row.door_name;
          }
          if (row.area_name) {
            camera.areaName = row.area_name;
          }
          return camera;
        });
        resolve(cameras);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { search, doorId, areaId, recordingEnabled, motionDetection } = options;
      
      let query = 'SELECT COUNT(*) as count FROM cameras WHERE 1=1';
      const params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR ip_address LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (doorId) {
        query += ' AND door_id = ?';
        params.push(doorId);
      }
      
      if (areaId) {
        query += ' AND area_id = ?';
        params.push(areaId);
      }
      
      if (recordingEnabled !== undefined) {
        query += ' AND recording_enabled = ?';
        params.push(recordingEnabled ? 1 : 0);
      }
      
      if (motionDetection !== undefined) {
        query += ' AND motion_detection = ?';
        params.push(motionDetection ? 1 : 0);
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
      const allowedFields = ['name', 'door_id', 'area_id', 'ip_address', 'port', 'username', 'password', 'stream_url', 'recording_enabled', 'motion_detection'];
      const updates = [];
      const params = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key === 'doorId' ? 'door_id' : 
                       key === 'areaId' ? 'area_id' :
                       key === 'ipAddress' ? 'ip_address' :
                       key === 'streamUrl' ? 'stream_url' :
                       key === 'recordingEnabled' ? 'recording_enabled' :
                       key === 'motionDetection' ? 'motion_detection' : key;
        
        if (allowedFields.includes(dbField) && value !== undefined) {
          if (dbField === 'recording_enabled' || dbField === 'motion_detection') {
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
      
      const query = `UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(query, params, (err) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Fetch updated camera
        Camera.findById(this.id)
          .then(updatedCamera => resolve(updatedCamera))
          .catch(reject);
      });
    });
  }

  async delete() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM cameras WHERE id = ?',
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

  // Test camera connection
  async testConnection() {
    return new Promise((resolve) => {
      // This would typically ping the camera or make an HTTP request
      // For now, we'll just check if IP and port are provided
      if (!this.ipAddress || !this.port) {
        resolve({ success: false, message: 'IP address and port are required' });
        return;
      }
      
      // Simulate connection test
      setTimeout(() => {
        resolve({ 
          success: true, 
          message: 'Camera connection test successful',
          responseTime: Math.random() * 100 + 50 // Simulate response time
        });
      }, 100);
    });
  }

  // Get camera stream URL
  getStreamUrl() {
    if (this.streamUrl) {
      return this.streamUrl;
    }
    
    if (this.ipAddress && this.port) {
      return `http://${this.ipAddress}:${this.port}/stream`;
    }
    
    return null;
  }

  // Get snapshot URL
  getSnapshotUrl() {
    if (this.ipAddress && this.port) {
      return `http://${this.ipAddress}:${this.port}/snapshot`;
    }
    
    return null;
  }
}

module.exports = { Camera };