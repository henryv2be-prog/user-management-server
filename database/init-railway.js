const { getDatabase, DB_PATH } = require('./connection');
const pool = require('./pool');

// Railway-optimized database initialization
const initDatabaseRailway = async () => {
    return new Promise(async (resolve, reject) => {
        console.log('🚂 Railway: Starting optimized database initialization...');
        
        try {
            const db = await pool.getConnection();
            console.log('🚂 Railway: Database connection acquired');
            
            // Use transactions for faster initialization
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // Create all tables in one go (Railway optimized)
                const createTablesSQL = `
                    -- Users table
                    CREATE TABLE IF NOT EXISTS users (
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
                    );
                    
                    -- Doors table
                    CREATE TABLE IF NOT EXISTS doors (
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
                    );
                    
                    -- Door commands table
                    CREATE TABLE IF NOT EXISTS door_commands (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        door_id INTEGER NOT NULL,
                        command TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        executed_at DATETIME,
                        FOREIGN KEY (door_id) REFERENCES doors (id)
                    );
                    
                    -- Access groups table
                    CREATE TABLE IF NOT EXISTS access_groups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        description TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    -- Door access groups junction table
                    CREATE TABLE IF NOT EXISTS door_access_groups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        door_id INTEGER NOT NULL,
                        access_group_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE,
                        FOREIGN KEY (access_group_id) REFERENCES access_groups (id) ON DELETE CASCADE,
                        UNIQUE(door_id, access_group_id)
                    );
                    
                    -- User access groups junction table
                    CREATE TABLE IF NOT EXISTS user_access_groups (
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
                    );
                    
                    -- Access log table
                    CREATE TABLE IF NOT EXISTS access_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        door_id INTEGER NOT NULL,
                        access_granted INTEGER NOT NULL,
                        access_reason TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
                        FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
                    );
                    
                    -- Access requests table
                    CREATE TABLE IF NOT EXISTS access_requests (
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
                    );
                    
                    -- Events table
                    CREATE TABLE IF NOT EXISTS events (
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
                    );
                    
                    -- Site plan table
                    CREATE TABLE IF NOT EXISTS site_plan (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        background_image TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    -- Door positions table
                    CREATE TABLE IF NOT EXISTS door_positions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        door_id INTEGER,
                        x REAL,
                        y REAL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(door_id),
                        FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
                    );
                    
                    -- Door tags table
                    CREATE TABLE IF NOT EXISTS door_tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        door_id INTEGER NOT NULL,
                        tag_id TEXT NOT NULL,
                        tag_type TEXT NOT NULL CHECK (tag_type IN ('nfc', 'qr')),
                        tag_data TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE,
                        UNIQUE (tag_id)
                    );

                    -- Visitors table
                    CREATE TABLE IF NOT EXISTS visitors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        first_name TEXT NOT NULL,
                        last_name TEXT NOT NULL,
                        email TEXT,
                        phone TEXT,
                        valid_from DATETIME NOT NULL,
                        valid_until DATETIME NOT NULL,
                        is_active INTEGER DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_by INTEGER,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
                    );
                `;
                
                db.exec(createTablesSQL, (err) => {
                    if (err) {
                        console.error('🚂 Railway: Error creating tables:', err.message);
                        db.run('ROLLBACK');
                        pool.releaseConnection(db);
                        reject(err);
                        return;
                    }
                    
                    console.log('🚂 Railway: All tables created successfully');
                    
                    // Create essential indexes only
                    const createIndexesSQL = `
                        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                        CREATE INDEX IF NOT EXISTS idx_doors_esp32_ip ON doors(esp32_ip);
                        CREATE INDEX IF NOT EXISTS idx_access_log_timestamp ON access_log(timestamp);
                        CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
                        CREATE INDEX IF NOT EXISTS idx_door_tags_tag_id ON door_tags(tag_id);
                        CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
                        CREATE INDEX IF NOT EXISTS idx_visitors_valid_until ON visitors(valid_until);
                    `;
                    
                    db.exec(createIndexesSQL, (err) => {
                        if (err) {
                            console.error('🚂 Railway: Error creating indexes:', err.message);
                            db.run('ROLLBACK');
                            pool.releaseConnection(db);
                            reject(err);
                            return;
                        }
                        
                        console.log('🚂 Railway: Essential indexes created');
                        
                        // Check if admin user exists, create if not
                        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                            if (err) {
                                console.error('🚂 Railway: Error checking users count:', err.message);
                                db.run('ROLLBACK');
                                pool.releaseConnection(db);
                                reject(err);
                                return;
                            }
                            
                            console.log(`🚂 Railway: Found ${row.count} existing users`);
                            
                            if (row.count === 0) {
                                console.log('🚂 Railway: Creating default admin user...');
                                const bcrypt = require('bcryptjs');
                                const hashedPassword = bcrypt.hashSync('admin123', 10);
                                
                                db.run(`INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    ['admin', 'admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1],
                                    function(err) {
                                        if (err) {
                                            console.error('🚂 Railway: Error creating admin user:', err.message);
                                            db.run('ROLLBACK');
                                            pool.releaseConnection(db);
                                            reject(err);
                                            return;
                                        }
                                        
                                        console.log('🚂 Railway: Default admin user created');
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                console.error('🚂 Railway: Error committing transaction:', err.message);
                                                reject(err);
                                                return;
                                            }
                                            
                                            console.log('🚂 Railway: Database initialization completed successfully');
                                            pool.releaseConnection(db);
                                            resolve();
                                        });
                                    }
                                );
                            } else {
                                console.log('🚂 Railway: Users exist, skipping admin creation');
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('🚂 Railway: Error committing transaction:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    
                                    console.log('🚂 Railway: Database initialization completed successfully');
                                    pool.releaseConnection(db);
                                    resolve();
                                });
                            }
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error('🚂 Railway: Database initialization failed:', error.message);
            reject(error);
        }
    });
};

module.exports = { initDatabaseRailway };