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
                is_active INTEGER DEFAULT 1,
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
            });

            // Doors table
            db.run(`CREATE TABLE IF NOT EXISTS doors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                esp32_ip TEXT,
                esp32_mac TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating doors table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Doors table created/verified');
            });

            // Access groups table
            db.run(`CREATE TABLE IF NOT EXISTS access_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating access_groups table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Access groups table created/verified');
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
            });

            // User access groups junction table
            db.run(`CREATE TABLE IF NOT EXISTS user_access_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                access_group_id INTEGER NOT NULL,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (access_group_id) REFERENCES access_groups (id) ON DELETE CASCADE,
                UNIQUE(user_id, access_group_id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating user_access_groups table:', err.message);
                    reject(err);
                    return;
                }
                console.log('User access groups table created/verified');
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

            // Insert default admin user if no users exist
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error('Error checking users count:', err.message);
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    const bcrypt = require('bcrypt');
                    const hashedPassword = bcrypt.hashSync('admin123', 10);
                    
                    db.run(`INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        ['admin', 'admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1, 1],
                        function(err) {
                            if (err) {
                                console.error('Error creating default admin user:', err.message);
                                reject(err);
                                return;
                            }
                            console.log('Default admin user created (username: admin, password: admin123)');
                            resolve();
                        }
                    );
                } else {
                    console.log('Users already exist, skipping default admin creation');
                    resolve();
                }
            });
        });
    });
};

// Run initialization
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
