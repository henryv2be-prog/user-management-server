const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at:', DB_PATH);
});

// Check if columns exist and add them if they don't
const migrateDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Check if last_seen column exists in doors table
            db.all("PRAGMA table_info(doors)", (err, columns) => {
                if (err) {
                    console.error('Error checking doors table structure:', err.message);
                    reject(err);
                    return;
                }
                
                const columnNames = columns.map(col => col.name);
                console.log('Current doors table columns:', columnNames);
                
                const migrations = [];
                
                // Add last_seen column if it doesn't exist
                if (!columnNames.includes('last_seen')) {
                    migrations.push(() => {
                        return new Promise((resolve, reject) => {
                            db.run("ALTER TABLE doors ADD COLUMN last_seen DATETIME", (err) => {
                                if (err) {
                                    console.error('Error adding last_seen column:', err.message);
                                    reject(err);
                                } else {
                                    console.log('✅ Added last_seen column to doors table');
                                    resolve();
                                }
                            });
                        });
                    });
                }
                
                // Add is_online column if it doesn't exist
                if (!columnNames.includes('is_online')) {
                    migrations.push(() => {
                        return new Promise((resolve, reject) => {
                            db.run("ALTER TABLE doors ADD COLUMN is_online INTEGER DEFAULT 0", (err) => {
                                if (err) {
                                    console.error('Error adding is_online column:', err.message);
                                    reject(err);
                                } else {
                                    console.log('✅ Added is_online column to doors table');
                                    resolve();
                                }
                            });
                        });
                    });
                }
                
                // Create door_commands table if it doesn't exist
                migrations.push(() => {
                    return new Promise((resolve, reject) => {
                        db.run(`CREATE TABLE IF NOT EXISTS door_commands (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            door_id INTEGER NOT NULL,
                            command TEXT NOT NULL,
                            status TEXT DEFAULT 'pending',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            executed_at DATETIME,
                            FOREIGN KEY (door_id) REFERENCES doors (id)
                        )`, (err) => {
                            if (err) {
                                console.error('Error creating door_commands table:', err.message);
                                reject(err);
                            } else {
                                console.log('✅ Created door_commands table');
                                resolve();
                            }
                        });
                    });
                });
                
                // Execute migrations sequentially
                const runMigrations = async () => {
                    for (const migration of migrations) {
                        await migration();
                    }
                    resolve();
                };
                
                if (migrations.length === 0) {
                    console.log('✅ No migrations needed - all columns already exist');
                    resolve();
                } else {
                    console.log(`🔄 Running ${migrations.length} migration(s)...`);
                    runMigrations().catch(reject);
                }
            });
        });
    });
};

// Run migration if this file is run directly
if (require.main === module) {
    migrateDatabase()
        .then(() => {
            console.log('✅ Database migration completed successfully');
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
            console.error('❌ Database migration failed:', err.message);
            db.close();
            process.exit(1);
        });
}

module.exports = { migrateDatabase };
