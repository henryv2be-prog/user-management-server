// Migration to add access event fields to visitors table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

function addAccessEventFields() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);
        
        // Check if columns already exist
        db.all("PRAGMA table_info(visitors)", (err, columns) => {
            if (err) {
                db.close();
                return reject(err);
            }
            
            const hasAccessEventLimit = columns.some(col => col.name === 'access_event_limit');
            const hasRemainingAccessEvents = columns.some(col => col.name === 'remaining_access_events');
            
            if (hasAccessEventLimit && hasRemainingAccessEvents) {
                console.log('Access event fields already exist in visitors table');
                db.close();
                return resolve();
            }
            
            // Add missing columns
            const migrations = [];
            
            if (!hasAccessEventLimit) {
                migrations.push(
                    new Promise((resolve, reject) => {
                        db.run("ALTER TABLE visitors ADD COLUMN access_event_limit INTEGER DEFAULT 0", (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('Added access_event_limit column to visitors table');
                                resolve();
                            }
                        });
                    })
                );
            }
            
            if (!hasRemainingAccessEvents) {
                migrations.push(
                    new Promise((resolve, reject) => {
                        db.run("ALTER TABLE visitors ADD COLUMN remaining_access_events INTEGER DEFAULT 0", (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('Added remaining_access_events column to visitors table');
                                resolve();
                            }
                        });
                    })
                );
            }
            
            Promise.all(migrations)
                .then(() => {
                    db.close();
                    console.log('Migration completed successfully');
                    resolve();
                })
                .catch((err) => {
                    db.close();
                    reject(err);
                });
        });
    });
}

// Run migration if called directly
if (require.main === module) {
    addAccessEventFields()
        .then(() => {
            console.log('Access event fields migration completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { addAccessEventFields };
