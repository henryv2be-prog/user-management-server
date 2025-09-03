const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'users.db');

console.log('Checking database at:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to database successfully');
});

// Check what tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }
    
    console.log('\nTables in database:');
    rows.forEach(row => {
        console.log('- ' + row.name);
    });
    
    // Check user_access_groups table specifically
    db.all("PRAGMA table_info(user_access_groups)", [], (err, columns) => {
        if (err) {
            console.error('Error getting user_access_groups schema:', err);
        } else if (columns.length === 0) {
            console.error('user_access_groups table does NOT exist');
        } else {
            console.log('\nuser_access_groups table columns:');
            columns.forEach(col => {
                console.log(`- ${col.name} (${col.type})`);
            });
        }
        
        db.close();
    });
});
