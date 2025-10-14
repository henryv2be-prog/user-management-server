const { getDatabase, DB_PATH } = require('./connection');
const pool = require('./pool');

// Minimal database initialization for Railway (emergency fallback)
const initDatabaseMinimal = async () => {
    return new Promise(async (resolve, reject) => {
        console.log('🚨 Railway: Starting MINIMAL database initialization...');
        
        try {
            const db = await pool.getConnection();
            console.log('🚨 Railway: Database connection acquired for minimal init');
            
            // Create only essential tables
            const minimalSQL = `
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

                -- Visitors table (ensure visitor features work in minimal init)
                CREATE TABLE IF NOT EXISTS visitors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    visitor_name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
                    valid_to DATETIME NOT NULL,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
                CREATE INDEX IF NOT EXISTS idx_visitors_valid_to ON visitors(valid_to);
            `;
            
            db.exec(minimalSQL, (err) => {
                if (err) {
                    console.error('🚨 Railway: Error in minimal database init:', err.message);
                    pool.releaseConnection(db);
                    reject(err);
                    return;
                }
                
                console.log('🚨 Railway: Minimal tables created');
                
                // Create admin user
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (err) {
                        console.error('🚨 Railway: Error checking users in minimal init:', err.message);
                        pool.releaseConnection(db);
                        reject(err);
                        return;
                    }
                    
                    if (row.count === 0) {
                        console.log('🚨 Railway: Creating admin user in minimal init...');
                        const bcrypt = require('bcryptjs');
                        const hashedPassword = bcrypt.hashSync('admin123', 10);
                        
                        db.run(`INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            ['admin', 'admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1],
                            function(err) {
                                if (err) {
                                    console.error('🚨 Railway: Error creating admin in minimal init:', err.message);
                                    pool.releaseConnection(db);
                                    reject(err);
                                    return;
                                }
                                
                                console.log('🚨 Railway: Admin user created in minimal init');
                                pool.releaseConnection(db);
                                resolve();
                            }
                        );
                    } else {
                        console.log('🚨 Railway: Users exist in minimal init');
                        pool.releaseConnection(db);
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.error('🚨 Railway: Minimal database initialization failed:', error.message);
            reject(error);
        }
    });
};

module.exports = { initDatabaseMinimal };