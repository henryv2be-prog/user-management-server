const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, 'users.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at:', DB_PATH);
});

// Initialize database tables
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(__dirname, 'users.db');
        const db = new sqlite3.Database(dbPath);
        
        let completedTables = 0;
        const totalTables = 15; // users, doors, access_groups, door_access_groups, user_access_groups, access_log, admin_user, sites, areas, power_monitoring, door_status, door_sensors, cameras, licenses, offline_cache
        
        const checkCompletion = () => {
            completedTables++;
            if (completedTables === totalTables) {
                db.close();
                resolve();
            }
        };
        
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                role TEXT DEFAULT 'user',
                email_verified INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Users table created/verified');
                checkCompletion();
            });

            // Doors table
            db.run(`CREATE TABLE IF NOT EXISTS doors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                esp32_ip TEXT,
                esp32_mac TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating doors table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Doors table created/verified');
                checkCompletion();
            });

            // Access groups table
            db.run(`CREATE TABLE IF NOT EXISTS access_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating access_groups table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Access groups table created/verified');
                checkCompletion();
            });

            // Door access groups junction table
            db.run(`CREATE TABLE IF NOT EXISTS door_access_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                door_id INTEGER NOT NULL,
                access_group_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE,
                FOREIGN KEY (access_group_id) REFERENCES access_groups (id) ON DELETE CASCADE,
                UNIQUE(door_id, access_group_id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating door_access_groups table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Door access groups table created/verified');
                checkCompletion();
            });

            // User access groups junction table
            db.run(`CREATE TABLE IF NOT EXISTS user_access_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                access_group_id INTEGER NOT NULL,
                granted_by INTEGER,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (access_group_id) REFERENCES access_groups (id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL,
                UNIQUE(user_id, access_group_id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating user_access_groups table:', err.message);
                    reject(err);
                    return;
                }
                console.log('User access groups table created/verified');
                checkCompletion();
            });

            // Access log table
            db.run(`CREATE TABLE IF NOT EXISTS access_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                door_id INTEGER NOT NULL,
                access_granted INTEGER NOT NULL,
                access_reason TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating access_log table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Access log table created/verified');
                checkCompletion();
            });

            // Create indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`, (err) => {
                if (err) console.error('Error creating users username index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (err) => {
                if (err) console.error('Error creating users email index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_doors_esp32_ip ON doors(esp32_ip)`, (err) => {
                if (err) console.error('Error creating doors esp32_ip index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_doors_esp32_mac ON doors(esp32_mac)`, (err) => {
                if (err) console.error('Error creating doors esp32_mac index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_timestamp ON access_log(timestamp)`, (err) => {
                if (err) console.error('Error creating access_log timestamp index:', err.message);
            });

            // Sites table for multi-site support
            db.run(`CREATE TABLE IF NOT EXISTS sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                address TEXT,
                timezone TEXT DEFAULT 'UTC',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating sites table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Sites table created/verified');
                checkCompletion();
            });

            // Areas/Zones table
            db.run(`CREATE TABLE IF NOT EXISTS areas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                site_id INTEGER,
                parent_area_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE CASCADE,
                FOREIGN KEY (parent_area_id) REFERENCES areas (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating areas table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Areas table created/verified');
                checkCompletion();
            });

            // Power monitoring table
            db.run(`CREATE TABLE IF NOT EXISTS power_monitoring (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                door_id INTEGER NOT NULL,
                voltage REAL,
                current REAL,
                power REAL,
                battery_level INTEGER,
                temperature REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating power_monitoring table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Power monitoring table created/verified');
                checkCompletion();
            });

            // Door status table
            db.run(`CREATE TABLE IF NOT EXISTS door_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                door_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'locked', 'unlocked')),
                locked BOOLEAN DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating door_status table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Door status table created/verified');
                checkCompletion();
            });

            // Door sensors table
            db.run(`CREATE TABLE IF NOT EXISTS door_sensors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                door_id INTEGER NOT NULL,
                sensor_type TEXT NOT NULL CHECK (sensor_type IN ('dps', 'magnetic', 'reed_switch', 'ultrasonic', 'pir')),
                sensor_pin INTEGER,
                is_active BOOLEAN DEFAULT 1,
                last_reading DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating door_sensors table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Door sensors table created/verified');
                checkCompletion();
            });

            // Cameras table
            db.run(`CREATE TABLE IF NOT EXISTS cameras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                door_id INTEGER,
                area_id INTEGER,
                ip_address TEXT,
                port INTEGER DEFAULT 80,
                username TEXT,
                password TEXT,
                stream_url TEXT,
                recording_enabled BOOLEAN DEFAULT 0,
                motion_detection BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE SET NULL,
                FOREIGN KEY (area_id) REFERENCES areas (id) ON DELETE SET NULL
            )`, (err) => {
                if (err) {
                    console.error('Error creating cameras table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Cameras table created/verified');
                checkCompletion();
            });

            // Licenses table
            db.run(`CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'basic', 'professional', 'enterprise')),
                features TEXT, -- JSON array of enabled features
                max_users INTEGER,
                max_doors INTEGER,
                max_sites INTEGER,
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating licenses table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Licenses table created/verified');
                checkCompletion();
            });

            // Offline cache table
            db.run(`CREATE TABLE IF NOT EXISTS offline_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE NOT NULL,
                cache_data TEXT NOT NULL, -- JSON data
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating offline_cache table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Offline cache table created/verified');
                checkCompletion();
            });

            // Update doors table to include new fields
            db.run(`ALTER TABLE doors ADD COLUMN site_id INTEGER REFERENCES sites(id)`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding site_id to doors:', err.message);
                }
            });

            db.run(`ALTER TABLE doors ADD COLUMN area_id INTEGER REFERENCES areas(id)`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding area_id to doors:', err.message);
                }
            });

            db.run(`ALTER TABLE doors ADD COLUMN access_type TEXT DEFAULT 'card' CHECK (access_type IN ('card', 'qr', 'nfc', 'biometric'))`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding access_type to doors:', err.message);
                }
            });

            db.run(`ALTER TABLE doors ADD COLUMN override_enabled BOOLEAN DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding override_enabled to doors:', err.message);
                }
            });

            db.run(`ALTER TABLE doors ADD COLUMN mesh_node_id TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding mesh_node_id to doors:', err.message);
                }
            });

            // Insert default admin user if no users exist
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error('Error checking users count:', err.message);
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    const bcrypt = require('bcryptjs');
                    const hashedPassword = bcrypt.hashSync('admin123', 10);
                    
                    db.run(`INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        ['admin', 'admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1],
                        function(err) {
                            if (err) {
                                console.error('Error creating default admin user:', err.message);
                                reject(err);
                                return;
                            }
                            console.log('Default admin user created (username: admin, password: admin123)');
                            checkCompletion();
                        }
                    );
                } else {
                    console.log('Users already exist, skipping default admin creation');
                    checkCompletion();
                }
            });
        });
    });
};

// Export the initialization function
module.exports = { initDatabase };

// Run initialization if this file is run directly
if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('Database initialization completed successfully');
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                    process.exit(1);
                }
                console.log('Database connection closed');
                process.exit(0);
            });
        })
        .catch((err) => {
            console.error('Database initialization failed:', err.message);
            db.close();
            process.exit(1);
        });
}