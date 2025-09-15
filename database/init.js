const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path - use environment variable for Render compatibility
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

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
        const totalTables = 9; // users, doors, access_groups, door_access_groups, user_access_groups, access_log, access_requests, events, admin_user
        
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
                last_seen DATETIME,
                is_online INTEGER DEFAULT 0,
                is_locked INTEGER DEFAULT 1,
                is_open INTEGER DEFAULT 0,
                has_lock_sensor INTEGER DEFAULT 0,
                has_door_position_sensor INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating doors table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Doors table created/verified');
                
                // Add new columns to existing doors table if they don't exist
                db.run(`ALTER TABLE doors ADD COLUMN is_locked INTEGER DEFAULT 1`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding is_locked column:', err.message);
                    }
                });
                
                db.run(`ALTER TABLE doors ADD COLUMN is_open INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding is_open column:', err.message);
                    }
                });
                
                db.run(`ALTER TABLE doors ADD COLUMN has_lock_sensor INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding has_lock_sensor column:', err.message);
                    }
                });
                
                db.run(`ALTER TABLE doors ADD COLUMN has_door_position_sensor INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding has_door_position_sensor column:', err.message);
                    }
                });
                
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

            // Access requests table
            db.run(`CREATE TABLE IF NOT EXISTS access_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                door_id INTEGER NOT NULL,
                request_type TEXT DEFAULT 'qr_scan',
                status TEXT DEFAULT 'pending',
                reason TEXT,
                user_agent TEXT,
                ip_address TEXT,
                qr_code_data TEXT,
                requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating access_requests table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Access requests table created/verified');
                checkCompletion();
            });

            // Events table for system event logging
            db.run(`CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                entity_name TEXT,
                user_id INTEGER,
                user_name TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )`, (err) => {
                if (err) {
                    console.error('Error creating events table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Events table created/verified');
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

            db.run(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)`, (err) => {
                if (err) console.error('Error creating events created_at index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`, (err) => {
                if (err) console.error('Error creating events type index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`, (err) => {
                if (err) console.error('Error creating events user_id index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id)`, (err) => {
                if (err) console.error('Error creating access_requests user_id index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_access_requests_door_id ON access_requests(door_id)`, (err) => {
                if (err) console.error('Error creating access_requests door_id index:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status)`, (err) => {
                if (err) console.error('Error creating access_requests status index:', err.message);
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