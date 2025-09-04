const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

class PowerMonitoring {
  constructor(data) {
    this.id = data.id;
    this.doorId = data.door_id;
    this.voltage = data.voltage;
    this.current = data.current;
    this.power = data.power;
    this.batteryLevel = data.battery_level;
    this.temperature = data.temperature;
    this.timestamp = data.timestamp;
  }

  toJSON() {
    return {
      id: this.id,
      doorId: this.doorId,
      voltage: this.voltage,
      current: this.current,
      power: this.power,
      batteryLevel: this.batteryLevel,
      temperature: this.temperature,
      timestamp: this.timestamp
    };
  }

  // Static methods for database operations
  static async create(powerData) {
    return new Promise((resolve, reject) => {
      const { doorId, voltage, current, power, batteryLevel, temperature } = powerData;
      
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'INSERT INTO power_monitoring (door_id, voltage, current, power, battery_level, temperature) VALUES (?, ?, ?, ?, ?, ?)',
        [doorId, voltage, current, power, batteryLevel, temperature],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch the created power monitoring record
          PowerMonitoring.findById(this.lastID)
            .then(record => resolve(record))
            .catch(reject);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT pm.*, d.name as door_name 
         FROM power_monitoring pm 
         LEFT JOIN doors d ON pm.door_id = d.id 
         WHERE pm.id = ?`,
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
          
          const record = new PowerMonitoring(row);
          if (row.door_name) {
            record.doorName = row.door_name;
          }
          resolve(record);
        }
      );
    });
  }

  static async findByDoorId(doorId, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate
      } = options;
      
      let query = `SELECT pm.*, d.name as door_name 
                   FROM power_monitoring pm 
                   LEFT JOIN doors d ON pm.door_id = d.id 
                   WHERE pm.door_id = ?`;
      const params = [doorId];
      
      if (startDate) {
        query += ' AND pm.timestamp >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND pm.timestamp <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY pm.timestamp DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const records = rows.map(row => {
          const record = new PowerMonitoring(row);
          if (row.door_name) {
            record.doorName = row.door_name;
          }
          return record;
        });
        resolve(records);
      });
    });
  }

  static async getLatestByDoorId(doorId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get(
        `SELECT pm.*, d.name as door_name 
         FROM power_monitoring pm 
         LEFT JOIN doors d ON pm.door_id = d.id 
         WHERE pm.door_id = ? 
         ORDER BY pm.timestamp DESC 
         LIMIT 1`,
        [doorId],
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
          
          const record = new PowerMonitoring(row);
          if (row.door_name) {
            record.doorName = row.door_name;
          }
          resolve(record);
        }
      );
    });
  }

  static async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        doorId
      } = options;
      
      let query = `SELECT pm.*, d.name as door_name 
                   FROM power_monitoring pm 
                   LEFT JOIN doors d ON pm.door_id = d.id 
                   WHERE 1=1`;
      const params = [];
      
      if (doorId) {
        query += ' AND pm.door_id = ?';
        params.push(doorId);
      }
      
      if (startDate) {
        query += ' AND pm.timestamp >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND pm.timestamp <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY pm.timestamp DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
      
      const db = new sqlite3.Database(DB_PATH);
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        const records = rows.map(row => {
          const record = new PowerMonitoring(row);
          if (row.door_name) {
            record.doorName = row.door_name;
          }
          return record;
        });
        resolve(records);
      });
    });
  }

  static async count(options = {}) {
    return new Promise((resolve, reject) => {
      const { startDate, endDate, doorId } = options;
      
      let query = 'SELECT COUNT(*) as count FROM power_monitoring WHERE 1=1';
      const params = [];
      
      if (doorId) {
        query += ' AND door_id = ?';
        params.push(doorId);
      }
      
      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
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

  // Get power statistics for a door
  static async getStatistics(doorId, options = {}) {
    return new Promise((resolve, reject) => {
      const { startDate, endDate } = options;
      
      let query = `SELECT 
                     AVG(voltage) as avg_voltage,
                     MIN(voltage) as min_voltage,
                     MAX(voltage) as max_voltage,
                     AVG(current) as avg_current,
                     MIN(current) as min_current,
                     MAX(current) as max_current,
                     AVG(power) as avg_power,
                     MIN(power) as min_power,
                     MAX(power) as max_power,
                     AVG(battery_level) as avg_battery_level,
                     MIN(battery_level) as min_battery_level,
                     MAX(battery_level) as max_battery_level,
                     AVG(temperature) as avg_temperature,
                     MIN(temperature) as min_temperature,
                     MAX(temperature) as max_temperature,
                     COUNT(*) as record_count
                   FROM power_monitoring 
                   WHERE door_id = ?`;
      const params = [doorId];
      
      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
      }
      
      const db = new sqlite3.Database(DB_PATH);
      db.get(query, params, (err, row) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        resolve(row);
      });
    });
  }

  // Clean up old records (keep only last 30 days by default)
  static async cleanup(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.run(
        'DELETE FROM power_monitoring WHERE timestamp < datetime("now", "-" || ? || " days")',
        [daysToKeep],
        function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve(this.changes);
        }
      );
    });
  }
}

module.exports = { PowerMonitoring };